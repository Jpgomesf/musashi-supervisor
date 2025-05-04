// src/langchain/langchain.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CarvalimaToolsService } from './tools/carvalima.tools.service';
import { CarvalimaSupervisorService } from './supervisor/carvalima.supervisor.service';
import { CarvalimaAgentsService } from './agents/carvalima.agents.service';

@Module({
  imports: [ConfigModule],
  providers: [
    CarvalimaToolsService,
    CarvalimaSupervisorService,
    CarvalimaAgentsService
  ],
  exports: [CarvalimaSupervisorService],
})
export class LangchainModule { }
