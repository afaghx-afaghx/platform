import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AfxPublic } from '../../core/authorization/public.decorator';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  @AfxPublic()
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @AfxPublic()
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', dependencies: { postgres: 'ok' } };
    } catch {
      throw new ServiceUnavailableException({ code: 'DEPENDENCY_UNAVAILABLE', message: 'Required dependency unavailable' });
    }
  }
}
