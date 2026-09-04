import { Module } from '@nestjs/common';
import { PrismaModule } from './core/prisma/prisma.module';
import { AuthController } from './core/authentication/auth.controller';
import { AuthenticationModule } from './core/authentication/authentication.module';
import { AuthorizationModule } from './core/authorization/authorization.module';
import { AuditModule } from './core/audit/audit.module';
import { SecurityModule } from './core/security/security.module';

@Module({
  imports: [PrismaModule, AuthenticationModule, AuthorizationModule, AuditModule, SecurityModule],
  controllers: [AuthController],
})
export class AppModule {}
