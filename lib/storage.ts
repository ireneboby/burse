import { Paths, File, Directory } from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';

const receiptsDir = new Directory(Paths.document, 'receipts');

function ensureReceiptsDir(): void {
  if (!receiptsDir.exists) {
    receiptsDir.create({ intermediates: true });
  }
}

export function saveReceiptImage(sourceUri: string): string {
  ensureReceiptsDir();
  const filename = `${uuidv4()}.jpg`;
  const destFile = new File(receiptsDir, filename);
  const sourceFile = new File(sourceUri);
  sourceFile.copy(destFile);
  return destFile.uri;
}

export function deleteReceiptImage(imageUri: string): void {
  const file = new File(imageUri);
  if (file.exists) {
    file.delete();
  }
}

export function getReceiptImageUri(filename: string): string {
  return new File(receiptsDir, filename).uri;
}

export function deleteAllReceiptImages(): void {
  if (receiptsDir.exists) {
    receiptsDir.delete();
  }
  receiptsDir.create({ intermediates: true });
}
