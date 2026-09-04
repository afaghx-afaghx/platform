import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { ApiErrorFilter } from './platform/http/api-error.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: process.env.CORS_ORIGINS?.split(',').map((v) => v.trim()).filter(Boolean) ?? false });
  app.enableShutdownHooks();
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidUnknownValues: true, forbidNonWhitelisted: true }));
  app.useGlobalFilters(new ApiErrorFilter());
  await app.listen(Number(process.env.PORT ?? 3000));
}

void bootstrap();
