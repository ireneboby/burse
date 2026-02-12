import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  type Part,
} from '@google/generative-ai';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import type { ConfidenceLevel, GeminiParseResult, Receipt } from '@/types/receipt';
import { GEMINI_API_KEY } from '@/constants/config';
import {
  RECEIPT_PARSE_SYSTEM_PROMPT,
  RECEIPT_PARSE_USER_PROMPT,
} from '@/constants/prompts';

const MODEL = 'gemini-2.0-flash';
const MAX_REQUESTS_PER_MINUTE = 15;
const WINDOW_MS = 60_000;
const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [1000, 2000];

const requestStarts: number[] = [];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireRateLimitSlot(): Promise<void> {
  const now = Date.now();
  const cutoff = now - WINDOW_MS;
  while (requestStarts.length > 0 && requestStarts[0]! < cutoff) {
    requestStarts.shift();
  }
  if (requestStarts.length < MAX_REQUESTS_PER_MINUTE) {
    requestStarts.push(now);
    return;
  }
  const oldest = requestStarts[0]!;
  const waitMs = oldest + WINDOW_MS - now;
  await sleep(waitMs);
  return acquireRateLimitSlot();
}

async function prepareImageForGemini(
  imageUri: string,
): Promise<{ base64: string; mimeType: 'image/jpeg' }> {
  const result = await manipulateAsync(
    imageUri,
    [{ resize: { width: 1024 } }],
    { base64: true, format: SaveFormat.JPEG },
  );
  if (!result.base64) {
    throw new Error('Could not encode image');
  }
  return { base64: result.base64, mimeType: 'image/jpeg' };
}

function stripJsonFences(raw: string): string {
  let s = raw.trim();
  const backtick = '```';
  if (s.startsWith(backtick)) {
    const end = s.indexOf(backtick, backtick.length);
    if (end !== -1) {
      s = s.slice(backtick.length, end).trim();
    }
  }
  if (s.startsWith('json')) {
    s = s.slice(4).trim();
  }
  return s;
}

const CONFIDENCE_VALUES: ConfidenceLevel[] = ['low', 'medium', 'high'];

function parseAndValidateResponse(text: string): GeminiParseResult | null {
  const s = stripJsonFences(text);
  if (!s) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(s);
  } catch {
    return null;
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return null;
  }
  const o = parsed as Record<string, unknown>;

  const confidenceRaw = o.confidence;
  const confidence: ConfidenceLevel =
    typeof confidenceRaw === 'string' && CONFIDENCE_VALUES.includes(confidenceRaw as ConfidenceLevel)
      ? (confidenceRaw as ConfidenceLevel)
      : 'low';

  const totalAmount =
    typeof o.total_amount === 'number' && Number.isFinite(o.total_amount)
      ? o.total_amount
      : o.total_amount === null
        ? null
        : null;

  const str = (v: unknown): string | null =>
    typeof v === 'string' && v.length > 0 ? v : null;
  const date = (v: unknown): string | null =>
    typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v : null;

  return {
    total_amount: totalAmount,
    currency: str(o.currency) ?? null,
    date: date(o.date) ?? null,
    vendor_name: str(o.vendor_name) ?? null,
    description: str(o.description) ?? null,
    category: str(o.category) ?? null,
    confidence,
  };
}

function isRetryableError(err: unknown): boolean {
  if (err instanceof GoogleGenerativeAIFetchError) {
    const status = err.status;
    return status === 429 || (status != null && status >= 500);
  }
  return err instanceof Error && /network|fetch|timeout/i.test(err.message);
}

async function callGenerateContentWithRetry(
  model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>,
  contents: (string | Part)[],
): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(contents);
      return result.response.text();
    } catch (err) {
      lastError = err;
      if (attempt < MAX_RETRIES && isRetryableError(err)) {
        await sleep(RETRY_DELAYS_MS[attempt] ?? 2000);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export type ParseReceiptResult =
  | { ok: true; result: GeminiParseResult }
  | { ok: false; error: string };

export async function parseReceiptImage(
  imageUri: string,
): Promise<ParseReceiptResult> {
  const key = GEMINI_API_KEY?.trim?.() ?? '';
  if (!key) {
    return { ok: false, error: 'Missing API key' };
  }

  await acquireRateLimitSlot();

  let base64: string;
  let mimeType: 'image/jpeg';
  try {
    const prepared = await prepareImageForGemini(imageUri);
    base64 = prepared.base64;
    mimeType = prepared.mimeType;
  } catch {
    return { ok: false, error: 'Could not load image' };
  }

  const genAI = new GoogleGenerativeAI(key);
  const model = genAI.getGenerativeModel({
    model: MODEL,
    systemInstruction: RECEIPT_PARSE_SYSTEM_PROMPT,
  });

  const contents: (string | Part)[] = [
    { inlineData: { mimeType, data: base64 } },
    { text: RECEIPT_PARSE_USER_PROMPT },
  ];

  try {
    const text = await callGenerateContentWithRetry(model, contents);
    const result = parseAndValidateResponse(text);
    if (result) {
      return { ok: true, result };
    }
    return { ok: false, error: 'Invalid response' };
  } catch (err) {
    if (err instanceof GoogleGenerativeAIFetchError) {
      if (err.status === 429) {
        return { ok: false, error: 'Rate limited. Try again later.' };
      }
      if (err.status != null && err.status >= 500) {
        return { ok: false, error: 'Server error. Try again later.' };
      }
    }
    if (err instanceof Error) {
      return { ok: false, error: err.message || 'Network error' };
    }
    return { ok: false, error: 'Request failed' };
  }
}

export function geminiParseResultToReceiptFields(
  result: GeminiParseResult,
): Pick<
  Receipt,
  | 'totalAmount'
  | 'currency'
  | 'date'
  | 'vendorName'
  | 'description'
  | 'category'
  | 'confidence'
> {
  return {
    totalAmount: result.total_amount,
    currency: result.currency,
    date: result.date,
    vendorName: result.vendor_name,
    description: result.description,
    category: result.category,
    confidence: result.confidence,
  };
}
