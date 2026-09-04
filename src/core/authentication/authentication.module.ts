import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuditModule } from '../audit/audit.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SecurityModule } from '../security/security.module';
import { AuthService } from './auth.service';
import { MfaController } from './mfa.controller';
import { PasswordService } from './password.service';
import { RecoveryController } from './recovery.controller';
import { SecurityContextGuard } from './security-context.guard';

@Module({
  imports: [PrismaModule, AuditModule, SecurityModule],
  controllers: [RecoveryController, MfaController],
  providers: [
    AuthService,
    PasswordService,
    SecurityContextGuard,
    { provide: APP_GUARD, useExisting: SecurityContextGuard },
  ],
  exports: [AuthService, PasswordService, SecurityContextGuard],
})
export class AuthenticationModule {}
