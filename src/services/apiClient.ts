import type {
  ApiHealthStatus,
  AppSettings,
  AttachmentItem,
  ChatMessage,
  UserProfile,
} from '../types/nexora';

export async function fetchApiHealth(): Promise<ApiHealthStatus> {
  try {
    const res = await fetch('/api/health', { method: 'GET' });
    if (!res.ok) {
      return {
        status: 'error',
        model: 'gemini-4-hydrogen',
        errorDetail: `Health endpoint returned ${res.status}`,
      };
    }
    const data = await res.json();
    return {
      status: data.status === 'connected' ? 'connected' : 'missing_key',
      model: data.model || 'gemini-4-hydrogen',
      maxFileSizeBytes: data.maxFileSizeBytes,
    };
  } catch (err) {
    return {
      status: 'error',
      model: 'gemini-4-hydrogen',
      errorDetail: err instanceof Error ? err.message : 'Unable to reach server',
    };
  }
}

export function uploadAndProcessFile(
  file: File,
  onProgress: (percent: number) => void,
): Promise<AttachmentItem> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append('file', file);

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && event.total > 0) {
        const pct = Math.min(95, Math.round((event.loaded / event.total) * 95));
        onProgress(pct);
      }
    });

    xhr.addEventListener('load', () => {
      onProgress(100);
      try {
        const payload = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && payload.attachment) {
          resolve(payload.attachment as AttachmentItem);
        } else {
          reject(new Error(payload.error || `Upload failed (${xhr.status})`));
        }
      } catch {
        reject(new Error('Invalid server response during file processing.'));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Network error while uploading file.'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('File upload cancelled.'));
    });

    xhr.open('POST', '/api/files/process');
    xhr.send(formData);
  });
}

export async function streamChatMessage(params: {
  messages: ChatMessage[];
  settings: AppSettings;
  profile: UserProfile;
  signal: AbortSignal;
  onChunk: (chunkText: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}): Promise<void> {
  try {
    const payloadMessages = params.messages
      .filter((m) => !m.isError)
      .map((m) => ({
        role: m.role,
        content: m.content,
        attachments: m.attachments?.map((att) => ({
          id: att.id,
          name: att.name,
          mimeType: att.mimeType,
          size: att.size,
          kind: att.kind,
          base64Data: att.base64Data,
          extractedText: att.extractedText,
          truncated: att.truncated,
        })),
      }));

    const response = await fetch('/api/chat/stream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: params.signal,
      body: JSON.stringify({
        messages: payloadMessages,
        preferences: {
          responseStyle: params.settings.responseStyle,
          speedMode: params.settings.speedMode,
          language: params.settings.language,
          userName: params.profile.name,
          userRole: params.profile.role,
        },
      }),
    });

    if (!response.ok) {
      let errMsg = `Server error (${response.status})`;
      try {
        const errJson = await response.json();
        if (errJson?.error) errMsg = errJson.error;
      } catch {
        // Keep HTTP error status message
      }
      params.onError(errMsg);
      return;
    }

    if (!response.body) {
      params.onError('Streaming response body is unavailable.');
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let completed = false;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) continue;
        const jsonStr = line.slice(5).trim();
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr) as {
            type: 'chunk' | 'done' | 'error';
            text?: string;
            message?: string;
          };

          if (event.type === 'chunk' && typeof event.text === 'string') {
            params.onChunk(event.text);
          } else if (event.type === 'error') {
            completed = true;
            params.onError(event.message || 'An error occurred while generating the response.');
            return;
          } else if (event.type === 'done') {
            completed = true;
            params.onDone();
            return;
          }
        } catch {
          // Ignore malformed SSE event line
        }
      }
    }

    if (!completed && !params.signal.aborted) {
      params.onDone();
    }
  } catch (err) {
    if (params.signal.aborted) {
      params.onDone();
      return;
    }
    params.onError(
      err instanceof Error ? err.message : 'Unable to connect to the AI service.',
    );
  }
}
