import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class WebhookSignatureGuard implements CanActivate {
  private readonly logger = new Logger(WebhookSignatureGuard.name);
  private readonly appSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.appSecret = this.configService.get<string>('WHATSAPP_APP_SECRET', '');
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const signature = request.headers['x-hub-signature-256'];

    // Si pas de secret configuré, on log un warning mais on laisse passer (dev mode)
    if (!this.appSecret) {
      this.logger.warn(
        'WHATSAPP_APP_SECRET not configured - webhook signature verification skipped',
      );
      return true;
    }

    // Vérifier que la signature est présente
    if (!signature) {
      this.logger.error('Missing X-Hub-Signature-256 header');
      throw new UnauthorizedException('Missing webhook signature');
    }

    // Récupérer le body raw pour la vérification
    const rawBody = request.rawBody;
    if (!rawBody) {
      this.logger.error('Raw body not available for signature verification');
      throw new UnauthorizedException('Cannot verify webhook signature');
    }

    // Vérifier la signature
    const isValid = this.verifySignature(rawBody, signature);

    if (!isValid) {
      this.logger.error('Invalid webhook signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.debug('Webhook signature verified successfully');
    return true;
  }

  private verifySignature(payload: Buffer | string, signature: string): boolean {
    try {
      const expectedSignature =
        'sha256=' +
        crypto
          .createHmac('sha256', this.appSecret)
          .update(payload)
          .digest('hex');

      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Signature verification error: ${err.message}`);
      return false;
    }
  }
}
