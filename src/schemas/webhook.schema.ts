import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";

@Schema({ timestamps: true })
export class Webhook extends Document {
  @Prop({ required: true })
  type!: string;

  @Prop({ required: true, type: Object })
  payload!: Record<string, any>;

  @Prop({ required: true })
  timestamp!: string;

  @Prop({
    required: true,
    enum: ["processed", "pending", "failed"],
    default: "pending",
  })
  status!: "processed" | "pending" | "failed";
}

export const WebhookSchema = SchemaFactory.createForClass(Webhook);
