// src/common/interfaces/quote.interface.ts

export interface QuoteDetails {
  originCep: string;
  destinationCep: string;
  payerCnpj: string;
  recipientCnpj: string;
  weightKg: number;
  invoiceValue: number;
  merchandiseCode?: string;
}

export interface QuoteResult {
  quoteId: string;
  price: number;
  estimatedDeliveryDays: number;
  errorMessage?: string;
  requiresHuman?: boolean;
}

export interface BookingResult {
  bookingId: string;
  status: 'confirmed' | 'failed';
  errorMessage?: string;
}

export interface LogOutcomeResult {
  logId: string;
  status: 'logged' | 'failed';
}

export interface CustomerStatus {
  status: 'active' | 'blocked' | 'not_found';
  reason?: string;
}

export interface CoverageResult {
  isServed: boolean;
  reason?: string;
}
