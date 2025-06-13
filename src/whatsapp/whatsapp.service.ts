import {
  Injectable,
  Logger,
  HttpException,
  HttpStatus,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import axios from "axios";
import { firstValueFrom } from "rxjs";
import { AxiosResponse } from "axios";
import { SendMessageDto, MessageType } from "./dto/send-message.dto";
import {
  WhatsappApiResponse,
  WhatsappMessage,
} from "./interfaces/whatsapp.interface";
import { ConversationsService } from "../services/conversations.service";
import { WebhooksService } from "../services/webhooks.service";

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly phoneNumberId: string;
  private readonly apiUrl: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject(forwardRef(() => ConversationsService))
    private readonly conversationsService: ConversationsService,
    private readonly webhooksService: WebhooksService
  ) {
    this.accessToken = this.configService.getOrThrow<string>("WHATSAPP_ACCESS_TOKEN");
    this.phoneNumberId = this.configService.getOrThrow<string>(
      "WHATSAPP_PHONE_NUMBER_ID"
    );
    const apiVersion = this.configService.getOrThrow<string>(
      "WHATSAPP_API_VERSION",
      "v18.0"
    );

    this.baseUrl = `https://graph.facebook.com/${apiVersion}/${this.phoneNumberId}`;

    this.logger.log("WhatsApp service initialized");
  }

  async sendMessage(
    sendMessageDto: SendMessageDto
  ): Promise<WhatsappApiResponse> {
    try {
      const { to, message, type = "text" } = sendMessageDto;

      const payload = {
        messaging_product: "whatsapp",
        to,
        type,
        [type]: type === "text" ? { body: message } : message,
      };

      this.logger.debug(`Sending message to ${to}: ${JSON.stringify(payload)}`);

      const response: AxiosResponse<WhatsappApiResponse> = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/messages`, payload, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        })
      );

      // Sauvegarder le webhook sortant
      await this.webhooksService.addWebhook("message_sent", {
        ...payload,
        status: "sent",
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Message sent successfully to ${to}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to send message: ${error.message}`,
        error.stack
      );

      if (error.response) {
        const { status, data } = error.response;
        throw new HttpException(
          `WhatsApp API Error: ${data.error?.message || "Unknown error"}`,
          status
        );
      }

      throw new HttpException(
        "Failed to send WhatsApp message",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async sendTextMessage(
    to: string,
    text: string
  ): Promise<WhatsappApiResponse> {
    return this.sendMessage({
      to,
      message: text,
      type: MessageType.TEXT,
    });
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = "en",
    components?: any[]
  ): Promise<WhatsappApiResponse> {
    try {
      const payload = {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: {
            code: "fr",
          },
          ...(components && { components }),
        },
      };

      this.logger.debug(`Sending template message to ${to}: ${templateName}`);

      const response: AxiosResponse<WhatsappApiResponse> = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/messages`, payload, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        })
      );

      // Sauvegarder le webhook sortant
      await this.webhooksService.addWebhook("template_sent", {
        ...payload,
        status: "sent",
        timestamp: new Date().toISOString(),
      });

      // Mettre à jour la conversation
      const conversation =
        await this.conversationsService.findByPhoneNumber(to);
      if (conversation) {
        await this.conversationsService.addMessage(conversation.id, {
          content: `Template: ${templateName}`,
          timestamp: new Date().toISOString(),
          direction: "outgoing",
        });
      }

      this.logger.log(`Template message sent successfully to ${to}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to send template message: ${error.message}`,
        error.stack
      );
      throw new HttpException(
        "Failed to send WhatsApp template message",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  async sendOtpMessage(to: string, otp: string): Promise<WhatsappApiResponse> {
    try {
      const payload = {
        messaging_product: "whatsapp",
        type: "template",
        recipient_type: "individual",
        to,
        template: {
          name: "verifkit_otp",
          language: {
            policy: "deterministic",
            code: "fr",
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: otp,
                },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [
                {
                  type: "text",
                  text: "Copier",
                },
              ],
            },
          ],
        },
      };

      const url = `${this.baseUrl}/messages`;
      this.logger.debug(`Sending OTP message to ${to}`);
      this.logger.debug(`Using URL: ${url}`);
      this.logger.debug(`Using payload: ${JSON.stringify(payload, null, 2)}`);

      const response: AxiosResponse<WhatsappApiResponse> = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        })
      );

      // Sauvegarder le webhook sortant
      await this.webhooksService.addWebhook("otp_sent", {
        ...payload,
        status: "sent",
        timestamp: new Date().toISOString(),
      });

      // Mettre à jour la conversation
      const conversation =
        await this.conversationsService.findByPhoneNumber(to);
      if (conversation) {
        // await this.conversationsService.addMessage(conversation.id, {
        //   content: `OTP sent: ${otp}`,
        //   timestamp: new Date().toISOString(),
        //   direction: "outgoing",
        // });
      }

      this.logger.log(`OTP message sent successfully to ${to}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to send OTP message: ${error.message}`,
        error.stack
      );

      if (error.response) {
        const { status, data } = error.response;
        this.logger.error(
          `API Error Response: ${JSON.stringify(data, null, 2)}`
        );
        throw new HttpException(
          `WhatsApp API Error: ${data.error?.message || "Unknown error"}`,
          status
        );
      }

      throw new HttpException(
        "Failed to send WhatsApp OTP message",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  processIncomingMessage(webhookData: any): WhatsappMessage | null {
    try {
      const entry = webhookData.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value?.messages?.[0]) {
        this.logger.debug("No message found in webhook data");
        return null;
      }

      const message = value.messages[0];
      const contact = value.contacts?.[0];

      const processedMessage: WhatsappMessage = {
        id: message.id,
        from: message.from,
        timestamp: message.timestamp,
        type: message.type,
        text: message.text?.body || "",
        contact: {
          name: contact?.profile?.name || "Unknown",
          wa_id: contact?.wa_id || message.from,
        },
      };

      this.logger.log(
        `Received message from ${processedMessage.from}: ${processedMessage.text}`
      );
      return processedMessage;
    } catch (error) {
      this.logger.error(
        `Failed to process incoming message: ${error.message}`,
        error.stack
      );
      return null;
    }
  }

  async handleIncomingMessage(message: WhatsappMessage): Promise<void> {
    try {
      // Vérifier si une conversation existe déjà
      const conversation = await this.conversationsService.findByPhoneNumber(
        message.from
      );

      if (conversation) {
        // Mettre à jour la conversation existante
        await this.conversationsService.addMessage(conversation.id, {
          content: message.text,
          timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString(),
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

      // Envoyer une réponse automatique uniquement pour les nouveaux messages entrants
      const responseText = `Hello ${message.contact.name}! J'ai bien reçu votre message. Malheuresement je ne suis qu'un bot et je ne peux pas répondre à vos messages. Veuillez contacter un de nos agents via le numero +221773435776`;

      // Envoyer le message sans passer par le service de conversations pour éviter la boucle
      await this.sendMessage({
        to: message.from,
        message: responseText,
        type: MessageType.TEXT,
      });

      this.logger.log(`Auto-response sent to ${message.from}`);
    } catch (error) {
      this.logger.error(
        `Failed to handle incoming message: ${error.message}`,
        error.stack
      );
    }
  }

  async sendTemplate(
    to: string,
    templateName: string,
    components: string[]
  ): Promise<any> {
    try {
      this.logger.debug(
        `Sending template "${templateName}" to ${to} with components:`,
        components
      );

      const payload = {
        messaging_product: "whatsapp",
        type: "template",
        recipient_type: "individual",
        to,
        template: {
          name: templateName,
          language: {
            policy: "deterministic",
            code: "fr",
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: components[0],
                  parameter_name: "name",
                },
                {
                  type: "text",
                  text: components[1],
                  parameter_name: "context",
                },
              ],
            },
          ],
        },
      };

      const url = `${this.baseUrl}/messages`;
      this.logger.debug(`Sending template message to ${to}`);
      this.logger.debug(`Using URL: ${url}`);
      this.logger.debug(`Using payload: ${JSON.stringify(payload, null, 2)}`);

      const response = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          "Content-Type": "application/json",
        },
      });

      this.logger.log(`Template "${templateName}" envoyé avec succès à ${to}`);
      this.logger.debug("WhatsApp API response:", response.data);

      return response.data;
    } catch (error) {
      this.logger.error(
        `Erreur lors de l'envoi du template à ${to}: ${error.message}`,
        error.response?.data || error.stack
      );

      if (error.response?.data) {
        this.logger.error(
          "WhatsApp API error details:",
          JSON.stringify(error.response.data, null, 2)
        );
      }

      throw new HttpException(
        `Erreur lors de l'envoi du template WhatsApp: ${error.response?.data?.error?.message || error.message}`,
        error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
