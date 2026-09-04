import { Controller, Get } from '@nestjs/common';
import { AfxPublic } from '../authorization/public.decorator';
import { JwksService } from './jwks.service';

@Controller('v1/.well-known')
export class JwksController {
  constructor(private readonly jwks: JwksService) {}

  @AfxPublic()
  @Get('jwks.json')
  async getJwks() {
    return this.jwks.getJwks();
  }
}
