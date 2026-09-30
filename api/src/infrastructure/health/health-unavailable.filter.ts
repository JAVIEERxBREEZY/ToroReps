import { Catch, HttpStatus, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Injectable()
@Catch(ServiceUnavailableException)
export class HealthUnavailableFilter implements ExceptionFilter<ServiceUnavailableException> {

    constructor(private readonly adapterHost: HttpAdapterHost) { }

    catch(exception: ServiceUnavailableException, host: ArgumentsHost): void {
        const originalResponse = exception.getResponse();

        const isShuttingDown =
            typeof originalResponse === 'object' &&
            originalResponse !== null &&
            'status' in originalResponse &&
            originalResponse.status === 'shutting_down';

        const failedChecks = isShuttingDown
            ? {}
            : { database: { status: 'down' } };

        const body = {
            status: isShuttingDown ? 'shutting_down' : 'error',
            info: {},
            error: failedChecks,
            details: failedChecks,
        };

        const response = host.switchToHttp().getResponse<unknown>();
        const { httpAdapter } = this.adapterHost;

        httpAdapter.setHeader(response, 'Cache-Control', 'no-store');
        httpAdapter.reply(response, body, HttpStatus.SERVICE_UNAVAILABLE);
    }

}