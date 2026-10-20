import rateLimit, { Options } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient from '../../infrastructure/cache/redis.ts';

const createRateLimiter = (prefix: string, opts: Partial<Options>) => {
  const config: Partial<Options> = { ...opts };
  if (process.env.NODE_ENV !== 'test' && redisClient.isOpen) {
    config.store = new RedisStore({
      prefix: `ratelimit:${prefix}:`,
      // @ts-ignore
      sendCommand: (...args: any[]) => redisClient.sendCommand(args),
    });
  }
  return rateLimit(config);
};

export const authRateLimiter = createRateLimiter('auth', {
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.',
  },
});

export const searchRateLimiter = createRateLimiter('search', {
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many search requests. Please slow down.',
  },
});

export const emailRateLimiter = createRateLimiter('email', {
  windowMs: 15 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many verification email requests. Please wait 15 minutes before requesting again.',
  },
});

export const passwordResetRateLimiter = createRateLimiter('pwdreset', {
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many password reset requests. Please wait 15 minutes before trying again.',
  },
});

export const joinCodeRateLimiter = createRateLimiter('joincode', {
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many team join attempts. Please check the code and try again in 15 minutes.',
  },
});

export const scraperRateLimiter = createRateLimiter('scraper', {
  windowMs: 15 * 60 * 1000,
  max: 2,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    success: false,
    message: 'Scraper rate limit reached. Manual scraping operations cannot be triggered continuously.',
  },
});

export const apiRateLimiter = createRateLimiter('api', {
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many requests. Please try again later.',
  },
});
