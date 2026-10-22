import { ServiceUnavailableException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { HealthCheckResult } from '@nestjs/terminus';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HealthController } from './health.controller.js';
import { HealthService } from './health.service.js';

describe('HealthController', () => {
  let controller: HealthController;
  const healthService = { checkReadiness: vi.fn() };

  beforeEach(async () => {
    healthService.checkReadiness.mockReset();

    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: healthService }],
    }).compile();

    controller = module.get(HealthController);
  });

  it('responde a liveness sin consultar la base de datos', () => {
    expect(controller.getLiveness()).toEqual({ status: 'ok' });
    expect(healthService.checkReadiness).not.toHaveBeenCalled();
  });

  it('devuelve el resultado de la comprobación de disponibilidad', async () => {
    const result: HealthCheckResult = {
      status: 'ok',
      info: { database: { status: 'up' } },
      error: {},
      details: { database: { status: 'up' } },
    };

    healthService.checkReadiness.mockResolvedValue(result);

    expect(await controller.getReadiness()).toBe(result);
    expect(healthService.checkReadiness).toHaveBeenCalledOnce();
  });

  it('propaga el fallo de disponibilidad para que lo gestione el filtro HTTP', async () => {
    const error = new ServiceUnavailableException();
    healthService.checkReadiness.mockRejectedValue(error);

    await expect(controller.getReadiness()).rejects.toBe(error);
  });
});
