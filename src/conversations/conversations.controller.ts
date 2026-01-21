import { Controller, Get, Param, Patch, Query } from "@nestjs/common";
import { ConversationsService } from "./conversations.service";
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from "@nestjs/swagger";
import { PaginationQueryDto } from "../common/dto/pagination.dto";

@ApiTags("conversations")
@Controller("conversations")
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  @ApiOperation({ summary: "Récupérer toutes les conversations avec pagination" })
  @ApiResponse({ status: 200, description: "Liste paginée des conversations" })
  @ApiQuery({ name: "page", required: false, type: Number, description: "Page number (default: 1)" })
  @ApiQuery({ name: "limit", required: false, type: Number, description: "Items per page (default: 20, max: 100)" })
  @ApiQuery({ name: "search", required: false, type: String, description: "Search by contact name or phone number" })
  findAll(@Query() paginationQuery: PaginationQueryDto) {
    // Si pas de paramètres de pagination, retourner la liste complète (backwards compatibility)
    if (!paginationQuery.page && !paginationQuery.limit && !paginationQuery.search) {
      return this.conversationsService.findAll();
    }
    return this.conversationsService.findAllPaginated(paginationQuery);
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
