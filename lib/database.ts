import * as SQLite from 'expo-sqlite';
import { v4 as uuidv4 } from 'uuid';
import type { Receipt } from '@/types/receipt';

let db: SQLite.SQLiteDatabase;

export async function initDatabase(): Promise<void> {
  db = await SQLite.openDatabaseAsync('burse.db');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version INTEGER PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS receipts (
      id TEXT PRIMARY KEY NOT NULL,
      imageUri TEXT NOT NULL,
      totalAmount REAL,
      currency TEXT,
      date TEXT,
      vendorName TEXT,
      description TEXT,
      category TEXT,
      confidence TEXT NOT NULL DEFAULT 'low',
      status TEXT NOT NULL DEFAULT 'pending',
      createdAt TEXT NOT NULL,
      errorMessage TEXT
    );
  `);
}

function rowToReceipt(row: Record<string, unknown>): Receipt {
  return {
    id: row.id as string,
    imageUri: row.imageUri as string,
    totalAmount: row.totalAmount != null ? Number(row.totalAmount) : null,
    currency: (row.currency as string) ?? null,
    date: (row.date as string) ?? null,
    vendorName: (row.vendorName as string) ?? null,
    description: (row.description as string) ?? null,
    category: (row.category as string) ?? null,
    confidence: (row.confidence as Receipt['confidence']) ?? 'low',
    status: (row.status as Receipt['status']) ?? 'pending',
    createdAt: row.createdAt as string,
    errorMessage: (row.errorMessage as string) ?? null,
  };
}

export async function insertReceipt(receipt: Receipt): Promise<void> {
  await db.runAsync(
    `INSERT INTO receipts (id, imageUri, totalAmount, currency, date, vendorName, description, category, confidence, status, createdAt, errorMessage)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    receipt.id,
    receipt.imageUri,
    receipt.totalAmount,
    receipt.currency,
    receipt.date,
    receipt.vendorName,
    receipt.description,
    receipt.category,
    receipt.confidence,
    receipt.status,
    receipt.createdAt,
    receipt.errorMessage,
  );
}

export async function updateReceipt(
  id: string,
  fields: Partial<Omit<Receipt, 'id'>>,
): Promise<void> {
  const entries = Object.entries(fields).filter(([_, v]) => v !== undefined);
  if (entries.length === 0) return;

  const setClauses = entries.map(([key]) => `${key} = ?`).join(', ');
  const values = entries.map(([_, v]) => v);

  await db.runAsync(
    `UPDATE receipts SET ${setClauses} WHERE id = ?`,
    ...values,
    id,
  );
}

export async function getReceipt(id: string): Promise<Receipt | null> {
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM receipts WHERE id = ?',
    id,
  );
  return row ? rowToReceipt(row) : null;
}

export async function getAllReceipts(): Promise<Receipt[]> {
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM receipts ORDER BY createdAt DESC',
  );
  return rows.map(rowToReceipt);
}

export async function deleteReceipt(id: string): Promise<void> {
  await db.runAsync('DELETE FROM receipts WHERE id = ?', id);
}

export async function __devVerifyDatabase(): Promise<boolean> {
  const testId = uuidv4();
  const mockReceipt: Receipt = {
    id: testId,
    imageUri: '/tmp/test-receipt.jpg',
    totalAmount: null,
    currency: null,
    date: null,
    vendorName: null,
    description: null,
    category: null,
    confidence: 'low',
    status: 'pending',
    createdAt: new Date().toISOString(),
    errorMessage: null,
  };

  try {
    await insertReceipt(mockReceipt);
    const inserted = await getReceipt(testId);
    if (!inserted || inserted.id !== testId) throw new Error('Insert/read failed');

    await updateReceipt(testId, { totalAmount: 42.99, status: 'done', vendorName: 'Test Vendor' });
    const updated = await getReceipt(testId);
    if (!updated || updated.totalAmount !== 42.99 || updated.status !== 'done') {
      throw new Error('Update failed');
    }

    await deleteReceipt(testId);
    const deleted = await getReceipt(testId);
    if (deleted !== null) throw new Error('Delete failed');

    console.log('[DB Verify] All CRUD operations passed');
    return true;
  } catch (error) {
    console.error('[DB Verify] Failed:', error);
    return false;
  }
}
