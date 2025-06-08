import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Conversation } from "../schemas/conversation.schema";
import { EventsGateway } from "../websockets/events.gateway";

@Injectable()
export class ConversationsService {
  constructor(
    @InjectModel(Conversation.name)
    private conversationModel: Model<Conversation>,
    private eventsGateway: EventsGateway
  ) {}

  async findAll() {
    const conversations = await this.conversationModel
      .find()
      .sort({ updatedAt: -1 })
      .lean()
      .exec();

    // Ensure all conversations have proper timestamps
    const now = new Date();
    const conversationsWithTimestamps = conversations.map((conversation) => {
      if (!conversation.updatedAt) {
        conversation.updatedAt = conversation.createdAt || now;
      }
      return conversation;
    });

    return conversationsWithTimestamps;
  }

  async findById(id: string) {
    return this.conversationModel.findById(id).exec();
  }

  async create(createConversationDto: any) {
    const now = new Date();
    const newConversation = new this.conversationModel({
      ...createConversationDto,
      createdAt: now,
      updatedAt: now,
    });

    const savedConversation = await newConversation.save();

    // Émettre l'événement de mise à jour de la liste des conversations
    this.eventsGateway.emitConversationsListUpdate({
      type: "create",
      conversation: savedConversation,
    });

    return savedConversation;
  }

  async updateTimestamp(id: string) {
    const now = new Date();
    const updatedConversation = await this.conversationModel
      .findByIdAndUpdate(id, { updatedAt: now }, { new: true })
      .exec();

    if (updatedConversation) {
      // Émettre l'événement de mise à jour de la liste des conversations
      this.eventsGateway.emitConversationsListUpdate({
        type: "update",
        conversation: updatedConversation,
      });
    }

    return updatedConversation;
  }

  async addMessage(conversationId: string, messageData: any) {
    const conversation = await this.conversationModel.findById(conversationId);
    if (!conversation) {
      throw new Error("Conversation not found");
    }

    const now = new Date();

    const updatedConversation = await this.conversationModel
      .findByIdAndUpdate(
        conversationId,
        {
          $push: { messages: messageData },
          $set: {
            lastMessage: messageData,
            updatedAt: now,
            unreadCount:
              conversation.unreadCount +
              (messageData.direction === "incoming" ? 1 : 0),
          },
        },
        { new: true }
      )
      .exec();

    if (!updatedConversation) {
      throw new Error("Failed to update conversation");
    }

    // Émettre l'événement de nouveau message
    this.eventsGateway.emitNewMessage(conversationId, messageData);

    // Émettre l'événement de mise à jour de la conversation
    this.eventsGateway.emitConversationUpdate(conversationId, {
      type: "update",
      conversation: updatedConversation,
    });

    // Émettre l'événement de mise à jour de la liste des conversations
    this.eventsGateway.emitConversationsListUpdate({
      type: "update",
      conversation: updatedConversation,
    });

    return updatedConversation;
  }

  async updateUnreadCount(id: string, unreadCount: number) {
    const now = new Date();
    const updatedConversation = await this.conversationModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            unreadCount,
            updatedAt: now,
          },
        },
        { new: true }
      )
      .exec();

    if (updatedConversation) {
      // Émettre l'événement de mise à jour de la conversation
      this.eventsGateway.emitConversationUpdate(id, {
        type: "update",
        conversation: updatedConversation,
      });

      // Émettre l'événement de mise à jour de la liste des conversations
      this.eventsGateway.emitConversationsListUpdate({
        type: "update",
        conversation: updatedConversation,
      });
    }

    return updatedConversation;
  }
}
