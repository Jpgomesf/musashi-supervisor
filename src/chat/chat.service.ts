// src/chat/chat.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AIMessage, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import { CarvalimaSupervisorService } from 'src/langchain/supervisor/carvalima.supervisor.service';
import { Conversation, ConversationDocument } from './schemas/conversation.schema';

function mapMongoMessagesToLangChain(mongoMessages: any[]): BaseMessage[] {
  if (!mongoMessages || mongoMessages.length === 0) return [];
  return mongoMessages.map(msg => {
    const baseArgs = {
      content: msg.content || "",
      name: msg.name,
      additional_kwargs: msg.additional_kwargs || {},
    };

    switch (msg.type) {
      case 'human':
        return new HumanMessage(baseArgs);
      case 'ai':
        let reconstructed_tool_calls = undefined;
        if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
          reconstructed_tool_calls = msg.tool_calls.map(tc => {
            let parsedArgs = {};
            if (tc.args) {
              if (typeof tc.args === 'string') {
                try {
                  parsedArgs = JSON.parse(tc.args);
                } catch (e) {
                  console.error("Failed to parse tool call args string from DB:", tc.args, e);
                  parsedArgs = {};
                }
              } else if (typeof tc.args === 'object') {
                parsedArgs = tc.args;
              }
            }
            return {
              id: tc.id,
              name: tc.name,
              args: parsedArgs,
              type: tc.type || 'tool_call',
            };
          }).filter(tc => tc.id && tc.name);
        }
        const aiContent = typeof baseArgs.content === 'string' ? baseArgs.content : null;
        return new AIMessage({
          ...baseArgs,
          content: aiContent!,
          tool_calls: reconstructed_tool_calls,
        });
      case 'system':
        const systemContent = typeof baseArgs.content === 'string' ? baseArgs.content : JSON.stringify(baseArgs.content);
        return new SystemMessage({ ...baseArgs, content: systemContent });
      case 'tool':
        const toolContent = typeof baseArgs.content === 'string' ? baseArgs.content : JSON.stringify(baseArgs.content);
        return new ToolMessage({
          ...baseArgs,
          content: toolContent,
          tool_call_id: msg.tool_call_id,
        });
      default:
        console.warn(`Unknown message type from DB: ${msg.type}`);
        return new SystemMessage({ content: `[Unknown message type: ${msg.type}] ${msg.content}` });
    }
  });
}

function mapLangChainMessagesToMongo(lcMessages: BaseMessage[]): any[] {
  if (!lcMessages || lcMessages.length === 0) return [];
  return lcMessages.map(msg => {
    let type: string;
    const baseData: any = {
      content: msg.content ?? '',
      additional_kwargs: msg.additional_kwargs,
    };

    if (msg instanceof HumanMessage) {
      type = 'human';
    } else if (msg instanceof AIMessage) {
      type = 'ai';
      baseData.name = msg.name;
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        baseData.tool_calls = msg.tool_calls.map(tc => ({
          id: tc.id,
          name: tc.name,
          // Store args as an object. Stringify only if it's not already (shouldn't be needed)
          args: typeof tc.args === 'object' ? tc.args : (tc.args ? JSON.parse(tc.args) : {}),
          type: tc.type,
        }));
      } else {
        baseData.tool_calls = undefined;
      }
    } else if (msg instanceof SystemMessage) {
      type = 'system';
    } else if (msg instanceof ToolMessage) {
      type = 'tool';
      baseData.name = msg.name;
      baseData.tool_call_id = msg.tool_call_id;
      // Ensure ToolMessage content is stored as string
      baseData.content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
    } else {
      console.warn("Unknown LangChain message type for Mongo storage:", msg);
      type = 'unknown';
    }
    // Ensure content isn't accidentally stored as complex object if not Tool/System msg
    if (type !== 'tool' && type !== 'system' && typeof baseData.content !== 'string') {
      baseData.content = JSON.stringify(baseData.content);
    }

    return { type, ...baseData };
  });
}
// --- End Helper Functions ---


@Injectable()
export class ChatService {
  constructor(
    private readonly supervisorService: CarvalimaSupervisorService,
    // Inject the Mongoose Model
    @InjectModel(Conversation.name) private conversationModel: Model<ConversationDocument>,
  ) { }

  // Reuse session ID logic
  private getSessionId(req: any): string {
    const sessionId = req.headers?.['x-session-id'] || 'default_session';
    console.log(`Using Session ID: ${sessionId}`);
    return sessionId;
  }

  async processMessage(userMessage: string, req: any): Promise<any> {
    const sessionId = this.getSessionId(req);

    console.log(`[${sessionId}] Processing message: "${userMessage}"`);

    let currentHistory: BaseMessage[] = [];
    try {
      const conversation = await this.conversationModel.findOne({ sessionId }).exec();
      if (conversation && conversation.messages) {
        currentHistory = mapMongoMessagesToLangChain(conversation.messages);
        console.log(`[${sessionId}] Retrieved history with ${currentHistory.length} messages.`);
      } else {
        console.log(`[${sessionId}] No existing history found.`);
      }
    } catch (dbError) {
      console.error(`[${sessionId}] Error retrieving history from DB:`, dbError);
    }

    currentHistory.push(new HumanMessage(userMessage));

    try {
      const finalState = await this.supervisorService.runWorkflowWithHistory(currentHistory);

      console.log(`[${sessionId}] Supervisor workflow execution complete.`);

      const finalMessages = finalState.messages;
      if (finalMessages && Array.isArray(finalMessages)) {
        const mongoMessages = mapLangChainMessagesToMongo(finalMessages);
        try {
          await this.conversationModel.findOneAndUpdate(
            { sessionId },
            { messages: mongoMessages },
            { new: true, upsert: true }
          ).exec();
          console.log(`[${sessionId}] Updated history in DB with ${finalMessages.length} messages.`);
        } catch (dbError) {
          console.error(`[${sessionId}] Error saving history to DB:`, dbError);
        }
        currentHistory = finalMessages;
      } else {
        console.warn(`[${sessionId}] Workflow did not return a valid messages array. History not saved.`);
      }

      let lastAgentResponse: string | null = null;
      const messagesToScan = currentHistory;

      for (let i = messagesToScan.length - 1; i >= 0; i--) {
        const msg = messagesToScan[i];
        if (msg instanceof AIMessage) {
          const content = typeof msg.content === 'string' ? msg.content.trim() : '';
          const isLikelyInternal = content === '' && msg.tool_calls && msg.tool_calls.length > 0 && msg.tool_calls[0].name.startsWith('transfer_to_');
          const isAgentName = ['supervisor', 'coverage_checker', 'customer_validator', 'quote_generator', 'negotiation_closer'].includes(content);
          const isTransferBack = msg.tool_calls?.some(tc => tc.name === 'transfer_back_to_supervisor');

          if (content && !isLikelyInternal && !isAgentName && !isTransferBack) {
            lastAgentResponse = content;
            break;
          } else if (content && !isAgentName && msg.tool_calls?.some(tc => tc.name === 'log_carvalima_outcome_crm')) {
            lastAgentResponse = content;
            break;
          }
        }
      }

      if (lastAgentResponse) {
        return { response: lastAgentResponse };
      } else {
        console.warn(`[${sessionId}] Could not find a suitable final AI message for the user.`);
        const lastMessage = messagesToScan[messagesToScan.length - 1];
        const fallbackContent = lastMessage?.content ?? "Process ended.";
        return { response: typeof fallbackContent === 'string' ? fallbackContent : JSON.stringify(fallbackContent) };
      }

    } catch (error) {
      console.error(`[${sessionId}] Error invoking supervisor workflow:`, error);
      const errorMessage = error.message || 'Unknown error';
      console.error("Stack Trace:", error.stack);
      return { response: `Sorry, I encountered an error: ${errorMessage}. Please try again later.` };
    }
  }
}
