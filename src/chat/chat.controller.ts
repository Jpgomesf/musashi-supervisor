// src/chat/chat.controller.ts
import { Controller, Post, Body, ValidationPipe, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatRequestDto } from './dto/chat-request.dto';
import { Request } from 'express';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  @Post()
  async handleChat(
    @Body(new ValidationPipe()) chatRequestDto: ChatRequestDto,
    @Req() req: Request
  ) {
    return this.chatService.processMessage(chatRequestDto.message, req);
  }
}
