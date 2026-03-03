import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { createTestApp } from '../helpers/app.factory';
import { cleanDb, getTestPrisma } from '../helpers/db.helper';
import { loginUser, registerUser, TEST_USER } from '../helpers/auth.helper';
import { PrismaClient } from '@prisma/client';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = getTestPrisma();
  });

  beforeEach(async () => {
    await cleanDb(prisma);
  });

  afterAll(async () => {
    await cleanDb(prisma);
    await app.close();
    await prisma.$disconnect();
  });

  // ── Register ────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/register', () => {
    it('creates account and returns generic success message', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(TEST_USER)
        .expect(201);

      expect(res.body.message).toContain('account has been created');
    });

    it('rejects password shorter than 12 chars', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'test@test.com', password: 'Short1!' })
        .expect(400);

      expect(res.body.code).toBe('BAD_REQUEST');
    });

    it('rejects missing special character', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'test@test.com', password: 'NoSpecialChar123' })
        .expect(400);
    });

    it('returns same 201 message on duplicate email — no enumeration', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/register').send(TEST_USER);

      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(TEST_USER)
        .expect(201); // NOT 409

      expect(res.body.message).toContain('account has been created');
    });

    it('rejects a top common password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'test@test.com', password: 'password' })
        .expect(400);
    });

    it('rejects invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'not-an-email', password: TEST_USER.password })
        .expect(400);
    });
  });

  // ── Login ───────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await registerUser(app);
    });

    it('returns accessToken and sets HttpOnly refresh cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(TEST_USER)
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(typeof res.body.accessToken).toBe('string');
      expect(res.body.user.email).toBe(TEST_USER.email);
      expect(res.body.user.passwordHash).toBeUndefined(); // never exposed

      const cookie: string = (res.headers['set-cookie'] as string[])[0] ?? '';
      expect(cookie).toContain('refresh_token=');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('SameSite=Strict');
      expect(cookie).toContain('Path=/api/v1/auth');
    });

    it('returns 401 for wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ ...TEST_USER, password: 'WrongPassword1!' })
        .expect(401);

      expect(res.body.code).toBe('UNAUTHORIZED');
    });

    it('returns same 401 message for nonexistent email as wrong password — no enumeration', async () => {
      const wrongPass = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ ...TEST_USER, password: 'WrongPass1!Long' });

      const wrongEmail = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@nowhere.invalid', password: TEST_USER.password });

      expect(wrongPass.status).toBe(401);
      expect(wrongEmail.status).toBe(401);
      expect(wrongPass.body.message).toBe(wrongEmail.body.message);
    });
  });

  // ── Refresh ─────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/refresh', () => {
    it('issues new accessToken and rotates refresh cookie', async () => {
      await registerUser(app);
      const { accessToken: oldToken, cookies: oldCookies } = await loginUser(app);

      const refreshRes = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', oldCookies)
        .expect(200);

      expect(refreshRes.body.accessToken).toBeDefined();
      expect(refreshRes.body.accessToken).not.toBe(oldToken);

      const newCookie: string = (refreshRes.headers['set-cookie'] as string[])[0] ?? '';
      const oldCookie = oldCookies[0] ?? '';
      expect(newCookie).not.toBe(oldCookie); // cookie rotated
    });

    it('rejects replayed refresh token after rotation — prevents replay attack', async () => {
      await registerUser(app);
      const { cookies: originalCookies } = await loginUser(app);

      // First rotation succeeds
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', originalCookies)
        .expect(200);

      // Replaying the original cookie must fail
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', originalCookies)
        .expect(401);
    });

    it('returns 401 with no cookie', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .expect(401);
    });
  });

  // ── Logout ──────────────────────────────────────────────────────────────────

  describe('POST /api/v1/auth/logout', () => {
    it('revokes session — subsequent refresh returns 401', async () => {
      await registerUser(app);
      const { accessToken, cookies } = await loginUser(app);

      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);

      // Old refresh cookie now invalid
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .set('Cookie', cookies)
        .expect(401);
    });
  });

  // ── Protected routes ─────────────────────────────────────────────────────────

  describe('GET /api/v1/users/me', () => {
    it('returns user profile with valid access token', async () => {
      await registerUser(app);
      const { accessToken } = await loginUser(app);

      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.email).toBe(TEST_USER.email);
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('returns 401 without token', async () => {
      await request(app.getHttpServer()).get('/api/v1/users/me').expect(401);
    });

    it('returns standardized error body — no stack trace', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/users/me')
        .expect(401);

      expect(res.body).toHaveProperty('code');
      expect(res.body).toHaveProperty('message');
      expect(res.body).not.toHaveProperty('stack');
    });
  });

  // ── Teams CRUD ──────────────────────────────────────────────────────────────

  describe('Teams CRUD', () => {
    let accessToken: string;

    beforeEach(async () => {
      await registerUser(app);
      const result = await loginUser(app);
      accessToken = result.accessToken;
    });

    it('creates and retrieves a team', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'My Rain Team', format: 'OU', data: [] })
        .expect(201);

      const teamId: string = createRes.body.id as string;

      const getRes = await request(app.getHttpServer())
        .get(`/api/v1/teams/${teamId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(getRes.body.name).toBe('My Rain Team');
    });

    it('cannot access another user team', async () => {
      const team = await request(app.getHttpServer())
        .post('/api/v1/teams')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: 'Secret Team', data: [] })
        .then((r) => r.body as { id: string });

      // Register second user
      await registerUser(app, {
        email: 'other@trainer.com',
        password: 'OtherTrainer1!Pwd',
      });
      const { accessToken: otherToken } = await loginUser(app, {
        email: 'other@trainer.com',
        password: 'OtherTrainer1!Pwd',
      });

      await request(app.getHttpServer())
        .get(`/api/v1/teams/${team.id}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(404);
    });
  });
});
