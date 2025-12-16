import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379'
});

export const connectRedis = async () => {
  try {
    await redisClient.connect();
    console.log('✅ Redis connected successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn('⚠️ Redis connection failed, continuing without cache:', errorMessage);
  }
};

export { redisClient };