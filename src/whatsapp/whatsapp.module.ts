import { Module, forwardRef } from "@nestjs/common";
import { HttpModule } from "@nestjs/axios";
import { WhatsappController } from "./whatsapp.controller";
import { WhatsappService } from "./whatsapp.service";
import { WebhookController } from "./webhook.controller";
import { WebhooksModule } from "../webhooks/webhooks.module";
import { ConversationsModule } from "../conversations/conversations.module";
import { MessageStatusModule } from "../message-status/message-status.module";

@Module({
  imports: [
    HttpModule.register({
      timeout: 5000,
      maxRedirects: 5,
    }),
    WebhooksModule,
    forwardRef(() => ConversationsModule),
    MessageStatusModule,
  ],
  controllers: [WhatsappController, WebhookController],
  providers: [WhatsappService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
