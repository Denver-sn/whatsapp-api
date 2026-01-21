import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  MessageStatus,
  MessageStatusDocument,
  DeliveryStatus,
} from '../schemas/message-status.schema';
import { EventsGateway } from '../websockets/events.gateway';

@Injectable()
export class MessageStatusService {
  private readonly logger = new Logger(MessageStatusService.name);

  constructor(
    @InjectModel(MessageStatus.name)
    private readonly messageStatusModel: Model<MessageStatusDocument>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Create a new message status record when a message is sent
   */
  async createMessageStatus(
    messageId: string,
    recipientPhone: string,
    conversationId?: string,
    metadata?: Record<string, any>,
  ): Promise<MessageStatus> {
    const messageStatus = new this.messageStatusModel({
      messageId,
      recipientPhone,
      conversationId,
      currentStatus: DeliveryStatus.PENDING,
      statusHistory: [
        {
          status: DeliveryStatus.PENDING,
          timestamp: new Date(),
        },
      ],
      metadata,
    });

    const saved = await messageStatus.save();
    this.logger.debug(`Created message status for ${messageId}`);
    return saved;
  }

  /**
   * Update message status from webhook
   */
  async updateStatus(
    messageId: string,
    status: DeliveryStatus,
    timestamp: Date,
    errorCode?: string,
    errorMessage?: string,
  ): Promise<MessageStatus | null> {
    const messageStatus = await this.messageStatusModel.findOne({ messageId });

    if (!messageStatus) {
      this.logger.warn(`Message status not found for ${messageId}`);
      return null;
    }

    // Add to status history
    messageStatus.statusHistory.push({
      status,
      timestamp,
      errorCode,
      errorMessage,
    });

    // Update current status
    messageStatus.currentStatus = status;

    // Update specific timestamp fields
    switch (status) {
      case DeliveryStatus.SENT:
        messageStatus.sentAt = timestamp;
        break;
      case DeliveryStatus.DELIVERED:
        messageStatus.deliveredAt = timestamp;
        break;
      case DeliveryStatus.READ:
        messageStatus.readAt = timestamp;
        break;
      case DeliveryStatus.FAILED:
        messageStatus.failedAt = timestamp;
        messageStatus.errorCode = errorCode;
        messageStatus.errorMessage = errorMessage;
        break;
    }

    const updated = await messageStatus.save();

    // Emit WebSocket event for real-time updates
    this.eventsGateway.emitMessageStatusUpdate({
      messageId,
      recipientPhone: messageStatus.recipientPhone,
      conversationId: messageStatus.conversationId,
      status,
      timestamp,
      errorCode,
      errorMessage,
    });

    this.logger.debug(`Updated message ${messageId} status to ${status}`);
    return updated;
  }

  /**
   * Get message status by message ID
   */
  async getByMessageId(messageId: string): Promise<MessageStatus | null> {
    return this.messageStatusModel.findOne({ messageId });
  }

  /**
   * Get all message statuses for a recipient
   */
  async getByRecipient(
    recipientPhone: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ data: MessageStatus[]; total: number }> {
    const [data, total] = await Promise.all([
      this.messageStatusModel
        .find({ recipientPhone })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit),
      this.messageStatusModel.countDocuments({ recipientPhone }),
    ]);

    return { data, total };
  }

  /**
   * Get message statuses by status
   */
  async getByStatus(
    status: DeliveryStatus,
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ data: MessageStatus[]; total: number }> {
    const [data, total] = await Promise.all([
      this.messageStatusModel
        .find({ currentStatus: status })
        .sort({ createdAt: -1 })
        .skip(offset)
        .limit(limit),
      this.messageStatusModel.countDocuments({ currentStatus: status }),
    ]);

    return { data, total };
  }

  /**
   * Get failed messages
   */
  async getFailedMessages(
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ data: MessageStatus[]; total: number }> {
    return this.getByStatus(DeliveryStatus.FAILED, limit, offset);
  }

  /**
   * Get message status statistics
   */
  async getStatistics(
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    total: number;
    pending: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
    deliveryRate: number;
    readRate: number;
  }> {
    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = startDate;
      if (endDate) dateFilter.createdAt.$lte = endDate;
    }

    const [total, pending, sent, delivered, read, failed] = await Promise.all([
      this.messageStatusModel.countDocuments(dateFilter),
      this.messageStatusModel.countDocuments({
        ...dateFilter,
        currentStatus: DeliveryStatus.PENDING,
      }),
      this.messageStatusModel.countDocuments({
        ...dateFilter,
        currentStatus: DeliveryStatus.SENT,
      }),
      this.messageStatusModel.countDocuments({
        ...dateFilter,
        currentStatus: DeliveryStatus.DELIVERED,
      }),
      this.messageStatusModel.countDocuments({
        ...dateFilter,
        currentStatus: DeliveryStatus.READ,
      }),
      this.messageStatusModel.countDocuments({
        ...dateFilter,
        currentStatus: DeliveryStatus.FAILED,
      }),
    ]);

    const successfullyDelivered = delivered + read;
    const deliveryRate = total > 0 ? (successfullyDelivered / total) * 100 : 0;
    const readRate = successfullyDelivered > 0 ? (read / successfullyDelivered) * 100 : 0;

    return {
      total,
      pending,
      sent,
      delivered,
      read,
      failed,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      readRate: Math.round(readRate * 100) / 100,
    };
  }

  /**
   * Delete old message statuses (for cleanup)
   */
  async deleteOldStatuses(olderThan: Date): Promise<number> {
    const result = await this.messageStatusModel.deleteMany({
      createdAt: { $lt: olderThan },
    });
    this.logger.log(`Deleted ${result.deletedCount} old message statuses`);
    return result.deletedCount;
  }
}
