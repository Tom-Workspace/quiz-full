const { getRedisClient } = require('../config/redis');

class CacheService {
  constructor() {
    this.client = null;
    this.defaultTTL = 3600; // 1 hour in seconds
  }

  async init() {
    this.client = getRedisClient();
  }

  async get(key) {
    if (!this.client) return null;
    
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    if (!this.client) return false;
    
    try {
      await this.client.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  async del(key) {
    if (!this.client) return false;
    
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  async delPattern(pattern) {
    if (!this.client) return false;
    
    try {
      const keys = await this.client.keys(pattern);
      if (keys.length > 0) {
        await this.client.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return false;
    }
  }

  // Cache keys generators
  keys = {
    user: (userId) => `user:${userId}`,
    quiz: (quizId) => `quiz:${quizId}`,
    activeQuizzes: () => 'quizzes:active',
    userQuizzes: (userId) => `user:${userId}:quizzes`,
    quizAttempts: (quizId, userId) => `quiz:${quizId}:user:${userId}:attempts`,
    onlineUsers: () => 'users:online'
  };
}

const cacheService = new CacheService();

module.exports = cacheService;

