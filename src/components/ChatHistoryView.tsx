import {
  Check,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { Conversation } from '../types/nexora';
import { formatShortDate } from '../utils/formatters';

interface ChatHistoryViewProps {
  conversations: Conversation[];
  onSelectChat: (id: string) => void;
  onRenameChat: (id: string, title: string) => void;
  onDeleteChat: (id: string) => void;
  onClearAll: () => void;
  onNewChat: () => void;
}

export const ChatHistoryView: React.FC<ChatHistoryViewProps> = ({
  conversations,
  onSelectChat,
  onRenameChat,
  onDeleteChat,
  onClearAll,
  onNewChat,
}) => {
  const [query, setQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [confirmClearAll, setConfirmClearAll] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
    if (!q) return sorted;
    return sorted.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [conversations, query]);

  const commitRename = (id: string) => {
    const trimmed = editingTitle.trim();
    if (trimmed) {
      onRenameChat(id, trimmed);
    }
    setEditingId(null);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/[0.08] pb-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
              Chat History
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-[#94A3B8]">
              <span className="font-mono tabular-nums">{conversations.length}</span> saved{' '}
              {conversations.length === 1 ? 'conversation' : 'conversations'} stored locally in your browser.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {conversations.length > 0 && (
              confirmClearAll ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClearAll();
                      setConfirmClearAll(false);
                    }}
                    className="h-9 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors whitespace-nowrap"
                  >
                    Confirm Clear All
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmClearAll(false)}
                    className="h-9 px-3 rounded-lg border border-slate-200 dark:border-white/[0.1] text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(true)}
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-white/[0.1] text-xs font-medium text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 hover:border-rose-500/40 transition-colors whitespace-nowrap"
                >
                  Clear All
                </button>
              )
            )}

            <button
              type="button"
              onClick={onNewChat}
              className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Chat</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversation titles or message content..."
            aria-label="Search chat history"
            className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#101321] text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-violet-500/60"
          />
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#101321] px-6 py-12 text-center space-y-3">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
              {query.trim() ? 'No matching conversations' : 'No saved conversations yet'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {query.trim()
                ? 'Try a different keyword or clear the search filter.'
                : 'Start a conversation in the workspace to see it appear here.'}
            </p>
            {!query.trim() && (
              <button
                type="button"
                onClick={onNewChat}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Start Conversation</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-200 dark:divide-white/[0.06] rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#101321] overflow-hidden">
            {filtered.map((conv) => {
              const isEditing = editingId === conv.id;
              const previewText =
                conv.messages[conv.messages.length - 1]?.content?.slice(0, 110) ||
                'Empty conversation';

              return (
                <div
                  key={conv.id}
                  className="flex items-center justify-between gap-4 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-[#15192A] transition-colors"
                >
                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename(conv.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                        className="flex-1 h-9 px-3 rounded-md border border-violet-500/60 bg-white dark:bg-[#080A12] text-sm text-slate-900 dark:text-white focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => commitRename(conv.id)}
                        className="p-2 text-emerald-500 hover:text-emerald-400"
                        aria-label="Save title"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-2 text-slate-400 hover:text-slate-200"
                        aria-label="Cancel rename"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onSelectChat(conv.id)}
                        className="flex-1 min-w-0 text-left focus-visible:outline-none"
                      >
                        <div className="flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-slate-400 shrink-0" />
                          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                            {conv.title}
                          </span>
                        </div>
                        <p className="mt-1 pl-6 text-xs text-slate-500 dark:text-[#94A3B8] truncate">
                          {previewText}
                        </p>
                      </button>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-mono tabular-nums">
                          <span>{conv.messages.length} msgs</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatShortDate(conv.updatedAt)}</span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(conv.id);
                              setEditingTitle(conv.title);
                            }}
                            className="p-2 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-white/[0.06] transition-colors"
                            aria-label={`Rename ${conv.title}`}
                            title="Rename"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteChat(conv.id)}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                            aria-label={`Delete ${conv.title}`}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
