import { Controller, Get } from '@nestjs/common';
import { AfxPublic } from '../authorization/public.decorator';

@Controller('v1/health')
export class HealthController {
  @AfxPublic()
  @Get()
  health() {
    return { status: 'ok', service: 'afaghx-platform' };
  }
}
