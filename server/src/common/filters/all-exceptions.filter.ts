import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';

interface ErrorBody {
  statusCode: number;
  message: string | string[];
  error: string;
}

const defaultErrorName = (status: number): string =>
  ({
    [HttpStatus.BAD_REQUEST]: 'Bad Request',
    [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
    [HttpStatus.FORBIDDEN]: 'Forbidden',
    [HttpStatus.NOT_FOUND]: 'Not Found',
    [HttpStatus.CONFLICT]: 'Conflict',
    [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
  })[status] || 'Error';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Http');

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Внутренняя ошибка сервера';
    let error = defaultErrorName(HttpStatus.INTERNAL_SERVER_ERROR);

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const payload = exception.getResponse();
      if (typeof payload === 'string') {
        message = payload;
        error = defaultErrorName(status);
      } else if (Array.isArray(payload)) {
        message = payload as string[];
        error = defaultErrorName(status);
      } else {
        const body = payload as Partial<ErrorBody>;
        message = body.message ?? exception.message;
        error = body.error ?? defaultErrorName(status);
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
    }

    const body: ErrorBody = { statusCode: status, message, error };
    response.status(status).json(body);
  }
}
