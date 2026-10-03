import { Controller, Get, Header, UseFilters } from '@nestjs/common';
import type { HealthCheckResult } from '@nestjs/terminus';
import { HealthService } from './health.service.js';
import { HealthUnavailableFilter } from './health-unavailable.filter.js';
import { Public } from '../../common/decorators/public.decorator.js';

@Public()
@Controller('health')
@UseFilters(HealthUnavailableFilter)
export class HealthController {

    constructor(private readonly healthService: HealthService) { }

    @Get('live')
    @Header('Cache-Control', 'no-store')
    getLiveness(): { status: 'ok' } {
        return { status: 'ok' };
    }

    @Get(['ready', ''])
    @Header('Cache-Control', 'no-store')
    getReadiness(): Promise<HealthCheckResult> {
        return this.healthService.checkReadiness();
    }

}
