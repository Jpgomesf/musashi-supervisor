// src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { LangchainModule } from '../langchain/langchain.module'; // Import LangchainModule

@Module({
  imports: [LangchainModule], // Import LangchainModule to access SupervisorService
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule { }
