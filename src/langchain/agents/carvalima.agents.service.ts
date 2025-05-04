// src/langchain/agents/carvalima.agents.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { CarvalimaToolsService } from '../tools/carvalima.tools.service';
import { BaseLanguageModel } from '@langchain/core/language_models/base';

@Injectable()
export class CarvalimaAgentsService {
  private readonly llm: BaseLanguageModel;

  constructor(
    private readonly configService: ConfigService,
    private readonly toolsService: CarvalimaToolsService,
  ) {
    // Use a capable model for agents
    this.llm = new ChatOpenAI({
      model: "gpt-4.1-mini",
      temperature: 0,
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  // Agent 1: Checks Coverage
  getCoverageAgent() {
    return createReactAgent({
      llm: this.llm,
      tools: [this.toolsService.getCheckCoverageTool()],
      name: "coverage_checker",
      prompt: `You are an expert at checking Carvalima freight coverage.
      1. Look for origin and destination CEPs (8 digits) in the conversation history.
      2. If missing, ask the user clearly for both CEPs.
      3. Once you have the CEPs, ALWAYS use the 'check_carvalima_coverage' tool.
      4. Report the result clearly: whether the area is served or not, and the reason if not served.
      5. Do NOT perform any other actions.`,
    });
  }

  // Agent 2: Checks Customer Status
  getCustomerAgent() {
    return createReactAgent({
      llm: this.llm,
      tools: [this.toolsService.getCustomerStatusTool()],
      name: "customer_validator",
      prompt: `You are an expert at validating Carvalima customer status.
       1. Look for the PAYER'S CNPJ (14 digits) in the conversation history.
       2. If missing, ask the user clearly for the payer's CNPJ.
       3. Once you have the CNPJ, ALWAYS use the 'get_carvalima_customer_status' tool.
       4. Report the result clearly: 'active', 'blocked' (include reason), or 'not_found'.
       5. Do NOT perform any other actions.`,
    });
  }

  // Agent 3: Generates Quotes
  getQuotingAgent() {
    return createReactAgent({
      llm: this.llm,
      tools: [this.toolsService.getQuoteTool()],
      name: "quote_generator",
      prompt: `You are an expert at generating Carvalima freight quotes.
       1. Ensure ALL required details are present in the conversation: originCep, destinationCep, payerCnpj, recipientCnpj, weightKg, invoiceValue.
       2. If any detail is missing, clearly state which specific details are needed and ask the user for them. Do NOT proceed without all details.
       3. Once all details are confirmed, ALWAYS use the 'get_carvalima_quote' tool.
       4. Present the quote result clearly (Price R$, Estimated Delivery Days).
       5. If the tool returns an error (e.g., value too high, invalid merchandise), report the specific error message.
       6. Do NOT ask about booking or discounts. Only provide the quote or report missing info/errors.`,
    });
  }

  // Agent 4: Handles Negotiation and Booking
  getNegotiationAgent() {
    return createReactAgent({
      llm: this.llm,
      tools: [this.toolsService.getBookingTool()],
      name: "negotiation_closer",
      prompt: `You handle the negotiation after a quote has been presented. The quote details (price, quoteId) should be in the recent conversation history.
            1. Ask the user if they accept the presented quote (e.g., "Do you accept this quote for R$ {price} and wish to book the collection?").
            2. **If YES:** Confirm acceptance and use the 'book_carvalima_collection' tool with the quoteId and original price found in the history. Report the booking confirmation or failure.
            3. **If NO due to PRICE:** Acknowledge the feedback. Offer a ONE-TIME 5% discount. Calculate the discounted price (original price * 0.95) and present it clearly (e.g., "I understand. I can offer a 5% discount, bringing the price to R$ {discounted_price}. Do you accept this price?").
            4. **If YES to DISCOUNT:** Confirm acceptance and use the 'book_carvalima_collection' tool with the quoteId and the CALCULATED discounted price. Report the booking confirmation or failure.
            5. **If NO after discount OR rejected for OTHER reasons:** Acknowledge the rejection. Ask politely for the reason (e.g., "Okay, could you please tell me why you decided not to proceed?"). Report this reason back.
            6. Clearly state the final outcome: 'accepted', 'accepted_discount', 'rejected_pricing', 'rejected_other', 'booking_failed'. Include the rejection reason if provided.
            7. Do not repeat discount offers. Do not handle initial quoting.`,
    });
  }

  // Helper to get all agents for the supervisor
  getAllAgents() {
    return [
      this.getCoverageAgent(),
      this.getCustomerAgent(),
      this.getQuotingAgent(),
      this.getNegotiationAgent(),
    ];
  }
}
