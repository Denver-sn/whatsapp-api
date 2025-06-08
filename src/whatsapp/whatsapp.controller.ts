import { Controller, Post, Body, Get, Param } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from "@nestjs/swagger";
import { WhatsappService } from "./whatsapp.service";
import { SendMessageDto } from "./dto/send-message.dto";
import { SendTextMessageDto } from "./dto/send-text-message.dto";
import { SendTemplateMessageDto } from "./dto/send-template-message.dto";
import { SendOtpMessageDto } from "./dto/send-otp-message.dto";

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
}
