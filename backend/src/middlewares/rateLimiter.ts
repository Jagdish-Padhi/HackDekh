import rateLimit from 'express-rate-limit';

/**
 * Strict Rate Limiter for Authentication & Account Registration Routes
 * Prevents credential brute-forcing, password guessing, and automated account creation.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 requests per 15-minute window
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.',
  },
});

/**
 * Rate Limiter for Search & Database Intensive Query Routes
 * Prevents database CPU/Memory resource exhaustion from rapid query spam.
 */
export const searchRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 search queries per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many search requests. Please slow down.',
  },
});

/**
 * General API Rate Limiter for Global Middleware
 * Protects all general endpoints from DoS spikes.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    statusCode: 429,
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
  },
});
