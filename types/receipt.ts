export type ReceiptStatus = 'pending' | 'processing' | 'done' | 'error';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

export interface Receipt {
  id: string;
  imageUri: string;
  totalAmount: number | null;
  currency: string | null;
  date: string | null;
  vendorName: string | null;
  description: string | null;
  category: string | null;
  confidence: ConfidenceLevel;
  status: ReceiptStatus;
  createdAt: string;
  errorMessage: string | null;
}

export type EditableReceiptFields = Pick<
  Receipt,
  'totalAmount' | 'currency' | 'date' | 'vendorName' | 'description' | 'category'
>;

export interface GeminiParseResult {
  total_amount: number | null;
  currency: string | null;
  date: string | null;
  vendor_name: string | null;
  description: string | null;
  category: string | null;
  confidence: ConfidenceLevel;
}
