import { Controller, Post, Body, Get, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { WhatsappService } from "./whatsapp.service";
import { SendMessageDto } from "./dto/send-message.dto";
import { SendTextMessageDto } from "./dto/send-text-message.dto";
import { SendTemplateMessageDto } from "./dto/send-template-message.dto";
import { SendOtpMessageDto } from "./dto/send-otp-message.dto";
import {
  SendMediaMessageDto,
  SendImageMessageDto,
  SendDocumentMessageDto,
  SendVideoMessageDto,
  SendAudioMessageDto,
  SendStickerMessageDto,
} from "./dto/send-media-message.dto";
import {
  SendReplyButtonsDto,
  SendListMessageDto,
  SendCtaButtonDto,
} from "./dto/send-interactive-message.dto";

@ApiTags("whatsapp")
@Controller("whatsapp")
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post("send")
  @ApiOperation({ summary: "Send a WhatsApp message" })
  @ApiBody({ type: SendMessageDto })
  @ApiResponse({ status: 201, description: "Message sent successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  async sendMessage(@Body() sendMessageDto: SendMessageDto) {
    return this.whatsappService.sendMessage(sendMessageDto);
  }

  @Post("send/text")
  @ApiOperation({ summary: "Send a text message to WhatsApp" })
  @ApiBody({ type: SendTextMessageDto })
  @ApiResponse({ status: 201, description: "Text message sent successfully" })
  async sendTextMessage(@Body() sendTextMessageDto: SendTextMessageDto) {
    const { to, text } = sendTextMessageDto;
    return this.whatsappService.sendTextMessage(to, text);
  }

  @Post("send/template")
  @ApiOperation({ summary: "Send a template message to WhatsApp" })
  @ApiBody({ type: SendTemplateMessageDto })
  @ApiResponse({
    status: 201,
    description: "Template message sent successfully",
  })
  async sendTemplateMessage(
    @Body() sendTemplateMessageDto: SendTemplateMessageDto
  ) {
    const { to, templateName, languageCode, components } =
      sendTemplateMessageDto;
    return this.whatsappService.sendTemplateMessage(
      to,
      templateName,
      languageCode,
      components
    );
  }

  @Post("send/otp")
  @ApiOperation({ summary: "Send an OTP message via WhatsApp template" })
  @ApiBody({ type: SendOtpMessageDto })
  @ApiResponse({ status: 201, description: "OTP message sent successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 500, description: "Internal server error" })
  async sendOtpMessage(@Body() sendOtpMessageDto: SendOtpMessageDto) {
    const { to, otp } = sendOtpMessageDto;
    return this.whatsappService.sendOtpMessage(to, otp);
  }

  @Get("test/:phoneNumber")
  @ApiOperation({ summary: "Send a test message to a phone number" })
  @ApiResponse({ status: 200, description: "Test message sent" })
  async sendTestMessage(@Param("phoneNumber") phoneNumber: string) {
    const testMessage = `Bonjour! Ceci est un message de test envoyé à ${new Date().toLocaleString("fr-FR")}`;
    return this.whatsappService.sendTextMessage(phoneNumber, testMessage);
  }

  // ==================== MEDIA ENDPOINTS ====================

  @Post("send/media")
  @ApiOperation({ summary: "Send a media message (image, video, audio, document, sticker)" })
  @ApiBody({ type: SendMediaMessageDto })
  @ApiResponse({ status: 201, description: "Media message sent successfully" })
  @ApiResponse({ status: 400, description: "Bad request - invalid media type or missing url/mediaId" })
  async sendMediaMessage(@Body() dto: SendMediaMessageDto) {
    return this.whatsappService.sendMediaMessage(dto);
  }

  @Post("send/image")
  @ApiOperation({ summary: "Send an image message" })
  @ApiBody({ type: SendImageMessageDto })
  @ApiResponse({ status: 201, description: "Image sent successfully" })
  async sendImageMessage(@Body() dto: SendImageMessageDto) {
    const { to, url, mediaId, caption } = dto;
    if (mediaId) {
      return this.whatsappService.sendImageMessage(to, mediaId, caption, true);
    }
    if (!url) {
      throw new Error("Either url or mediaId must be provided");
    }
    return this.whatsappService.sendImageMessage(to, url, caption, false);
  }

  @Post("send/video")
  @ApiOperation({ summary: "Send a video message" })
  @ApiBody({ type: SendVideoMessageDto })
  @ApiResponse({ status: 201, description: "Video sent successfully" })
  async sendVideoMessage(@Body() dto: SendVideoMessageDto) {
    const { to, url, mediaId, caption } = dto;
    if (mediaId) {
      return this.whatsappService.sendVideoMessage(to, mediaId, caption, true);
    }
    if (!url) {
      throw new Error("Either url or mediaId must be provided");
    }
    return this.whatsappService.sendVideoMessage(to, url, caption, false);
  }

  @Post("send/audio")
  @ApiOperation({ summary: "Send an audio message" })
  @ApiBody({ type: SendAudioMessageDto })
  @ApiResponse({ status: 201, description: "Audio sent successfully" })
  async sendAudioMessage(@Body() dto: SendAudioMessageDto) {
    const { to, url, mediaId } = dto;
    if (mediaId) {
      return this.whatsappService.sendAudioMessage(to, mediaId, true);
    }
    if (!url) {
      throw new Error("Either url or mediaId must be provided");
    }
    return this.whatsappService.sendAudioMessage(to, url, false);
  }

  @Post("send/document")
  @ApiOperation({ summary: "Send a document message" })
  @ApiBody({ type: SendDocumentMessageDto })
  @ApiResponse({ status: 201, description: "Document sent successfully" })
  async sendDocumentMessage(@Body() dto: SendDocumentMessageDto) {
    const { to, url, mediaId, caption, filename } = dto;
    if (mediaId) {
      return this.whatsappService.sendDocumentMessage(to, mediaId, caption, filename, true);
    }
    if (!url) {
      throw new Error("Either url or mediaId must be provided");
    }
    return this.whatsappService.sendDocumentMessage(to, url, caption, filename, false);
  }

  @Post("send/sticker")
  @ApiOperation({ summary: "Send a sticker message" })
  @ApiBody({ type: SendStickerMessageDto })
  @ApiResponse({ status: 201, description: "Sticker sent successfully" })
  async sendStickerMessage(@Body() dto: SendStickerMessageDto) {
    const { to, url, mediaId } = dto;
    if (mediaId) {
      return this.whatsappService.sendStickerMessage(to, mediaId, true);
    }
    if (!url) {
      throw new Error("Either url or mediaId must be provided");
    }
    return this.whatsappService.sendStickerMessage(to, url, false);
  }

  // ==================== INTERACTIVE MESSAGE ENDPOINTS ====================

  @Post("send/buttons")
  @ApiOperation({ summary: "Send a reply buttons message (up to 3 buttons)" })
  @ApiBody({ type: SendReplyButtonsDto })
  @ApiResponse({ status: 201, description: "Reply buttons sent successfully" })
  @ApiResponse({ status: 400, description: "Bad request - invalid button configuration" })
  async sendReplyButtons(@Body() dto: SendReplyButtonsDto) {
    return this.whatsappService.sendReplyButtons(dto);
  }

  @Post("send/list")
  @ApiOperation({ summary: "Send a list message with selectable options" })
  @ApiBody({ type: SendListMessageDto })
  @ApiResponse({ status: 201, description: "List message sent successfully" })
  @ApiResponse({ status: 400, description: "Bad request - invalid list configuration" })
  async sendListMessage(@Body() dto: SendListMessageDto) {
    return this.whatsappService.sendListMessage(dto);
  }

  @Post("send/cta")
  @ApiOperation({ summary: "Send a CTA URL button message" })
  @ApiBody({ type: SendCtaButtonDto })
  @ApiResponse({ status: 201, description: "CTA button sent successfully" })
  @ApiResponse({ status: 400, description: "Bad request - invalid CTA configuration" })
  async sendCtaButton(@Body() dto: SendCtaButtonDto) {
    return this.whatsappService.sendCtaButton(dto);
  }
}
