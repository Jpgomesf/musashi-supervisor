// src/langchain/agents.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { ToolsService } from './tools.service';
import { BaseLanguageModel } from '@langchain/core/language_models/base';
import { BaseMessage } from '@langchain/core/messages';

@Injectable()
export class AgentsService {
  private readonly llm: BaseLanguageModel;

  constructor(
    private readonly configService: ConfigService,
    private readonly toolsService: ToolsService,
  ) {
    this.llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0,
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  getLogisticsAgent() {
    return createReactAgent({
      llm: this.llm,
      tools: [this.toolsService.getFreightCalculator()],
      name: 'logistics_expert',
      prompt:
        'You are a logistics expert. Always use the freight_calculator tool when asked about freight costs between two locations.',
    });
  }

  getSalesAgent() {
    return createReactAgent({
      llm: this.llm,
      tools: [this.toolsService.getDiscountService()],
      name: 'sales_expert',
      prompt:
        'You are a sales expert. Always call discount_service when asked for a discount.',
    });
  }
}
