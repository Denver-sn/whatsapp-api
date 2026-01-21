import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendTextMessageDto {
  @ApiProperty({
    description: 'Phone number to send message to (with country code)',
    example: '33123456789',
  })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiProperty({
    description: 'Text message content',
    example: 'Hello, this is a test message!',
  })
  @IsString()
  @IsNotEmpty()
  text!: string;
}