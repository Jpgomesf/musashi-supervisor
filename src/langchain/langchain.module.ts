// src/langchain/langchain.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ToolsService } from './tools.service';
import { AgentsService } from './agents.service';
import { SupervisorService } from './supervisor.service';

@Module({
  imports: [ConfigModule],
  providers: [ToolsService, AgentsService, SupervisorService],
  exports: [SupervisorService],
})
export class LangchainModule { }
