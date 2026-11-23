import type { AppSettings, ResponseStyle, SpeedMode, UserProfile } from '../types/nexora';

export const APP_NAME = 'NEXORA AI';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_ATTACHMENTS_PER_MESSAGE = 4;

export const ACCEPTED_FILE_INPUT =
  '.png,.jpg,.jpeg,.webp,.gif,.pdf,.txt,.md,.markdown,.csv,.json,.ts,.tsx,.js,.jsx,.py,.html,.css,.xml,.yaml,.yml,.sql,.sh,.log';

export const SUPPORTED_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Portuguese',
  'Hindi',
  'Arabic',
];

export const RESPONSE_STYLES: Array<{
  id: ResponseStyle;
  label: string;
  description: string;
}> = [
  {
    id: 'Balanced',
    label: 'Balanced',
    description: 'Clear, natural reasoning with structured takeaways.',
  },
  {
    id: 'Concise',
    label: 'Concise',
    description: 'Brief, direct answers focused on essential facts.',
  },
  {
    id: 'Detailed',
    label: 'Detailed',
    description: 'Thorough explanations with examples and context.',
  },
  {
    id: 'Technical',
    label: 'Technical',
    description: 'Engineering depth, trade-offs, and production code.',
  },
];

export interface StarterSuggestion {
  id: string;
  title: string;
  description: string;
  prompt: string;
  requiresFile?: boolean;
}

export const STARTER_SUGGESTIONS: StarterSuggestion[] = [
  {
    id: 'explain',
    title: 'Explain something complex',
    description: 'Clear mental models and structured intuition',
    prompt:
      'Explain how transformer self-attention works using a clear mental model and a step-by-step example.',
  },
  {
    id: 'write',
    title: 'Write professional content',
    description: 'Announcements, emails, scripts, and copy',
    prompt:
      'Write a crisp, high-trust product launch announcement email for engineering leaders introducing a faster release pipeline.',
  },
  {
    id: 'analyze',
    title: 'Analyze a document',
    description: 'Upload a PDF, CSV, code file, or image',
    prompt:
      'Summarize the key findings, structure, and any notable risks or action items in this file.',
    requiresFile: true,
  },
  {
    id: 'solve',
    title: 'Help me solve a problem',
    description: 'Debug code, compare trade-offs, or plan architecture',
    prompt:
      'Help me debug an async race condition in React when rapid filter changes trigger overlapping fetch requests, and show the cleanest cancellation pattern.',
  },
];

export const SPEED_MODES: Array<{
  id: SpeedMode;
  label: string;
  description: string;
}> = [
  {
    id: 'Fast',
    label: 'Fast',
    description: 'Near-instant replies with minimal thinking delay.',
  },
  {
    id: 'Balanced',
    label: 'Balanced',
    description: 'Low-latency reasoning for everyday tasks and files.',
  },
  {
    id: 'Deep',
    label: 'Deep',
    description: 'Extended reasoning depth for complex coding and analysis.',
  },
];

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  language: 'English',
  responseStyle: 'Balanced',
  speedMode: 'Fast',
};

export const DEFAULT_PROFILE: UserProfile = {
  name: 'Ananya Rao',
  role: 'Product Architect',
  email: 'workspace@nexora.ai',
  bio: 'Focused on systems architecture, product strategy, and technical writing.',
  avatarUrl: '/src/assets/images/avatar_nexora_user_1795442172085.jpg',
};
