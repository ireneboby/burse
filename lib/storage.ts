import { Platform } from 'react-native';
import { Paths, File, Directory } from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';

let receiptsDir: Directory | null = null;

function getReceiptsDir(): Directory {
  if (Platform.OS === 'web') {
    throw new Error('Receipt storage is not supported on web. Use the app on a device.');
  }
  if (!receiptsDir) {
    receiptsDir = new Directory(Paths.document, 'receipts');
  }
  return receiptsDir;
}

function ensureReceiptsDir(): void {
  const dir = getReceiptsDir();
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
}

export function saveReceiptImage(sourceUri: string): string {
  ensureReceiptsDir();
  const dir = getReceiptsDir();
  const filename = `${uuidv4()}.jpg`;
  const destFile = new File(dir, filename);
  const sourceFile = new File(sourceUri);
  sourceFile.copy(destFile);
  return destFile.uri;
}

export function deleteReceiptImage(imageUri: string): void {
  if (Platform.OS === 'web') return;
  const file = new File(imageUri);
  if (file.exists) {
    file.delete();
  }
}

export function getReceiptImageUri(filename: string): string {
  if (Platform.OS === 'web') {
    throw new Error('Receipt storage is not supported on web.');
  }
  return new File(getReceiptsDir(), filename).uri;
}

export function deleteAllReceiptImages(): void {
  if (Platform.OS === 'web') return;
  const dir = getReceiptsDir();
  if (dir.exists) {
    dir.delete();
  }
  dir.create({ intermediates: true });
}
