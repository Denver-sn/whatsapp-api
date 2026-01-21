import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUrl, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  STICKER = 'sticker',
}

export class SendMediaMessageDto {
  @ApiProperty({
    description: 'Phone number to send message to (with country code)',
    example: '221777460452',
  })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiProperty({
    description: 'Type of media',
    enum: MediaType,
    example: MediaType.IMAGE,
  })
  @IsEnum(MediaType)
  @IsNotEmpty()
  mediaType!: MediaType;

  @ApiPropertyOptional({
    description: 'URL of the media file (use this OR mediaId, not both)',
    example: 'https://example.com/image.jpg',
  })
  @ValidateIf((o) => !o.mediaId)
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({
    description: 'Media ID from WhatsApp (use this OR url, not both)',
    example: '1234567890',
  })
  @ValidateIf((o) => !o.url)
  @IsString()
  @IsOptional()
  mediaId?: string;

  @ApiPropertyOptional({
    description: 'Caption for the media (not supported for audio)',
    example: 'Check out this image!',
  })
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiPropertyOptional({
    description: 'Filename for document type',
    example: 'report.pdf',
  })
  @IsString()
  @IsOptional()
  filename?: string;
}

export class SendImageMessageDto {
  @ApiProperty({
    description: 'Phone number to send message to (with country code)',
    example: '221777460452',
  })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiPropertyOptional({
    description: 'URL of the image',
    example: 'https://example.com/image.jpg',
  })
  @ValidateIf((o) => !o.mediaId)
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({
    description: 'Media ID of the image',
  })
  @ValidateIf((o) => !o.url)
  @IsString()
  @IsOptional()
  mediaId?: string;

  @ApiPropertyOptional({
    description: 'Caption for the image',
    example: 'Beautiful sunset!',
  })
  @IsString()
  @IsOptional()
  caption?: string;
}

export class SendDocumentMessageDto {
  @ApiProperty({
    description: 'Phone number to send message to (with country code)',
    example: '221777460452',
  })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiPropertyOptional({
    description: 'URL of the document',
    example: 'https://example.com/document.pdf',
  })
  @ValidateIf((o) => !o.mediaId)
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({
    description: 'Media ID of the document',
  })
  @ValidateIf((o) => !o.url)
  @IsString()
  @IsOptional()
  mediaId?: string;

  @ApiPropertyOptional({
    description: 'Caption for the document',
    example: 'Here is the report',
  })
  @IsString()
  @IsOptional()
  caption?: string;

  @ApiPropertyOptional({
    description: 'Filename to display',
    example: 'quarterly-report.pdf',
  })
  @IsString()
  @IsOptional()
  filename?: string;
}

export class SendVideoMessageDto {
  @ApiProperty({
    description: 'Phone number to send message to (with country code)',
    example: '221777460452',
  })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiPropertyOptional({
    description: 'URL of the video',
    example: 'https://example.com/video.mp4',
  })
  @ValidateIf((o) => !o.mediaId)
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({
    description: 'Media ID of the video',
  })
  @ValidateIf((o) => !o.url)
  @IsString()
  @IsOptional()
  mediaId?: string;

  @ApiPropertyOptional({
    description: 'Caption for the video',
    example: 'Watch this!',
  })
  @IsString()
  @IsOptional()
  caption?: string;
}

export class SendAudioMessageDto {
  @ApiProperty({
    description: 'Phone number to send message to (with country code)',
    example: '221777460452',
  })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiPropertyOptional({
    description: 'URL of the audio file',
    example: 'https://example.com/audio.mp3',
  })
  @ValidateIf((o) => !o.mediaId)
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({
    description: 'Media ID of the audio',
  })
  @ValidateIf((o) => !o.url)
  @IsString()
  @IsOptional()
  mediaId?: string;
}

export class SendStickerMessageDto {
  @ApiProperty({
    description: 'Phone number to send message to (with country code)',
    example: '221777460452',
  })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiPropertyOptional({
    description: 'URL of the sticker (WebP format)',
    example: 'https://example.com/sticker.webp',
  })
  @ValidateIf((o) => !o.mediaId)
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({
    description: 'Media ID of the sticker',
  })
  @ValidateIf((o) => !o.url)
  @IsString()
  @IsOptional()
  mediaId?: string;
}
