import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiException } from './api-exception';

interface ErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  details?: string[];
  path: string;
  timestamp: string;
}

const STATUS_CODES: Partial<Record<HttpStatus, string>> = {
  [HttpStatus.BAD_REQUEST]: 'BAD_REQUEST',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'TOO_MANY_REQUESTS',
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const isHttpException = exception instanceof HttpException;
    const statusCode = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = isHttpException ? exception.getResponse() : undefined;
    const bodyObject = typeof body === 'object' && body !== null
      ? body as Record<string, unknown>
      : undefined;
    const validationDetails = Array.isArray(bodyObject?.message)
      ? bodyObject.message.filter((message): message is string => typeof message === 'string')
      : undefined;
    const code = exception instanceof ApiException
      ? exception.code
      : STATUS_CODES[statusCode as HttpStatus] ??
        (statusCode >= 500 ? 'INTERNAL_SERVER_ERROR' : 'HTTP_ERROR');
    const message = statusCode >= 500
      ? exception instanceof ApiException
        ? exception.message
        : 'An unexpected error occurred.'
      : validationDetails?.length
        ? 'Request validation failed.'
        : typeof bodyObject?.message === 'string'
          ? bodyObject.message
          : typeof body === 'string'
            ? body
            : exception instanceof HttpException
              ? exception.message
              : 'Request failed.';

    if (statusCode >= 500) {
      const errorName = exception instanceof Error ? exception.name : 'UnknownError';
      this.logger.error(`${errorName} while handling ${request.method} ${request.url}`);
    }

    const errorResponse: ErrorResponse = {
      statusCode,
      code,
      message,
      ...(validationDetails?.length ? { details: validationDetails } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(statusCode).json(errorResponse);
  }
}
