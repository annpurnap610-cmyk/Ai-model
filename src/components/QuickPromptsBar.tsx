import React, { useMemo } from 'react';
import type { ChatMessage, PendingAttachment } from '../types/nexora';

export interface QuickPromptItem {
  id: string;
  label: string;
  prompt: string;
  wrapComposerText?: boolean;
}

interface QuickPromptsBarProps {
  messages: ChatMessage[];
  pendingAttachments: PendingAttachment[];
  composerText: string;
  disabled?: boolean;
  onSelectPrompt: (item: QuickPromptItem) => void;
}

const CODE_FILE_EXT_RE = /\.(ts|tsx|js|jsx|mjs|cjs|py|go|rs|java|cpp|c|cs|rb|php|sql|sh|html|css|scss|json|yaml|yml)$/i;

const CODE_CONTENT_RE =
  /```|\b(function|const|let|var|import|export|class|def|return|async|await|interface|type)\b|TypeError|SyntaxError|ReferenceError|Exception|Traceback|at line \d+/;

const WRITING_CONTENT_RE =
  /\b(email|draft|article|blog|post|caption|script|youtube|copy|headline|announcement|rewrite|tone|letter|proposal)\b/i;

function deriveContextualPrompts(
  messages: ChatMessage[],
  pendingAttachments: PendingAttachment[],
  composerText: string,
): QuickPromptItem[] {
  const readyFiles = pendingAttachments.filter((a) => a.status !== 'error');
  const trimmedDraft = composerText.trim();

  // 1. Pending attachment context (highest priority)
  if (readyFiles.length > 0) {
    const hasImage = readyFiles.some((f) => f.file.type.startsWith('image/'));
    const hasCodeFile = readyFiles.some((f) => CODE_FILE_EXT_RE.test(f.name));

    if (hasImage) {
      return [
        {
          id: 'img-describe',
          label: 'Describe image',
          prompt: 'Describe what is shown in the attached image in clear detail.',
        },
        {
          id: 'img-ocr',
          label: 'Extract text',
          prompt: 'Extract and transcribe all visible text from the attached image accurately.',
        },
        {
          id: 'img-analyze',
          label: 'Analyze details',
          prompt: 'Analyze the key elements, structure, and any notable details in this image.',
        },
        {
          id: 'img-improve',
          label: 'Suggest improvements',
          prompt: 'Review this image and suggest practical improvements or next steps.',
        },
      ];
    }

    if (hasCodeFile) {
      return [
        {
          id: 'code-file-explain',
          label: 'Explain code',
          prompt: 'Explain what this code file does, its architecture, and key functions.',
        },
        {
          id: 'code-file-bugs',
          label: 'Fix bugs',
          prompt: 'Audit this code for bugs, edge cases, and potential runtime issues, and provide fixes.',
        },
        {
          id: 'code-file-refactor',
          label: 'Improve code',
          prompt: 'Suggest cleaner structure, readability, and performance improvements for this code.',
        },
        {
          id: 'code-file-tests',
          label: 'Write tests',
          prompt: 'Write concise unit tests covering the main behaviors and edge cases in this file.',
        },
      ];
    }

    return [
      {
        id: 'doc-summarize',
        label: 'Summarize this',
        prompt: 'Summarize the attached document clearly with the main takeaways.',
      },
      {
        id: 'doc-keypoints',
        label: 'Extract key points',
        prompt: 'Extract the most important facts, metrics, and insights from this document.',
      },
      {
        id: 'doc-actions',
        label: 'Action items',
        prompt: 'List concrete action items, decisions, and next steps based on this document.',
      },
      {
        id: 'doc-questions',
        label: 'Spot gaps & risks',
        prompt: 'Identify any ambiguities, missing details, or potential risks in this document.',
      },
    ];
  }

  // 2. Pasted code or long text in the composer draft
  if (trimmedDraft.length > 24 && CODE_CONTENT_RE.test(trimmedDraft)) {
    return [
      {
        id: 'draft-explain-code',
        label: 'Explain code',
        prompt: 'Explain what this code does step by step:',
        wrapComposerText: true,
      },
      {
        id: 'draft-fix-bugs',
        label: 'Fix bugs',
        prompt: 'Find and fix any bugs or errors in this code:',
        wrapComposerText: true,
      },
      {
        id: 'draft-optimize',
        label: 'Optimize',
        prompt: 'Improve the clarity and performance of this code:',
        wrapComposerText: true,
      },
    ];
  }

  if (trimmedDraft.length > 160) {
    return [
      {
        id: 'draft-summarize',
        label: 'Summarize this',
        prompt: 'Summarize the following text clearly and concisely:',
        wrapComposerText: true,
      },
      {
        id: 'draft-polish',
        label: 'Proofread & polish',
        prompt: 'Proofread and improve the clarity and tone of this text:',
        wrapComposerText: true,
      },
      {
        id: 'draft-bullets',
        label: 'Turn into bullets',
        prompt: 'Convert this into clean, structured bullet points:',
        wrapComposerText: true,
      },
    ];
  }

  // 3. Empty conversation default contextual prompts
  const validMessages = messages.filter((m) => !m.isError && m.content.trim().length > 0);
  if (validMessages.length === 0) {
    return [
      {
        id: 'empty-summarize',
        label: 'Summarize this',
        prompt: 'Give me a concise 5-bullet framework for summarizing long technical articles effectively.',
      },
      {
        id: 'empty-explain-code',
        label: 'Explain code',
        prompt: 'Explain how async/await and Promise error handling work in TypeScript with a practical example.',
      },
      {
        id: 'empty-fix-bugs',
        label: 'Fix bugs',
        prompt: 'Walk through a systematic checklist for debugging tricky state and API race conditions in React.',
      },
      {
        id: 'empty-write',
        label: 'Draft an email',
        prompt: 'Draft a clear, professional project status update email highlighting progress, blockers, and next steps.',
      },
    ];
  }

  // 4. Active conversation context analysis
  const recentWindow = validMessages.slice(-4);
  const recentCombined = recentWindow.map((m) => m.content).join('\n');
  const lastMsg = validMessages[validMessages.length - 1];
  const hadRecentAttachments = recentWindow.some(
    (m) => m.attachments && m.attachments.length > 0,
  );

  if (CODE_CONTENT_RE.test(recentCombined)) {
    return [
      {
        id: 'ctx-explain-code',
        label: 'Explain code',
        prompt: 'Explain the logic and key parts of the code above in simple terms.',
      },
      {
        id: 'ctx-fix-bugs',
        label: 'Fix bugs',
        prompt: 'Check the code above for potential bugs, edge cases, or subtle errors and fix them.',
      },
      {
        id: 'ctx-improve-code',
        label: 'Refactor',
        prompt: 'Refactor the solution above to be cleaner, safer, and more maintainable.',
      },
      {
        id: 'ctx-tests',
        label: 'Add tests',
        prompt: 'Write unit tests covering the main cases and edge cases for the code above.',
      },
    ];
  }

  if (WRITING_CONTENT_RE.test(recentCombined)) {
    return [
      {
        id: 'ctx-concise',
        label: 'Make it shorter',
        prompt: 'Rewrite the above to be tighter and more concise while keeping the core message.',
      },
      {
        id: 'ctx-tone',
        label: 'Polish tone',
        prompt: 'Refine the tone and phrasing of the draft above for maximum clarity and professionalism.',
      },
      {
        id: 'ctx-variations',
        label: '3 variations',
        prompt: 'Provide 3 distinct variations of the content above (direct, persuasive, and executive).',
      },
      {
        id: 'ctx-summarize',
        label: 'Summarize this',
        prompt: 'Summarize the key message of the draft above in two sentences.',
      },
    ];
  }

  if (hadRecentAttachments || lastMsg.content.length > 650) {
    return [
      {
        id: 'ctx-summarize-long',
        label: 'Summarize this',
        prompt: 'Summarize the response above into 3–5 concise bullet points.',
      },
      {
        id: 'ctx-example',
        label: 'Give an example',
        prompt: 'Illustrate the explanation above with a concrete, real-world example.',
      },
      {
        id: 'ctx-next-steps',
        label: 'Next steps',
        prompt: 'Turn the information above into an actionable step-by-step plan.',
      },
      {
        id: 'ctx-simplify',
        label: 'Simplify',
        prompt: 'Explain the core idea above even more simply without technical jargon.',
      },
    ];
  }

  return [
    {
      id: 'ctx-deeper',
      label: 'Explain deeper',
      prompt: 'Go deeper into the topic above with additional detail and nuances.',
    },
    {
      id: 'ctx-summarize-gen',
      label: 'Summarize this',
      prompt: 'Summarize our conversation so far into key takeaways.',
    },
    {
      id: 'ctx-example-gen',
      label: 'Give an example',
      prompt: 'Provide a practical example demonstrating what we just discussed.',
    },
    {
      id: 'ctx-next-gen',
      label: 'Action plan',
      prompt: 'What are the most important next steps based on our discussion?',
    },
  ];
}

export const QuickPromptsBar: React.FC<QuickPromptsBarProps> = ({
  messages,
  pendingAttachments,
  composerText,
  disabled = false,
  onSelectPrompt,
}) => {
  const suggestions = useMemo(
    () => deriveContextualPrompts(messages, pendingAttachments, composerText),
    [messages, pendingAttachments, composerText],
  );

  return (
    <div
      className="mb-2 flex items-center gap-2 overflow-x-auto pb-0.5"
      aria-label="Quick prompt suggestions"
    >
      <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 whitespace-nowrap shrink-0 pr-0.5">
        Quick Prompts
      </span>
      <div className="flex items-center gap-1.5">
        {suggestions.map((item) => (
          <button
            key={item.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelectPrompt(item)}
            className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50/80 dark:bg-[#101321] hover:border-violet-500/50 hover:text-slate-900 dark:hover:text-white text-xs font-medium text-slate-600 dark:text-slate-300 disabled:opacity-45 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};
