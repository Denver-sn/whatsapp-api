import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WhatsappHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(WhatsappHealthIndicator.name);
  private readonly baseUrl: string;
  private readonly accessToken: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    super();
    const phoneNumberId = this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID', '');
    const apiVersion = this.configService.get<string>('WHATSAPP_API_VERSION', 'v18.0');
    this.baseUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}`;
    this.accessToken = this.configService.get<string>('WHATSAPP_ACCESS_TOKEN', '');
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Check if credentials are configured
      if (!this.accessToken) {
        return this.getStatus(key, true, {
          status: 'not_configured',
          message: 'WhatsApp credentials not configured',
        });
      }

      // Make a simple API call to verify connectivity
      // We use the phone_numbers endpoint which is a lightweight call
      const response = await firstValueFrom(
        this.httpService.get(this.baseUrl, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
          timeout: 5000,
        }),
      );

      return this.getStatus(key, true, {
        status: 'connected',
        phoneNumberId: response.data.id,
        verifiedName: response.data.verified_name,
      });
    } catch (error) {
      const err = error as { response?: { data?: { error?: { message?: string } } }; message?: string };
      const errorMessage = err.response?.data?.error?.message || err.message || 'Unknown error';
      this.logger.warn(`WhatsApp API health check failed: ${errorMessage}`);

      // Don't fail the health check for WhatsApp - it's external
      // Just report the status
      return this.getStatus(key, true, {
        status: 'degraded',
        error: errorMessage,
        note: 'External service - not failing health check',
      });
    }
  }
}
