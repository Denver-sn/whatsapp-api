import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendTemplateMessageDto {
  @ApiProperty({
    description: 'Phone number to send message to (with country code)',
    example: '33123456789',
  })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiProperty({
    description: 'Template name',
    example: 'hello_world',
  })
  @IsString()
  @IsNotEmpty()
  templateName!: string;

  @ApiProperty({
    description: 'Language code for the template',
    example: 'en',
    default: 'en',
    required: false,
  })
  @IsOptional()
  @IsString()
  languageCode?: string;

  @ApiProperty({
    description: 'Template components (parameters, buttons, etc.)',
    required: false,
    type: [Object],
  })
  @IsOptional()
  @IsArray()
  components?: any[];
}