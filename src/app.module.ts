import { Module } from '@nestjs/common';
import { PrismaModule } from './core/prisma/prisma.module';
import { AuthController } from './core/authentication/auth.controller';
import { AuthenticationModule } from './core/authentication/authentication.module';
import { AuthorizationModule } from './core/authorization/authorization.module';

@Module({
  imports: [PrismaModule, AuthenticationModule, AuthorizationModule],
  controllers: [AuthController],
})
export class AppModule {}
