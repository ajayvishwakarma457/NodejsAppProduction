const NodeCache = require('node-cache');

// Standard TTL is 5 minutes (300 seconds), check period is 60 seconds
const localCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

module.exports = localCache;
