import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsOptional,
  MaxLength,
  ArrayMaxSize,
  ArrayMinSize,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

// Button for reply buttons (max 3)
export class ReplyButton {
  @ApiProperty({ description: 'Button ID (max 256 chars)', example: 'btn_yes' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  id!: string;

  @ApiProperty({ description: 'Button title (max 20 chars)', example: 'Yes' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  title!: string;
}

// Row for list messages
export class ListRow {
  @ApiProperty({ description: 'Row ID (max 200 chars)', example: 'row_1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  id!: string;

  @ApiProperty({ description: 'Row title (max 24 chars)', example: 'Option 1' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(24)
  title!: string;

  @ApiPropertyOptional({ description: 'Row description (max 72 chars)', example: 'Description of option 1' })
  @IsString()
  @IsOptional()
  @MaxLength(72)
  description?: string;
}

// Section for list messages
export class ListSection {
  @ApiPropertyOptional({ description: 'Section title (max 24 chars)', example: 'Main Options' })
  @IsString()
  @IsOptional()
  @MaxLength(24)
  title?: string;

  @ApiProperty({ description: 'Rows in this section (max 10)', type: [ListRow] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ListRow)
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  rows!: ListRow[];
}

// Header for interactive messages
export class InteractiveHeader {
  @ApiProperty({ description: 'Header type', enum: ['text', 'image', 'video', 'document'] })
  @IsString()
  @IsNotEmpty()
  type!: 'text' | 'image' | 'video' | 'document';

  @ApiPropertyOptional({ description: 'Header text (for type=text, max 60 chars)' })
  @IsString()
  @IsOptional()
  @MaxLength(60)
  text?: string;

  @ApiPropertyOptional({ description: 'Media URL (for image/video/document)' })
  @IsUrl()
  @IsOptional()
  url?: string;

  @ApiPropertyOptional({ description: 'Media ID (for image/video/document)' })
  @IsString()
  @IsOptional()
  mediaId?: string;
}

// Footer for interactive messages
export class InteractiveFooter {
  @ApiProperty({ description: 'Footer text (max 60 chars)', example: 'Powered by WhatsApp API' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  text!: string;
}

// Body for interactive messages
export class InteractiveBody {
  @ApiProperty({ description: 'Body text (max 1024 chars)', example: 'Please select an option' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1024)
  text!: string;
}

// DTO for Reply Buttons message
export class SendReplyButtonsDto {
  @ApiProperty({ description: 'Recipient phone number', example: '22890000000' })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiProperty({ description: 'Message body', type: InteractiveBody })
  @ValidateNested()
  @Type(() => InteractiveBody)
  body!: InteractiveBody;

  @ApiPropertyOptional({ description: 'Message header', type: InteractiveHeader })
  @ValidateNested()
  @Type(() => InteractiveHeader)
  @IsOptional()
  header?: InteractiveHeader;

  @ApiPropertyOptional({ description: 'Message footer', type: InteractiveFooter })
  @ValidateNested()
  @Type(() => InteractiveFooter)
  @IsOptional()
  footer?: InteractiveFooter;

  @ApiProperty({ description: 'Reply buttons (1-3)', type: [ReplyButton] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReplyButton)
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  buttons!: ReplyButton[];
}

// DTO for List message
export class SendListMessageDto {
  @ApiProperty({ description: 'Recipient phone number', example: '22890000000' })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiProperty({ description: 'Message body', type: InteractiveBody })
  @ValidateNested()
  @Type(() => InteractiveBody)
  body!: InteractiveBody;

  @ApiPropertyOptional({ description: 'Message header', type: InteractiveHeader })
  @ValidateNested()
  @Type(() => InteractiveHeader)
  @IsOptional()
  header?: InteractiveHeader;

  @ApiPropertyOptional({ description: 'Message footer', type: InteractiveFooter })
  @ValidateNested()
  @Type(() => InteractiveFooter)
  @IsOptional()
  footer?: InteractiveFooter;

  @ApiProperty({ description: 'Button text to open list (max 20 chars)', example: 'View Options' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  buttonText!: string;

  @ApiProperty({ description: 'List sections (max 10)', type: [ListSection] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ListSection)
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  sections!: ListSection[];
}

// CTA URL Button
export class CtaUrlButton {
  @ApiProperty({ description: 'Button display text (max 20 chars)', example: 'Visit Website' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  displayText!: string;

  @ApiProperty({ description: 'URL to open', example: 'https://example.com' })
  @IsUrl()
  @IsNotEmpty()
  url!: string;
}

// DTO for CTA URL Button message
export class SendCtaButtonDto {
  @ApiProperty({ description: 'Recipient phone number', example: '22890000000' })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiProperty({ description: 'Message body', type: InteractiveBody })
  @ValidateNested()
  @Type(() => InteractiveBody)
  body!: InteractiveBody;

  @ApiPropertyOptional({ description: 'Message header', type: InteractiveHeader })
  @ValidateNested()
  @Type(() => InteractiveHeader)
  @IsOptional()
  header?: InteractiveHeader;

  @ApiPropertyOptional({ description: 'Message footer', type: InteractiveFooter })
  @ValidateNested()
  @Type(() => InteractiveFooter)
  @IsOptional()
  footer?: InteractiveFooter;

  @ApiProperty({ description: 'CTA URL button', type: CtaUrlButton })
  @ValidateNested()
  @Type(() => CtaUrlButton)
  button!: CtaUrlButton;
}

// Generic interactive message DTO
export class SendInteractiveMessageDto {
  @ApiProperty({ description: 'Recipient phone number', example: '22890000000' })
  @IsString()
  @IsNotEmpty()
  to!: string;

  @ApiProperty({ description: 'Interactive message type', enum: ['button', 'list', 'cta_url'] })
  @IsString()
  @IsNotEmpty()
  type!: 'button' | 'list' | 'cta_url';

  @ApiProperty({ description: 'Message body', type: InteractiveBody })
  @ValidateNested()
  @Type(() => InteractiveBody)
  body!: InteractiveBody;

  @ApiPropertyOptional({ description: 'Message header', type: InteractiveHeader })
  @ValidateNested()
  @Type(() => InteractiveHeader)
  @IsOptional()
  header?: InteractiveHeader;

  @ApiPropertyOptional({ description: 'Message footer', type: InteractiveFooter })
  @ValidateNested()
  @Type(() => InteractiveFooter)
  @IsOptional()
  footer?: InteractiveFooter;

  @ApiPropertyOptional({ description: 'Reply buttons (for type=button)', type: [ReplyButton] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReplyButton)
  @IsOptional()
  @ArrayMaxSize(3)
  buttons?: ReplyButton[];

  @ApiPropertyOptional({ description: 'Button text for list (for type=list)' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  buttonText?: string;

  @ApiPropertyOptional({ description: 'List sections (for type=list)', type: [ListSection] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ListSection)
  @IsOptional()
  @ArrayMaxSize(10)
  sections?: ListSection[];

  @ApiPropertyOptional({ description: 'CTA URL button (for type=cta_url)', type: CtaUrlButton })
  @ValidateNested()
  @Type(() => CtaUrlButton)
  @IsOptional()
  ctaButton?: CtaUrlButton;
}
