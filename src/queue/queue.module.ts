import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WhatsappQueueProcessor } from './processors/whatsapp-queue.processor';
import { QueueService } from './queue.service';
import { QueueController } from './queue.controller';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { WHATSAPP_QUEUE } from './queue.constants';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD', ''),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: {
            count: 100,
            age: 24 * 3600, // 24 hours
          },
          removeOnFail: {
            count: 500,
            age: 7 * 24 * 3600, // 7 days
          },
        },
      }),
    }),
    BullModule.registerQueue({
      name: WHATSAPP_QUEUE,
    }),
    forwardRef(() => WhatsappModule),
  ],
  controllers: [QueueController],
  providers: [WhatsappQueueProcessor, QueueService],
  exports: [QueueService, BullModule],
})
export class QueueModule {}

// Re-export for convenience
export { WHATSAPP_QUEUE } from './queue.constants';
