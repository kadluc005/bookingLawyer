import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TokenService } from '@nestjs/authentication';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { AppModule } from './../src/app.module.js';
import { LawyersService } from '../src/services/lawyers.service.js';
import { UsersService } from '../src/services/users.service.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('requires authentication for the lawyer directory', () => {
    return request(app.getHttpServer()).get('/lawyers').expect(401);
  });

  it.each([
    ['client', 200],
    ['lawyer', 200],
    ['admin', 403],
  ] as const)('applies the directory permissions for a %s account', async (role, status) => {
    const userId = '00000000-0000-4000-8000-000000000010';
    vi.spyOn(app.get(UsersService), 'findById').mockResolvedValue({
      id: userId,
      email: 'directory@example.test',
      role,
      status: 'active',
      emailVerifiedAt: null,
    });
    vi.spyOn(app.get(LawyersService), 'findVisibleDirectory').mockResolvedValue([]);
    const { accessToken } = await app.get(TokenService).issue(userId, {
      method: 'password',
    });
    const authorization = `Bearer ${accessToken}`;
    await request(app.getHttpServer())
      .get('/lawyers')
      .set('Authorization', authorization)
      .expect(status);

    if (role === 'lawyer') {
      await request(app.getHttpServer())
        .post('/lawyers/00000000-0000-4000-8000-000000000011/contact')
        .set('Authorization', authorization)
        .send({ channel: 'email' })
        .expect(403);
    }
  });

  it('requires authentication for the admin lawyer list and details', async () => {
    await request(app.getHttpServer()).get('/admin/lawyers').expect(401);
    await request(app.getHttpServer())
      .get('/admin/lawyers/00000000-0000-4000-8000-000000000001')
      .expect(401);
  });

  it('requires authentication for a client profile', () => {
    return request(app.getHttpServer()).get('/clients/me').expect(401);
  });

  it('validates public sign-in input before querying credentials', () => {
    return request(app.getHttpServer())
      .post('/auth/token')
      .send({ email: 'not-an-email', password: '' })
      .expect(400);
  });

  afterEach(async () => {
    await app.close();
  });
});
