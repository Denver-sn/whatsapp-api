import { Injectable, Logger, Inject, forwardRef } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, FilterQuery } from "mongoose";
import {
  Conversation,
  ConversationDocument,
  Message,
} from "../schemas/conversation.schema";
import type { ConversationResponse } from "../models/conversation.model";
import { WhatsappService } from "../whatsapp/whatsapp.service";
import { PaginationQueryDto, PaginatedResult } from "../common/dto/pagination.dto";

@Injectable()
export class ConversationsService {
  private readonly logger = new Logger(ConversationsService.name);

  constructor(
    @InjectModel(Conversation.name)
    private readonly conversationModel: Model<ConversationDocument>,
    @Inject(forwardRef(() => WhatsappService))
    private readonly whatsappService: WhatsappService
  ) {}

  async findAll(): Promise<ConversationResponse[]> {
    const conversations = await this.conversationModel.find().lean().exec();
    return conversations.map((conversation) => ({
      id: conversation._id?.toString() || "",
      contact: conversation.contact,
      lastMessage: conversation.lastMessage,
      unreadCount: conversation.unreadCount,
    }));
  }

  async findAllPaginated(
    paginationQuery: PaginationQueryDto
  ): Promise<PaginatedResult<ConversationResponse>> {
    const { page = 1, limit = 20, search } = paginationQuery;
    const skip = (page - 1) * limit;

    // Build filter query
    const filter: FilterQuery<ConversationDocument> = {};
    if (search) {
      filter.$or = [
        { "contact.name": { $regex: search, $options: "i" } },
        { "contact.phoneNumber": { $regex: search, $options: "i" } },
      ];
    }

    // Execute queries in parallel for better performance
    const [conversations, total] = await Promise.all([
      this.conversationModel
        .find(filter)
        .sort({ "lastMessage.timestamp": -1 }) // Most recent first
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.conversationModel.countDocuments(filter).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: conversations.map((conversation) => ({
        id: conversation._id?.toString() || "",
        contact: conversation.contact,
        lastMessage: conversation.lastMessage,
        unreadCount: conversation.unreadCount,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findById(id: string): Promise<ConversationDocument | null> {
    return this.conversationModel.findById(id).exec();
  }

  async findByPhoneNumber(
    phoneNumber: string
  ): Promise<ConversationDocument | null> {
    return this.conversationModel
      .findOne({
        "contact.phoneNumber": phoneNumber,
      })
      .exec();
  }

  async create(data: {
    contact: { name: string; phoneNumber: string; profilePicture?: string };
    lastMessage: Message;
    unreadCount: number;
    messages: Message[];
    templateData?: {
      name: string;
      context: string;
    };
  }): Promise<ConversationDocument> {
    try {
      // Vérifier si une conversation existe déjà avec ce numéro
      const existingConversation = await this.findByPhoneNumber(
        data.contact.phoneNumber
      );

      if (existingConversation) {
        this.logger.log(
          `Conversation existante trouvée pour ${data.contact.phoneNumber}`
        );

        // Mettre à jour la conversation existante avec le nouveau message
        existingConversation.messages.push(data.lastMessage);
        existingConversation.lastMessage = data.lastMessage;
        existingConversation.unreadCount = 0;

        // Envoyer le template WhatsApp si les données sont présentes
        if (data.templateData) {
          await this.whatsappService.sendTemplate(
            data.contact.phoneNumber,
            "start_message",
            [data.templateData.name, data.templateData.context]
          );
        }

        const updatedConversation = await existingConversation.save();
        this.logger.log(
          `Conversation mise à jour avec succès pour ${data.contact.phoneNumber}`
        );
        return updatedConversation;
      }

      // Créer une nouvelle conversation
      this.logger.log(
        `Création d'une nouvelle conversation pour ${data.contact.phoneNumber}`
      );
      const conversation = new this.conversationModel(data);

      // Envoyer le template WhatsApp si les données sont présentes
      if (data.templateData) {
        await this.whatsappService.sendTemplate(
          data.contact.phoneNumber,
          "start_message",
          [data.templateData.name, data.templateData.context]
        );
      }

      const savedConversation = await conversation.save();
      this.logger.log(
        `Nouvelle conversation créée avec succès pour ${data.contact.phoneNumber}`
      );
      return savedConversation;
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Erreur lors de la création/mise à jour de la conversation: ${err.message}`,
        err.stack
      );
      throw error;
    }
  }

  async getMessages(id: string) {
    const conversation = await this.findById(id);
    return conversation?.messages || [];
  }

  async addMessage(id: string, message: Message) {
    const conversation = await this.findById(id);
    if (!conversation) {
      this.logger.warn(
        `Tentative d'ajout de message à une conversation inexistante: ${id}`
      );
      return null;
    }

    if (message.direction === "outgoing") {
      try {
        this.logger.log(
          `Envoi de message WhatsApp à ${conversation.contact.phoneNumber}`
        );
        await this.whatsappService.sendTextMessage(
          conversation.contact.phoneNumber,
          message.content
        );
        this.logger.log("Message WhatsApp envoyé avec succès");
      } catch (error) {
        const err = error as Error;
        this.logger.error(
          `Erreur lors de l'envoi du message WhatsApp: ${err.message}`,
          err.stack
        );
      }
    }

    const updatedConversation = await this.conversationModel
      .findByIdAndUpdate(
        id,
        {
          $push: { messages: message },
          $set: {
            lastMessage: message,
            unreadCount: message.direction === "incoming" ? 1 : 0,
          },
        },
        { new: true }
      )
      .exec();

    if (!updatedConversation) {
      this.logger.error(`Échec de la mise à jour de la conversation: ${id}`);
      return null;
    }

    return message;
  }

  // Méthode utilitaire pour créer des données de test
  async seed() {
    if ((await this.conversationModel.countDocuments()) === 0) {
      await this.conversationModel.create([
        {
          contact: {
            name: "John Doe",
            phoneNumber: "+221777460452",
            profilePicture:
              "https://api.dicebear.com/7.x/avataaars/svg?seed=John",
          },
          lastMessage: {
            content: "Hello, I need assistance with my order",
            timestamp: new Date().toISOString(),
            direction: "incoming" as const,
          },
          unreadCount: 1,
          messages: [
            {
              content: "Hello, I need assistance with my order",
              timestamp: new Date().toISOString(),
              direction: "incoming" as const,
            },
          ],
        },
        {
          contact: {
            name: "Alice Smith",
            phoneNumber: "+221777460453",
          },
          lastMessage: {
            content: "Your order has been shipped!",
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            direction: "outgoing" as const,
          },
          unreadCount: 0,
          messages: [
            {
              content: "Your order has been shipped!",
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              direction: "outgoing" as const,
            },
          ],
        },
      ]);
    }
  }
}
