import { AlertCircle, CheckCircle2, Download, RefreshCw, Trash2 } from 'lucide-react';
import React, { useState } from 'react';
import { RESPONSE_STYLES, SPEED_MODES, SUPPORTED_LANGUAGES } from '../config/constants';
import type { ApiHealthStatus, AppSettings, ThemeMode } from '../types/nexora';

interface SettingsViewProps {
  settings: AppSettings;
  onUpdateSettings: (partial: Partial<AppSettings>) => void;
  apiHealth: ApiHealthStatus;
  onRefreshHealth: () => void;
  conversationCount: number;
  onExportHistory: () => void;
  onClearHistory: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  apiHealth,
  onRefreshHealth,
  conversationCount,
  onExportHistory,
  onClearHistory,
}) => {
  const [confirmClear, setConfirmClear] = useState(false);

  const themes: Array<{ id: ThemeMode; label: string }> = [
    { id: 'dark', label: 'Dark' },
    { id: 'light', label: 'Light' },
    { id: 'system', label: 'System' },
  ];

  return (
    <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="border-b border-slate-200 dark:border-white/[0.08] pb-5">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Settings
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#94A3B8]">
            Configure workspace appearance, assistant behavior, and local conversation storage.
          </p>
        </div>

        {/* Theme Selection */}
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Theme
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
                Select the visual theme for your NEXORA AI workspace.
              </p>
            </div>
            <div className="inline-flex items-center p-1 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-100 dark:bg-[#101321] shrink-0">
              {themes.map((t) => {
                const active = settings.theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onUpdateSettings({ theme: t.id })}
                    className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-white dark:bg-[#15192A] text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <hr className="border-slate-200 dark:border-white/[0.06]" />

        {/* Language Preference */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Response Language
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Default language used for AI responses unless specified otherwise.
            </p>
          </div>
          <select
            value={settings.language}
            onChange={(e) => onUpdateSettings({ language: e.target.value })}
            aria-label="Response language"
            className="h-10 px-3 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#15192A] text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-violet-500/60 shrink-0 min-w-[160px]"
          >
            {SUPPORTED_LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </section>

        <hr className="border-slate-200 dark:border-white/[0.06]" />

        {/* Response Style */}
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Response Style
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Adjust tone, depth, and level of technical rigor.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {RESPONSE_STYLES.map((style) => {
              const active = settings.responseStyle === style.id;
              return (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => onUpdateSettings({ responseStyle: style.id })}
                  className={`text-left rounded-xl border p-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                    active
                      ? 'border-violet-500/70 bg-violet-500/[0.07]'
                      : 'border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#101321] hover:border-slate-300 dark:hover:border-white/[0.16]'
                  }`}
                >
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {style.label}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-[#94A3B8]">
                    {style.description}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <hr className="border-slate-200 dark:border-white/[0.06]" />

        {/* Response Speed */}
        <section className="space-y-3">
          <div>
            <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Response Speed
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              Choose between instant low-latency replies or deeper reasoning.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {SPEED_MODES.map((mode) => {
              const active = settings.speedMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => onUpdateSettings({ speedMode: mode.id })}
                  className={`text-left rounded-xl border p-3.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${
                    active
                      ? 'border-violet-500/70 bg-violet-500/[0.07]'
                      : 'border-slate-200 dark:border-white/[0.08] bg-slate-50/50 dark:bg-[#101321] hover:border-slate-300 dark:hover:border-white/[0.16]'
                  }`}
                >
                  <div className="text-sm font-medium text-slate-900 dark:text-white">
                    {mode.label}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-[#94A3B8]">
                    {mode.description}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <hr className="border-slate-200 dark:border-white/[0.06]" />

        {/* Chat History Management */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">
              Chat History Management
            </h2>
            <p className="text-xs text-slate-500 dark:text-[#94A3B8]">
              <span className="font-mono tabular-nums">{conversationCount}</span> conversations stored in local browser storage.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={conversationCount === 0}
              onClick={onExportHistory}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 dark:border-white/[0.1] text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            {confirmClear ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    onClearHistory();
                    setConfirmClear(false);
                  }}
                  className="h-9 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium transition-colors whitespace-nowrap"
                >
                  Confirm Delete
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="h-9 px-3 rounded-lg border border-slate-200 dark:border-white/[0.1] text-xs font-medium text-slate-600 dark:text-slate-300"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={conversationCount === 0}
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 dark:border-white/[0.1] text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </section>

        <hr className="border-slate-200 dark:border-white/[0.06]" />

        {/* API Connection Status */}
        <section className="rounded-xl border border-slate-200 dark:border-white/[0.08] bg-slate-50/70 dark:bg-[#101321] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {apiHealth.status === 'connected' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-sm font-medium text-slate-900 dark:text-white">
                AI Service Status:{' '}
                <span
                  className={
                    apiHealth.status === 'connected'
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }
                >
                  {apiHealth.status === 'connected'
                    ? 'Connected'
                    : apiHealth.status === 'checking'
                      ? 'Checking...'
                      : apiHealth.status === 'missing_key'
                        ? 'API Key Not Configured'
                        : 'Unavailable'}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-[#94A3B8]">
                Active Model: <span className="font-mono">{apiHealth.model}</span>
                {apiHealth.status === 'missing_key' &&
                  ' · Configure GEMINI_API_KEY in Settings > Secrets.'}
                {apiHealth.errorDetail && ` · ${apiHealth.errorDetail}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onRefreshHealth}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#15192A] text-xs font-medium text-slate-700 dark:text-slate-200 hover:border-violet-500/50 transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${apiHealth.status === 'checking' ? 'animate-spin' : ''}`} />
            <span>Check Status</span>
          </button>
        </section>
      </div>
    </div>
  );
};
