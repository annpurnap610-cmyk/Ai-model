import {
  AlertTriangle,
  ArrowDown,
  Check,
  Copy,
  FileCode,
  FileText,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { STARTER_SUGGESTIONS } from '../config/constants';
import type {
  AppSettings,
  AttachmentItem,
  ChatMessage,
  PendingAttachment,
} from '../types/nexora';
import { formatBytes, formatMessageTime } from '../utils/formatters';
import { MarkdownRenderer } from './MarkdownRenderer';
import { MessageComposer } from './MessageComposer';
import { NexoraLogo } from './NexoraLogo';
import { QuickPromptsBar, type QuickPromptItem } from './QuickPromptsBar';

interface ChatWorkspaceProps {
  messages: ChatMessage[];
  composerText: string;
  onComposerTextChange: (text: string) => void;
  pendingAttachments: PendingAttachment[];
  onFilesSelected: (files: FileList | File[]) => void;
  onRemoveAttachment: (localId: string) => void;
  onSend: (overrideText?: string) => void;
  onStop: () => void;
  onRetry: (assistantMessageId: string) => void;
  isStreaming: boolean;
  settings: AppSettings;
  focusMode?: boolean;
  onOpenSettings: () => void;
}

const AttachmentCard: React.FC<{ attachment: AttachmentItem }> = ({ attachment }) => {
  const [imgError, setImgError] = useState(false);
  const imageSrc =
    attachment.kind === 'image'
      ? attachment.previewUrl ||
        (attachment.base64Data
          ? `data:${attachment.mimeType};base64,${attachment.base64Data}`
          : undefined)
      : undefined;

  if (attachment.kind === 'image' && imageSrc && !imgError) {
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#0D101B] max-w-xs">
        <img
          src={imageSrc}
          alt={attachment.name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="max-h-56 w-auto object-contain"
        />
        <div className="px-2.5 py-1.5 border-t border-slate-200 dark:border-white/[0.06] flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="truncate">{attachment.name}</span>
          <span className="font-mono tabular-nums shrink-0">{formatBytes(attachment.size)}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-[#101321] px-3 py-2 max-w-xs">
      <div className="w-8 h-8 rounded bg-slate-100 dark:bg-white/[0.05] flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400">
        {attachment.kind === 'pdf' ? (
          <FileText className="w-4 h-4 text-violet-500" />
        ) : attachment.kind === 'image' ? (
          <ImageIcon className="w-4 h-4 text-sky-500" />
        ) : (
          <FileCode className="w-4 h-4 text-sky-500" />
        )}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
          {attachment.name}
        </div>
        <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
          {formatBytes(attachment.size)}
          {attachment.lineCount ? ` · ${attachment.lineCount} lines` : ''}
        </div>
      </div>
    </div>
  );
};

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  messages,
  composerText,
  onComposerTextChange,
  pendingAttachments,
  onFilesSelected,
  onRemoveAttachment,
  onSend,
  onStop,
  onRetry,
  isStreaming,
  settings,
  focusMode = false,
  onOpenSettings,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setAutoScrollEnabled(distanceFromBottom < 110);
  };

  useEffect(() => {
    if (autoScrollEnabled) {
      bottomAnchorRef.current?.scrollIntoView({ behavior: isStreaming ? 'auto' : 'smooth' });
    }
  }, [messages, isStreaming, autoScrollEnabled]);

  const scrollToBottom = () => {
    setAutoScrollEnabled(true);
    bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCopyMessage = async (msg: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedMsgId(msg.id);
      setTimeout(() => setCopiedMsgId(null), 1800);
    } catch {
      // Ignore clipboard error
    }
  };

  const handleStarterClick = (suggestion: (typeof STARTER_SUGGESTIONS)[number]) => {
    if (suggestion.requiresFile) {
      if (!composerText.trim()) {
        onComposerTextChange(suggestion.prompt);
      }
      fileInputRef.current?.click();
      textareaRef.current?.focus();
      return;
    }
    onSend(suggestion.prompt);
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-white dark:bg-[#080A12]">
      {/* Scrollable conversation area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto px-4 sm:px-6"
      >
        {isEmpty ? (
          <div className="min-h-full flex flex-col items-center justify-center py-10">
            <div className="w-full max-w-2xl mx-auto">
              <div className="mb-8 space-y-2.5">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-slate-900 dark:text-[#F8FAFC] text-balance">
                  Your ideas deserve intelligent answers.
                </h1>
                <p className="text-[15px] text-slate-500 dark:text-[#94A3B8]">
                  Ask anything. Create anything. Discover what&apos;s possible.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {STARTER_SUGGESTIONS.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleStarterClick(item)}
                    className="group text-left rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#101321] hover:border-violet-500/50 hover:bg-slate-100/70 dark:hover:bg-[#15192A] p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                  >
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors">
                      {item.title}
                    </div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-[#94A3B8] leading-relaxed">
                      {item.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div
            className={`mx-auto space-y-7 ${
              focusMode ? 'max-w-4xl py-8 sm:py-10' : 'max-w-3xl py-6 sm:py-8'
            }`}
          >
            {messages.map((msg, idx) => {
              const isLastMessage = idx === messages.length - 1;
              const isThinking =
                isStreaming && isLastMessage && msg.role === 'assistant' && !msg.content && !msg.isError;

              if (msg.role === 'user') {
                return (
                  <div key={msg.id} className="flex flex-col items-end gap-2">
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap justify-end gap-2 max-w-[90%] sm:max-w-[80%]">
                        {msg.attachments.map((att) => (
                          <AttachmentCard key={att.id} attachment={att} />
                        ))}
                      </div>
                    )}

                    {msg.content && (
                      <div className="max-w-[90%] sm:max-w-[80%] rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-100/90 dark:bg-[#15192A] px-4 py-3 text-[15px] leading-relaxed text-slate-900 dark:text-[#F8FAFC] whitespace-pre-wrap break-words">
                        {msg.content}
                      </div>
                    )}

                    <span className="text-[11px] font-mono tabular-nums text-slate-400 dark:text-slate-500 px-1">
                      {formatMessageTime(msg.createdAt)}
                    </span>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex items-start gap-3.5">
                  <div className="mt-0.5 shrink-0">
                    <NexoraLogo size={22} />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    {msg.isError ? (
                      <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-700 dark:text-rose-300 flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-2">
                          <p className="leading-relaxed">{msg.content}</p>
                          <button
                            type="button"
                            onClick={() => onRetry(msg.id)}
                            className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/30 px-2.5 py-1 text-xs font-medium text-rose-700 dark:text-rose-200 hover:bg-rose-500/10 transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Retry</span>
                          </button>
                        </div>
                      </div>
                    ) : isThinking ? (
                      <div className="space-y-2.5 py-1 max-w-md" aria-label="Thinking">
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Thinking...
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 w-full rounded bg-slate-200/80 dark:bg-white/[0.06] animate-pulse" />
                          <div className="h-3 w-4/5 rounded bg-slate-200/80 dark:bg-white/[0.06] animate-pulse" />
                        </div>
                      </div>
                    ) : (
                      <MarkdownRenderer content={msg.content} />
                    )}

                    {/* Assistant message actions */}
                    {!isThinking && !msg.isError && msg.content && !(isStreaming && isLastMessage) && (
                      <div className="flex items-center gap-3 pt-1 text-xs text-slate-400 dark:text-slate-500">
                        <span className="font-mono tabular-nums text-[11px]">
                          {formatMessageTime(msg.createdAt)}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleCopyMessage(msg)}
                          className="inline-flex items-center gap-1 rounded px-1.5 py-1 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                          aria-label="Copy response"
                        >
                          {copiedMsgId === msg.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span className="text-emerald-600 dark:text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>

                        {isLastMessage && (
                          <button
                            type="button"
                            onClick={() => onRetry(msg.id)}
                            className="inline-flex items-center gap-1 rounded px-1.5 py-1 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
                            aria-label="Retry response"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Retry</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomAnchorRef} className="h-2" />
          </div>
        )}

        {!autoScrollEnabled && !isEmpty && (
          <div className="sticky bottom-3 flex justify-center pointer-events-none">
            <button
              type="button"
              onClick={scrollToBottom}
              className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/[0.12] bg-white/95 dark:bg-[#15192A]/95 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 shadow-md hover:border-violet-500/50 transition-colors"
            >
              <ArrowDown className="w-3.5 h-3.5" />
              <span>Latest</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Composer */}
      <div className="shrink-0 px-4 sm:px-6 pb-4 pt-2 bg-gradient-to-t from-white via-white to-transparent dark:from-[#080A12] dark:via-[#080A12] dark:to-transparent">
        <div className={`mx-auto ${focusMode ? 'max-w-4xl' : 'max-w-3xl'}`}>
          <QuickPromptsBar
            messages={messages}
            pendingAttachments={pendingAttachments}
            composerText={composerText}
            disabled={
              isStreaming || pendingAttachments.some((a) => a.status === 'uploading')
            }
            onSelectPrompt={(item: QuickPromptItem) => {
              if (item.wrapComposerText && composerText.trim()) {
                const combined = `${item.prompt}\n\n${composerText.trim()}`;
                onComposerTextChange('');
                onSend(combined);
              } else {
                onSend(item.prompt);
              }
            }}
          />
          <MessageComposer
            value={composerText}
            onChange={onComposerTextChange}
            attachments={pendingAttachments}
            onFilesSelected={onFilesSelected}
            onRemoveAttachment={onRemoveAttachment}
            onSend={() => onSend()}
            onStop={onStop}
            isStreaming={isStreaming}
            settings={settings}
            onOpenSettings={onOpenSettings}
            fileInputRef={fileInputRef}
            textareaRef={textareaRef}
          />
          <p className="mt-2 text-center text-[11px] text-slate-400 dark:text-slate-500">
            NEXORA AI can make mistakes. Verify critical code, facts, and document summaries.
          </p>
        </div>
      </div>
    </div>
  );
};
