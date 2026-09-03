import { Module } from '@nestjs/common';
import { PrismaModule } from './core/prisma/prisma.module';
import { AuthController } from './core/authentication/auth.controller';
import { AuthService } from './core/authentication/auth.service';
import { PasswordService } from './core/authentication/password.service';

@Module({ imports: [PrismaModule], controllers: [AuthController], providers: [AuthService, PasswordService] })
export class AppModule {}
