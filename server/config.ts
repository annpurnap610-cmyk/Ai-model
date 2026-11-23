export const SERVER_CONFIG = {
  PORT: Number(process.env.PORT || 3000),
  GEMINI_MODEL: 'gemini-4-hydrogen',
  FALLBACK_GEMINI_MODEL: 'gemini-3.1-flash-lite',
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB per file
  MAX_ATTACHMENTS_PER_MESSAGE: 4,
  MAX_MESSAGE_LENGTH: 24000,
  MAX_HISTORY_TURNS: 16,
  MAX_EXTRACTED_TEXT_CHARS: 180000,
  RATE_LIMIT_WINDOW_MS: 60 * 1000, // 1 minute
  RATE_LIMIT_CHAT_MAX: 30,
  RATE_LIMIT_UPLOAD_MAX: 25,
} as const;

export const ALLOWED_IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

export const ALLOWED_BINARY_DOC_MIMES = new Set([
  'application/pdf',
]);

export const ALLOWED_TEXT_EXTENSIONS = new Set([
  '.txt',
  '.md',
  '.markdown',
  '.csv',
  '.json',
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.html',
  '.htm',
  '.css',
  '.scss',
  '.xml',
  '.yaml',
  '.yml',
  '.sql',
  '.sh',
  '.log',
  '.env',
]);

export const ALLOWED_TEXT_MIMES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/html',
  'text/css',
  'text/xml',
  'text/javascript',
  'application/json',
  'application/javascript',
  'application/typescript',
  'application/xml',
  'application/x-yaml',
  'text/yaml',
  'application/octet-stream', // fallback when browser sends unknown MIME for .md/.ts/.py
]);
