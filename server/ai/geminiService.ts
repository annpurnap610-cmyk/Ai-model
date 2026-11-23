import { GoogleGenAI, ThinkingLevel, type Content, type Part } from '@google/genai';
import {
  ALLOWED_BINARY_DOC_MIMES,
  ALLOWED_IMAGE_MIMES,
  SERVER_CONFIG,
} from '../config.ts';

export type ResponseStyle = 'Balanced' | 'Concise' | 'Detailed' | 'Technical';
export type SpeedMode = 'Fast' | 'Balanced' | 'Deep';

export interface IncomingAttachment {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: 'image' | 'pdf' | 'text';
  base64Data?: string;
  extractedText?: string;
  truncated?: boolean;
}

export interface IncomingChatMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: IncomingAttachment[];
}

export interface ChatPreferences {
  responseStyle: ResponseStyle;
  speedMode?: SpeedMode;
  language: string;
  userName?: string;
  userRole?: string;
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error(
      'Gemini API key is not configured on the server. Please add GEMINI_API_KEY in Settings > Secrets.',
    );
    (err as Error & { code?: string; status?: number }).code = 'MISSING_API_KEY';
    (err as Error & { code?: string; status?: number }).status = 503;
    throw err;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

function buildSystemInstruction(prefs: ChatPreferences): string {
  const styleGuides: Record<ResponseStyle, string> = {
    Balanced:
      'Provide clear, well-structured, natural responses that balance thoroughness with readability.',
    Concise:
      'Be crisp, direct, and economical with words. Prioritize bullet points and key takeaways without unnecessary filler.',
    Detailed:
      'Provide comprehensive, in-depth explanations with examples, nuance, edge cases, and structured headings where helpful.',
    Technical:
      'Adopt a senior engineering and analytical perspective. Include precise terminology, implementation details, trade-offs, and production-ready code when relevant.',
  };

  const parts: string[] = [
    'You are NEXORA AI, a highly capable intelligent assistant for reasoning, writing, software engineering, and document and image analysis.',
    `Response Style: ${styleGuides[prefs.responseStyle] || styleGuides.Balanced}`,
    `Preferred Output Language: Respond in ${prefs.language || 'English'} unless the user explicitly asks for a different language.`,
    'Formatting: Use clean Markdown formatting (headings, lists, tables, and fenced code blocks with language identifiers) when it improves clarity.',
    'Accuracy & Attachments: Only analyze or cite document or image contents that are actually provided in the conversation. Never fabricate file contents or claim to have read a file that was not attached.',
  ];

  if (prefs.userName?.trim()) {
    const roleSnippet = prefs.userRole?.trim() ? ` (${prefs.userRole.trim()})` : '';
    parts.push(`User Context: You are assisting ${prefs.userName.trim()}${roleSnippet}.`);
  }

  return parts.join('\n\n');
}

function buildMessageParts(
  msg: IncomingChatMessage,
  includeBinaryAttachments: boolean,
): Part[] {
  const parts: Part[] = [];

  if (msg.attachments && msg.attachments.length > 0) {
    for (const att of msg.attachments) {
      if (att.kind === 'text' && typeof att.extractedText === 'string') {
        const truncationNote = att.truncated
          ? '\n[Note: File content was truncated due to size limits.]'
          : '';
        parts.push({
          text: `[Attached Document: ${att.name}]\n\`\`\`\n${att.extractedText}\n\`\`\`${truncationNote}`,
        });
      } else if (
        includeBinaryAttachments &&
        (att.kind === 'image' || att.kind === 'pdf') &&
        typeof att.base64Data === 'string' &&
        att.base64Data.length > 0 &&
        (ALLOWED_IMAGE_MIMES.has(att.mimeType) || ALLOWED_BINARY_DOC_MIMES.has(att.mimeType))
      ) {
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.base64Data,
          },
        });
      } else if (!includeBinaryAttachments && (att.kind === 'image' || att.kind === 'pdf')) {
        parts.push({
          text: `[Previously attached ${att.kind === 'image' ? 'image' : 'PDF'}: ${att.name}]`,
        });
      }
    }
  }

  const trimmedText = msg.content.trim();
  if (trimmedText) {
    parts.push({ text: trimmedText });
  } else if (parts.length > 0) {
    parts.push({ text: 'Please analyze the attached content.' });
  }

  return parts;
}

function extractReadableErrorMessage(raw: string): string {
  let current = raw.trim();
  for (let i = 0; i < 3; i++) {
    if (current.startsWith('{') || current.startsWith('[')) {
      try {
        const parsed = JSON.parse(current) as {
          error?: { message?: string };
          message?: string;
        };
        const next = parsed?.error?.message || parsed?.message;
        if (typeof next === 'string' && next.trim()) {
          current = next.trim();
          continue;
        }
      } catch {
        break;
      }
    }
    break;
  }
  return current;
}

function normalizeGeminiError(error: unknown): {
  message: string;
  code: string;
  status: number;
  retryable: boolean;
} {
  const errObj = error as {
    message?: string;
    status?: number;
    code?: string | number;
  };

  const rawMsg = errObj?.message || 'An unexpected AI service error occurred.';
  const cleanMsg = extractReadableErrorMessage(rawMsg);
  const upperMsg = cleanMsg.toUpperCase();

  if (errObj?.code === 'MISSING_API_KEY') {
    return { message: cleanMsg, code: 'MISSING_API_KEY', status: 503, retryable: false };
  }

  if (
    errObj?.status === 400 &&
    (upperMsg.includes('API_KEY_INVALID') || upperMsg.includes('API KEY'))
  ) {
    return {
      message:
        'The configured Gemini API key appears invalid. Please verify GEMINI_API_KEY in Settings > Secrets.',
      code: 'API_KEY_INVALID',
      status: 400,
      retryable: false,
    };
  }

  if (errObj?.status === 403 || upperMsg.includes('PERMISSION_DENIED')) {
    return {
      message:
        'Permission denied by Gemini API. Please check your GEMINI_API_KEY permissions in Settings > Secrets.',
      code: 'PERMISSION_DENIED',
      status: 403,
      retryable: false,
    };
  }

  if (errObj?.status === 429 || upperMsg.includes('RESOURCE_EXHAUSTED')) {
    return {
      message:
        'AI rate limit or quota reached. Please wait a moment and try again, or check your API quota in Settings > Secrets.',
      code: 'RESOURCE_EXHAUSTED',
      status: 429,
      retryable: false,
    };
  }

  if (errObj?.status === 404 || upperMsg.includes('NOT_FOUND')) {
    return {
      message: `Requested Gemini model (${SERVER_CONFIG.GEMINI_MODEL}) was not found or is unavailable.`,
      code: 'MODEL_NOT_FOUND',
      status: 404,
      retryable: false,
    };
  }

  const isTransient =
    errObj?.status === 503 ||
    errObj?.status === 502 ||
    upperMsg.includes('UNAVAILABLE') ||
    upperMsg.includes('HIGH DEMAND');

  return {
    message: cleanMsg.length > 280 ? `${cleanMsg.slice(0, 280)}...` : cleanMsg,
    code: isTransient ? 'SERVICE_UNAVAILABLE' : 'AI_SERVICE_ERROR',
    status:
      typeof errObj?.status === 'number' && errObj.status >= 400
        ? errObj.status
        : isTransient
          ? 503
          : 500,
    retryable: isTransient,
  };
}

export async function streamChatCompletion(params: {
  messages: IncomingChatMessage[];
  preferences: ChatPreferences;
  signal: AbortSignal;
  onChunk: (text: string) => void;
}): Promise<void> {
  const ai = getGeminiClient();
  const recentMessages = params.messages.slice(-SERVER_CONFIG.MAX_HISTORY_TURNS);

  // Include full binary attachments for the latest 2 messages for low payload latency
  const contents: Content[] = recentMessages.map((msg, idx) => {
    const isRecent = idx >= recentMessages.length - 2;
    return {
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: buildMessageParts(msg, isRecent),
    };
  });

  const speedMode: SpeedMode = params.preferences.speedMode || 'Fast';
  const hasBinaryInLatest = recentMessages
    .slice(-2)
    .some((m) => m.attachments?.some((a) => a.kind === 'image' || a.kind === 'pdf'));

  // Select optimal low-latency model & thinking level without artificial retry delays
  const modelsToTry: Array<{ model: string; thinkingLevel: ThinkingLevel }> =
    speedMode === 'Fast' && !hasBinaryInLatest
      ? [
          { model: SERVER_CONFIG.FALLBACK_GEMINI_MODEL, thinkingLevel: ThinkingLevel.MINIMAL },
          { model: SERVER_CONFIG.GEMINI_MODEL, thinkingLevel: ThinkingLevel.LOW },
        ]
      : speedMode === 'Deep'
        ? [
            { model: SERVER_CONFIG.GEMINI_MODEL, thinkingLevel: ThinkingLevel.HIGH },
            { model: SERVER_CONFIG.FALLBACK_GEMINI_MODEL, thinkingLevel: ThinkingLevel.LOW },
          ]
        : [
            { model: SERVER_CONFIG.GEMINI_MODEL, thinkingLevel: ThinkingLevel.LOW },
            { model: SERVER_CONFIG.FALLBACK_GEMINI_MODEL, thinkingLevel: ThinkingLevel.MINIMAL },
          ];

  let lastError: unknown;

  for (const target of modelsToTry) {
    let emittedAnyChunk = false;
    try {
      const stream = await ai.models.generateContentStream({
        model: target.model,
        contents,
        config: {
          systemInstruction: buildSystemInstruction(params.preferences),
          thinkingConfig: {
            thinkingLevel: target.thinkingLevel,
          },
        },
      });

      for await (const chunk of stream) {
        if (params.signal.aborted) {
          return;
        }
        const text = chunk.text;
        if (text) {
          emittedAnyChunk = true;
          params.onChunk(text);
        }
      }
      return;
    } catch (err) {
      if (params.signal.aborted) {
        return;
      }
      lastError = err;
      const normalized = normalizeGeminiError(err);

      if (emittedAnyChunk) {
        const wrapped = new Error(normalized.message) as Error & {
          code?: string;
          status?: number;
        };
        wrapped.code = normalized.code;
        wrapped.status = normalized.status;
        throw wrapped;
      }

      const shouldFailover =
        normalized.retryable || normalized.code === 'RESOURCE_EXHAUSTED';

      if (!shouldFailover) {
        const wrapped = new Error(normalized.message) as Error & {
          code?: string;
          status?: number;
        };
        wrapped.code = normalized.code;
        wrapped.status = normalized.status;
        throw wrapped;
      }
      // Instant failover to backup model with zero sleep
    }
  }

  const normalized = normalizeGeminiError(lastError);
  const wrapped = new Error(normalized.message) as Error & {
    code?: string;
    status?: number;
  };
  wrapped.code = normalized.code;
  wrapped.status = normalized.status;
  throw wrapped;
}
