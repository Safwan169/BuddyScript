import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { requestContext } from './middleware/requestContext';
import routes from './routes';

const app: Application = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      const allowedOrigins = config.corsOrigin
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true,
  })
);

app.use(requestContext);
morgan.token('request-id', (req) => (req as any).requestId || '-');

if (config.nodeEnv === 'development') {
  app.use(morgan(':method :url :status :response-time ms req-id=:request-id'));
} else {
  app.use(morgan(':remote-addr - :method :url :status :res[content-length] - :response-time ms req-id=:request-id'));
}

app.use(cookieParser());
app.use(express.json({ limit: config.jsonBodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.urlencodedBodyLimit }));
app.use('/uploads', (_req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.resolve(process.cwd(), 'uploads')));

app.use('/api', routes);
app.use('/api/api', routes);

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use(errorHandler);

export default app;
