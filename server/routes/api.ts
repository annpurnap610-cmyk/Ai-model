import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import {
  isGeminiConfigured,
  streamChatCompletion,
  type ChatPreferences,
  type IncomingChatMessage,
  type ResponseStyle,
  type SpeedMode,
} from '../ai/geminiService.ts';
import {
  ALLOWED_BINARY_DOC_MIMES,
  ALLOWED_IMAGE_MIMES,
  SERVER_CONFIG,
} from '../config.ts';
import { createRateLimiter } from '../middleware/rateLimit.ts';
import { processUploadedFile } from '../services/fileProcessor.ts';

const VALID_STYLES = new Set<ResponseStyle>([
  'Balanced',
  'Concise',
  'Detailed',
  'Technical',
]);

const VALID_SPEEDS = new Set<SpeedMode>(['Fast', 'Balanced', 'Deep']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: SERVER_CONFIG.MAX_FILE_SIZE_BYTES,
    files: 1,
  },
});

const chatRateLimiter = createRateLimiter({
  windowMs: SERVER_CONFIG.RATE_LIMIT_WINDOW_MS,
  maxRequests: SERVER_CONFIG.RATE_LIMIT_CHAT_MAX,
  message: 'Too many chat requests. Please pause briefly before sending another message.',
});

const uploadRateLimiter = createRateLimiter({
  windowMs: SERVER_CONFIG.RATE_LIMIT_WINDOW_MS,
  maxRequests: SERVER_CONFIG.RATE_LIMIT_UPLOAD_MAX,
  message: 'Too many file upload requests. Please wait a minute and try again.',
});

export const apiRouter = express.Router();

apiRouter.get('/health', (_req: Request, res: Response) => {
  const configured = isGeminiConfigured();
  res.json({
    status: configured ? 'connected' : 'missing_key',
    model: SERVER_CONFIG.GEMINI_MODEL,
    maxFileSizeBytes: SERVER_CONFIG.MAX_FILE_SIZE_BYTES,
    timestamp: new Date().toISOString(),
  });
});

apiRouter.post(
  '/files/process',
  uploadRateLimiter,
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('file')(req, res, (err: unknown) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(413).json({
              error: 'File exceeds the 10 MB maximum upload limit.',
              code: 'FILE_TOO_LARGE',
            });
            return;
          }
          res.status(400).json({ error: err.message, code: 'UPLOAD_ERROR' });
          return;
        }
        next(err);
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No file was uploaded.', code: 'NO_FILE' });
        return;
      }

      try {
        const processed = processUploadedFile(req.file);
        res.json({ attachment: processed });
      } catch (processErr) {
        const message =
          processErr instanceof Error ? processErr.message : 'Unable to process file.';
        res.status(400).json({ error: message, code: 'UNSUPPORTED_FILE' });
      }
    });
  },
);

function validateChatPayload(body: unknown): {
  messages: IncomingChatMessage[];
  preferences: ChatPreferences;
} {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid JSON payload.');
  }

  const raw = body as Record<string, unknown>;
  if (!Array.isArray(raw.messages) || raw.messages.length === 0) {
    throw new Error('At least one chat message is required.');
  }

  if (raw.messages.length > 100) {
    throw new Error('Conversation exceeds maximum supported message length.');
  }

  const sanitizedMessages: IncomingChatMessage[] = [];
  for (const item of raw.messages) {
    if (!item || typeof item !== 'object') {
      throw new Error('Invalid message entry.');
    }
    const msgObj = item as Record<string, unknown>;
    const role = msgObj.role === 'assistant' ? 'assistant' : msgObj.role === 'user' ? 'user' : null;
    if (!role) {
      throw new Error('Invalid message role.');
    }

    const content = typeof msgObj.content === 'string' ? msgObj.content : '';
    if (content.length > SERVER_CONFIG.MAX_MESSAGE_LENGTH) {
      throw new Error(
        `Message exceeds maximum length of ${SERVER_CONFIG.MAX_MESSAGE_LENGTH} characters.`,
      );
    }

    const attachments: IncomingChatMessage['attachments'] = [];
    if (Array.isArray(msgObj.attachments)) {
      if (msgObj.attachments.length > SERVER_CONFIG.MAX_ATTACHMENTS_PER_MESSAGE) {
        throw new Error(
          `Maximum ${SERVER_CONFIG.MAX_ATTACHMENTS_PER_MESSAGE} attachments per message.`,
        );
      }
      for (const rawAtt of msgObj.attachments) {
        if (!rawAtt || typeof rawAtt !== 'object') continue;
        const att = rawAtt as Record<string, unknown>;
        const kind = att.kind;
        const mimeType = typeof att.mimeType === 'string' ? att.mimeType.toLowerCase() : '';
        const name = typeof att.name === 'string' ? att.name.slice(0, 140) : 'attachment';
        const size = typeof att.size === 'number' ? att.size : 0;

        if (size > SERVER_CONFIG.MAX_FILE_SIZE_BYTES) {
          throw new Error(`Attachment "${name}" exceeds 10 MB size limit.`);
        }

        if (kind === 'text' && typeof att.extractedText === 'string') {
          attachments.push({
            id: typeof att.id === 'string' ? att.id : 'att',
            name,
            mimeType,
            size,
            kind: 'text',
            extractedText: att.extractedText.slice(0, SERVER_CONFIG.MAX_EXTRACTED_TEXT_CHARS),
            truncated: Boolean(att.truncated),
          });
        } else if (
          (kind === 'image' && ALLOWED_IMAGE_MIMES.has(mimeType)) ||
          (kind === 'pdf' && ALLOWED_BINARY_DOC_MIMES.has(mimeType))
        ) {
          if (typeof att.base64Data === 'string' && att.base64Data.length > 0) {
            attachments.push({
              id: typeof att.id === 'string' ? att.id : 'att',
              name,
              mimeType,
              size,
              kind,
              base64Data: att.base64Data,
            });
          }
        }
      }
    }

    if (!content.trim() && attachments.length === 0) {
      throw new Error('Messages cannot be empty without an attachment.');
    }

    sanitizedMessages.push({ role, content, attachments });
  }

  const rawPrefs =
    raw.preferences && typeof raw.preferences === 'object'
      ? (raw.preferences as Record<string, unknown>)
      : {};

  const styleCandidate =
    typeof rawPrefs.responseStyle === 'string' &&
    VALID_STYLES.has(rawPrefs.responseStyle as ResponseStyle)
      ? (rawPrefs.responseStyle as ResponseStyle)
      : 'Balanced';

  const speedCandidate =
    typeof rawPrefs.speedMode === 'string' &&
    VALID_SPEEDS.has(rawPrefs.speedMode as SpeedMode)
      ? (rawPrefs.speedMode as SpeedMode)
      : 'Fast';

  const language =
    typeof rawPrefs.language === 'string' && rawPrefs.language.trim().length > 0
      ? rawPrefs.language.trim().slice(0, 40)
      : 'English';

  const userName =
    typeof rawPrefs.userName === 'string' ? rawPrefs.userName.trim().slice(0, 60) : undefined;
  const userRole =
    typeof rawPrefs.userRole === 'string' ? rawPrefs.userRole.trim().slice(0, 80) : undefined;

  return {
    messages: sanitizedMessages,
    preferences: {
      responseStyle: styleCandidate,
      speedMode: speedCandidate,
      language,
      userName,
      userRole,
    },
  };
}

apiRouter.post('/chat/stream', chatRateLimiter, async (req: Request, res: Response) => {
  let validated;
  try {
    validated = validateChatPayload(req.body);
  } catch (err) {
    res.status(400).json({
      error: err instanceof Error ? err.message : 'Invalid request payload.',
      code: 'INVALID_REQUEST',
    });
    return;
  }

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const abortController = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  const sendEvent = (payload: Record<string, unknown>) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    }
  };

  try {
    await streamChatCompletion({
      messages: validated.messages,
      preferences: validated.preferences,
      signal: abortController.signal,
      onChunk: (text) => {
        sendEvent({ type: 'chunk', text });
      },
    });

    if (!abortController.signal.aborted) {
      sendEvent({ type: 'done' });
    }
  } catch (err) {
    const errObj = err as Error & { code?: string; status?: number };
    sendEvent({
      type: 'error',
      message: errObj.message || 'Unable to generate response.',
      code: errObj.code || 'AI_SERVICE_ERROR',
    });
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});
