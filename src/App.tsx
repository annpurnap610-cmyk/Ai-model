import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChatHistoryView } from './components/ChatHistoryView';
import { ChatWorkspace } from './components/ChatWorkspace';
import { ProfileView } from './components/ProfileView';
import { PulseVectorGame } from './components/PulseVectorGame';
import { SettingsView } from './components/SettingsView';
import { Sidebar } from './components/Sidebar';
import { ToastContainer } from './components/ToastContainer';
import { TopBar } from './components/TopBar';
import {
  MAX_ATTACHMENTS_PER_MESSAGE,
  MAX_FILE_SIZE_BYTES,
} from './config/constants';
import {
  fetchApiHealth,
  streamChatMessage,
  uploadAndProcessFile,
} from './services/apiClient';
import {
  loadActiveChatId,
  loadConversations,
  loadProfile,
  loadSettings,
  saveActiveChatId,
  saveConversations,
  saveProfile,
  saveSettings,
} from './services/storageService';
import type {
  ApiHealthStatus,
  AppSettings,
  AttachmentItem,
  ChatMessage,
  Conversation,
  PendingAttachment,
  ToastItem,
  UserProfile,
  WorkspaceSection,
} from './types/nexora';
import { deriveConversationTitle } from './utils/formatters';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    loadConversations(),
  );
  const [activeChatId, setActiveChatId] = useState<string | null>(() => {
    const savedId = loadActiveChatId();
    const loaded = loadConversations();
    if (savedId && loaded.some((c) => c.id === savedId)) {
      return savedId;
    }
    return null;
  });
  const [section, setSection] = useState<WorkspaceSection>('chat');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);

  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile());
  const [apiHealth, setApiHealth] = useState<ApiHealthStatus>({
    status: 'checking',
    model: 'gemini-4-hydrogen',
  });

  const [composerText, setComposerText] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const pushToast = useCallback(
    (type: ToastItem['type'], message: string) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4200);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Theme application (Dark / Light / System)
  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement;
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const shouldBeDark =
        settings.theme === 'dark' || (settings.theme === 'system' && prefersDark);

      if (shouldBeDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (settings.theme === 'system') applyTheme();
    };
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [settings.theme]);

  // Persist state changes
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  useEffect(() => {
    saveActiveChatId(activeChatId);
  }, [activeChatId]);

  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  // Initial API health check
  const refreshHealth = useCallback(async () => {
    setApiHealth((prev) => ({ ...prev, status: 'checking' }));
    const result = await fetchApiHealth();
    setApiHealth(result);
  }, []);

  useEffect(() => {
    refreshHealth();
  }, [refreshHealth]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeChatId) ?? null,
    [conversations, activeChatId],
  );

  const handleNewChat = useCallback(() => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    }
    setActiveChatId(null);
    setSection('chat');
    setComposerText('');
  }, [isStreaming]);

  // Keyboard shortcut Ctrl+K / Cmd+K for New Chat
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleNewChat]);

  const handleSelectChat = (id: string) => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    }
    setActiveChatId(id);
    setSection('chat');
  };

  const handleRenameChat = (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c)),
    );
    pushToast('success', 'Conversation renamed.');
  };

  const handleDeleteChat = (id: string) => {
    if (id === activeChatId && isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    }
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeChatId === id) {
      setActiveChatId(null);
    }
    pushToast('info', 'Conversation deleted.');
  };

  const handleClearCurrentChat = () => {
    if (!activeChatId) return;
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    }
    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeChatId
          ? { ...c, messages: [], updatedAt: Date.now() }
          : c,
      ),
    );
    pushToast('info', 'Conversation cleared.');
  };

  const handleClearAllHistory = () => {
    if (isStreaming) {
      abortControllerRef.current?.abort();
      setIsStreaming(false);
    }
    setConversations([]);
    setActiveChatId(null);
    pushToast('info', 'All chat history cleared.');
  };

  const handleExportHistory = () => {
    try {
      const exportPayload = conversations.map((c) => ({
        id: c.id,
        title: c.title,
        createdAt: new Date(c.createdAt).toISOString(),
        updatedAt: new Date(c.updatedAt).toISOString(),
        messages: c.messages.map((m) => ({
          role: m.role,
          content: m.content,
          createdAt: new Date(m.createdAt).toISOString(),
          attachments: m.attachments?.map((a) => ({
            name: a.name,
            mimeType: a.mimeType,
            size: a.size,
          })),
        })),
      }));
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexora-ai-history-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      pushToast('success', 'Chat history exported as JSON.');
    } catch {
      pushToast('error', 'Failed to export chat history.');
    }
  };

  const handleFilesSelected = async (fileList: FileList | File[]) => {
    const incoming = Array.from(fileList);
    if (incoming.length === 0) return;

    const remainingSlots = MAX_ATTACHMENTS_PER_MESSAGE - pendingAttachments.length;
    if (remainingSlots <= 0) {
      pushToast(
        'error',
        `Maximum ${MAX_ATTACHMENTS_PER_MESSAGE} attachments per message.`,
      );
      return;
    }

    const filesToProcess = incoming.slice(0, remainingSlots);
    if (incoming.length > remainingSlots) {
      pushToast(
        'info',
        `Only ${remainingSlots} additional file(s) attached (limit ${MAX_ATTACHMENTS_PER_MESSAGE}).`,
      );
    }

    for (const file of filesToProcess) {
      const localId = `pend_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      if (file.size > MAX_FILE_SIZE_BYTES) {
        pushToast('error', `"${file.name}" exceeds the 10 MB limit.`);
        continue;
      }

      const previewUrl = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : undefined;

      const newPending: PendingAttachment = {
        localId,
        file,
        name: file.name,
        size: file.size,
        progress: 0,
        status: 'uploading',
        previewUrl,
      };

      setPendingAttachments((prev) => [...prev, newPending]);

      try {
        const processed = await uploadAndProcessFile(file, (percent) => {
          setPendingAttachments((prev) =>
            prev.map((item) =>
              item.localId === localId ? { ...item, progress: percent } : item,
            ),
          );
        });

        setPendingAttachments((prev) =>
          prev.map((item) =>
            item.localId === localId
              ? {
                  ...item,
                  status: 'ready',
                  progress: 100,
                  processed: { ...processed, previewUrl },
                }
              : item,
          ),
        );
      } catch (err) {
        const errMessage =
          err instanceof Error ? err.message : 'File could not be processed.';
        setPendingAttachments((prev) =>
          prev.map((item) =>
            item.localId === localId
              ? { ...item, status: 'error', errorMessage: errMessage }
              : item,
          ),
        );
        pushToast('error', errMessage);
      }
    }
  };

  const handleRemoveAttachment = (localId: string) => {
    setPendingAttachments((prev) => {
      const target = prev.find((a) => a.localId === localId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((a) => a.localId !== localId);
    });
  };

  const runStreamingTurn = useCallback(
    async (
      targetChatId: string,
      historyForApi: ChatMessage[],
      assistantMsgId: string,
    ) => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsStreaming(true);

      await streamChatMessage({
        messages: historyForApi,
        settings,
        profile,
        signal: controller.signal,
        onChunk: (chunkText) => {
          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.id !== targetChatId) return conv;
              return {
                ...conv,
                updatedAt: Date.now(),
                messages: conv.messages.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: m.content + chunkText }
                    : m,
                ),
              };
            }),
          );
        },
        onDone: () => {
          setIsStreaming(false);
          if (abortControllerRef.current === controller) {
            abortControllerRef.current = null;
          }
        },
        onError: (errMsg) => {
          setIsStreaming(false);
          if (abortControllerRef.current === controller) {
            abortControllerRef.current = null;
          }
          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.id !== targetChatId) return conv;
              return {
                ...conv,
                updatedAt: Date.now(),
                messages: conv.messages.map((m) =>
                  m.id === assistantMsgId
                    ? {
                        ...m,
                        content: errMsg,
                        isError: true,
                      }
                    : m,
                ),
              };
            }),
          );
          pushToast('error', errMsg);
        },
      });
    },
    [settings, profile, pushToast],
  );

  const handleSend = async (overrideText?: string) => {
    if (isStreaming) return;

    const text = (overrideText !== undefined ? overrideText : composerText).trim();
    const readyAttachments: AttachmentItem[] = pendingAttachments
      .filter((p) => p.status === 'ready' && p.processed)
      .map((p) => p.processed as AttachmentItem);

    if (!text && readyAttachments.length === 0) return;

    const now = Date.now();
    const userMsg: ChatMessage = {
      id: `msg_u_${now}_${Math.random().toString(36).slice(2, 7)}`,
      role: 'user',
      content: text,
      createdAt: now,
      attachments: readyAttachments.length > 0 ? readyAttachments : undefined,
    };

    const assistantMsgId = `msg_a_${now}_${Math.random().toString(36).slice(2, 7)}`;
    const assistantPlaceholder: ChatMessage = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      createdAt: now + 1,
    };

    let targetChatId = activeChatId;
    let updatedHistoryForApi: ChatMessage[] = [];

    if (!targetChatId) {
      targetChatId = `chat_${now}_${Math.random().toString(36).slice(2, 7)}`;
      const newTitle = deriveConversationTitle(text, readyAttachments[0]?.name);
      const newConversation: Conversation = {
        id: targetChatId,
        title: newTitle,
        createdAt: now,
        updatedAt: now,
        messages: [userMsg, assistantPlaceholder],
      };
      updatedHistoryForApi = [userMsg];
      setConversations((prev) => [newConversation, ...prev]);
      setActiveChatId(targetChatId);
    } else {
      const existing = conversations.find((c) => c.id === targetChatId);
      const priorMessages = existing ? existing.messages : [];
      updatedHistoryForApi = [...priorMessages, userMsg];

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== targetChatId) return c;
          const shouldRetitle = c.messages.length === 0 || c.title === 'New Conversation';
          return {
            ...c,
            title: shouldRetitle
              ? deriveConversationTitle(text, readyAttachments[0]?.name)
              : c.title,
            updatedAt: now,
            messages: [...c.messages, userMsg, assistantPlaceholder],
          };
        }),
      );
    }

    if (overrideText === undefined) {
      setComposerText('');
    }
    if (readyAttachments.length > 0) {
      setPendingAttachments([]);
    }

    await runStreamingTurn(targetChatId, updatedHistoryForApi, assistantMsgId);
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
    pushToast('info', 'Generation stopped.');
  };

  const handleRetry = async (assistantMessageId: string) => {
    if (isStreaming || !activeConversation) return;

    const msgIndex = activeConversation.messages.findIndex(
      (m) => m.id === assistantMessageId,
    );
    if (msgIndex <= 0) return;

    // Take messages strictly before the failed/retried assistant turn
    const historyBeforeAssistant = activeConversation.messages.slice(0, msgIndex);
    const now = Date.now();
    const newAssistantId = `msg_a_${now}_${Math.random().toString(36).slice(2, 7)}`;
    const freshPlaceholder: ChatMessage = {
      id: newAssistantId,
      role: 'assistant',
      content: '',
      createdAt: now,
    };

    setConversations((prev) =>
      prev.map((c) =>
        c.id === activeConversation.id
          ? {
              ...c,
              updatedAt: now,
              messages: [...historyBeforeAssistant, freshPlaceholder],
            }
          : c,
      ),
    );

    await runStreamingTurn(activeConversation.id, historyBeforeAssistant, newAssistantId);
  };

  const handleToggleFocusMode = useCallback(() => {
    setFocusMode((prev) => {
      const next = !prev;
      if (next) {
        setMobileMenuOpen(false);
        setSection('chat');
      }
      return next;
    });
  }, []);

  return (
    <div className="h-[100dvh] w-full overflow-hidden flex bg-white text-slate-900 dark:bg-[#080A12] dark:text-[#F8FAFC]">
      {!focusMode && (
        <Sidebar
          conversations={conversations}
          activeChatId={activeChatId}
          section={section}
          profile={profile}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          onSelectChat={handleSelectChat}
          onNewChat={handleNewChat}
          onRenameChat={handleRenameChat}
          onDeleteChat={handleDeleteChat}
          onNavigate={(next) => setSection(next)}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col h-full">
        <TopBar
          section={section}
          activeChatTitle={activeConversation?.title}
          hasMessages={Boolean(activeConversation && activeConversation.messages.length > 0)}
          apiHealth={apiHealth}
          focusMode={focusMode}
          onToggleFocusMode={handleToggleFocusMode}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onNewChat={handleNewChat}
          onClearChat={handleClearCurrentChat}
          onNavigateSettings={() => {
            setFocusMode(false);
            setSection('settings');
          }}
        />

        {section === 'chat' && (
          <ChatWorkspace
            messages={activeConversation?.messages ?? []}
            composerText={composerText}
            onComposerTextChange={setComposerText}
            pendingAttachments={pendingAttachments}
            onFilesSelected={handleFilesSelected}
            onRemoveAttachment={handleRemoveAttachment}
            onSend={handleSend}
            onStop={handleStop}
            onRetry={handleRetry}
            isStreaming={isStreaming}
            settings={settings}
            focusMode={focusMode}
            onOpenSettings={() => {
              setFocusMode(false);
              setSection('settings');
            }}
          />
        )}

        {section === 'history' && (
          <ChatHistoryView
            conversations={conversations}
            onSelectChat={handleSelectChat}
            onRenameChat={handleRenameChat}
            onDeleteChat={handleDeleteChat}
            onClearAll={handleClearAllHistory}
            onNewChat={handleNewChat}
          />
        )}

        {section === 'settings' && (
          <SettingsView
            settings={settings}
            onUpdateSettings={(partial) =>
              setSettings((prev) => ({ ...prev, ...partial }))
            }
            apiHealth={apiHealth}
            onRefreshHealth={refreshHealth}
            conversationCount={conversations.length}
            onExportHistory={handleExportHistory}
            onClearHistory={handleClearAllHistory}
          />
        )}

        {section === 'profile' && (
          <ProfileView
            profile={profile}
            conversations={conversations}
            onSaveProfile={(updated) => {
              setProfile(updated);
              pushToast('success', 'Profile updated.');
            }}
          />
        )}
      </div>

      {section === 'game' && (
        <PulseVectorGame onExit={() => setSection('chat')} />
      )}

      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
