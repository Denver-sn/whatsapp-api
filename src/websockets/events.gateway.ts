import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";

@WebSocketGateway({
  cors: {
    origin: "*", // En production, remplacer par l'URL du frontend
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger: Logger = new Logger("EventsGateway");
  private clients: Map<string, Socket> = new Map();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.clients.set(client.id, client);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.clients.delete(client.id);
  }

  @SubscribeMessage("joinConversation")
  handleJoinConversation(client: Socket, conversationId: string) {
    client.join(`conversation-${conversationId}`);
    this.logger.log(
      `Client ${client.id} joined conversation: ${conversationId}`
    );
  }

  @SubscribeMessage("leaveConversation")
  handleLeaveConversation(client: Socket, conversationId: string) {
    client.leave(`conversation-${conversationId}`);
    this.logger.log(`Client ${client.id} left conversation: ${conversationId}`);
  }

  // Méthode pour émettre des mises à jour de conversation
  emitConversationUpdate(conversationId: string, data: any) {
    this.server
      .to(`conversation-${conversationId}`)
      .emit("conversationUpdate", {
        conversationId,
        ...data,
      });
  }

  // Méthode pour émettre des nouveaux messages
  emitNewMessage(conversationId: string, message: any) {
    this.server.to(`conversation-${conversationId}`).emit("newMessage", {
      conversationId,
      message,
    });
  }

  // Méthode pour émettre des mises à jour de la liste des conversations
  emitConversationsListUpdate(data: any) {
    this.server.emit("conversationsListUpdate", data);
  }
}
