import { HttpException, HttpStatus } from '@nestjs/common';

export class ApiException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly code: string,
    message: string,
    options?: { cause?: unknown },
  ) {
    super({ code, message }, status, options);
  }
}
