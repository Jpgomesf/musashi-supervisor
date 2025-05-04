// src/langchain/supervisor.service.ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createSupervisor } from '@langchain/langgraph-supervisor';
import { ChatOpenAI } from '@langchain/openai';
import { AgentsService } from './agents.service';
import { Runnable } from '@langchain/core/runnables';
import { BaseMessage } from '@langchain/core/messages';

@Injectable()
export class SupervisorService implements OnModuleInit {
  private compiledWorkflow: Runnable<{ messages: BaseMessage[] }, any>; // Adjust output type if known

  constructor(
    private readonly configService: ConfigService,
    private readonly agentsService: AgentsService,
  ) { }

  // Compile the workflow when the module initializes
  onModuleInit() {
    this.initializeWorkflow();
  }

  private initializeWorkflow() {
    const supervisorPrompt =
      'You manage a logistics_expert and a sales_expert. ' +
      'Route freight-related questions to logistics_expert and ' +
      'pricing/discount questions to sales_expert. ' +
      'If a request involves both, route to logistics_expert first, then sales_expert. ' +
      'Reply FINISH when the user’s request is completely answered by the agents.';

    const llm = new ChatOpenAI({
      model: 'gpt-4o-mini',
      temperature: 0,
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });

    const workflow = createSupervisor({
      agents: [
        this.agentsService.getLogisticsAgent(),
        this.agentsService.getSalesAgent(),
      ],
      llm,
      prompt: supervisorPrompt,
    });

    this.compiledWorkflow = workflow.compile();
    console.log('LangGraph Supervisor Workflow Compiled.');
  }

  getCompiledWorkflow(): Runnable<{ messages: BaseMessage[] }, any> {
    if (!this.compiledWorkflow) {
      console.warn("Workflow not compiled during init, attempting now.");
      this.initializeWorkflow();
    }
    return this.compiledWorkflow;
  }
}
