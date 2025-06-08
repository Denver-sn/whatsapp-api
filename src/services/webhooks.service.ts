import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Webhook } from "../schemas/webhook.schema";
import type { WebhookStats } from "../models/webhook.model";

@Injectable()
export class WebhooksService {
  constructor(
    @InjectModel(Webhook.name)
    private readonly webhookModel: Model<Webhook>
  ) {}

  async getRecent(): Promise<Webhook[]> {
    return this.webhookModel.find().sort({ timestamp: -1 }).limit(10).exec();
  }

  async getStats(): Promise<WebhookStats> {
    const [total, processed, pending, failed] = await Promise.all([
      this.webhookModel.countDocuments(),
      this.webhookModel.countDocuments({ status: "processed" }),
      this.webhookModel.countDocuments({ status: "pending" }),
      this.webhookModel.countDocuments({ status: "failed" }),
    ]);

    return {
      total,
      processed,
      pending,
      failed,
    };
  }

  async addWebhook(type: string, payload: any): Promise<Webhook> {
    const webhook = new this.webhookModel({
      type,
      payload,
      timestamp: new Date().toISOString(),
      status: "pending",
    });

    return webhook.save();
  }

  async updateStatus(messageId: string, status: string): Promise<void> {
    // Trouver le webhook par l'ID du message dans le payload
    const webhook = await this.webhookModel.findOne({
      "payload.messages.id": messageId,
    });

    if (webhook) {
      webhook.status = this.mapWhatsAppStatusToWebhookStatus(status);
      await webhook.save();
    }
  }

  private mapWhatsAppStatusToWebhookStatus(
    status: string
  ): "processed" | "pending" | "failed" {
    switch (status.toLowerCase()) {
      case "sent":
      case "delivered":
      case "read":
        return "processed";
      case "failed":
        return "failed";
      default:
        return "pending";
    }
  }

  // Méthode utilitaire pour créer des données de test
  async seed() {
    if ((await this.webhookModel.countDocuments()) === 0) {
      await this.webhookModel.create([
        {
          type: "message",
          payload: {
            from: "+221777460452",
            text: "Hello, I need assistance with my order",
          },
          timestamp: new Date().toISOString(),
          status: "processed",
        },
        {
          type: "status",
          payload: {
            from: "+221777460452",
            status: "delivered",
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
          status: "processed",
        },
        {
          type: "message",
          payload: {
            from: "+221777460453",
            text: "When will my order arrive?",
          },
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          status: "pending",
        },
      ]);
    }
  }
}
