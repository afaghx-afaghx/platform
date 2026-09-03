import { Module } from '@nestjs/common';
import { PrismaModule } from './core/prisma/prisma.module';
import { AuthController } from './core/authentication/auth.controller';
import { AuthenticationModule } from './core/authentication/authentication.module';
import { AuthorizationModule } from './core/authorization/authorization.module';
import { AuditModule } from './core/audit/audit.module';

@Module({
  imports: [PrismaModule, AuthenticationModule, AuthorizationModule, AuditModule],
  controllers: [AuthController],
})
export class AppModule {}
