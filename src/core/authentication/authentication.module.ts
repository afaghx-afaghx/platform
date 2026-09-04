import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { SecurityContextGuard } from './security-context.guard';
import { MfaService } from './mfa.service';
import { JwksService } from './jwks.service';
import { JwksController } from './jwks.controller';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [JwksController],
  providers: [
    AuthService,
    PasswordService,
    MfaService,
    JwksService,
    SecurityContextGuard,
    { provide: APP_GUARD, useExisting: SecurityContextGuard },
  ],
  exports: [AuthService, PasswordService, MfaService, JwksService, SecurityContextGuard],
})
export class AuthenticationModule {}
