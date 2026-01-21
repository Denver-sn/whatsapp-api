import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { MessageStatusService } from '../services/message-status.service';
import { DeliveryStatus } from '../schemas/message-status.schema';

@ApiTags('message-status')
@Controller('message-status')
export class MessageStatusController {
  constructor(private readonly messageStatusService: MessageStatusService) {}

  @Get('statistics')
  @ApiOperation({ summary: 'Get message delivery statistics' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Start date (ISO string)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'End date (ISO string)' })
  @ApiResponse({
    status: 200,
    description: 'Returns message delivery statistics',
    schema: {
      type: 'object',
      properties: {
        total: { type: 'number' },
        pending: { type: 'number' },
        sent: { type: 'number' },
        delivered: { type: 'number' },
        read: { type: 'number' },
        failed: { type: 'number' },
        deliveryRate: { type: 'number' },
        readRate: { type: 'number' },
      },
    },
  })
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.messageStatusService.getStatistics(start, end);
  }

  @Get('failed')
  @ApiOperation({ summary: 'Get failed messages' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Number of records to return' })
  @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Number of records to skip' })
  @ApiResponse({ status: 200, description: 'Returns list of failed messages' })
  async getFailedMessages(
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return this.messageStatusService.getFailedMessages(limit, offset);
  }

  @Get('by-status/:status')
  @ApiOperation({ summary: 'Get messages by delivery status' })
  @ApiParam({ name: 'status', enum: DeliveryStatus, description: 'Delivery status to filter by' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns messages filtered by status' })
  async getByStatus(
    @Param('status') status: DeliveryStatus,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return this.messageStatusService.getByStatus(status, limit, offset);
  }

  @Get('recipient/:phoneNumber')
  @ApiOperation({ summary: 'Get message statuses for a specific recipient' })
  @ApiParam({ name: 'phoneNumber', description: 'Recipient phone number' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Returns message statuses for the recipient' })
  async getByRecipient(
    @Param('phoneNumber') phoneNumber: string,
    @Query('limit') limit: number = 50,
    @Query('offset') offset: number = 0,
  ) {
    return this.messageStatusService.getByRecipient(phoneNumber, limit, offset);
  }

  @Get(':messageId')
  @ApiOperation({ summary: 'Get status for a specific message' })
  @ApiParam({ name: 'messageId', description: 'WhatsApp message ID' })
  @ApiResponse({ status: 200, description: 'Returns message status details' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async getByMessageId(@Param('messageId') messageId: string) {
    const status = await this.messageStatusService.getByMessageId(messageId);
    if (!status) {
      return { error: 'Message not found', messageId };
    }
    return status;
  }
}
