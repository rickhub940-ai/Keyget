const { Redis } = require("@upstash/redis");

module.exports = Redis.fromEnv();
