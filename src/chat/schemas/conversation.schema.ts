// src/chat/schemas/conversation.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ _id: false })
class StoredMessage {
  @Prop({ required: true, enum: ['human', 'ai', 'system', 'tool'] })
  type: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: String, required: false })
  name?: string;

  @Prop({ type: String, required: false })
  tool_call_id?: string;

  @Prop({ type: [Object], required: false })
  tool_calls?: any[];

  @Prop({ type: Object, required: false, default: {} })
  additional_kwargs?: Record<string, any>;
}
const StoredMessageSchema = SchemaFactory.createForClass(StoredMessage);


@Schema({ timestamps: true })
export class Conversation {
  @Prop({ required: true, unique: true, index: true })
  sessionId: string;

  @Prop({ type: [StoredMessageSchema], required: true, default: [] })
  messages: StoredMessage[];
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
