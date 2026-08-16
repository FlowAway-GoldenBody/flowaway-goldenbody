// Helper utilities for request header handling used by rate-limiters
function getRequestIP(req) {
    const ipHeader = req && req.headers && (req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for']);
    if (ipHeader) return String(ipHeader).split(',')[0].trim();
    return (req && req.socket && req.socket.remoteAddress) || (req && req.connection && req.connection && req.connection.remoteAddress) || 'unknown';
}
const browserSessionAttempts = new Map();
function getBrowserSessionRateLimit(req, res) {
    const ip = getRequestIP(req);
    const now = Date.now();

    const window = 1 * 60 * 1000; // 1 minute
    const max = 30;

    let data = browserSessionAttempts.get(ip);

    if (!data || now - data.time > window) {
        data = {
            time: now,
            count: 0
        };
    }

    data.count++;
    browserSessionAttempts.set(ip, data);

    if (data.count > max) {
        res.writeHead(429);
        res.end(JSON.stringify({ error: "This action had been rate limited. Try again later."}));
        return false;
    }

    return true;
}
const downloadAttempts = new Map();
function downloadRateLimit(req, res) {
    const ip = getRequestIP(req);
    const now = Date.now();

    const window = 1 * 60 * 1000; // 1 minute
    const max = 30;

    let data = downloadAttempts.get(ip);

    if (!data || now - data.time > window) {
        data = {
            time: now,
            count: 0
        };
    }

    data.count++;
    downloadAttempts.set(ip, data);

    if (data.count > max) {
        res.writeHead(429);
        res.end(JSON.stringify({ error: "This action had been rate limited. Try again later."}));
        return false;
    }

    return true;
}
const zmcdAttempts = new Map();
function zmcdRateLimit(req, res) {
    const ip = getRequestIP(req);
    const now = Date.now();

    const window = 60 * 1000; // 1 minute
    const max = 60;

    let data = zmcdAttempts.get(ip);

    if (!data || now - data.time > window) {
        data = {
            time: now,
            count: 0
        };
    }

    data.count++;
    zmcdAttempts.set(ip, data);

    if (data.count > max) {
        res.writeHead(429);
        res.end(JSON.stringify({ error: "This action had been rate limited. Try again later." }));
        return false;
    }

    return true;
}

const systemRecoveryAttempts = new Map();
function systemRecoveryRateLimit(req, res) {
    const ip = getRequestIP(req);
    const now = Date.now();

    const window = 60 * 1000 * 1; // 1 minute
    const max = 100;

    let data = systemRecoveryAttempts.get(ip);

    if (!data || now - data.time > window) {
        data = {
            time: now,
            count: 0
        };
    }

    data.count++;
    systemRecoveryAttempts.set(ip, data);

    if (data.count > max) {
        res.writeHead(429);
        res.end(JSON.stringify({ error: "This action had been rate limited. Try again later." }));
        return false;
    }

    return true;
}

const newSessionAttempts = new Map();
function newSessionRateLimit(req, res) {
    const ip = getRequestIP(req);
    const now = Date.now();

    const window = 1 * 60 * 1000; // 1 minute
    const max = 30;

    let data = newSessionAttempts.get(ip);

    if (!data || now - data.time > window) {
        data = {
            time: now,
            count: 0
        };
    }

    data.count++;
    newSessionAttempts.set(ip, data);

    if (data.count > max) {
        res.writeHead(429);
        res.end(JSON.stringify({ error: "This action had been rate limited. Try again later."}));
        return false;
    }

    return true;
}

const fetchFilesAttempts = new Map();
function fetchFilesRateLimit(req, res) {
    const ip = getRequestIP(req);
    const now = Date.now();

    const window = 10 * 1000; // 10 seconds
    const max = 5000;

    let data = fetchFilesAttempts.get(ip);

    if (!data || now - data.time > window) {
        data = {
            time: now,
            count: 0
        };
    }

    data.count++;
    fetchFilesAttempts.set(ip, data);

    if (data.count > max) {
        res.writeHead(429);
        res.end(JSON.stringify({ error: "This action had been rate limited. Try again later."}));
        return false;
    }

    return true;
}

setInterval(() => {
    cleanup(zmcdAttempts, 5 * 60 * 1000);
    cleanup(systemRecoveryAttempts, 5 * 60 * 1000);
    cleanup(newSessionAttempts, 2 * 60 * 1000);
    cleanup(fetchFilesAttempts, 90 * 1000);
    cleanup(browserSessionAttempts, 5 * 60 * 1000);
    cleanup(downloadAttempts, 5 * 60 * 1000);
}, 60 * 1000);

function cleanup(map, maxAge) {
    const now = Date.now();

    for (const [ip, data] of map) {
        if (now - data.time > maxAge) {
            map.delete(ip);
        }
    }
}

module.exports = {
    zmcdRateLimit,
    fetchFilesRateLimit,
    newSessionRateLimit,
    systemRecoveryRateLimit,
    downloadRateLimit,
    getBrowserSessionRateLimit,
    getRequestIP
};