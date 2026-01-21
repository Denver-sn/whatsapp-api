import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MessageStatusDocument = MessageStatus & Document;

export enum DeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

@Schema()
export class StatusUpdate {
  @Prop({ required: true, enum: DeliveryStatus })
  status!: DeliveryStatus;

  @Prop({ required: true })
  timestamp!: Date;

  @Prop()
  errorCode?: string;

  @Prop()
  errorMessage?: string;
}

@Schema({ timestamps: true })
export class MessageStatus extends Document {
  @Prop({ required: true })
  messageId!: string;

  @Prop({ required: true, index: true })
  recipientPhone!: string;

  @Prop({ required: true })
  conversationId?: string;

  @Prop({ required: true, enum: DeliveryStatus, default: DeliveryStatus.PENDING })
  currentStatus!: DeliveryStatus;

  @Prop({ type: [StatusUpdate], default: [] })
  statusHistory!: StatusUpdate[];

  @Prop()
  sentAt?: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  readAt?: Date;

  @Prop()
  failedAt?: Date;

  @Prop()
  errorCode?: string;

  @Prop()
  errorMessage?: string;

  @Prop({ type: Object })
  metadata?: Record<string, any>;

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const MessageStatusSchema = SchemaFactory.createForClass(MessageStatus);

// Create indexes for efficient querying
MessageStatusSchema.index({ messageId: 1 }, { unique: true });
MessageStatusSchema.index({ recipientPhone: 1, createdAt: -1 });
MessageStatusSchema.index({ currentStatus: 1 });
MessageStatusSchema.index({ createdAt: -1 });
