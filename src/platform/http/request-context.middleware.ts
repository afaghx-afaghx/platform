import { randomUUID } from 'node:crypto';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

export const AFX_REQUEST_ID_HEADER = 'x-afx-request-id';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const supplied = req.header(AFX_REQUEST_ID_HEADER)?.trim();
    const requestId = supplied && /^[A-Za-z0-9._:-]{1,128}$/.test(supplied) ? supplied : randomUUID();
    res.setHeader(AFX_REQUEST_ID_HEADER, requestId);
    res.locals.afxRequestId = requestId;
    next();
  }
}
