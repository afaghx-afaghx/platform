import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { SecurityContextGuard } from './security-context.guard';
import { MfaService } from './mfa.service';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [
    AuthService,
    PasswordService,
    MfaService,
    SecurityContextGuard,
    { provide: APP_GUARD, useExisting: SecurityContextGuard },
  ],
  exports: [AuthService, PasswordService, MfaService, SecurityContextGuard],
})
export class AuthenticationModule {}
