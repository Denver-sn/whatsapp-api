import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ValidationPipe,
  UsePipes,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";
import { ConversationsService } from "../services/conversations.service";
import {
  ConversationResponse,
  MessageDto,
  CreateConversationDto,
} from "../models/conversation.model";

@ApiTags("Conversations")
@Controller("conversations")
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @ApiOperation({
    summary: "Créer une nouvelle conversation",
    description:
      "Crée une nouvelle conversation avec un contact et envoie le message initial",
  })
  @ApiBody({
    description: "Données pour créer la conversation",
    type: CreateConversationDto,
  })
  @ApiResponse({
    status: 201,
    description: "Conversation créée avec succès",
    type: ConversationResponse,
  })
  @UsePipes(new ValidationPipe({ transform: true }))
  async create(@Body() createConversationDto: CreateConversationDto) {
    const data = {
      contact: {
        name: `Contact ${createConversationDto.recipientPhone}`,
        phoneNumber: createConversationDto.recipientPhone,
      },
      lastMessage: {
        content: `Hello,\nje me permets de me présenter : ${createConversationDto.agentName}, de DEXCHANGE GROUP.\nJe vous contacte à propos ${createConversationDto.context}`,
        timestamp: new Date().toISOString(),
        direction: "outgoing" as const,
      },
      unreadCount: 0,
      messages: [],
      templateData: {
        name: createConversationDto.agentName,
        context: createConversationDto.context,
      },
    };
    return this.conversationsService.create(data);
  }

  @Get()
  @ApiOperation({
    summary: "Récupérer toutes les conversations",
    description:
      "Retourne la liste de toutes les conversations avec leurs derniers messages",
  })
  @ApiResponse({
    status: 200,
    description: "Liste des conversations récupérée avec succès",
    type: [ConversationResponse],
  })
  findAll() {
    return this.conversationsService.findAll();
  }

  @Get(":id")
  @ApiOperation({
    summary: "Récupérer une conversation par ID",
    description:
      "Retourne les détails d'une conversation spécifique avec tous ses messages",
  })
  @ApiParam({
    name: "id",
    description: "ID de la conversation",
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Conversation trouvée",
    type: ConversationResponse,
  })
  @ApiResponse({ status: 404, description: "Conversation non trouvée" })
  findOne(@Param("id") id: string) {
    return this.conversationsService.findById(id);
  }

  @Get(":id/messages")
  @ApiOperation({
    summary: "Récupérer les messages d'une conversation",
    description: "Retourne tous les messages d'une conversation spécifique",
  })
  @ApiParam({
    name: "id",
    description: "ID de la conversation",
    required: true,
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Messages récupérés avec succès",
    type: [MessageDto],
  })
  @ApiResponse({ status: 404, description: "Conversation non trouvée" })
  getMessages(@Param("id") id: string) {
    return this.conversationsService.getMessages(id);
  }

  @Post(":id/messages")
  @ApiOperation({
    summary: "Ajouter un message à une conversation",
    description: "Ajoute un nouveau message à une conversation existante",
  })
  @ApiParam({
    name: "id",
    description: "ID de la conversation",
    required: true,
    type: String,
  })
  @ApiBody({
    description: "Message à ajouter",
    type: MessageDto,
    examples: {
      message: {
        value: {
          content: "Bonjour, comment puis-je vous aider ?",
          timestamp: new Date().toISOString(),
          direction: "outgoing",
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Message ajouté avec succès",
    type: MessageDto,
  })
  @ApiResponse({ status: 404, description: "Conversation non trouvée" })
  @ApiResponse({ status: 400, description: "Données du message invalides" })
  @UsePipes(new ValidationPipe({ transform: true }))
  async addMessage(@Param("id") id: string, @Body() message: MessageDto) {
    return this.conversationsService.addMessage(id, message);
  }
}
