import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { ApiExceptionFilter } from './api-exception.filter';
import { ApiException } from './api-exception';

describe('ApiExceptionFilter', () => {
  let filter: ApiExceptionFilter;
  let response: { status: jest.Mock; json: jest.Mock };

  beforeEach(() => {
    filter = new ApiExceptionFilter();
    response = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  function createHost(exception: unknown): ArgumentsHost {
    return {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ method: 'POST', url: '/api/claims/assess' }),
      }),
    } as ArgumentsHost;
  }

  it('formats application errors with stable codes and safe messages', () => {
    const exception = new ApiException(
      HttpStatus.SERVICE_UNAVAILABLE,
      'ASSESSMENT_PROVIDER_UNAVAILABLE',
      'The assessment provider is temporarily unavailable.',
      { cause: new Error('private provider diagnostic') },
    );

    filter.catch(exception, createHost(exception));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: HttpStatus.SERVICE_UNAVAILABLE,
      code: 'ASSESSMENT_PROVIDER_UNAVAILABLE',
      message: 'The assessment provider is temporarily unavailable.',
      path: '/api/claims/assess',
      timestamp: expect.any(String),
    }));
    expect(JSON.stringify(response.json.mock.calls[0][0])).not.toContain(
      'private provider diagnostic',
    );
  });

  it('returns consistent validation details for bad requests', () => {
    const exception = new HttpException(
      { statusCode: 400, message: ['claimText should not be empty'], error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, createHost(exception));

    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: HttpStatus.BAD_REQUEST,
      code: 'BAD_REQUEST',
      message: 'Request validation failed.',
      details: ['claimText should not be empty'],
    }));
  });

  it('hides unexpected internal error details from the response', () => {
    const exception = new Error('database connection string');

    filter.catch(exception, createHost(exception));

    expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
    }));
    expect(JSON.stringify(response.json.mock.calls[0][0])).not.toContain(
      'database connection string',
    );
  });
});
