import {
  AlertCircle,
  ArrowUp,
  FileCode,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Square,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import {
  ACCEPTED_FILE_INPUT,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from '../config/constants';
import type { AppSettings, PendingAttachment } from '../types/nexora';
import { formatBytes } from '../utils/formatters';

interface MessageComposerProps {
  value: string;
  onChange: (value: string) => void;
  attachments: PendingAttachment[];
  onFilesSelected: (files: FileList | File[]) => void;
  onRemoveAttachment: (localId: string) => void;
  onSend: () => void;
  onStop: () => void;
  isStreaming: boolean;
  settings: AppSettings;
  onOpenSettings: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  value,
  onChange,
  attachments,
  onFilesSelected,
  onRemoveAttachment,
  onSend,
  onStop,
  isStreaming,
  settings,
  onOpenSettings,
  fileInputRef,
  textareaRef,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragDepthRef = useRef(0);

  // Auto-resize textarea up to 200px
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value, textareaRef]);

  const hasUploading = attachments.some((a) => a.status === 'uploading');
  const readyAttachments = attachments.filter((a) => a.status === 'ready');
  const canSend =
    !isStreaming &&
    !hasUploading &&
    (value.trim().length > 0 || readyAttachments.length > 0);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (canSend) {
        onSend();
      }
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative rounded-xl border transition-colors bg-white dark:bg-[#15192A] ${
        isDragging
          ? 'border-violet-500 ring-2 ring-violet-500/20'
          : 'border-slate-200 dark:border-white/[0.1] focus-within:border-violet-500/60'
      }`}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_INPUT}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(e.target.files);
          }
          e.target.value = '';
        }}
      />

      {/* Attachment preview strip */}
      {attachments.length > 0 && (
        <div className="px-3.5 pt-3 pb-1 flex flex-wrap gap-2">
          {attachments.map((att) => {
            const isImage = Boolean(att.previewUrl);
            const isPdf = att.name.toLowerCase().endsWith('.pdf');

            return (
              <div
                key={att.localId}
                className={`group relative flex items-center gap-2.5 rounded-lg border px-2.5 py-2 max-w-[240px] ${
                  att.status === 'error'
                    ? 'border-rose-500/40 bg-rose-500/5'
                    : 'border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#101321]'
                }`}
              >
                {isImage ? (
                  <img
                    src={att.previewUrl}
                    alt={att.name}
                    referrerPolicy="no-referrer"
                    className="w-9 h-9 rounded object-cover shrink-0 border border-slate-200 dark:border-white/[0.08]"
                  />
                ) : (
                  <div className="w-9 h-9 rounded bg-slate-200/70 dark:bg-white/[0.05] flex items-center justify-center shrink-0 text-slate-500 dark:text-slate-400">
                    {att.status === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    ) : isPdf ? (
                      <FileText className="w-4 h-4 text-violet-500" />
                    ) : att.file.type.startsWith('image/') ? (
                      <ImageIcon className="w-4 h-4" />
                    ) : (
                      <FileCode className="w-4 h-4 text-sky-500" />
                    )}
                  </div>
                )}

                <div className="min-w-0 flex-1 pr-4">
                  <div className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                    {att.name}
                  </div>
                  {att.status === 'uploading' ? (
                    <div className="mt-1 space-y-1">
                      <div className="h-1 w-full rounded-full bg-slate-200 dark:bg-white/[0.08] overflow-hidden">
                        <div
                          className="h-full bg-violet-500 transition-all duration-150"
                          style={{ width: `${att.progress}%` }}
                        />
                      </div>
                      <div className="text-[10px] font-mono tabular-nums text-slate-500">
                        Uploading {att.progress}%
                      </div>
                    </div>
                  ) : att.status === 'error' ? (
                    <div className="text-[11px] text-rose-600 dark:text-rose-400 truncate">
                      {att.errorMessage || 'Upload failed'}
                    </div>
                  ) : (
                    <div className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {formatBytes(att.size)}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onRemoveAttachment(att.localId)}
                  className="absolute top-1.5 right-1.5 p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 hover:bg-slate-200/70 dark:hover:bg-white/[0.08] transition-colors"
                  aria-label={`Remove ${att.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Textarea */}
      <div className="px-4 pt-3.5 pb-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message NEXORA AI — ask a question, paste code, or drop a file..."
          aria-label="Message input"
          className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-slate-900 dark:text-[#F8FAFC] placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none max-h-[200px]"
        />
      </div>

      {/* Bottom control bar */}
      <div className="px-3 pb-2.5 pt-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            disabled={isStreaming || attachments.length >= MAX_ATTACHMENTS_PER_MESSAGE}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-white/[0.06] disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            title="Attach image, PDF, CSV, JSON, or code file (max 10 MB)"
          >
            <Paperclip className="w-4 h-4" />
            <span>Attach</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors truncate px-2 py-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            title="Adjust speed, response style, or language in Settings"
          >
            <span>{settings.speedMode}</span>
            <span aria-hidden="true">·</span>
            <span>{settings.responseStyle}</span>
            <span aria-hidden="true">·</span>
            <span>{settings.language}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden md:inline text-[11px] text-slate-400 dark:text-slate-500 whitespace-nowrap">
            Enter to send · Shift+Enter for newline
          </span>

          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-lg bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              aria-label="Stop generation"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={!canSend}
              onClick={onSend}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-white/[0.06] dark:disabled:text-slate-600 text-white transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              aria-label="Send message"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {isDragging && (
        <div className="absolute inset-0 z-10 rounded-xl bg-violet-600/10 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
          <div className="rounded-lg border border-violet-500/40 bg-white dark:bg-[#15192A] px-4 py-2 text-xs font-medium text-violet-600 dark:text-violet-300 shadow-sm">
            Drop files here to attach (Images, PDF, Text, Code · max 10 MB)
          </div>
        </div>
      )}
    </div>
  );
};
