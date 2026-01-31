const RammerheadProxy = require('./classes/RammerheadProxy');
const RammerheadLogging = require('./classes/RammerheadLogging');
const RammerheadSession = require('./classes/RammerheadSession');
const RammerheadSessionAbstractStore = require('./classes/RammerheadSessionAbstractStore');
const RammerheadSessionFileCache = require('./classes/RammerheadSessionFileCache');
const generateId = require('./util/generateId');
const addStaticFilesToProxy = require('./util/addStaticDirToProxy');
const RammerheadSessionMemoryStore = require('./classes/RammerheadMemoryStore');
const StrShuffler = require('./util/StrShuffler');
const URLPath = require('./util/URLPath');
const RammerheadJSAbstractCache = require('./classes/RammerheadJSAbstractCache.js');
const RammerheadJSFileCache = require('./classes/RammerheadJSFileCache.js');
const RammerheadJSMemCache = require('./classes/RammerheadJSMemCache.js');
console.log("Before require");
const zmcd = require('./server/zmcd.js');
<<<<<<< HEAD
const verification = require('./server/verification.js');
=======
>>>>>>> 55215956420d290fa708c947255db92dc23a9933
console.log("After require");
module.exports = {
    RammerheadProxy,
    RammerheadLogging,
    RammerheadSession,
    RammerheadSessionAbstractStore,
    RammerheadSessionMemoryStore,
    RammerheadSessionFileCache,
    RammerheadJSAbstractCache,
    RammerheadJSFileCache,
    RammerheadJSMemCache,
    StrShuffler,
    generateId,
    addStaticFilesToProxy,
    URLPath,
<<<<<<< HEAD
    zmcd,
    verification
=======
    zmcd
>>>>>>> 55215956420d290fa708c947255db92dc23a9933
};
