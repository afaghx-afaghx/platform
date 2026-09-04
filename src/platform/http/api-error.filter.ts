import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse<Response>();
    const request = http.getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw = exception instanceof HttpException ? exception.getResponse() : undefined;
    const message = typeof raw === 'object' && raw !== null && 'message' in raw ? (raw as { message: unknown }).message : raw;
    const code = typeof raw === 'object' && raw !== null && 'error' in raw ? (raw as { error: unknown }).error : 'INTERNAL_SERVER_ERROR';
    const requestId = response.locals?.afxRequestId ?? request.header('x-afx-request-id');

    response.status(status).json({
      error: {
        code: typeof code === 'string' ? code : 'HTTP_ERROR',
        message: Array.isArray(message) ? message : typeof message === 'string' ? message : 'Request failed',
        requestId,
        status,
      },
    });
  }
}
