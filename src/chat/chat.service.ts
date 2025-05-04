// src/chat/chat.service.ts
import { Injectable } from '@nestjs/common';
import { SupervisorService } from '../langchain/supervisor.service';
import { AIMessage, HumanMessage } from '@langchain/core/messages';

@Injectable()
export class ChatService {
  constructor(private readonly supervisorService: SupervisorService) { }

  async processMessage(userMessage: string): Promise<any> { // Return type 'any' for now, can be refined
    const app = this.supervisorService.getCompiledWorkflow();

    console.log(`Invoking workflow with message: "${userMessage}"`);

    // Invoke the compiled LangGraph app
    const result = await app.invoke({
      messages: [new HumanMessage(userMessage)],
    });

    console.log('Workflow invocation complete.');
    // The result often contains the final messages array
    // Extract the last message or relevant part if needed
    return result;
    // Or more specifically:
    // return result.messages[result.messages.length - 1];
  }
}
