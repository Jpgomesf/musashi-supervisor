// src/chat/dto/chat-request.dto.ts
import { IsString, IsNotEmpty } from 'class-validator'; // You might need: npm install class-validator class-transformer

export class ChatRequestDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}
