import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';

export const TEST_USER = {
  email: 'prof.basil@paldeacollege.edu',
  password: 'ProfBasil1!SecurePwd',
};

export async function registerUser(
  app: INestApplication,
  credentials = TEST_USER,
): Promise<void> {
  await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send(credentials);
}

export interface LoginResult {
  accessToken: string;
  cookies: string[];
}

export async function loginUser(
  app: INestApplication,
  credentials = TEST_USER,
): Promise<LoginResult> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send(credentials)
    .expect(200);

  return {
    accessToken: res.body.accessToken as string,
    cookies: res.headers['set-cookie'] as string[],
  };
}
