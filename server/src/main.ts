import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Remove Server and X-Powered-By headers
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use((_req: unknown, res: { removeHeader: (h: string) => void }, next: () => void) => {
    res.removeHeader('Server');
    next();
  });

  // Security headers via Helmet
  app.use(
    helmet({
      // COEP/COOP disabled — those are set by Next.js for WASM SharedArrayBuffer
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: false,
      crossOriginResourcePolicy: { policy: 'same-origin' },
      contentSecurityPolicy: false, // API returns JSON, not HTML
      referrerPolicy: { policy: 'no-referrer' },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
    }),
  );

  // Cookie parser — must be before Passport reads cookies
  app.use(cookieParser());

  // CORS — whitelist from CLIENT_ORIGINS env var
  const allowedOrigins = (process.env.CLIENT_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    maxAge: 86400,
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // Global validation pipe — strip unknown fields, transform types
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global exception filter — { code, message } only, no stack traces
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = parseInt(process.env.PORT ?? '3001', 10);
  await app.listen(port);
}

bootstrap();
