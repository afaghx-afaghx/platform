import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { MfaService } from './mfa.service';
import { RecoveryService } from './recovery.service';
import { RedisSessionStore } from './redis-session.store';
import { KeyManager } from './key-manager';
import { KmsKeyManager } from './kms-key-manager';
import { SecretBoxService } from './secret-box.service';
import { HealthController } from './health.controller';
import { JwksController } from './jwks.controller';

@Module({
  imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])],
  controllers: [HealthController, JwksController],
  providers: [MfaService, RecoveryService, RedisSessionStore, KeyManager, KmsKeyManager, SecretBoxService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
  exports: [MfaService, RecoveryService, RedisSessionStore, KeyManager, KmsKeyManager, SecretBoxService],
})
export class SecurityModule {}
