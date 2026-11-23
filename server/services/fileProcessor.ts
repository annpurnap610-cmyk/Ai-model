import path from 'node:path';
import {
  ALLOWED_BINARY_DOC_MIMES,
  ALLOWED_IMAGE_MIMES,
  ALLOWED_TEXT_EXTENSIONS,
  ALLOWED_TEXT_MIMES,
  SERVER_CONFIG,
} from '../config.ts';

export interface ProcessedAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: 'image' | 'pdf' | 'text';
  base64Data?: string;
  extractedText?: string;
  truncated?: boolean;
  lineCount?: number;
}

function sanitizeFilename(originalName: string): string {
  const base = path.basename(originalName || 'attachment');
  return base.replace(/[^\w.\- ()]/g, '_').slice(0, 120) || 'attachment';
}

function matchesMagicBytes(buffer: Buffer, mimeType: string): boolean {
  if (buffer.length < 4) return false;

  if (mimeType === 'image/png') {
    return (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }

  if (mimeType === 'image/jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === 'image/gif') {
    const header = buffer.subarray(0, 6).toString('ascii');
    return header === 'GIF87a' || header === 'GIF89a';
  }

  if (mimeType === 'image/webp') {
    if (buffer.length < 12) return false;
    return (
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }

  if (mimeType === 'application/pdf') {
    return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
  }

  return false;
}

function isLikelyPlainText(buffer: Buffer): boolean {
  const sampleLen = Math.min(buffer.length, 8192);
  for (let i = 0; i < sampleLen; i++) {
    if (buffer[i] === 0x00) {
      return false; // Null byte indicates binary executable or unsupported binary format
    }
  }
  return true;
}

export function processUploadedFile(file: Express.Multer.File): ProcessedAttachment {
  if (!file || !file.buffer) {
    throw new Error('No file payload received.');
  }

  if (file.size === 0 || file.buffer.length === 0) {
    throw new Error('The uploaded file is empty.');
  }

  if (file.size > SERVER_CONFIG.MAX_FILE_SIZE_BYTES) {
    throw new Error('File exceeds the 10 MB maximum size limit.');
  }

  const safeName = sanitizeFilename(file.originalname);
  const ext = path.extname(safeName).toLowerCase();
  const mimeType = (file.mimetype || 'application/octet-stream').toLowerCase();
  const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // 1. Supported Images
  if (ALLOWED_IMAGE_MIMES.has(mimeType)) {
    if (!matchesMagicBytes(file.buffer, mimeType)) {
      throw new Error(`Invalid or corrupted image signature for ${safeName}.`);
    }
    return {
      id,
      name: safeName,
      mimeType,
      size: file.size,
      kind: 'image',
      base64Data: file.buffer.toString('base64'),
    };
  }

  // 2. Supported PDF Documents
  if (ALLOWED_BINARY_DOC_MIMES.has(mimeType) || ext === '.pdf') {
    if (!matchesMagicBytes(file.buffer, 'application/pdf')) {
      throw new Error(`File "${safeName}" is not a valid PDF document.`);
    }
    return {
      id,
      name: safeName,
      mimeType: 'application/pdf',
      size: file.size,
      kind: 'pdf',
      base64Data: file.buffer.toString('base64'),
    };
  }

  // 3. Supported Text, Markdown, CSV, JSON, and Code Files
  const isTextByExt = ALLOWED_TEXT_EXTENSIONS.has(ext);
  const isTextByMime = ALLOWED_TEXT_MIMES.has(mimeType) || mimeType.startsWith('text/');

  if (isTextByExt || (isTextByMime && ext !== '.exe' && ext !== '.dll' && ext !== '.bin')) {
    if (!isLikelyPlainText(file.buffer)) {
      throw new Error(`"${safeName}" contains binary data and cannot be read as text.`);
    }

    const rawText = file.buffer.toString('utf8');
    const lineCount = rawText.split(/\r\n|\r|\n/).length;
    const truncated = rawText.length > SERVER_CONFIG.MAX_EXTRACTED_TEXT_CHARS;
    const extractedText = truncated
      ? rawText.slice(0, SERVER_CONFIG.MAX_EXTRACTED_TEXT_CHARS)
      : rawText;

    return {
      id,
      name: safeName,
      mimeType: mimeType === 'application/octet-stream' ? 'text/plain' : mimeType,
      size: file.size,
      kind: 'text',
      extractedText,
      truncated,
      lineCount,
    };
  }

  throw new Error(
    `Unsupported file type (${ext || mimeType}). Supported formats: PNG, JPG, WEBP, GIF, PDF, TXT, MD, CSV, JSON, and common code files.`,
  );
}
