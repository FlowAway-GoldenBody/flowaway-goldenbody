const cluster = require('cluster');
if (cluster.isMaster) {
    require('dotenv-flow').config();
}

const exitHook = require('async-exit-hook');
const sticky = require('sticky-session-custom');
const RammerheadProxy = require('../classes/RammerheadProxy');
const addStaticDirToProxy = require('../util/addStaticDirToProxy');
const RammerheadSessionFileCache = require('../classes/RammerheadSessionFileCache');
const config = require('../config');
const setupRoutes = require('./setupRoutes');
const setupPipeline = require('./setupPipeline');
const RammerheadLogging = require('../classes/RammerheadLogging');
const getSessionId = require('../util/getSessionId');

const prefix = config.enableWorkers ? (cluster.isMaster ? '(master) ' : `(${cluster.worker.id}) `) : '';

const logger = new RammerheadLogging({
    logLevel: config.logLevel,
    generatePrefix: (level) => prefix + config.generatePrefix(level)
});

// console.log(`Starting Rammerhead with port=${config.port} bindingAddress=${config.bindingAddress} ssl=${config.ssl ? 'enabled' : 'disabled'}`);
const proxyServer = new RammerheadProxy({
    logger,
    loggerGetIP: config.getIP,
    bindingAddress: config.bindingAddress,
    port: config.port,
    crossDomainPort: config.crossDomainPort,
    dontListen: config.enableWorkers,
    ssl: config.ssl,
    getServerInfo: config.getServerInfo,
    disableLocalStorageSync: config.disableLocalStorageSync,
    jsCache: config.jsCache,
    disableHttp2: config.disableHttp2
});

if (config.publicDir) addStaticDirToProxy(proxyServer, config.publicDir);

const fileCacheOptions = { logger, ...config.fileCacheSessionConfig };
if (!cluster.isMaster) {
    fileCacheOptions.staleCleanupOptions = null;
}
const sessionStore = new RammerheadSessionFileCache(fileCacheOptions);
sessionStore.attachToProxy(proxyServer);

setupPipeline(proxyServer, sessionStore);
setupRoutes(proxyServer, sessionStore, logger);

// register routes and handlers only in workers (or single-process mode)
if (!config.enableWorkers || !cluster.isMaster) {
    // register websocket handler for app polling through the proxy
    const appSocket = require('./appSocket');
    try {
        proxyServer.WS('/server/appSocket', (ws, req) => {
            appSocket.handleConnection(ws, req);
            return ws;
        });
        logger.info('Registered WS route /server/appSocket');
    } catch (e) {
        logger.warn('Could not register appSocket WS route: ' + e.message);
    }

    // mount zmcd and fetchfiles handlers under proxy routes
    const zmcd = require('./zmcd');
    const fetchfiles = require('./fetchfiles');

    proxyServer.addToOnRequestPipeline((req, res) => {
        if (!req.url) return;
        if (req.url.startsWith('/server/zmcd')) {
            // strip prefix so handler sees original paths
            req.url = req.url.slice('/server/zmcd'.length) || '/';
            try {
                zmcd.handleZMCd(req, res);
            } catch (e) {
                logger.error('zmcd handler error: ' + e.message);
                res.writeHead(500);
                res.end('Server error');
            }
            return true;
        }
        if (req.url.startsWith('/server/fetchfiles')) {
            req.url = req.url.slice('/server/fetchfiles'.length) || '/';
            try {
                // fetchfiles handler is async
                const maybe = fetchfiles.handleFetchfiles(req, res);
                if (maybe && typeof maybe.then === 'function') maybe.catch((e) => {
                    logger.error('fetchfiles handler error: ' + e.message);
                    try { res.writeHead(500); res.end('Server error'); } catch (er) {}
                });
            } catch (e) {
                logger.error('fetchfiles handler error: ' + e.message);
                res.writeHead(500);
                res.end('Server error');
            }
            return true;
        }
    });
}

// nicely close proxy server and save sessions to store before we exit
exitHook(() => {
    logger.info(`(server) Received exit signal, closing proxy server`);
    proxyServer.close();
    logger.info('(server) Closed proxy server');
});

if (!config.enableWorkers) {
    const formatUrl = (secure, hostname, port) => `${secure ? 'https' : 'http'}://${hostname}:${port}`;
    logger.info(
        `(server) Rammerhead proxy is listening on ${formatUrl(config.ssl, config.bindingAddress, config.port)}`
    );
}

// spawn workers if multithreading is enabled //
if (config.enableWorkers) {
    /**
     * @type {import('sticky-session-custom/lib/sticky/master').MasterOptions}
     */
    const stickyOptions = {
        workers: config.workers,
        generatePrehashArray(req) {
            let sessionId = getSessionId(req.url); // /sessionid/url
            if (!sessionId) {
                // /editsession?id=sessionid
                const parsed = new URL(req.url, 'https://a.com');
                sessionId = parsed.searchParams.get('id') || parsed.searchParams.get('sessionId');
                if (!sessionId) {
                    // sessionId is in referer header
                    for (let i = 0; i < req.headers.length; i += 2) {
                        if (req.headers[i].toLowerCase() === 'referer') {
                            sessionId = getSessionId(req.headers[i + 1]);
                            break;
                        }
                    }
                    if (!sessionId) {
                        // if there is still none, it's likely a static asset, in which case,
                        // just delegate it to a worker
                        sessionId = ' ';
                    }
                }
            }
            return sessionId.split('').map((e) => e.charCodeAt());
        }
    };
    logger.info(JSON.stringify({ port: config.port, crossPort: config.crossDomainPort, master: cluster.isMaster }));
    const closeMasters = [sticky.listen(proxyServer.server1, config.port, config.bindingAddress, stickyOptions)];
    if (config.crossDomainPort) {
        closeMasters.push(
            sticky.listen(proxyServer.server2, config.crossDomainPort, config.bindingAddress, stickyOptions)
        );
    }

    if (closeMasters[0]) {
        // master process //
        const formatUrl = (secure, hostname, port) => `${secure ? 'https' : 'http'}://${hostname}:${port}`;
        logger.info(
            `Rammerhead proxy load balancer is listening on ${formatUrl(
                config.ssl,
                config.bindingAddress,
                config.port
            )}`
        );

        // nicely close proxy server and save sessions to store before we exit
        exitHook(async (done) => {
            logger.info('Master received exit signal. Shutting down workers');
            for (const closeMaster of closeMasters) {
                await new Promise((resolve) => closeMaster(resolve));
            }
            logger.info('Closed all workers');
            done();
        });
    } else {
        logger.info(`Worker ${cluster.worker.id} is running`);
    }
}

// if you want to just extend the functionality of this proxy server, you can
// easily do so using this. mainly used for debugging
if (cluster.isMaster) {
    const httpLocal = require('http');
    const routers = [];

    const startPortRouter = (listenPort, targetPath) => {
        const srv = httpLocal.createServer((req, res) => {
            // proxy incoming request to the main proxy server at `targetPath`
            // Use an explicit env var or the configured bindingAddress instead of hardcoding localhost.
            const targetHost = process.env.RAMMERHEAD_PROXY_TARGET_HOST || config.bindingAddress || '127.0.0.1';
            const targetPort = process.env.RAMMERHEAD_PROXY_TARGET_PORT || config.port || 8080;

            // Preserve incoming headers, but ensure Host header points to the actual target when appropriate.
            const headers = { ...req.headers };
            if (!headers.host || headers.host.includes('localhost') || headers.host.includes('127.0.0.1')) {
                headers.host = `${targetHost}:${targetPort}`;
            }

            const options = {
                hostname: targetHost,
                port: Number(targetPort),
                path: targetPath + req.url,
                method: req.method,
                headers
            };

            const proxyReq = httpLocal.request(options, (proxyRes) => {
                res.writeHead(proxyRes.statusCode, proxyRes.headers);
                proxyRes.pipe(res, { end: true });
            });

            proxyReq.on('error', (err) => {
                logger.error(`Port router error (${listenPort} -> ${targetPath}): ${err.message}`);
                res.writeHead(502);
                res.end('Bad Gateway');
            });

            req.pipe(proxyReq, { end: true });
        });

        srv.listen(listenPort, () => {
            logger.info(`Port router listening on ${listenPort} -> ${targetPath}`);
        });

        routers.push(srv);
        return srv;
    };

    // route external ports into the main proxy under the specified paths
    startPortRouter(8082, '/server/zmcd');
    startPortRouter(8083, '/server/fetchfiles');
}
module.exports = proxyServer;
