import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthenticationModule } from '../authentication/authentication.module';
import { AuthorizationService } from './authorization.service';
import { AuthorizationGuard } from './authorization.guard';

@Module({
  imports: [PrismaModule, AuthenticationModule],
  providers: [AuthorizationService, AuthorizationGuard],
  exports: [AuthorizationService, AuthorizationGuard],
})
export class AuthorizationModule {}
