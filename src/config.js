const path = require('path');
const fs = require('fs');
const os = require('os');
const RammerheadJSMemCache = require('./classes/RammerheadJSMemCache.js');
const RammerheadJSFileCache = require('./classes/RammerheadJSFileCache.js');

const enableWorkers = os.cpus().length !== 1;

module.exports = {
    //// HOSTING CONFIGURATION ////

    bindingAddress: '0.0.0.0',
    port: 8080,
    crossDomainPort: 8081,
    publicDir: path.join(__dirname, '../public'), // set to null to disable

    // enable or disable multithreading
    enableWorkers,
    workers: os.cpus().length,

    // ssl object is either null or { key: fs.readFileSync('path/to/key'), cert: fs.readFileSync('path/to/cert') }
    // for more info, see https://nodejs.org/api/https.html#https_https_createserver_options_requestlistener
    ssl: null,

    // this function's return object will determine how the client url rewriting will work.
    // set them differently from bindingAddress and port if rammerhead is being served
    // from a reverse proxy.
    // By default this function will prefer environment variables, then the request host
    getServerInfo: (req) => {
        // Prefer explicit environment overrides first
        const envProto = process.env.SERVER_PROTOCOL;
        const envHost = process.env.SERVER_HOSTNAME || process.env.HOSTNAME;
        const envPort = process.env.SERVER_PORT ? Number(process.env.SERVER_PORT) : null;

        // If request present, try to derive hostname and protocol from headers (useful behind TLS terminators)
        let hostnameFromReq = null;
        let portFromReq = null;
        let protocolFromReq = null;
        if (req && req.headers) {
            const hostHdr = req.headers.host;
            if (hostHdr) {
                try {
                    // parse host (may include port)
                    const parsed = new URL('https://' + hostHdr);
                    hostnameFromReq = parsed.hostname;
                    portFromReq = parsed.port ? Number(parsed.port) : null;
                } catch (e) {
                    hostnameFromReq = hostHdr.split(':')[0];
                }
            }

            // prefer x-forwarded-proto / forwarded headers when available
            const hdr = req.headers || {};
            const protoHeader = (hdr['x-forwarded-proto'] || hdr['x-forwarded-protocol'] || hdr['x-forwarded-scheme'] || hdr.forwarded || '').toString();
            if (protoHeader) {
                const m = protoHeader.match(/https?|:(https?|http)/i);
                if (m) protocolFromReq = (m[0].replace(/^:/, '') + ':');
                else protocolFromReq = (protoHeader.split(',')[0] || '').trim() + ':';
            } else if (req.socket && req.socket.encrypted) {
                protocolFromReq = 'https:';
            }
        }

        const finalProtocol = envProto || protocolFromReq || 'https:';
        const finalPort = envPort || portFromReq || (finalProtocol === 'https:' ? 443 : 80);

        return {
            hostname: envHost || hostnameFromReq || '0.0.0.0',
            port: finalPort,
            crossDomainPort: process.env.CROSS_DOMAIN_PORT ? Number(process.env.CROSS_DOMAIN_PORT) : (finalProtocol === 'https:' ? 443 : 80),
            protocol: finalProtocol
        };
    },
    // example of non-hard-coding the hostname header
    // getServerInfo: (req) => {
    //     return { hostname: new URL('https://' + req.headers.host).hostname, port: 80, crossDomainPort: 8081, protocol: 'https:' };
    // },

    // enforce a password for creating new sessions. set to null to disable
    password: '183115428',

    // disable or enable localStorage sync (turn off if clients send over huge localStorage data, resulting in huge memory usages)
    disableLocalStorageSync: false,

    // restrict sessions to be only used per IP
    restrictSessionToIP: false,

    // caching options for js rewrites. (disk caching not recommended for slow HDD disks)
    // recommended: 50mb for memory, 5gb for disk
    // jsCache: new RammerheadJSMemCache(5 * 1024 * 1024),
    // jsCache: new RammerheadJSFileCache(path.join(__dirname, '../cache-js'), 5 * 1024 * 1024 * 1024, 50000, enableWorkers),

    // whether to disable http2 support or not (from proxy to destination site).
    // disabling may reduce number of errors/memory, but also risk
    // removing support for picky sites like web.whatsapp.com that want
    // the client to connect to http2 before connecting to their websocket
    disableHttp2: false,

    //// REWRITE HEADER CONFIGURATION ////

    // removes reverse proxy headers
    // cloudflare example:
    // stripClientHeaders: ['cf-ipcountry', 'cf-ray', 'x-forwarded-proto', 'cf-visitor', 'cf-connecting-ip', 'cdn-loop', 'x-forwarded-for'],
    stripClientHeaders: [],
    // if you want to modify response headers, like removing the x-frame-options header, do it like so:
    // rewriteServerHeaders: {
    //     // you can also specify a function to modify/add the header using the original value (undefined if adding the header)
    //     // 'x-frame-options': (originalHeaderValue) => '',
    //     'x-frame-options': null, // set to null to tell rammerhead that you want to delete it
    // },
    rewriteServerHeaders: {
    'x-frame-options': null, // remove
    'content-security-policy': null // remove CSP
},



    //// SESSION STORE CONFIG ////

    // see src/classes/RammerheadSessionFileCache.js for more details and options
// fileCacheSessionConfig: {
//   saveDirectory: path.join(__dirname, '../permanent_sessions'),
//   cacheTimeout: Infinity,
//   cacheCheckInterval: Infinity,
//   deleteUnused: false,
//   staleCleanupOptions: {
//     staleTimeout: Infinity,
//     staleCheckInterval: Infinity
//   },
//   deleteCorruptedSessions: false
// },
fileCacheSessionConfig: {
  // Store sessions in a stable directory (not temp)
  saveDirectory: path.join(__dirname, '../sessions'),

  // Prevent all automatic deletions
  deleteUnused: false,                  // Never delete inactive sessions
  deleteCorruptedSessions: false,       // Keep even if malformed (manual cleanup only)
  
  // Disable all timing-based cleanup
  cacheTimeout: 0,                      // 0 = no expiry timer
  cacheCheckInterval: 0,                // 0 = no cleanup interval

  // Disable stale cleanup logic entirely
  staleCleanupOptions: null             // No background stale file deletion
},


    //// LOGGING CONFIGURATION ////

    // valid values: 'disabled', 'debug', 'traffic', 'info', 'warn', 'error'
    logLevel: process.env.DEVELOPMENT ? 'debug' : 'info',
    generatePrefix: (level) => `[${new Date().toISOString()}] [${level.toUpperCase()}] `,

    // logger depends on this value
    getIP: (req) => req.socket.remoteAddress
    // use the example below if rammerhead is sitting behind a reverse proxy like nginx
    // getIP: req => (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').split(',')[0].trim()
};

if (fs.existsSync(path.join(__dirname, '../config.js'))) Object.assign(module.exports, require('../config'));
