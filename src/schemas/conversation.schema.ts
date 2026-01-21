import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

export type ConversationDocument = Conversation & Document;

@Schema()
export class Contact {
  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  phoneNumber!: string;

  @Prop()
  profilePicture?: string;
}

@Schema()
export class Message {
  @Prop({ required: true })
  content!: string;

  @Prop({ required: true })
  timestamp!: string;

  @Prop({ required: true, type: String, enum: ["incoming", "outgoing"] })
  direction!: "incoming" | "outgoing";
}

@Schema({ timestamps: true })
export class Conversation extends Document {
  @Prop({ type: Contact, required: true })
  contact!: Contact;

  @Prop({ type: Message, required: true })
  lastMessage!: Message;

  @Prop({ required: true, default: 0 })
  unreadCount!: number;

  @Prop({ type: [Message], default: [] })
  messages!: Message[];

  @Prop()
  createdAt?: Date;

  @Prop()
  updatedAt?: Date;
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
