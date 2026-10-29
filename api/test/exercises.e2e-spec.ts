import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/infrastructure/prisma/prisma.service.js';
import { AuthSessionService } from '../src/modules/auth/services/auth-session.service.js';

const databaseUrl = process.env.CATALOG_TEST_DATABASE_URL;

describe.skipIf(!databaseUrl)('Catálogo con PostgreSQL aislado (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let userCookie: string;
  let adminCookie: string;
  let groupId: string;
  let secondGroupId: string;

  const exerciseInput = (overrides: Record<string, unknown> = {}) => ({
    name: 'Press de prueba',
    equipmentType: 'BARBELL',
    measurementMode: 'REPS',
    loadMode: 'EXTERNAL_TOTAL',
    ...overrides,
  });
  const mediaInput = (overrides: Record<string, unknown> = {}) => ({
    type: 'IMAGE',
    cloudinaryCloudName: 'demo',
    cloudinaryPublicId: 'exercises/press',
    cloudinaryFormat: 'jpg',
    position: 0,
    ...overrides,
  });
  const seedExercise = (
    name: string,
    overrides: Record<string, unknown> = {},
  ) =>
    prisma.exercise.create({
      data: {
        name,
        equipmentType: 'BARBELL',
        measurementMode: 'REPS',
        loadMode: 'EXTERNAL_TOTAL',
        ...overrides,
      },
    });

  beforeAll(async () => {
    const target = new URL(databaseUrl!);
    // Nunca limpiar ni escribir sobre la base de desarrollo o una conexión remota.
    if (
      !['127.0.0.1', 'localhost'].includes(target.hostname) ||
      !/^\/tororeps_catalog_test_[a-z0-9_]+$/.test(target.pathname)
    ) {
      throw new Error(
        'CATALOG_TEST_DATABASE_URL debe apuntar a una base local aislada tororeps_catalog_test_*.',
      );
    }

    const config = new ConfigService({
      DATABASE_URL: databaseUrl,
      EMAIL_ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
      EMAIL_LOOKUP_KEY: Buffer.alloc(32, 2).toString('base64'),
      NODE_ENV: 'test',
    });
    prisma = new PrismaService(config);
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .overrideProvider(ConfigService)
      .useValue(config)
      .compile();

    app = moduleFixture.createNestApplication();
    app.enableCsrfProtection();
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        forbidUnknownValues: true,
        validationError: { target: false, value: false },
      }),
    );
    await app.init();
  });

  beforeEach(async () => {
    await prisma.exerciseMedia.deleteMany();
    await prisma.exerciseMuscle.deleteMany();
    await prisma.exercise.deleteMany();
    await prisma.muscleGroup.deleteMany();
    await prisma.authSession.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: {
        emailEncrypted: 'test-only',
        emailLookupHash: '1'.repeat(64),
        passwordHash: 'test-only',
        displayName: 'Usuario de prueba',
      },
    });
    const admin = await prisma.user.create({
      data: {
        emailEncrypted: 'test-only',
        emailLookupHash: '2'.repeat(64),
        passwordHash: 'test-only',
        displayName: 'Admin de prueba',
        role: 'ADMIN',
      },
    });
    const sessions = app.get(AuthSessionService);
    userCookie = `tororeps_session=${(await sessions.create(user.id)).token}`;
    adminCookie = `tororeps_session=${(await sessions.create(admin.id)).token}`;
    groupId = (
      await prisma.muscleGroup.create({
        data: { name: 'Pectorales', slug: 'pectorales' },
      })
    ).id;
    secondGroupId = (
      await prisma.muscleGroup.create({
        data: { name: 'Tríceps', slug: 'triceps' },
      })
    ).id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('requiere sesión en listado, discover, opciones y detalle', async () => {
    for (const path of [
      '/exercises',
      '/exercises/discover',
      '/exercises/options',
      `/exercises/${randomUUID()}`,
    ]) {
      await request(app.getHttpServer()).get(path).expect(401);
    }
    await request(app.getHttpServer())
      .get('/exercises/discover')
      .set('Cookie', 'tororeps_session=invalid')
      .expect(401);
    await prisma.authSession.updateMany({ data: { expiresAt: new Date(0) } });
    await request(app.getHttpServer())
      .get('/exercises')
      .set('Cookie', userCookie)
      .expect(401);
  });

  it('rechaza escrituras sin sesión y de USER; mantiene la protección CSRF', async () => {
    const exercise = await seedExercise('Existente');
    await request(app.getHttpServer())
      .post('/exercises')
      .send(exerciseInput())
      .expect(401);
    await request(app.getHttpServer())
      .post('/exercises')
      .set('Cookie', userCookie)
      .send(exerciseInput())
      .expect(403);
    await request(app.getHttpServer())
      .patch(`/exercises/${exercise.id}`)
      .set('Cookie', userCookie)
      .send({ name: 'Cambio' })
      .expect(403);
    await request(app.getHttpServer())
      .post(`/exercises/${exercise.id}/archive`)
      .set('Cookie', userCookie)
      .expect(403);
    await request(app.getHttpServer())
      .post('/exercises')
      .set('Cookie', adminCookie)
      .set('Origin', 'https://foreign.example')
      .send(exerciseInput())
      .expect(403);
    expect(await prisma.exercise.count()).toBe(1);
  });

  it('pagina en la base de datos con defaults y desempata por id', async () => {
    for (let index = 0; index < 24; index += 1)
      await seedExercise('Mismo nombre');
    await seedExercise('Archivado', { archivedAt: new Date() });
    const first = await request(app.getHttpServer())
      .get('/exercises')
      .set('Cookie', userCookie)
      .expect(200);
    expect(first.body).toMatchObject({ page: 1, limit: 20, total: 24 });
    expect(first.body.items).toHaveLength(20);
    const next = await request(app.getHttpServer())
      .get('/exercises?page=2&limit=20')
      .set('Cookie', userCookie)
      .expect(200);
    expect(next.body.items).toHaveLength(4);
    const ids = [...first.body.items, ...next.body.items].map(
      (item: { id: string }) => item.id,
    );
    expect(ids).toEqual([...ids].sort());
    expect(new Set(ids).size).toBe(24);
    const past = await request(app.getHttpServer())
      .get('/exercises?page=3')
      .set('Cookie', userCookie)
      .expect(200);
    expect(past.body).toMatchObject({
      items: [],
      page: 3,
      limit: 20,
      total: 24,
    });
  });

  it('combina búsqueda sin distinguir mayúsculas, grupo muscular y equipamiento', async () => {
    const matching = await seedExercise('Press inclinado', {
      muscles: { create: { muscleGroupId: groupId, role: 'PRIMARY' } },
    });
    await seedExercise('Press con mancuernas', {
      equipmentType: 'DUMBBELL',
      muscles: { create: { muscleGroupId: groupId, role: 'PRIMARY' } },
    });
    await seedExercise('Sentadilla');
    const response = await request(app.getHttpServer())
      .get('/exercises')
      .query({
        search: 'PRESS',
        muscleGroupId: groupId,
        equipmentType: 'BARBELL',
      })
      .set('Cookie', userCookie)
      .expect(200);
    expect(response.body.total).toBe(1);
    expect(response.body.items[0].id).toBe(matching.id);
    const missing = await request(app.getHttpServer())
      .get('/exercises')
      .query({ muscleGroupId: randomUUID() })
      .set('Cookie', userCookie)
      .expect(200);
    expect(missing.body.total).toBe(0);
    await seedExercise('100% real_');
    const literal = await request(app.getHttpServer())
      .get('/exercises')
      .query({ search: '% real_' })
      .set('Cookie', userCookie)
      .expect(200);
    expect(literal.body.total).toBe(1);
  });

  it.each([
    'page=0',
    'page=1.5',
    'page=abc',
    'limit=101',
    'limit=0',
    'limit=bad',
    'equipmentType=INVALID',
    'muscleGroupId=bad',
    'unknown=true',
    'search=',
    'page=2147483647&limit=100',
  ])('rechaza parámetros inválidos: %s', async (query) => {
    await request(app.getHttpServer())
      .get(`/exercises?${query}`)
      .set('Cookie', userCookie)
      .expect(400);
  });

  it('discover devuelve [] con 200 y resuelve la ruta estática sin interpretar discover como UUID', async () => {
    const response = await request(app.getHttpServer())
      .get('/exercises/discover')
      .set('Cookie', userCookie)
      .expect(200);
    expect(response.body).toEqual([]);
    expect(response.headers['cache-control']).toBe('no-store');
  });

  it('discover devuelve todos los disponibles si hay menos de cinco y excluye archivados', async () => {
    const first = await seedExercise('Uno');
    const second = await seedExercise('Dos');
    await seedExercise('Archivado', { archivedAt: new Date() });
    const response = await request(app.getHttpServer())
      .get('/exercises/discover')
      .set('Cookie', userCookie)
      .expect(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.map((item: { id: string }) => item.id).sort()).toEqual(
      [first.id, second.id].sort(),
    );
    expect(
      response.body.every(
        (item: { archivedAt: unknown }) => item.archivedAt === null,
      ),
    ).toBe(true);
  });

  it('discover selecciona cinco ejercicios distintos aunque tengan múltiples músculos y medios', async () => {
    for (let index = 0; index < 8; index += 1) {
      await seedExercise(`Ejercicio ${index}`, {
        muscles: {
          create: [
            { muscleGroupId: groupId, role: 'PRIMARY' },
            { muscleGroupId: secondGroupId, role: 'SECONDARY' },
          ],
        },
        media: {
          create: [
            mediaInput(),
            mediaInput({
              type: 'VIDEO',
              cloudinaryPublicId: 'exercises/video',
              cloudinaryFormat: 'mp4',
              position: 1,
            }),
          ],
        },
      });
    }
    await seedExercise('No disponible', { archivedAt: new Date() });
    const response = await request(app.getHttpServer())
      .get('/exercises/discover')
      .set('Cookie', userCookie)
      .expect(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(5);
    expect(
      new Set(response.body.map((item: { id: string }) => item.id)).size,
    ).toBe(5);
    for (const item of response.body) {
      expect(item.name).not.toBe('No disponible');
      expect(item.muscles).toHaveLength(2);
      expect(item.media).toHaveLength(2);
      expect(item.media[0].url).toBe(
        'https://res.cloudinary.com/demo/image/upload/v1/exercises/press.jpg',
      );
      expect(item.media[1].url).toBe(
        'https://res.cloudinary.com/demo/video/upload/v1/exercises/video.mp4',
      );
      const detail = await request(app.getHttpServer())
        .get(`/exercises/${item.id}`)
        .set('Cookie', userCookie)
        .expect(200);
      expect(item).toEqual(detail.body);
    }
  });

  it.each([
    'limit=5',
    'page=1',
    'search=press',
    'muscleGroupId=bad',
    'equipmentType=BARBELL',
  ])('discover no admite %s', async (query) => {
    await request(app.getHttpServer())
      .get(`/exercises/discover?${query}`)
      .set('Cookie', userCookie)
      .expect(400);
  });

  it('ofrece grupos existentes y enums, y responde 404 para detalle ausente o archivado', async () => {
    const options = await request(app.getHttpServer())
      .get('/exercises/options')
      .set('Cookie', userCookie)
      .expect(200);
    expect(
      options.body.muscleGroups.map((group: { id: string }) => group.id),
    ).toContain(groupId);
    expect(options.body.equipmentTypes).toContain('BARBELL');
    expect(options.body.measurementModes).toEqual(['REPS', 'DURATION']);
    await request(app.getHttpServer())
      .get(`/exercises/${randomUUID()}`)
      .set('Cookie', userCookie)
      .expect(404);
    const archived = await seedExercise('Archivado', {
      archivedAt: new Date(),
    });
    await request(app.getHttpServer())
      .get(`/exercises/${archived.id}`)
      .set('Cookie', userCookie)
      .expect(404);
    await request(app.getHttpServer())
      .get('/exercises/not-a-uuid')
      .set('Cookie', userCookie)
      .expect(400);
  });

  it('ADMIN crea y modifica ejercicios con relaciones y URL de imagen/vídeo, sin Cloudinary remoto', async () => {
    const created = await request(app.getHttpServer())
      .post('/exercises')
      .set('Cookie', adminCookie)
      .send(
        exerciseInput({
          muscles: [
            { muscleGroupId: groupId, role: 'PRIMARY' },
            { muscleGroupId: secondGroupId, role: 'SECONDARY' },
          ],
          media: [
            mediaInput({
              type: 'VIDEO',
              position: 1,
              cloudinaryPublicId: 'exercises/video',
              cloudinaryFormat: 'mp4',
            }),
            mediaInput({ cloudinaryVersion: '4000000000' }),
          ],
        }),
      )
      .expect(201);
    expect(
      created.body.media.map((media: { position: number }) => media.position),
    ).toEqual([0, 1]);
    expect(created.body.media[0].cloudinaryVersion).toBe('4000000000');
    expect(created.body.media[0].url).toContain('/image/upload/v4000000000/');
    expect(created.body.media[1].url).toContain('/video/upload/v1/');
    const updated = await request(app.getHttpServer())
      .patch(`/exercises/${created.body.id}`)
      .set('Cookie', adminCookie)
      .send({
        name: 'Nombre actualizado',
        description: null,
        muscles: [{ muscleGroupId: secondGroupId, role: 'PRIMARY' }],
      })
      .expect(200);
    expect(updated.body.muscles).toHaveLength(1);
    expect(updated.body.muscles[0].muscleGroupId).toBe(secondGroupId);
    expect(updated.body.media).toEqual(created.body.media);
  });

  it('distingue omitir media de [] y permite quitar músculos con []', async () => {
    const created = await request(app.getHttpServer())
      .post('/exercises')
      .set('Cookie', adminCookie)
      .send(
        exerciseInput({
          muscles: [{ muscleGroupId: groupId, role: 'PRIMARY' }],
          media: [mediaInput()],
        }),
      )
      .expect(201);
    const kept = await request(app.getHttpServer())
      .patch(`/exercises/${created.body.id}`)
      .set('Cookie', adminCookie)
      .send({ loadNote: 'Aclaración' })
      .expect(200);
    expect(kept.body.media).toEqual(created.body.media);
    const removed = await request(app.getHttpServer())
      .patch(`/exercises/${created.body.id}`)
      .set('Cookie', adminCookie)
      .send({ media: [], muscles: [] })
      .expect(200);
    expect(removed.body.media).toEqual([]);
    expect(removed.body.muscles).toEqual([]);
    expect(await prisma.exerciseMedia.count()).toBe(0);
  });

  it('reordena una galería conservando identidades y fechas de creación incluso con posiciones máximas', async () => {
    const created = await request(app.getHttpServer())
      .post('/exercises')
      .set('Cookie', adminCookie)
      .send(
        exerciseInput({
          media: [
            mediaInput(),
            mediaInput({
              position: 2147483647,
              cloudinaryPublicId: 'exercises/second',
            }),
          ],
        }),
      )
      .expect(201);
    const [first, second] = created.body.media;
    const updated = await request(app.getHttpServer())
      .patch(`/exercises/${created.body.id}`)
      .set('Cookie', adminCookie)
      .send({
        media: [
          mediaInput({ id: first.id, position: 2147483647 }),
          mediaInput({
            id: second.id,
            position: 0,
            cloudinaryPublicId: 'exercises/second',
          }),
        ],
      })
      .expect(200);
    expect(updated.body.media.map((media: { id: string }) => media.id)).toEqual(
      [second.id, first.id],
    );
    expect(updated.body.media[0].createdAt).toBe(second.createdAt);
    const mixed = await request(app.getHttpServer())
      .patch(`/exercises/${created.body.id}`)
      .set('Cookie', adminCookie)
      .send({
        media: [
          mediaInput({ id: first.id, position: 0 }),
          mediaInput({ position: 1, cloudinaryPublicId: 'exercises/new' }),
        ],
      })
      .expect(200);
    expect(mixed.body.media[0].id).toBe(first.id);
    expect(mixed.body.media[1].id).not.toBe(second.id);
    expect(
      await prisma.exerciseMedia.findUnique({ where: { id: second.id } }),
    ).toBeNull();
  });

  it('rechaza id multimedia ajenos, inexistentes y repetidos sin cambios parciales', async () => {
    const own = await request(app.getHttpServer())
      .post('/exercises')
      .set('Cookie', adminCookie)
      .send(exerciseInput({ media: [mediaInput()] }))
      .expect(201);
    const other = await request(app.getHttpServer())
      .post('/exercises')
      .set('Cookie', adminCookie)
      .send(exerciseInput({ media: [mediaInput()] }))
      .expect(201);
    for (const id of [other.body.media[0].id, randomUUID()]) {
      await request(app.getHttpServer())
        .patch(`/exercises/${own.body.id}`)
        .set('Cookie', adminCookie)
        .send({ name: 'No debe guardarse', media: [mediaInput({ id })] })
        .expect(400);
    }
    await request(app.getHttpServer())
      .patch(`/exercises/${own.body.id}`)
      .set('Cookie', adminCookie)
      .send({
        media: [
          mediaInput({ id: own.body.media[0].id }),
          mediaInput({ id: own.body.media[0].id, position: 1 }),
        ],
      })
      .expect(400);
    const unchanged = await request(app.getHttpServer())
      .get(`/exercises/${own.body.id}`)
      .set('Cookie', userCookie)
      .expect(200);
    expect(unchanged.body).toEqual(own.body);
  });

  it('rechaza referencias musculares inválidas y media con id durante creación', async () => {
    await request(app.getHttpServer())
      .post('/exercises')
      .set('Cookie', adminCookie)
      .send(
        exerciseInput({
          muscles: [{ muscleGroupId: randomUUID(), role: 'PRIMARY' }],
        }),
      )
      .expect(400);
    await request(app.getHttpServer())
      .post('/exercises')
      .set('Cookie', adminCookie)
      .send(exerciseInput({ media: [mediaInput({ id: randomUUID() })] }))
      .expect(400);
    expect(await prisma.exercise.count()).toBe(0);
    const existing = await seedExercise('Sin cambios');
    await request(app.getHttpServer())
      .patch(`/exercises/${existing.id}`)
      .set('Cookie', adminCookie)
      .send({
        name: 'No guardar',
        muscles: [{ muscleGroupId: randomUUID(), role: 'PRIMARY' }],
      })
      .expect(400);
    expect(
      (await prisma.exercise.findUniqueOrThrow({ where: { id: existing.id } }))
        .name,
    ).toBe('Sin cambios');
  });

  it.each([
    { name: '   ' },
    { name: null },
    { equipmentType: 'UNKNOWN' },
    { media: null },
    { muscles: null },
    { media: [mediaInput({ position: -1 })] },
    { media: [mediaInput({ position: 2147483648 })] },
    { media: [mediaInput(), mediaInput()] },
    { media: [mediaInput({ type: 'AUDIO' })] },
    {
      media: [
        mediaInput({
          cloudinaryPublicId: 'https://example.com/image?token=temporary',
        }),
      ],
    },
    { media: [mediaInput({ cloudinaryPublicId: 'C:\\local\\image.jpg' })] },
    { media: [mediaInput({ cloudinaryPublicId: '/tmp/image.jpg' })] },
    { media: [mediaInput({ cloudinaryPublicId: '../image' })] },
    { media: [mediaInput({ cloudinaryPublicId: 'folder/v123/image' })] },
    { media: [mediaInput({ cloudinaryVersion: 42 })] },
    { media: [mediaInput({ cloudinaryVersion: '0' })] },
    { media: [mediaInput({ cloudinaryVersion: '9223372036854775808' })] },
    { media: [mediaInput({ cloudinaryCloudName: 'bad/cloud' })] },
    { media: [mediaInput({ cloudinaryFormat: '.jpg' })] },
    { media: [mediaInput({ cloudinaryDeliveryType: null })] },
    { media: [mediaInput({ unexpected: true })] },
    { ownerUserId: randomUUID() },
  ])('valida el cuerpo y rechaza datos inválidos: %j', async (invalid) => {
    await request(app.getHttpServer())
      .post('/exercises')
      .set('Cookie', adminCookie)
      .send(exerciseInput(invalid))
      .expect(400);
    expect(await prisma.exercise.count()).toBe(0);
  });

  it('acepta referencias no públicas, devolviendo url null sin fabricar firmas', async () => {
    const response = await request(app.getHttpServer())
      .post('/exercises')
      .set('Cookie', adminCookie)
      .send(
        exerciseInput({
          media: [
            mediaInput({ cloudinaryDeliveryType: 'PRIVATE' }),
            mediaInput({
              position: 1,
              cloudinaryDeliveryType: 'AUTHENTICATED',
            }),
          ],
        }),
      )
      .expect(201);
    expect(
      response.body.media.map((media: { url: unknown }) => media.url),
    ).toEqual([null, null]);
  });

  it('archiva como ADMIN de forma idempotente, conserva relaciones y oculta el ejercicio', async () => {
    const created = await request(app.getHttpServer())
      .post('/exercises')
      .set('Cookie', adminCookie)
      .send(exerciseInput({ media: [mediaInput()] }))
      .expect(201);
    const archived = await request(app.getHttpServer())
      .post(`/exercises/${created.body.id}/archive`)
      .set('Cookie', adminCookie)
      .expect(200);
    expect(archived.body.archivedAt).not.toBeNull();
    expect(archived.body.media).toEqual(created.body.media);
    const again = await request(app.getHttpServer())
      .post(`/exercises/${created.body.id}/archive`)
      .set('Cookie', adminCookie)
      .expect(200);
    expect(again.body.archivedAt).toBe(archived.body.archivedAt);
    await request(app.getHttpServer())
      .get(`/exercises/${created.body.id}`)
      .set('Cookie', userCookie)
      .expect(404);
    await request(app.getHttpServer())
      .patch(`/exercises/${created.body.id}`)
      .set('Cookie', adminCookie)
      .send({ name: 'Cambio' })
      .expect(404);
    const list = await request(app.getHttpServer())
      .get('/exercises')
      .set('Cookie', userCookie)
      .expect(200);
    expect(list.body.total).toBe(0);
    await request(app.getHttpServer())
      .post(`/exercises/${randomUUID()}/archive`)
      .set('Cookie', adminCookie)
      .expect(404);
  });

  it('deshace creación y reemplazo de galería si PostgreSQL rechaza una escritura intermedia', async () => {
    const created = await request(app.getHttpServer())
      .post('/exercises')
      .set('Cookie', adminCookie)
      .send(exerciseInput({ media: [mediaInput()] }))
      .expect(201);
    // Restricción temporal únicamente en la base de pruebas para forzar un error real tras otras escrituras.
    await prisma.$executeRaw`ALTER TABLE exercise_media ADD CONSTRAINT catalog_test_reject CHECK (cloudinary_public_id <> 'rollback/reject')`;
    try {
      await request(app.getHttpServer())
        .post('/exercises')
        .set('Cookie', adminCookie)
        .send(
          exerciseInput({
            name: 'No persistir',
            media: [mediaInput({ cloudinaryPublicId: 'rollback/reject' })],
          }),
        )
        .expect(400);
      await request(app.getHttpServer())
        .patch(`/exercises/${created.body.id}`)
        .set('Cookie', adminCookie)
        .send({
          name: 'No persistir cambio',
          muscles: [{ muscleGroupId: groupId, role: 'PRIMARY' }],
          media: [mediaInput({ cloudinaryPublicId: 'rollback/reject' })],
        })
        .expect(400);
      const unchanged = await request(app.getHttpServer())
        .get(`/exercises/${created.body.id}`)
        .set('Cookie', userCookie)
        .expect(200);
      expect(unchanged.body).toEqual(created.body);
      expect(await prisma.exercise.count()).toBe(1);
    } finally {
      await prisma.$executeRaw`ALTER TABLE exercise_media DROP CONSTRAINT catalog_test_reject`;
    }
  });
});
