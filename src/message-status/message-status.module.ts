import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MessageStatus, MessageStatusSchema } from '../schemas/message-status.schema';
import { MessageStatusService } from '../services/message-status.service';
import { MessageStatusController } from './message-status.controller';
import { WebsocketsModule } from '../websockets/websockets.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: MessageStatus.name, schema: MessageStatusSchema },
    ]),
    WebsocketsModule,
  ],
  controllers: [MessageStatusController],
  providers: [MessageStatusService],
  exports: [MessageStatusService],
})
export class MessageStatusModule {}
