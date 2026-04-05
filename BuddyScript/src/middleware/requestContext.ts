import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export const requestContext = (req: Request, res: Response, next: NextFunction): void => {
  const headerRequestId = req.header('x-request-id');
  const requestId = headerRequestId && headerRequestId.trim() ? headerRequestId : randomUUID();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  next();
};
