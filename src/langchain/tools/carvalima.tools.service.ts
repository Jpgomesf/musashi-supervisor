// src/langchain/tools/carvalima.tools.service.ts
import { Injectable } from '@nestjs/common';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { CoverageResult, CustomerStatus, QuoteDetails, QuoteResult, BookingResult, LogOutcomeResult } from '../../common/interface/quote.interface';

const fakeApiCall = <T>(data: T, delay = 50): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(data), delay));

@Injectable()
export class CarvalimaToolsService {

  getCheckCoverageTool() {
    return tool(
      async ({ originCep, destinationCep }: { originCep: string; destinationCep: string }): Promise<CoverageResult> => {
        console.log(`[TOOL MOCK] Checking coverage: ${originCep} -> ${destinationCep}`);

        const originServed = originCep?.startsWith('7');
        const destServed = destinationCep?.startsWith('7');

        if (originServed && destServed) {
          return fakeApiCall({ isServed: true });
        } else {
          const reason = !originServed ? "Origin CEP not served" : "Destination CEP not served";
          return fakeApiCall({ isServed: false, reason });
        }
      },
      {
        name: 'check_carvalima_coverage',
        description: 'Checks if both origin and destination Brazilian CEPs are served by Carvalima Transportes.',
        schema: z.object({
          originCep: z.string().length(8).describe('Origin CEP (only numbers, e.g., 74000000)'),
          destinationCep: z.string().length(8).describe('Destination CEP (only numbers, e.g., 79000000)'),
        }),
      },
    );
  }

  getCustomerStatusTool() {
    return tool(
      async ({ cnpj }: { cnpj: string }): Promise<CustomerStatus> => {
        console.log(`[TOOL MOCK] Checking customer status for CNPJ: ${cnpj}`);
        // Mock logic
        if (cnpj === '11111111000111') { // Example blocked CNPJ
          return fakeApiCall({ status: 'blocked', reason: 'Pending payments' });
        }
        if (cnpj === '00000000000000') { // Example not found CNPJ
          return fakeApiCall({ status: 'not_found' });
        }
        // Assume others are active
        return fakeApiCall({ status: 'active' });
      },
      {
        name: 'get_carvalima_customer_status',
        description: 'Checks if a customer (identified by CNPJ) is active, blocked, or not found in the Carvalima system.',
        schema: z.object({
          cnpj: z.string().length(14).describe('Customer CNPJ (only numbers, 14 digits)'),
        }),
      },
    );
  }

  getQuoteTool() {
    return tool(
      async (details: QuoteDetails): Promise<QuoteResult> => {
        console.log('[TOOL MOCK] Requesting quote with details:', details);

        if (details.payerCnpj === '11111111000111') {
          return fakeApiCall({ quoteId: '', price: 0, estimatedDeliveryDays: 0, errorMessage: 'CLIENTE BLOQUEADO PARA TRANSPORTE.', requiresHuman: true });
        }
        if (details.merchandiseCode === 'INVALID_CODE') {
          return fakeApiCall({ quoteId: '', price: 0, estimatedDeliveryDays: 0, errorMessage: 'Código de mercadoria inválido para o cliente pagador.', requiresHuman: true });
        }
        if (details.invoiceValue > 500000) {
          return fakeApiCall({ quoteId: '', price: 0, estimatedDeliveryDays: 0, errorMessage: 'Valor da NF excede o limite permitido.', requiresHuman: true });
        }
        if (details.weightKg > 3000) {
          return fakeApiCall({ quoteId: '', price: 0, estimatedDeliveryDays: 0, errorMessage: 'Peso excede o limite permitido.', requiresHuman: true });
        }

        const price = (details.weightKg * 2.5) + (details.invoiceValue * 0.005) + 50;
        const quoteId = `QT${Math.floor(Math.random() * 90000) + 10000}`;
        const deliveryDays = Math.ceil(details.weightKg / 100) + 1;

        return fakeApiCall({
          quoteId: quoteId,
          price: parseFloat(price.toFixed(2)),
          estimatedDeliveryDays: deliveryDays,
          requiresHuman: false,
        });
      },
      {
        name: 'get_carvalima_quote',
        description: 'Calculates a freight quote based on shipment details. Returns quote ID, price, and estimated delivery. May return error or human transfer flag.',
        schema: z.object({
          originCep: z.string().length(8).describe("Origin CEP (numbers only)"),
          destinationCep: z.string().length(8).describe("Destination CEP (numbers only)"),
          payerCnpj: z.string().length(14).describe("Payer CNPJ (numbers only)"),
          recipientCnpj: z.string().length(14).describe("Recipient CNPJ (numbers only)"),
          weightKg: z.number().positive().describe("Weight in kilograms"),
          invoiceValue: z.number().positive().describe("Value of the invoice (Nota Fiscal) in BRL"),
          merchandiseCode: z.string().optional().describe("Code for the type of merchandise (optional)"),
        }),
      },
    );
  }

  getBookingTool() {
    return tool(
      async ({ quoteId, finalPrice }: { quoteId: string, finalPrice: number }): Promise<BookingResult> => {
        console.log(`[TOOL MOCK] Booking collection for Quote ID: ${quoteId} at Price: ${finalPrice}`);

        if (!quoteId) {
          return fakeApiCall({ bookingId: '', status: 'failed', errorMessage: 'Missing Quote ID' });
        }
        const bookingId = `BK${quoteId.substring(2)}`;
        return fakeApiCall({ bookingId, status: 'confirmed' });
      },
      {
        name: 'book_carvalima_collection',
        description: 'Books a freight collection based on an accepted quote ID and the final agreed price.',
        schema: z.object({
          quoteId: z.string().describe("The ID of the accepted quote."),
          finalPrice: z.number().positive().describe("The final price agreed upon (can be discounted)."),
        }),
      }
    );
  }

  getLogOutcomeTool() {
    return tool(
      async ({ quoteId, status, reason }: { quoteId?: string, status: 'accepted' | 'accepted_discount' | 'rejected_pricing' | 'rejected_other' | 'human_transfer' | 'error_blocked' | 'error_coverage' | 'error_quote_invalid', reason?: string }): Promise<LogOutcomeResult> => {
        console.log(`[TOOL MOCK] Logging outcome for Quote ID: ${quoteId ?? 'N/A'}`);
        console.log(`[TOOL MOCK] Status: ${status}`);
        if (reason) {
          console.log(`[TOOL MOCK] Reason: ${reason}`);
        }
        // Mock logic: In a real scenario, this would POST to a CRM API
        const logId = `LOG${Math.floor(Math.random() * 900000) + 100000}`;
        return fakeApiCall({ logId, status: 'logged' });
      },
      {
        name: 'log_carvalima_outcome_crm',
        description: 'Logs the final outcome of the quoting interaction (accepted, rejected with reason, transferred, error) to the CRM.',
        schema: z.object({
          quoteId: z.string().optional().describe("The ID of the quote, if available."),
          status: z.enum(['accepted', 'accepted_discount', 'rejected_pricing', 'rejected_other', 'human_transfer', 'error_blocked', 'error_coverage', 'error_quote_invalid']).describe("The final status of the interaction."),
          reason: z.string().optional().describe("The reason provided by the user if the quote was rejected."),
        }),
      }
    );
  }

  getAllTools() {
    return [
      this.getCheckCoverageTool(),
      this.getCustomerStatusTool(),
      this.getQuoteTool(),
      this.getBookingTool(),
      this.getLogOutcomeTool(),
    ];
  }
}
