import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { RequestContextMiddleware } from './http/request-context.middleware';
import { HealthController } from './health/health.controller';
import { PrismaModule } from '../core/prisma/prisma.module';
import { OutboxService } from './events/outbox.service';

@Module({
  imports: [PrismaModule],
  controllers: [HealthController],
  providers: [OutboxService],
  exports: [OutboxService],
})
export class PlatformModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
