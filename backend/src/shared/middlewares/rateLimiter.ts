import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient from '../../infrastructure/cache/redis.ts';

// Fallback to in-memory store when Redis is not connected (e.g. in ci or unit tests)
const createRedisStore = (prefix: string) => {
  if (process.env.NODE_ENV === 'test' || !redisClient.isOpen) {
    return undefined;
  }

  return new RedisStore({
    prefix:k `ratelimit:${prefix}:`,
    // @ts-ignore
    sendCommand: (...args: any[]) => redisClient.sendCommand(args),
  });
};

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('auth'),
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
});

export const searchRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('search'),
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many search requests. Please slow down.',
  },
});

export const emailRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('email'),
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many verification email requests. Please wait 15 minutes before requesting again.',
  },
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('pwdreset'),
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many password reset requests. Please wait 15 minutes before trying again.',
  },
});

export const joinCodeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('joincode'),
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many team join attempts. Please check the code and try again in 15 minutes.',
  },
});

export const scraperRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('scraper'),
  message: {
    statusCode: 429,
    success: false,
    message: 'Scraper rate limit reached. Manual scraping operations cannot be triggered continuously.',
  },
});

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  store: createRedisStore('api'),
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});
