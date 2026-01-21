import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsEnum, IsISO8601, IsNotEmpty } from "class-validator";

export class CreateConversationDto {
  @ApiProperty({
    description: "Numéro de téléphone du destinataire",
    example: "+221771234567",
  })
  @IsString()
  @IsNotEmpty()
  recipientPhone!: string;

  @ApiProperty({
    description: "Nom de l'agent",
    example: "John Doe",
  })
  @IsString()
  @IsNotEmpty()
  agentName!: string;

  @ApiProperty({
    description: "Contexte de la conversation",
    example: "votre demande de devis",
  })
  @IsString()
  @IsNotEmpty()
  context!: string;
}

export class ContactDto {
  @ApiProperty({
    description: "Nom du contact",
    example: "John Doe",
  })
  name!: string;

  @ApiProperty({
    description: "Numéro de téléphone",
    example: "+221777460452",
  })
  phoneNumber!: string;

  @ApiProperty({
    description: "URL de la photo de profil",
    example: "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
    required: false,
  })
  profilePicture?: string;
}

export class MessageDto {
  @ApiProperty({
    description: "Contenu du message",
    example: "Bonjour, comment puis-je vous aider ?",
  })
  @IsString()
  @IsNotEmpty()
  content!: string;

  @ApiProperty({
    description: "Horodatage du message",
    example: "2024-03-19T14:30:00.000Z",
  })
  @IsISO8601()
  @IsNotEmpty()
  timestamp!: string;

  @ApiProperty({
    description: "Direction du message",
    enum: ["incoming", "outgoing"],
    example: "outgoing",
  })
  @IsEnum(["incoming", "outgoing"])
  @IsNotEmpty()
  direction!: "incoming" | "outgoing";
}

export class ConversationResponse {
  @ApiProperty({
    description: "ID unique de la conversation",
    example: "507f1f77bcf86cd799439011",
  })
  id!: string;

  @ApiProperty({
    description: "Informations sur le contact",
    type: () => ContactDto,
  })
  contact!: ContactDto;

  @ApiProperty({
    description: "Dernier message de la conversation",
    type: () => MessageDto,
  })
  lastMessage!: MessageDto;

  @ApiProperty({
    description: "Nombre de messages non lus",
    example: 2,
    minimum: 0,
  })
  unreadCount!: number;
}
