import { BookOpen, Eraser, Menu, PanelLeftOpen, Plus } from 'lucide-react';
import React from 'react';
import type { ApiHealthStatus, WorkspaceSection } from '../types/nexora';
import { NexoraLogo } from './NexoraLogo';

interface TopBarProps {
  section: WorkspaceSection;
  activeChatTitle?: string;
  hasMessages: boolean;
  apiHealth: ApiHealthStatus;
  focusMode: boolean;
  onToggleFocusMode: () => void;
  onOpenMobileMenu: () => void;
  onNewChat: () => void;
  onClearChat: () => void;
  onNavigateSettings: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  section,
  activeChatTitle,
  hasMessages,
  apiHealth,
  focusMode,
  onToggleFocusMode,
  onOpenMobileMenu,
  onNewChat,
  onClearChat,
  onNavigateSettings,
}) => {
  const sectionLabel =
    section === 'chat'
      ? activeChatTitle || 'New Conversation'
      : section === 'history'
        ? 'Chat History'
        : section === 'settings'
          ? 'Settings'
          : 'User Profile';

  const statusText =
    apiHealth.status === 'connected'
      ? 'Gemini 4 Hydrogen · Ready'
      : apiHealth.status === 'checking'
        ? 'Checking AI status...'
        : apiHealth.status === 'missing_key'
          ? 'API key needed'
          : 'Service unreachable';

  const statusTone =
    apiHealth.status === 'connected'
      ? 'text-slate-500 dark:text-[#94A3B8]'
      : apiHealth.status === 'checking'
        ? 'text-slate-400 dark:text-slate-500'
        : 'text-amber-600 dark:text-amber-400';

  return (
    <header className="h-14 shrink-0 border-b border-slate-200 dark:border-white/[0.08] bg-white/90 dark:bg-[#080A12]/90 backdrop-blur-sm px-3 sm:px-5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2.5 min-w-0">
        {!focusMode && (
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 -ml-1 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div
          className={`items-center gap-2 shrink-0 ${
            focusMode ? 'flex' : 'flex lg:hidden'
          }`}
        >
          <NexoraLogo size={20} />
          <span className="text-sm font-semibold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            NEXORA AI
          </span>
        </div>

        {focusMode && (
          <span className="hidden lg:inline-block text-slate-300 dark:text-white/15" aria-hidden="true">
            /
          </span>
        )}

        <span className="hidden lg:inline-block text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-md">
          {sectionLabel}
        </span>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
        {!focusMode && (
          <button
            type="button"
            onClick={onNavigateSettings}
            title="View AI connection status in Settings"
            className={`hidden md:inline-flex items-center text-xs font-medium transition-colors hover:text-slate-900 dark:hover:text-slate-200 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded px-1.5 py-1 ${statusTone}`}
          >
            {statusText}
          </button>
        )}

        <button
          type="button"
          onClick={onToggleFocusMode}
          aria-pressed={focusMode}
          title={
            focusMode
              ? 'Exit Focus / Reading mode and show sidebar'
              : 'Enter Focus / Reading mode to hide sidebar'
          }
          className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            focusMode
              ? 'border-violet-500/60 bg-violet-500/10 text-violet-700 dark:text-violet-300 hover:bg-violet-500/15'
              : 'border-slate-200 dark:border-white/[0.09] text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/[0.06]'
          }`}
        >
          {focusMode ? (
            <>
              <PanelLeftOpen className="w-3.5 h-3.5" />
              <span>Exit Focus</span>
            </>
          ) : (
            <>
              <BookOpen className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Focus</span>
            </>
          )}
        </button>

        {section === 'chat' && hasMessages && (
          <button
            type="button"
            onClick={onClearChat}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 dark:border-white/[0.09] text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/[0.06] transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            title="Clear current conversation"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        )}

        <button
          type="button"
          onClick={onNewChat}
          className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#080A12]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Chat</span>
        </button>
      </div>
    </header>
  );
};
