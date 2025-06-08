import { Controller, Get, Post, Body } from "@nestjs/common";
import { WebhooksService } from "../services/webhooks.service";

@Controller("webhook")
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Get("recent")
  getRecent() {
    return this.webhooksService.getRecent();
  }

  @Get("stats")
  getStats() {
    return this.webhooksService.getStats();
  }

  @Post()
  create(@Body() webhook: { type: string; payload: any }) {
    return this.webhooksService.addWebhook(webhook.type, webhook.payload);
  }
}
