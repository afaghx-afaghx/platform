import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpSecurityMiddleware } from './core/security/http-security.middleware';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidUnknownValues: true }));
  const security = new HttpSecurityMiddleware();
  app.use(security.use.bind(security));
  await app.listen(Number(process.env.PORT ?? 3000));
}
bootstrap();
