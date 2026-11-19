import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

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
