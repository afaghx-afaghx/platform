import { Controller, Get } from '@nestjs/common';
import { AfxPublic } from '../authorization/public.decorator';
import { KeyManager } from './key-manager';
import { KmsKeyManager } from './kms-key-manager';

@Controller('v1/.well-known')
export class JwksController {
  constructor(private readonly kms: KmsKeyManager, private readonly local: KeyManager) {}

  @AfxPublic()
  @Get('jwks.json')
  async jwks() {
    if (process.env.AUTH_KMS_KEYS_JSON) return this.kms.jwks();
    return this.local.jwks();
  }
}
