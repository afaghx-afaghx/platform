import helmet from 'helmet';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class HttpSecurityMiddleware implements NestMiddleware {
  private readonly helmetMiddleware = helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'no-referrer' },
    hsts: process.env.NODE_ENV === 'production' ? undefined : false,
  });

  use(req: Request, res: Response, next: NextFunction): void {
    const requestId = this.header(req, 'x-request-id') ?? randomUUID();
    res.setHeader('X-Request-Id', requestId);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    this.helmetMiddleware(req, res, next);
  }

  private header(req: Request, name: string): string | undefined {
    const value = req.headers[name];
    return typeof value === 'string' && value.length <= 128 ? value : undefined;
  }
}
