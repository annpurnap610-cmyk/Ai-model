import type { Conversation } from '../types/nexora';

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  const value = bytes / Math.pow(1024, idx);
  return `${value >= 10 || idx === 0 ? Math.round(value) : value.toFixed(1)} ${units[idx]}`;
}

export function formatMessageTime(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return '';
  }
}

export function formatShortDate(timestamp: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    }).format(new Date(timestamp));
  } catch {
    return '';
  }
}

export function deriveConversationTitle(text: string, fallbackFileName?: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    return fallbackFileName ? `Analysis: ${fallbackFileName}`.slice(0, 48) : 'New Conversation';
  }
  if (cleaned.length <= 44) return cleaned;
  return `${cleaned.slice(0, 41).trimEnd()}...`;
}

export type HistoryGroupLabel = 'Today' | 'Yesterday' | 'Previous 7 Days' | 'Older';

export function groupConversationsByDate(
  conversations: Conversation[],
): Array<{ label: HistoryGroupLabel; items: Conversation[] }> {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOf7Days = startOfToday - 7 * 24 * 60 * 60 * 1000;

  const groups: Record<HistoryGroupLabel, Conversation[]> = {
    Today: [],
    Yesterday: [],
    'Previous 7 Days': [],
    Older: [],
  };

  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);

  for (const conv of sorted) {
    if (conv.updatedAt >= startOfToday) {
      groups.Today.push(conv);
    } else if (conv.updatedAt >= startOfYesterday) {
      groups.Yesterday.push(conv);
    } else if (conv.updatedAt >= startOf7Days) {
      groups['Previous 7 Days'].push(conv);
    } else {
      groups.Older.push(conv);
    }
  }

  const order: HistoryGroupLabel[] = ['Today', 'Yesterday', 'Previous 7 Days', 'Older'];
  return order
    .filter((label) => groups[label].length > 0)
    .map((label) => ({ label, items: groups[label] }));
}

export function sanitizeExternalUrl(url?: string): string {
  if (!url) return '#';
  const trimmed = url.trim();
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('mailto:') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('#')
  ) {
    return trimmed;
  }
  return '#';
}
