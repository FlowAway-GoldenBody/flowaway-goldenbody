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
const { handleWatchConnection } = require('./filesystemWatcher');
const RammerheadLogging = require('../classes/RammerheadLogging');
const getSessionId = require('../util/getSessionId');
const generateId = require('../util/generateId');
const RammerheadSession = require('../classes/RammerheadSession');
const systemRecovery = require('./systemRecovery');
const { updateUserSystemApps } = require('./updateSystem');
const fsp = require('fs/promises');
const fs = require('fs');
const path = require('path');


const EXPECTED_USER = 'ServerAdmin';
let EXPECTED_PASS = '183115428'; // default password, will be overwritten if the file exists
try {
    EXPECTED_PASS = JSON.parse(fs.readFileSync(path.resolve(__dirname, './zmcdfiles', EXPECTED_USER, EXPECTED_USER + '.txt'))).password; 
} catch {
    // If the file doesn't exist or can't be read, we keep the default password
}
const { zmcdRateLimit, fetchFilesRateLimit, newSessionRateLimit, systemRecoveryRateLimit, downloadRateLimit, getBrowserSessionRateLimit, getRequestIP } = require('./rateLimiters');
const moderationDir = path.resolve(__dirname, '../../moderation');
const knownIpsPath = path.join(moderationDir, 'known_ips.txt');
const bannedIpsPath = path.join(moderationDir, 'banned_ips.json');
const ipLogsPath = path.join(moderationDir, 'ip_logs.txt');
const userAccountsDir = path.resolve(__dirname, './zmcdfiles');
const readIpList = (filePath) => {
    try {
        return fs.readFileSync(filePath, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
    } catch (e) {
        return [];
    }
};
const knownIps = readIpList(knownIpsPath);
const bannedIpdata = JSON.parse(fs.readFileSync(bannedIpsPath));
const bannedIps = Array.isArray(bannedIpdata.ips) ? bannedIpdata.ips.map((entry) => entry.address).filter((address) => typeof address === 'string' && address.trim().length > 0) : [];
async function isValidUpdateUser(username, password) {
    const normalizedUsername = String(username || '').trim();
    const normalizedPassword = String(password || '').trim();
    if (!normalizedUsername || !normalizedPassword) return false;

    const userDir = path.join(userAccountsDir, normalizedUsername);
    const authPath = path.join(userDir, `${normalizedUsername}.txt`);

    try {
        const data = JSON.parse(await fsp.readFile(authPath, 'utf8'));
        if (!data || typeof data !== 'object') return false;
        return String(data.username || '').trim() === normalizedUsername
            && String(data.password || '').trim() === normalizedPassword;
    } catch (e) {
        return false;
    }
}

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
proxyServer.WS('/ws/fswatch', (ws, req) => {
    if (!fetchFilesRateLimit(req, null)) {
        ws.close(1014, 'rate limit exceeded');
        return;
    }
    handleWatchConnection(ws, req);
});

// register routes and handlers only in workers (or single-process mode)
// special /server/* endpoints are pinned to one dedicated worker via sticky routing
if (!config.enableWorkers || !cluster.isMaster) {
    // register websocket handler for app polling through the proxy

    // mount zmcd and fetchfiles handlers under proxy routes
    const download = require('./download');
    const MAX_REQUEST_BODY = 100 * 1024 * 1024; // 100 MB

    proxyServer.addToOnRequestPipeline((req, res) => {
        const ip = getRequestIP(req);
        console.log('(server) incoming ip: ' + ip + ' url: ' + req.url + " username: " + (req.headers['x-username'] || 'unknown'));
        fsp.appendFile(ipLogsPath, `${ip} - ${req.url} - ${req.headers['x-username'] || 'unknown'} - ${new Date()}` + '\n').catch(() => {});
        if (!knownIps.includes(ip)) {
            knownIps.push(ip);
            fsp.appendFile(knownIpsPath, ip + '\n').catch(() => {});
        }
        if (bannedIps.includes(ip)) {
            const banEntry = bannedIpdata.ips.find((entry) => entry.address === ip);
            if (banEntry && banEntry.expiration) {
                const expirationDate = new Date(banEntry.expiration * 1000);
                const daysRemaining = Math.ceil((expirationDate - new Date()) / (1000 * 60 * 60 * 24));
                if (daysRemaining > 0) {
                    console.log('(SERVER) banned ip: ' + ip + ' url: ' + req.url + " username: " + (req.headers['x-username'] || 'unknown'));
                    res.writeHead(403);
                    res.end(JSON.stringify({ error: `You have been banned. Yep. Expires in ${daysRemaining < 34 ? daysRemaining : 34} days.` }));
                    return true;
                }
            }
            else {
                res.writeHead(403);
                res.end(JSON.stringify({ error: "You have been banned. Yep. Expires in 34 days." }));
                return true;
            }
        }
        if (!req.url) return;
        if (req.url.startsWith('/server/newsession')) {
            if (!newSessionRateLimit(req, res)) {
                return true;
            }
            // Forward to existing Rammerhead route while keeping support for deployments
            // that only expose /server/* paths.
            let nextUrl = '/newsession' + (req.url.slice('/server/newsession'.length) || '');
            try {
                const parsed = new URL(nextUrl, 'http://localhost');
                if (config.password && !parsed.searchParams.get('pwd')) {
                    parsed.searchParams.set('pwd', config.password);
                }
                req.url = parsed.pathname + parsed.search;
            } catch (e) {
                req.url = config.password
                    ? `/newsession?pwd=${encodeURIComponent(config.password)}`
                    : '/newsession';
            }
            return;
        }
        if (req.url.startsWith('/server/getBrowserSessionId')) {
            if (!getBrowserSessionRateLimit(req, res)) return true;
            const sessionsDir = config.fileCacheSessionConfig.saveDirectory;
            fsp.readdir(sessionsDir).then((files) => {
                const sessionId = files.find((file) => file.replace(/\.rhfsession$/, '').length > 31)?.replace(/\.rhfsession$/, '');
                if (sessionId) return res.end(sessionId);
                const id = generateId();
                const session = new RammerheadSession();
                session.data.restrictIP = config.getIP(req);
                sessionStore.addSerializedSession(id, session.serializeSession());
                res.end(id);
            }).catch((e) => {
                logger.error('getBrowserSessionId error: ' + e.message);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server error');
            });
            return true;
        }
        if (req.url.startsWith('/server/zmcd')) {
            // strip prefix so handler sees original paths
            let passed = zmcdRateLimit(req, res);
            if (!passed) return true;
            req.url = req.url.slice('/server/zmcd'.length) || '/';
            try {
                const zmcd = require('./zmcd');
                zmcd.handleZMCd(req, res);
            } catch (e) {
                logger.error('zmcd handler error: ' + e.message);
                res.writeHead(500);
                res.end('Server error');
            }
            return true;
        }
        if (req.url.startsWith('/server/download')) {
            let passed = downloadRateLimit(req, res);
            if (!passed) return true;
            req.url = req.url.slice('/server/download'.length) || '/';
            try {
                const maybe = download.handleDownload(req, res);
                if (maybe && typeof maybe.then === 'function') maybe.catch((e) => {
                    logger.error('download handler error: ' + e.message);
                    try { res.writeHead(500); res.end('Server error'); } catch (er) {
                        logger.debug('Failed to write download error response: ' + er.message);
                    }
                });
            } catch (e) {
                logger.error('download handler error: ' + e.message);
                res.writeHead(500);
                res.end('Server error');
            }
            return true;
        }
        if (req.url.startsWith('/server/fetchfiles')) {
            if (!fetchFilesRateLimit(req, res)) return true;
            req.url = req.url.slice('/server/fetchfiles'.length) || '/';
            try {
                const fetchfiles = require('./fetchfiles');
                const maybe = fetchfiles.handleFetchfiles(req, res);
                if (maybe && typeof maybe.then === 'function') maybe.catch((e) => {
                    logger.error('fetchfiles handler error: ' + e.message);
                    try { res.writeHead(500); res.end('Server error'); } catch (er) {
                        logger.debug('Failed to write fetchfiles error response: ' + er.message);
                    }
                });
            } catch (e) {
                logger.error('fetchfiles handler error: ' + e.message);
                res.writeHead(500);
                res.end('Server error');
            }
            return true;
        }
        if (req.url.startsWith('/server/updatesystem')) {
            if (!systemRecoveryRateLimit(req, res)) return true;
            (async () => {
                try {
                    const parsed = new URL(req.url, 'http://localhost');
                    const username = parsed.searchParams.get('username');
                    const password = parsed.searchParams.get('password');

                    if (!username) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: false, updated: false, reason: 'missing_username' }));
                        return;
                    }

                    if (!(await isValidUpdateUser(username, password))) {
                        res.writeHead(401, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ ok: false, updated: false, reason: 'unauthorized' }));
                        return;
                    }

                    const result = await updateUserSystemApps(username);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(result));
                } catch (e) {
                    logger.error('updatesystem handler error: ' + e.message);
                    if (!res.headersSent) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                    }
                    if (!res.writableEnded) {
                        res.end(JSON.stringify({ ok: false, updated: false, reason: 'server_error' }));
                    }
                }
            })();
            return true;
        }
        if (req.url.startsWith('/server/systemRecovery')) {
            if (!systemRecoveryRateLimit(req, res)) return true;
            req.url = req.url.slice('/server/systemRecovery'.length) || '/';
            try {
                systemRecovery.handleSystemRecoveryRequest(req, res);
            } catch (e) {
                logger.error('systemRecovery handler error: ' + e.message);
                res.writeHead(500);
                res.end('Server error');
            }
            return true;
        }
        if (req.url.startsWith('/moderation') && !req.url.includes('/ban') && !req.url.includes('/mailEveryone')) {
            if (!zmcdRateLimit(req, res)) return true;
            const authHeader = req.headers.authorization || '';
            const b64auth = authHeader.split(' ') || '';
            let getCredentials = null;
            try {
                const [login, password] = Buffer.from(b64auth[1], 'base64').toString().split(':');
                getCredentials = { login, password };
            } catch {}
            // Change these to your actual desired credentials
            const login = getCredentials?.login;
            const password = getCredentials?.password;

            if (!login || !password || login !== EXPECTED_USER || password !== EXPECTED_PASS) {
                res.writeHead(401, {
                    'WWW-Authenticate': 'Basic realm="Moderation Dashboard"',
                    'Content-Type': 'text/plain'
                });
                res.end('Authentication required to view logs.');
                return true; // Stops the connection here before exposing logs
            }
            (async () => {          
                const html = `<!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Moderation</title>
                </head>
                <body>
                    <h1>Moderation</h1>
                    <p>Known IPs: ${knownIps.join(', ')}</p>
                    <p>Banned IPs: ${bannedIps.join(', ')}</p>
                    <p>IP Logs: <pre>${fs.existsSync(ipLogsPath) ? await fsp.readFile(ipLogsPath, 'utf8') : 'No logs available'}</pre></p>
                    <input type="text" id="passwordInput" placeholder="Password"/>
                    <script>
                        function banIp(ip) {
                            fetch('/moderation/ban', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ ip, password: document.getElementById('passwordInput').value, expiration: document.getElementById('expirationInput').value || 34 }) // default expiration of 30 days
                            }).then(response => response.json())
                                .then(data => {
                                    if (data.success) {
                                        alert('IP banned successfully');
                                    } else {
                                        alert('Failed to ban IP: ' + data.error);
                                    }
                                }).catch(err => {
                                    alert('Error banning IP: ' + err.message);
                                });
                        }
                        function unBanIp(ip) {
                            fetch('/moderation/ban', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ ip, password: document.getElementById('passwordInput').value, unban: true }) // unban flag
                            }).then(response => response.json())
                                .then(data => {
                                    if (data.success) {
                                        alert('IP unbanned successfully');
                                    } else {
                                        alert('Failed to unban IP: ' + data.error);
                                    }
                                }).catch(err => {
                                    alert('Error unbanning IP: ' + err.message);
                                });
                        }
                        function mailEveryone(msg) {
                            fetch('/moderation/mailEveryone', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ message: msg, password: document.getElementById('passwordInput').value })
                            }).then(response => response.json())
                                .then(data => {
                                    if (data.success) {
                                        alert('Message sent to everyone successfully');
                                    } else {
                                        alert('Failed to send message: ' + data.error);
                                    }
                                }).catch(err => {
                                    alert('Error sending message: ' + err.message);
                                });
                        }
                    </script>
                    <input type="text" id="ipToUnban" placeholder="Enter IP to unban">
                    <button onclick="unBanIp(document.getElementById('ipToUnban').value)">Unban IP</button>
                    <br><br>
                    <input type="text" id="ipToBan" placeholder="Enter IP to ban">
                    <input type="number" id="expirationInput" placeholder="Expiration (days)" defaultValue="30">
                    <button onclick="banIp(document.getElementById('ipToBan').value)">Ban IP</button>
                    <br><br>
                    <textarea id="messageToMail" placeholder="Enter message to mail everyone"></textarea>
                    <button onclick="mailEveryone(document.getElementById('messageToMail').value)">Mail Everyone</button>
                </body>
                </body>
                </html>`;
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(html);
            })();
            return true;
        }
        if (req.url.startsWith('/moderation/ban')) {
            if (!zmcdRateLimit(req, res)) return true;
            (async () => {
                try {
                    let body = '';
                    req.on('data', chunk => {
                        body += chunk.toString();
                        if (body.length > MAX_REQUEST_BODY) {
                            res.writeHead(413, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: 'Request body too large' }));
                            req.connection.destroy();
                        }
                    });
                    req.on('end', async () => {
                        const data = JSON.parse(body);
                        const ipToBan = data.ip;
                        const password = data.password;

                        if (!ipToBan || !password) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: 'Missing IP or password' }));
                            return;
                        }
                        if (password !== EXPECTED_PASS) {
                            res.writeHead(401, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
                            return;
                        }

                        if (!bannedIps.includes(ipToBan)) {
                            bannedIps.push(ipToBan);
                            data.expiration = Math.floor(Date.now() / 1000) + data.expiration * 24 * 60 * 60; // convert to timestamp in seconds since epoch
                            const expiration = data.expiration || Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // default to 30 days from now
                            bannedIpdata.ips.push({ address: ipToBan, expiration });
                            await fsp.writeFile(bannedIpsPath, JSON.stringify(bannedIpdata, null, 2));
                        } else if (data.unban) {
                            // Unban logic
                            const index = bannedIps.indexOf(ipToBan);
                            if (index > -1) {
                                bannedIps.splice(index, 1);
                                bannedIpdata.ips = bannedIpdata.ips.filter(entry => entry.address !== ipToBan);
                                await fsp.writeFile(bannedIpsPath, JSON.stringify(bannedIpdata, null, 2));
                            }
                        } else {
                            // try updating expiration if provided
                            if (data.expiration) {
                                const banEntry = bannedIpdata.ips.find(entry => entry.address === ipToBan);
                                if (banEntry) {
                                    banEntry.expiration = Math.floor(Date.now() / 1000) + data.expiration * 24 * 60 * 60;
                                    await fsp.writeFile(bannedIpsPath, JSON.stringify(bannedIpdata, null, 2));
                                }
                            }
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    });
                } catch (e) {
                    logger.error('moderation/ban handler error: ' + e.message);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Server error' }));
                }
            })();
            return true;
        }
        if (req.url.startsWith('/moderation/mailEveryone')) {
            if (!zmcdRateLimit(req, res)) return true;
            (async () => {
                try {
                    let body = '';
                    req.on('data', chunk => {
                        body += chunk.toString();
                        if (body.length > MAX_REQUEST_BODY) {
                            res.writeHead(413, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: 'Request body too large' }));
                            req.connection.destroy();
                        }
                    });
                    req.on('end', async () => {
                        const data = JSON.parse(body);
                        const message = data.message;
                        const password = data.password;

                        if (!message || !password) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: 'Missing message or password' }));
                            return;
                        }
                        if (password !== EXPECTED_PASS) {
                            res.writeHead(401, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: false, error: 'Unauthorized' }));
                            return;
                        }

                        logger.info(`Mailing everyone: ${message}`);
                        const userDirs = fs.readdirSync(userAccountsDir, { withFileTypes: true }).filter(dirent => dirent.isDirectory()).map(dirent => dirent.name);
                        for (const userDir of userDirs) {
                            const inboxPath = path.join(userAccountsDir, userDir, 'root/systemfiles/userprofile/startupNotifications/');
                            if (!fs.existsSync(inboxPath)) {
                                fs.mkdirSync(inboxPath, { recursive: true });
                            }
                            fs.writeFileSync(path.join(inboxPath, `notification-${Date.now()}.txt`), message);
                        }
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true }));
                    });
                } catch (e) {
                    logger.error('moderation/mailEveryone handler error: ' + e.message);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: false, error: 'Server error' }));
                }
            })();
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
            const targetHost = process.env.RAMMERHEAD_PROXY_TARGET_HOST || config.bindingAddress || '';
            const targetPort = process.env.RAMMERHEAD_PROXY_TARGET_PORT || config.port || 80;
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
}
module.exports = proxyServer;
