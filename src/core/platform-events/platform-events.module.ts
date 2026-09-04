import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { InboxService } from './inbox.service';
import { OutboxService } from './outbox.service';

@Module({
  imports: [PrismaModule],
  providers: [OutboxService, InboxService],
  exports: [OutboxService, InboxService],
})
export class PlatformEventsModule {}
