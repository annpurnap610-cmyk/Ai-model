import {
  Check,
  Gamepad2,
  History,
  MessageSquare,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';
import type { Conversation, UserProfile, WorkspaceSection } from '../types/nexora';
import { groupConversationsByDate } from '../utils/formatters';
import { NexoraLogo } from './NexoraLogo';

interface SidebarProps {
  conversations: Conversation[];
  activeChatId: string | null;
  section: WorkspaceSection;
  profile: UserProfile;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  onSelectChat: (id: string) => void;
  onNewChat: () => void;
  onRenameChat: (id: string, newTitle: string) => void;
  onDeleteChat: (id: string) => void;
  onNavigate: (section: WorkspaceSection) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeChatId,
  section,
  profile,
  mobileOpen,
  onCloseMobile,
  onSelectChat,
  onNewChat,
  onRenameChat,
  onDeleteChat,
  onNavigate,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [avatarFailed, setAvatarFailed] = useState(false);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q)),
    );
  }, [conversations, searchQuery]);

  const grouped = useMemo(
    () => groupConversationsByDate(filteredConversations),
    [filteredConversations],
  );

  const startEditing = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const commitRename = (id: string) => {
    const trimmed = editingTitle.trim();
    if (trimmed) {
      onRenameChat(id, trimmed);
    }
    setEditingId(null);
  };

  const initials = profile.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

  const sidebarContent = (
    <div className="flex h-full flex-col bg-slate-50 dark:bg-[#101321] border-r border-slate-200 dark:border-white/[0.08] select-none">
      {/* Brand header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-200/80 dark:border-white/[0.06] shrink-0">
        <button
          type="button"
          onClick={() => {
            onNavigate('chat');
            onCloseMobile();
          }}
          className="flex items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-md"
        >
          <NexoraLogo size={22} />
          <span className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            NEXORA AI
          </span>
        </button>

        <button
          type="button"
          onClick={onCloseMobile}
          className="lg:hidden p-2 rounded-md text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
          aria-label="Close sidebar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Primary New Chat + Search */}
      <div className="p-3 space-y-2.5 shrink-0">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            onCloseMobile();
          }}
          className="w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-white/[0.09] bg-white dark:bg-[#15192A] hover:border-violet-500/50 text-sm font-medium text-slate-800 dark:text-slate-100 flex items-center justify-between transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-violet-500" />
            <span>New conversation</span>
          </span>
          <kbd className="hidden sm:inline-block text-[10px] font-mono text-slate-400 dark:text-slate-500">
            Ctrl+K
          </kbd>
        </button>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations"
            aria-label="Search conversations"
            className="w-full h-9 pl-8 pr-3 rounded-lg border border-slate-200/80 dark:border-white/[0.06] bg-white/70 dark:bg-[#0B0E18] text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-violet-500/60 transition-colors"
          />
        </div>
      </div>

      {/* Chat History List */}
      <div className="flex-1 overflow-y-auto px-2.5 py-1 space-y-4">
        {grouped.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {searchQuery.trim()
                ? 'No matching conversations found.'
                : 'Your recent conversations will appear here.'}
            </p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.label}>
              <div className="px-2.5 pb-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-500">
                {group.label}
              </div>
              <ul className="space-y-0.5">
                {group.items.map((conv) => {
                  const isActive = section === 'chat' && activeChatId === conv.id;
                  const isEditing = editingId === conv.id;

                  return (
                    <li key={conv.id} className="group relative">
                      {isEditing ? (
                        <div className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-white dark:bg-[#15192A] border border-violet-500/60">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitRename(conv.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            className="flex-1 min-w-0 bg-transparent text-xs text-slate-900 dark:text-white focus:outline-none"
                            aria-label="Rename conversation"
                          />
                          <button
                            type="button"
                            onClick={() => commitRename(conv.id)}
                            className="p-1 text-emerald-500 hover:text-emerald-400"
                            aria-label="Save title"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1 text-slate-400 hover:text-slate-200"
                            aria-label="Cancel rename"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`flex items-center rounded-lg transition-colors ${
                            isActive
                              ? 'bg-slate-200/80 dark:bg-white/[0.08] text-slate-900 dark:text-white'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/50 dark:hover:bg-white/[0.04]'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              onSelectChat(conv.id);
                              onCloseMobile();
                            }}
                            className="flex-1 min-w-0 flex items-center gap-2 px-2.5 py-2 text-left text-[13px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg"
                          >
                            <MessageSquare className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
                            <span className="truncate font-medium">{conv.title}</span>
                          </button>

                          <div
                            className={`flex items-center pr-1.5 gap-0.5 transition-opacity ${
                              isActive
                                ? 'opacity-100'
                                : 'opacity-0 group-hover:opacity-100 focus-within:opacity-100'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={(e) => startEditing(conv, e)}
                              className="p-1.5 rounded text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors"
                              aria-label={`Rename ${conv.title}`}
                              title="Rename"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDeleteChat(conv.id);
                              }}
                              className="p-1.5 rounded text-slate-400 hover:text-rose-500 transition-colors"
                              aria-label={`Delete ${conv.title}`}
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </div>

      {/* Bottom Workspace Navigation (Essential Sections Only) */}
      <div className="p-2.5 border-t border-slate-200 dark:border-white/[0.08] space-y-0.5 shrink-0">
        <button
          type="button"
          onClick={() => {
            onNavigate('history');
            onCloseMobile();
          }}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            section === 'history'
              ? 'bg-slate-200/80 dark:bg-white/[0.08] text-slate-900 dark:text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <History className="w-4 h-4 shrink-0" />
          <span>Chat History</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onNavigate('game');
            onCloseMobile();
          }}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            section === 'game'
              ? 'bg-slate-200/80 dark:bg-white/[0.08] text-slate-900 dark:text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Gamepad2 className="w-4 h-4 shrink-0" />
          <span>Pulse Vector</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onNavigate('settings');
            onCloseMobile();
          }}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            section === 'settings'
              ? 'bg-slate-200/80 dark:bg-white/[0.08] text-slate-900 dark:text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/[0.04] hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onNavigate('profile');
            onCloseMobile();
          }}
          className={`w-full flex items-center gap-2.5 px-2.5 py-2 mt-1 rounded-lg text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
            section === 'profile'
              ? 'bg-slate-200/80 dark:bg-white/[0.08] text-slate-900 dark:text-white'
              : 'hover:bg-slate-200/50 dark:hover:bg-white/[0.04]'
          }`}
        >
          <div className="w-7 h-7 rounded-full overflow-hidden bg-violet-600/20 border border-slate-200 dark:border-white/[0.1] flex items-center justify-center shrink-0">
            {profile.avatarUrl && !avatarFailed ? (
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                referrerPolicy="no-referrer"
                onError={() => setAvatarFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-300">
                {initials || 'NA'}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium text-slate-900 dark:text-slate-100 truncate">
              {profile.name}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {profile.role}
            </div>
          </div>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:block w-[264px] shrink-0 h-full">{sidebarContent}</aside>

      {/* Mobile slide-out drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-[280px] max-w-[85vw] h-full shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
