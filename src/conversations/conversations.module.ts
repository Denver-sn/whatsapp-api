import { Module, forwardRef } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ConversationsController } from "../controllers/conversations.controller";
import { ConversationsService } from "../services/conversations.service";
import {
  Conversation,
  ConversationSchema,
} from "../schemas/conversation.schema";
import { WhatsappModule } from "../whatsapp/whatsapp.module";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Conversation.name, schema: ConversationSchema },
    ]),
    forwardRef(() => WhatsappModule),
  ],
  controllers: [ConversationsController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
