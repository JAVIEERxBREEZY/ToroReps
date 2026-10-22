import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import type { App } from 'supertest/types.js';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js';

describe('Salud y autenticación (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      // Estos endpoints deben funcionar sin una conexión a PostgreSQL.
      .overrideProvider(PrismaService)
      .useValue({})
      .overrideProvider(ConfigService)
      .useValue(
        new ConfigService({
          EMAIL_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
          EMAIL_LOOKUP_KEY: Buffer.alloc(32, 2).toString('base64'),
          NODE_ENV: 'test',
        }),
      )
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('permite comprobar liveness sin iniciar sesión', () => {
    return request(app.getHttpServer())
      .get('/health/live')
      .expect(200)
      .expect('Cache-Control', 'no-store')
      .expect({ status: 'ok' });
  });

  it('rechaza el acceso a /auth/me sin cookie de sesión', () => {
    return request(app.getHttpServer()).get('/auth/me').expect(401);
  });

  it('rechaza una cookie de sesión con formato inválido', () => {
    return request(app.getHttpServer())
      .get('/auth/me')
      .set('Cookie', 'tororeps_session=invalid')
      .expect(401);
  });

  afterEach(async () => {
    await app?.close();
  });
});
