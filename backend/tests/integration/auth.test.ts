import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createHash } from 'crypto';
import { app } from '../../src/app.ts';
import { User, PendingUser } from '../../src/modules/identity/index.ts';

beforeEach(async () => {
  await User.deleteMany({});
  await PendingUser.deleteMany({});
});

describe('User Authentication Integration API Tests', () => {
  it('should register a new pending user successfully without creating active account directly', async () => {
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

    // Confirm active User was NOT created yet
    const activeUser = await User.findOne({ email: 'runner@hackdekh.com' });
    expect(activeUser).toBeNull();

    // Confirm PendingUser was created
    const pending = await PendingUser.findOne({ email: 'runner@hackdekh.com' });
    expect(pending).not.toBeNull();
  });

  it('should reject duplicate user registration if account already exists', async () => {
    await User.create({
      username: 'testrunner',
      fullName: 'Existing User',
      email: 'runner@hackdekh.com',
      password: 'Password123!',
      isEmailVerified: true,
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

  it('should reject duplicate username reserved by another pending user', async () => {
    await request(app)
      .post('/api/v1/users/register')
      .send({
        username: 'uniquename',
        fullName: 'First Person',
        email: 'first@hackdekh.com',
        password: 'Password123!',
      });

    const res = await request(app)
      .post('/api/v1/users/register')
      .send({
        username: 'uniquename',
        fullName: 'Second Person',
        email: 'second@hackdekh.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(409);
  });

  it('should verify email token, create the account, and allow authentication', async () => {
    await request(app)
      .post('/api/v1/users/register')
      .send({
        username: 'loginuser',
        fullName: 'Login User',
        email: 'login@hackdekh.com',
        password: 'Password123!',
      });

    const pending = await PendingUser.findOne({ email: 'login@hackdekh.com' });
    expect(pending).not.toBeNull();

    const rawToken = 'test-token-1234567890abcdef123456';
    pending!.verificationToken = createHash('sha256').update(rawToken).digest('hex');
    await pending!.save();

    const verifyRes = await request(app)
      .post('/api/v1/users/verify-email')
      .send({ token: rawToken });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.user.email).toBe('login@hackdekh.com');

    // Confirm pending record was cleared
    const pendingAfter = await PendingUser.findOne({ email: 'login@hackdekh.com' });
    expect(pendingAfter).toBeNull();

    // Confirm active user now exists in DB
    const activeUser = await User.findOne({ email: 'login@hackdekh.com' });
    expect(activeUser).not.toBeNull();
    expect(activeUser!.isEmailVerified).toBe(true);

    // Test login
    const loginRes = await request(app)
      .post('/api/v1/users/login')
      .send({
        email: 'login@hackdekh.com',
        password: 'Password123!',
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
    expect(loginRes.body.data.accessToken).toBeDefined();
  });

  it('should prevent login when account is still pending verification', async () => {
    await request(app)
      .post('/api/v1/users/register')
      .send({
        username: 'unverified',
        fullName: 'Unverified User',
        email: 'unverified@hackdekh.com',
        password: 'Password123!',
      });

    const res = await request(app)
      .post('/api/v1/users/login')
      .send({
        email: 'unverified@hackdekh.com',
        password: 'Password123!',
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should handle forgot password flow: generate token, verify reset, and allow login with new password', async () => {
    // 1. Create verified user
    await User.create({
      username: 'resetme',
      fullName: 'Reset Me',
      email: 'resetme@hackdekh.com',
      password: 'OldPassword123!',
      isEmailVerified: true,
    });

    // 2. Request forgot password
    const forgotRes = await request(app)
      .post('/api/v1/users/forgot-password')
      .send({ email: 'resetme@hackdekh.com' });

    expect(forgotRes.status).toBe(200);
    expect(forgotRes.body.success).toBe(true);

    const userWithToken = await User.findOne({ email: 'resetme@hackdekh.com' });
    expect(userWithToken!.passwordResetToken).toBeDefined();
    expect(userWithToken!.passwordResetExpiry).toBeDefined();

    // 3. Reset password with token
    const rawToken = 'sample-reset-token-1234567890';
    userWithToken!.passwordResetToken = createHash('sha256').update(rawToken).digest('hex');
    userWithToken!.passwordResetExpiry = new Date(Date.now() + 3600000);
    await userWithToken!.save();

    const resetRes = await request(app)
      .post('/api/v1/users/reset-password')
      .send({
        token: rawToken,
        newPassword: 'NewPassword123!',
      });

    expect(resetRes.status).toBe(200);
    expect(resetRes.body.success).toBe(true);

    // 4. Old password should fail
    const oldLogin = await request(app)
      .post('/api/v1/users/login')
      .send({
        email: 'resetme@hackdekh.com',
        password: 'OldPassword123!',
      });
    expect(oldLogin.status).toBe(401);

    // 5. New password should succeed
    const newLogin = await request(app)
      .post('/api/v1/users/login')
      .send({
        email: 'resetme@hackdekh.com',
        password: 'NewPassword123!',
      });
    expect(newLogin.status).toBe(200);
    expect(newLogin.body.data.accessToken).toBeDefined();
  });
});
