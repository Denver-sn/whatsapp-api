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
  SendMediaMessageDto,
  MediaType,
} from "./dto/send-media-message.dto";
import {
  SendReplyButtonsDto,
  SendListMessageDto,
  SendCtaButtonDto,
} from "./dto/send-interactive-message.dto";
import {
  WhatsappApiResponse,
  WhatsappMessage,
  MediaPayload,
} from "./interfaces/whatsapp.interface";
import { ConversationsService } from "../services/conversations.service";
import { WebhooksService } from "../services/webhooks.service";

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly phoneNumberId: string;

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
    } catch (error: unknown) {
      const err = error as Error & { response?: { status: number; data: { error?: { message?: string } } }; stack?: string };
      this.logger.error(
        `Failed to send message: ${err.message}`,
        err.stack
      );

      if (err.response) {
        const { status, data } = err.response;
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

  /**
   * Send a media message (image, video, audio, document, sticker)
   */
  async sendMediaMessage(
    dto: SendMediaMessageDto
  ): Promise<WhatsappApiResponse> {
    try {
      const { to, mediaType, url, mediaId, caption, filename } = dto;

      // Build media payload
      const mediaPayload: MediaPayload = {};
      if (url) {
        mediaPayload.link = url;
      } else if (mediaId) {
        mediaPayload.id = mediaId;
      } else {
        throw new HttpException(
          "Either url or mediaId must be provided",
          HttpStatus.BAD_REQUEST
        );
      }

      // Add caption (not supported for audio and sticker)
      if (caption && mediaType !== MediaType.AUDIO && mediaType !== MediaType.STICKER) {
        mediaPayload.caption = caption;
      }

      // Add filename (only for documents)
      if (filename && mediaType === MediaType.DOCUMENT) {
        mediaPayload.filename = filename;
      }

      const payload = {
        messaging_product: "whatsapp",
        to,
        type: mediaType,
        [mediaType]: mediaPayload,
      };

      this.logger.debug(`Sending ${mediaType} to ${to}: ${JSON.stringify(payload)}`);

      const response: AxiosResponse<WhatsappApiResponse> = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/messages`, payload, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        })
      );

      // Save outgoing webhook
      await this.webhooksService.addWebhook(`${mediaType}_sent`, {
        ...payload,
        status: "sent",
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`${mediaType} sent successfully to ${to}`);
      return response.data;
    } catch (error: unknown) {
      const err = error as Error & { response?: { status: number; data: { error?: { message?: string } } }; stack?: string };
      this.logger.error(
        `Failed to send ${dto.mediaType}: ${err.message}`,
        err.stack
      );

      if (err.response) {
        const { status, data } = err.response;
        throw new HttpException(
          `WhatsApp API Error: ${data.error?.message || "Unknown error"}`,
          status
        );
      }

      throw new HttpException(
        `Failed to send WhatsApp ${dto.mediaType}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Send an image message
   */
  async sendImageMessage(
    to: string,
    urlOrMediaId: string,
    caption?: string,
    isMediaId: boolean = false
  ): Promise<WhatsappApiResponse> {
    return this.sendMediaMessage({
      to,
      mediaType: MediaType.IMAGE,
      ...(isMediaId ? { mediaId: urlOrMediaId } : { url: urlOrMediaId }),
      caption,
    });
  }

  /**
   * Send a video message
   */
  async sendVideoMessage(
    to: string,
    urlOrMediaId: string,
    caption?: string,
    isMediaId: boolean = false
  ): Promise<WhatsappApiResponse> {
    return this.sendMediaMessage({
      to,
      mediaType: MediaType.VIDEO,
      ...(isMediaId ? { mediaId: urlOrMediaId } : { url: urlOrMediaId }),
      caption,
    });
  }

  /**
   * Send an audio message
   */
  async sendAudioMessage(
    to: string,
    urlOrMediaId: string,
    isMediaId: boolean = false
  ): Promise<WhatsappApiResponse> {
    return this.sendMediaMessage({
      to,
      mediaType: MediaType.AUDIO,
      ...(isMediaId ? { mediaId: urlOrMediaId } : { url: urlOrMediaId }),
    });
  }

  /**
   * Send a document message
   */
  async sendDocumentMessage(
    to: string,
    urlOrMediaId: string,
    caption?: string,
    filename?: string,
    isMediaId: boolean = false
  ): Promise<WhatsappApiResponse> {
    return this.sendMediaMessage({
      to,
      mediaType: MediaType.DOCUMENT,
      ...(isMediaId ? { mediaId: urlOrMediaId } : { url: urlOrMediaId }),
      caption,
      filename,
    });
  }

  /**
   * Send a sticker message
   */
  async sendStickerMessage(
    to: string,
    urlOrMediaId: string,
    isMediaId: boolean = false
  ): Promise<WhatsappApiResponse> {
    return this.sendMediaMessage({
      to,
      mediaType: MediaType.STICKER,
      ...(isMediaId ? { mediaId: urlOrMediaId } : { url: urlOrMediaId }),
    });
  }

  async sendTemplateMessage(
    to: string,
    templateName: string,
    _languageCode: string = "en",
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
    } catch (error: unknown) {
      const err = error as Error & { stack?: string };
      this.logger.error(
        `Failed to send template message: ${err.message}`,
        err.stack
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
    } catch (error: unknown) {
      const err = error as Error & { response?: { status: number; data: { error?: { message?: string } } }; stack?: string };
      this.logger.error(
        `Failed to send OTP message: ${err.message}`,
        err.stack
      );

      if (err.response) {
        const { status, data } = err.response;
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

      // Extract text based on message type
      let text = "";
      let media = undefined;

      switch (message.type) {
        case "text":
          text = message.text?.body || "";
          break;
        case "image":
          text = message.image?.caption || "[Image]";
          media = {
            id: message.image?.id,
            mimeType: message.image?.mime_type,
            sha256: message.image?.sha256,
            caption: message.image?.caption,
          };
          break;
        case "video":
          text = message.video?.caption || "[Video]";
          media = {
            id: message.video?.id,
            mimeType: message.video?.mime_type,
            sha256: message.video?.sha256,
            caption: message.video?.caption,
          };
          break;
        case "audio":
          text = "[Audio]";
          media = {
            id: message.audio?.id,
            mimeType: message.audio?.mime_type,
            sha256: message.audio?.sha256,
          };
          break;
        case "document":
          text = message.document?.caption || `[Document: ${message.document?.filename || "file"}]`;
          media = {
            id: message.document?.id,
            mimeType: message.document?.mime_type,
            sha256: message.document?.sha256,
            filename: message.document?.filename,
            caption: message.document?.caption,
          };
          break;
        case "sticker":
          text = "[Sticker]";
          media = {
            id: message.sticker?.id,
            mimeType: message.sticker?.mime_type,
            sha256: message.sticker?.sha256,
          };
          break;
        case "location":
          text = `[Location: ${message.location?.name || ""} ${message.location?.address || ""}]`.trim();
          break;
        default:
          text = `[${message.type}]`;
      }

      const processedMessage: WhatsappMessage = {
        id: message.id,
        from: message.from,
        timestamp: message.timestamp,
        type: message.type,
        text,
        contact: {
          name: contact?.profile?.name || "Unknown",
          wa_id: contact?.wa_id || message.from,
        },
        ...(media && { media }),
      };

      this.logger.log(
        `Received ${message.type} message from ${processedMessage.from}: ${processedMessage.text}`
      );
      return processedMessage;
    } catch (error: unknown) {
      const err = error as Error & { stack?: string };
      this.logger.error(
        `Failed to process incoming message: ${err.message}`,
        err.stack
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
    } catch (error: unknown) {
      const err = error as Error & { stack?: string };
      this.logger.error(
        `Failed to handle incoming message: ${err.message}`,
        err.stack
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
    } catch (error: unknown) {
      const err = error as Error & { response?: { status: number; data: { error?: { message?: string } } }; stack?: string };
      this.logger.error(
        `Erreur lors de l'envoi du template à ${to}: ${err.message}`,
        err.response?.data || err.stack
      );

      if (err.response?.data) {
        this.logger.error(
          "WhatsApp API error details:",
          JSON.stringify(err.response.data, null, 2)
        );
      }

      throw new HttpException(
        `Erreur lors de l'envoi du template WhatsApp: ${err.response?.data?.error?.message || err.message}`,
        err.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Send a reply buttons message (up to 3 buttons)
   */
  async sendReplyButtons(dto: SendReplyButtonsDto): Promise<WhatsappApiResponse> {
    try {
      const { to, body, header, footer, buttons } = dto;

      const interactive: any = {
        type: "button",
        body: { text: body.text },
        action: {
          buttons: buttons.map((btn) => ({
            type: "reply",
            reply: {
              id: btn.id,
              title: btn.title,
            },
          })),
        },
      };

      if (header) {
        if (header.type === "text") {
          interactive.header = { type: "text", text: header.text };
        } else if (header.url) {
          interactive.header = { type: header.type, [header.type]: { link: header.url } };
        } else if (header.mediaId) {
          interactive.header = { type: header.type, [header.type]: { id: header.mediaId } };
        }
      }

      if (footer) {
        interactive.footer = { text: footer.text };
      }

      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "interactive",
        interactive,
      };

      this.logger.debug(`Sending reply buttons to ${to}: ${JSON.stringify(payload)}`);

      const response: AxiosResponse<WhatsappApiResponse> = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/messages`, payload, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        })
      );

      await this.webhooksService.addWebhook("interactive_button_sent", {
        ...payload,
        status: "sent",
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`Reply buttons sent successfully to ${to}`);
      return response.data;
    } catch (error: unknown) {
      const err = error as Error & { response?: { status: number; data: { error?: { message?: string } } }; stack?: string };
      this.logger.error(`Failed to send reply buttons: ${err.message}`, err.stack);

      if (err.response) {
        const { status, data } = err.response;
        throw new HttpException(
          `WhatsApp API Error: ${data.error?.message || "Unknown error"}`,
          status
        );
      }

      throw new HttpException(
        "Failed to send WhatsApp reply buttons",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Send a list message (up to 10 sections with rows)
   */
  async sendListMessage(dto: SendListMessageDto): Promise<WhatsappApiResponse> {
    try {
      const { to, body, header, footer, buttonText, sections } = dto;

      const interactive: any = {
        type: "list",
        body: { text: body.text },
        action: {
          button: buttonText,
          sections: sections.map((section) => ({
            ...(section.title && { title: section.title }),
            rows: section.rows.map((row) => ({
              id: row.id,
              title: row.title,
              ...(row.description && { description: row.description }),
            })),
          })),
        },
      };

      if (header && header.type === "text") {
        interactive.header = { type: "text", text: header.text };
      }

      if (footer) {
        interactive.footer = { text: footer.text };
      }

      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "interactive",
        interactive,
      };

      this.logger.debug(`Sending list message to ${to}: ${JSON.stringify(payload)}`);

      const response: AxiosResponse<WhatsappApiResponse> = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/messages`, payload, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        })
      );

      await this.webhooksService.addWebhook("interactive_list_sent", {
        ...payload,
        status: "sent",
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`List message sent successfully to ${to}`);
      return response.data;
    } catch (error: unknown) {
      const err = error as Error & { response?: { status: number; data: { error?: { message?: string } } }; stack?: string };
      this.logger.error(`Failed to send list message: ${err.message}`, err.stack);

      if (err.response) {
        const { status, data } = err.response;
        throw new HttpException(
          `WhatsApp API Error: ${data.error?.message || "Unknown error"}`,
          status
        );
      }

      throw new HttpException(
        "Failed to send WhatsApp list message",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Send a CTA URL button message
   */
  async sendCtaButton(dto: SendCtaButtonDto): Promise<WhatsappApiResponse> {
    try {
      const { to, body, header, footer, button } = dto;

      const interactive: any = {
        type: "cta_url",
        body: { text: body.text },
        action: {
          name: "cta_url",
          parameters: {
            display_text: button.displayText,
            url: button.url,
          },
        },
      };

      if (header) {
        if (header.type === "text") {
          interactive.header = { type: "text", text: header.text };
        } else if (header.url) {
          interactive.header = { type: header.type, [header.type]: { link: header.url } };
        } else if (header.mediaId) {
          interactive.header = { type: header.type, [header.type]: { id: header.mediaId } };
        }
      }

      if (footer) {
        interactive.footer = { text: footer.text };
      }

      const payload = {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to,
        type: "interactive",
        interactive,
      };

      this.logger.debug(`Sending CTA button to ${to}: ${JSON.stringify(payload)}`);

      const response: AxiosResponse<WhatsappApiResponse> = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/messages`, payload, {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
          },
        })
      );

      await this.webhooksService.addWebhook("interactive_cta_sent", {
        ...payload,
        status: "sent",
        timestamp: new Date().toISOString(),
      });

      this.logger.log(`CTA button sent successfully to ${to}`);
      return response.data;
    } catch (error: unknown) {
      const err = error as Error & { response?: { status: number; data: { error?: { message?: string } } }; stack?: string };
      this.logger.error(`Failed to send CTA button: ${err.message}`, err.stack);

      if (err.response) {
        const { status, data } = err.response;
        throw new HttpException(
          `WhatsApp API Error: ${data.error?.message || "Unknown error"}`,
          status
        );
      }

      throw new HttpException(
        "Failed to send WhatsApp CTA button",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
