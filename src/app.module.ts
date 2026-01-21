import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { WinstonModule } from "nest-winston";
import { winstonConfig } from "./common/logger/winston.config";
import { WhatsappModule } from "./whatsapp/whatsapp.module";
import { ConversationsModule } from "./conversations/conversations.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { WebsocketsModule } from "./websockets/websockets.module";
import { QueueModule } from "./queue/queue.module";
import { HealthModule } from "./health/health.module";
import { MessageStatusModule } from "./message-status/message-status.module";
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
    // Winston logging
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        winstonConfig(
          configService.get<string>("NODE_ENV", "development"),
          configService.get<string>("LOG_LEVEL", "debug")
        ),
    }),
    // Rate limiting configuration
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            name: "short",
            ttl: configService.get<number>("THROTTLE_SHORT_TTL", 1000),
            limit: configService.get<number>("THROTTLE_SHORT_LIMIT", 10),
          },
          {
            name: "medium",
            ttl: configService.get<number>("THROTTLE_MEDIUM_TTL", 10000),
            limit: configService.get<number>("THROTTLE_MEDIUM_LIMIT", 50),
          },
          {
            name: "long",
            ttl: configService.get<number>("THROTTLE_LONG_TTL", 60000),
            limit: configService.get<number>("THROTTLE_LONG_LIMIT", 200),
          },
        ],
      }),
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
    QueueModule,
    HealthModule,
    MessageStatusModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global rate limiting guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
