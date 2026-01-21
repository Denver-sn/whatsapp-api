import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Logger,
  HttpException,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { ConfigService } from "@nestjs/config";
import { SkipThrottle } from "@nestjs/throttler";
import { WhatsappService } from "./whatsapp.service";
import { WebhooksService } from "../services/webhooks.service";
import { ConversationsService } from "../services/conversations.service";
import { MessageStatusService } from "../services/message-status.service";
import { WebhookSignatureGuard } from "../common/guards/webhook-signature.guard";
import { DeliveryStatus } from "../schemas/message-status.schema";

@ApiTags("webhook")
@Controller("webhook")
@SkipThrottle() // Skip rate limiting for webhooks (Meta needs unrestricted access)
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);
  private readonly verifyToken: string;

  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly webhooksService: WebhooksService,
    private readonly conversationsService: ConversationsService,
    private readonly messageStatusService: MessageStatusService,
    private readonly configService: ConfigService
  ) {
    this.verifyToken = this.configService.getOrThrow<string>(
      "WHATSAPP_WEBHOOK_VERIFY_TOKEN"
    );
  }

  @Get("whatsapp")
  @ApiOperation({ summary: "Verify WhatsApp webhook" })
  @ApiQuery({ name: "hub.mode", required: true })
  @ApiQuery({ name: "hub.verify_token", required: true })
  @ApiQuery({ name: "hub.challenge", required: true })
  @ApiResponse({ status: 200, description: "Webhook verified successfully" })
  @ApiResponse({ status: 403, description: "Verification failed" })
  verifyWebhook(
    @Query("hub.mode") mode: string,
    @Query("hub.verify_token") token: string,
    @Query("hub.challenge") challenge: string
  ) {
    this.logger.log(
      `Webhook verification attempt - Mode: ${mode}, Token: ${token}`
    );

    if (mode === "subscribe" && token === this.verifyToken) {
      this.logger.log("Webhook verified successfully");
      return challenge;
    }

    this.logger.error("Webhook verification failed - Invalid token");
    throw new HttpException("Verification failed", HttpStatus.FORBIDDEN);
  }

  @Post("whatsapp")
  @UseGuards(WebhookSignatureGuard)
  @ApiOperation({ summary: "Receive WhatsApp webhook events" })
  @ApiResponse({ status: 200, description: "Webhook processed successfully" })
  @ApiResponse({ status: 401, description: "Invalid webhook signature" })
  async receiveWebhook(@Body() webhookData: any) {
    this.logger.log(
      "Received webhook data:",
      JSON.stringify(webhookData, null, 2)
    );

    try {
      // Sauvegarder le webhook
      const entry = webhookData.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value) {
        return { status: "ignored", message: "No value in webhook data" };
      }

      // Déterminer le type de webhook
      let webhookType = "unknown";
      if (value.messages) webhookType = "message";
      if (value.statuses) webhookType = "status";

      // Sauvegarder le webhook
      await this.webhooksService.addWebhook(webhookType, value);

      // Traiter les messages
      if (value.messages) {
        const message =
          this.whatsappService.processIncomingMessage(webhookData);

        if (message) {
          // Créer ou mettre à jour la conversation
          const conversation =
            await this.conversationsService.findByPhoneNumber(message.from);

          if (conversation) {
            // Mettre à jour la conversation existante
            await this.conversationsService.addMessage(conversation.id, {
              content: message.text,
              timestamp: new Date(
                parseInt(message.timestamp) * 1000
              ).toISOString(),
              direction: "incoming",
            });
          } else {
            // Créer une nouvelle conversation
            await this.conversationsService.create({
              contact: {
                name: message.contact.name,
                phoneNumber: message.from,
              },
              lastMessage: {
                content: message.text,
                timestamp: new Date(
                  parseInt(message.timestamp) * 1000
                ).toISOString(),
                direction: "incoming",
              },
              unreadCount: 1,
              messages: [
                {
                  content: message.text,
                  timestamp: new Date(
                    parseInt(message.timestamp) * 1000
                  ).toISOString(),
                  direction: "incoming",
                },
              ],
            });
          }

          // Traiter le message reçu
          await this.whatsappService.handleIncomingMessage(message);
        }
      }

      // Traiter les statuts
      if (value.statuses) {
        const statuses = value.statuses;
        this.logger.log(
          `Message status update received:`,
          JSON.stringify(statuses)
        );

        // Mettre à jour le statut des messages
        for (const status of statuses) {
          // Map WhatsApp status to our DeliveryStatus enum
          const deliveryStatus = this.mapWhatsAppStatus(status.status);
          const timestamp = new Date(parseInt(status.timestamp) * 1000);

          // Update message status with error info if failed
          let errorCode: string | undefined;
          let errorMessage: string | undefined;

          if (status.errors && status.errors.length > 0) {
            errorCode = status.errors[0].code?.toString();
            errorMessage = status.errors[0].title || status.errors[0].message;
          }

          await this.messageStatusService.updateStatus(
            status.id,
            deliveryStatus,
            timestamp,
            errorCode,
            errorMessage
          );

          // Also update webhook status
          await this.webhooksService.updateStatus(status.id, status.status);
        }
      }

      return { status: "ok" };
    } catch (error: unknown) {
      const err = error as Error & { stack?: string };
      this.logger.error(
        `Error processing webhook: ${err.message}`,
        err.stack
      );
      return { status: "error", message: err.message };
    }
  }

  @Get("test")
  @ApiOperation({ summary: "Test webhook endpoint" })
  @ApiResponse({ status: 200, description: "Webhook test successful" })
  testWebhook() {
    return {
      message: "Webhook endpoint is working!",
      timestamp: new Date().toISOString(),
      verifyToken: this.verifyToken ? "configured" : "not configured",
    };
  }

  /**
   * Map WhatsApp status string to DeliveryStatus enum
   */
  private mapWhatsAppStatus(whatsappStatus: string): DeliveryStatus {
    switch (whatsappStatus) {
      case "sent":
        return DeliveryStatus.SENT;
      case "delivered":
        return DeliveryStatus.DELIVERED;
      case "read":
        return DeliveryStatus.READ;
      case "failed":
        return DeliveryStatus.FAILED;
      default:
        return DeliveryStatus.PENDING;
    }
  }
}
