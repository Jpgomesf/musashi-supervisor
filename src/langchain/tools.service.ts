// src/langchain/tools.service.ts
import { Injectable } from '@nestjs/common';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';

@Injectable()
export class ToolsService {
  getFreightCalculator() {
    return tool(
      async ({ origin, destination }: { origin: string; destination: string }) => {
        console.log(`[Tool] Calculating freight for ${origin} -> ${destination}`);
        const price = (origin.length + destination.length) * 1.23;
        return { price };
      },
      {
        name: 'freight_calculator',
        description: 'Return a freight quote between two Brazilian CEPs.',
        schema: z.object({
          origin: z.string().describe('CEP de origem, formato 00000‑000'),
          destination: z.string().describe('CEP de destino, formato 00000‑000'),
        }),
      },
    );
  }

  getDiscountService() {
    return tool(
      async () => {
        const discount = Math.floor(Math.random() * 26);
        console.log(`[Tool] Calculating discount: ${discount}%`);
        return { discount };
      },
      {
        name: 'discount_service',
        description: 'Return a random discount percentage (0‑25%).',
        schema: z.object({}),
      },
    );
  }
}
