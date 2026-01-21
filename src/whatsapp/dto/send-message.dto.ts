import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum MessageType {
  TEXT = 'text',
  TEMPLATE = 'template',
  IMAGE = 'image',
  DOCUMENT = 'document',
  AUDIO = 'audio',
  VIDEO = 'video',
}

export class SendMessageDto {
  @ApiProperty({
    description: 'Phone number to send message to (with country code)',
    example: '33123456789',
  })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiProperty({
    description: 'Message content (can be string for text or object for other types)',
    example: 'Hello, this is a test message!',
  })
  @IsNotEmpty()
  message!: string | object;

  @ApiProperty({
    description: 'Type of message',
    enum: MessageType,
    default: MessageType.TEXT,
    required: false,
  })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;
}