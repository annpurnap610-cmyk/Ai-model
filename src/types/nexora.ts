export type WorkspaceSection = 'chat' | 'history' | 'settings' | 'profile' | 'game';

export type ThemeMode = 'dark' | 'light' | 'system';

export type ResponseStyle = 'Balanced' | 'Concise' | 'Detailed' | 'Technical';

export type SpeedMode = 'Fast' | 'Balanced' | 'Deep';

export interface AttachmentItem {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  kind: 'image' | 'pdf' | 'text';
  base64Data?: string;
  extractedText?: string;
  truncated?: boolean;
  lineCount?: number;
  previewUrl?: string;
}

export interface PendingAttachment {
  localId: string;
  file: File;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'ready' | 'error';
  errorMessage?: string;
  processed?: AttachmentItem;
  previewUrl?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  attachments?: AttachmentItem[];
  isError?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface AppSettings {
  theme: ThemeMode;
  language: string;
  responseStyle: ResponseStyle;
  speedMode: SpeedMode;
}

export interface UserProfile {
  name: string;
  role: string;
  email: string;
  bio: string;
  avatarUrl: string;
}

export interface ApiHealthStatus {
  status: 'connected' | 'missing_key' | 'error' | 'checking';
  model: string;
  maxFileSizeBytes?: number;
  errorDetail?: string;
}

export interface ToastItem {
  id: string;
  type: 'info' | 'success' | 'error';
  message: string;
}
