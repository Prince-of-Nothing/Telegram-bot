const { Redis } = require("@upstash/redis");

// Upstash Redis (REST-only, works on Vercel serverless)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

redis.on("error", (err) => console.error("Redis error:", err));

const getRedis = () => redis;

module.exports = { redis, getRedis };
