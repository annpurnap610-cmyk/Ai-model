import { DEFAULT_PROFILE, DEFAULT_SETTINGS } from '../config/constants';
import type { AppSettings, Conversation, UserProfile } from '../types/nexora';

const STORAGE_KEYS = {
  CONVERSATIONS: 'nexora_conversations_v1',
  ACTIVE_CHAT_ID: 'nexora_active_chat_v1',
  SETTINGS: 'nexora_settings_v1',
  PROFILE: 'nexora_profile_v1',
} as const;

export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(conversations));
  } catch {
    // Fallback if base64 image payloads exceed localStorage quota: strip binary base64Data from older messages
    try {
      const compact = conversations.map((conv, convIndex) => ({
        ...conv,
        messages: conv.messages.map((msg) => ({
          ...msg,
          attachments: msg.attachments?.map((att) =>
            convIndex === 0
              ? { ...att, previewUrl: undefined }
              : { ...att, base64Data: undefined, previewUrl: undefined },
          ),
        })),
      }));
      localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(compact));
    } catch {
      // Last-resort fallback: retain metadata and text only
      try {
        const minimal = conversations.slice(0, 30).map((conv) => ({
          ...conv,
          messages: conv.messages.map((msg) => ({
            ...msg,
            attachments: msg.attachments?.map((att) => ({
              id: att.id,
              name: att.name,
              mimeType: att.mimeType,
              size: att.size,
              kind: att.kind,
              truncated: att.truncated,
              lineCount: att.lineCount,
            })),
          })),
        }));
        localStorage.setItem(STORAGE_KEYS.CONVERSATIONS, JSON.stringify(minimal));
      } catch {
        // Ignore storage write failure gracefully
      }
    }
  }
}

export function loadActiveChatId(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_CHAT_ID);
  } catch {
    return null;
  }
}

export function saveActiveChatId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_CHAT_ID, id);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_CHAT_ID);
    }
  } catch {
    // Ignore storage error
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch {
    // Ignore storage error
  }
}

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function saveProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  } catch {
    // Ignore storage error
  }
}
