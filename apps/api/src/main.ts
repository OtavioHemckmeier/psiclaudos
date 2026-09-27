import { NestFactory } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'development-only-secret')) {
    throw new Error('JWT_SECRET seguro é obrigatório em produção.');
  }
  const app = await NestFactory.create(AppModule);
  const requestLog = new Map<string, { startedAt: number; count: number }>();
  app.enableCors({ origin: process.env.WEB_ORIGIN?.split(',').map((origin) => origin.trim()).filter(Boolean) || true, credentials: true });
  app.enableShutdownHooks();
  app.use((_request: Request, response: Response, next: NextFunction) => {
    const address = _request.ip ?? 'unknown';
    const now = Date.now();
    const current = requestLog.get(address);
    if (!current || now - current.startedAt >= 60_000) requestLog.set(address, { startedAt: now, count: 1 });
    else if (current.count >= 120) { response.status(429).json({ message: 'Muitas requisições. Tente novamente em instantes.' }); return; }
    else current.count += 1;
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    response.setHeader('Content-Security-Policy', "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; object-src 'none'");
    next();
  });
  app.setGlobalPrefix('api');
  await app.listen(Number(process.env.API_PORT ?? 3000));
}

void bootstrap();
