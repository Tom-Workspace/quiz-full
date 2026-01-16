const redis = require('redis');

let redisClient;

const connectRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis Client Connected');
    });

    await redisClient.connect();
  } catch (error) {
    console.error('Redis connection error:', error.message);
    // Don't exit process, continue without Redis
    console.log('Continuing without Redis cache...');
  }
};

const getRedisClient = () => {
  return redisClient;
};

module.exports = {
  connectRedis,
  getRedisClient
};

