// src/chat/chat.controller.ts
import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  @Post()
  async handleChat(
    @Body(new ValidationPipe()) chatRequestDto: ChatRequestDto // Use DTO and ValidationPipe
  ) {
    const result = await this.chatService.processMessage(chatRequestDto.message);
    return result;
  }
}
