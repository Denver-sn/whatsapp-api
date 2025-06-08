import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { WhatsappModule } from "./whatsapp/whatsapp.module";
import { ConversationsModule } from "./conversations/conversations.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { WebsocketsModule } from "./websockets/websockets.module";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { validate } from "./config/env.validation";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
      validate,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>("MONGODB_URI"),
      }),
      inject: [ConfigService],
    }),
    WhatsappModule,
    ConversationsModule,
    WebhooksModule,
    WebsocketsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
