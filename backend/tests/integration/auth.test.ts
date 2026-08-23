import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../src/app.ts';
import User from '../../src/models/user.model.ts';

beforeEach(async () => {
  await User.deleteMany({});
});

describe('User Authentication Integration API Tests', () => {
  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/v1/users/register')
      .send({
        username: 'testrunner',
        fullName: 'Test Runner',
        email: 'runner@hackdekh.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe('testrunner');
  });

  it('should reject duplicate user registration', async () => {
    await request(app)
      .post('/api/v1/users/register')
      .send({
        username: 'testrunner',
        fullName: 'First Registration',
        email: 'runner@hackdekh.com',
        password: 'Password123!',
      });

    const res = await request(app)
      .post('/api/v1/users/register')
      .send({
        username: 'testrunner',
        fullName: 'Test Runner Duplicate',
        email: 'runner@hackdekh.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('should authenticate user and return access token', async () => {
    await request(app)
      .post('/api/v1/users/register')
      .send({
        username: 'loginuser',
        fullName: 'Login User',
        email: 'login@hackdekh.com',
        password: 'Password123!',
      });

    const res = await request(app)
      .post('/api/v1/users/login')
      .send({
        email: 'login@hackdekh.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });
});
