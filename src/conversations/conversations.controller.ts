import { Controller, Get, Post, Body, Param, Patch } from "@nestjs/common";
import { ConversationsService } from "./conversations.service";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";

@ApiTags("conversations")
@Controller("conversations")
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: "Récupérer toutes les conversations" })
  @ApiResponse({ status: 200, description: "Liste des conversations" })
  findAll() {
    return this.conversationsService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Récupérer une conversation par ID" })
  @ApiResponse({ status: 200, description: "Détails de la conversation" })
  findOne(@Param("id") id: string) {
    return this.conversationsService.findById(id);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Marquer une conversation comme lue" })
  @ApiResponse({ status: 200, description: "Conversation mise à jour" })
  markAsRead(@Param("id") id: string) {
    return this.conversationsService.updateUnreadCount(id, 0);
  }

  // ... rest of the controller code ...
}
