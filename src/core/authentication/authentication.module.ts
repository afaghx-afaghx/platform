import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { SecurityContextGuard } from './security-context.guard';

@Module({
  imports: [PrismaModule],
  providers: [
    AuthService,
    PasswordService,
    SecurityContextGuard,
    { provide: APP_GUARD, useExisting: SecurityContextGuard },
  ],
  exports: [AuthService, PasswordService, SecurityContextGuard],
})
export class AuthenticationModule {}
