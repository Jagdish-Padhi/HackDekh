import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.ts';

describe('Rate Limiter & Security Integration Tests', () => {
  it('should block unauthorized access to scraper refresh endpoint', async () => {
    const res = await request(app)
      .post('/api/v1/scrape/refresh')
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Unauthorized');
  });

  it('should enforce emailRateLimiter on resend-verification endpoint', async () => {
    // emailRateLimiter allows 3 requests per 15 minutes
    const makeRequest = () =>
      request(app)
        .post('/api/v1/users/resend-verification')
        .send({ email: 'ratelimit-test@hackdekh.com' });

    // 1st request
    await makeRequest();
    // 2nd request
    await makeRequest();
    // 3rd request
    await makeRequest();

    // 4th request must be blocked with HTTP 429
    const blockedRes = await makeRequest();
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.statusCode).toBe(429);
    expect(blockedRes.body.success).toBe(false);
  });
});
