import { describe, expect, it, vi } from 'vitest';

import { CloudinaryUrlService } from './cloudinary-url.service.js';

describe('CloudinaryUrlService', () => {
  const service = new CloudinaryUrlService();
  const image = {
    type: 'IMAGE' as const,
    cloudinaryCloudName: 'tororeps-demo',
    cloudinaryPublicId: 'exercises/press banca',
    cloudinaryDeliveryType: 'UPLOAD' as const,
    cloudinaryVersion: 4_000_000_000n,
    cloudinaryFormat: 'jpg',
  };

  it('resuelve una imagen HTTPS, conservando rutas, espacios, puntos y Unicode', () => {
    const network = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new Error('No debe acceder a la red'));
    try {
      expect(service.resolve(image)).toBe(
        'https://res.cloudinary.com/tororeps-demo/image/upload/v4000000000/exercises/press%20banca.jpg',
      );
      expect(
        service.resolve({ ...image, cloudinaryPublicId: 'ejercicios/niño.v2' }),
      ).toContain('/ejercicios/ni%C3%B1o.v2.jpg');
      expect(network).not.toHaveBeenCalled();
    } finally {
      network.mockRestore();
    }
  });

  it('resuelve vídeo y usa v1 como separador si no hay versión, sin exigir formato', () => {
    expect(
      service.resolve({
        ...image,
        type: 'VIDEO',
        cloudinaryPublicId: 'c_scale/squat',
        cloudinaryVersion: null,
        cloudinaryFormat: 'mp4',
      }),
    ).toBe(
      'https://res.cloudinary.com/tororeps-demo/video/upload/v1/c_scale/squat.mp4',
    );
    expect(
      service.resolve({
        ...image,
        cloudinaryVersion: null,
        cloudinaryFormat: null,
      }),
    ).toMatch(/\/v1\/exercises\/press%20banca$/);
  });

  it.each(['PRIVATE', 'AUTHENTICATED'] as const)(
    'no fabrica una URL pública para %s',
    (cloudinaryDeliveryType) => {
      expect(service.resolve({ ...image, cloudinaryDeliveryType })).toBeNull();
    },
  );
});
