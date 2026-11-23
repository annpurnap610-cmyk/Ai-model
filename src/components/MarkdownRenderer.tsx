import { Check, Copy } from 'lucide-react';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import remarkGfm from 'remark-gfm';
import { sanitizeExternalUrl } from '../utils/formatters';

interface CodeBlockProps {
  language?: string;
  children: React.ReactNode;
  rawText: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, children, rawText }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rawText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failure gracefully
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0D101B]">
      <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-200 dark:border-white/[0.06] bg-slate-100/80 dark:bg-[#121626]">
        <span className="text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400 lowercase">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded px-2 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          aria-label="Copy code block"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-[13px] leading-relaxed font-mono">
        {children}
      </pre>
    </div>
  );
};

function extractTextFromChildren(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractTextFromChildren).join('');
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return extractTextFromChildren(node.props.children);
  }
  return '';
}

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="text-[15px] leading-[1.68] text-slate-800 dark:text-[#EDF2F7] tracking-[0.004em] break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-6 mb-3 text-xl font-semibold tracking-tight text-slate-900 dark:text-white first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-5 mb-2.5 text-lg font-semibold tracking-tight text-slate-900 dark:text-white first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-4 mb-2 text-base font-semibold text-slate-900 dark:text-white first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-3.5 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-3.5 list-disc pl-5 space-y-1.5 marker:text-slate-400 dark:marker:text-slate-500">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3.5 list-decimal pl-5 space-y-1.5 marker:text-slate-500 dark:marker:text-slate-400 marker:font-mono marker:text-xs">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="my-4 rounded-r-md border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-[#101321] px-4 py-2.5 text-slate-600 dark:text-slate-300">
              {children}
            </blockquote>
          ),
          hr: () => (
            <hr className="my-5 border-t border-slate-200 dark:border-white/[0.08]" />
          ),
          a: ({ href, children }) => {
            const safeHref = sanitizeExternalUrl(href);
            return (
              <a
                href={safeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 dark:text-sky-400 underline decoration-sky-500/35 underline-offset-2 hover:decoration-sky-400 transition-colors"
              >
                {children}
              </a>
            );
          },
          table: ({ children }) => (
            <div className="my-4 overflow-x-auto rounded-lg border border-slate-200 dark:border-white/[0.08]">
              <table className="w-full border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-50 dark:bg-[#101321] border-b border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-300">
              {children}
            </thead>
          ),
          th: ({ children }) => <th className="px-3.5 py-2.5">{children}</th>,
          td: ({ children }) => (
            <td className="px-3.5 py-2.5 border-t border-slate-200/70 dark:border-white/[0.06] text-slate-700 dark:text-slate-300">
              {children}
            </td>
          ),
          pre: ({ children }) => {
            const codeChild = React.Children.toArray(children).find((child) =>
              React.isValidElement(child),
            ) as React.ReactElement<{ className?: string; children?: React.ReactNode }> | undefined;

            const className = codeChild?.props?.className || '';
            const langMatch = /language-([\w-]+)/.exec(className);
            const rawText = extractTextFromChildren(codeChild?.props?.children ?? children).replace(
              /\n$/,
              '',
            );

            return (
              <CodeBlock language={langMatch?.[1]} rawText={rawText}>
                {children}
              </CodeBlock>
            );
          },
          code: ({ className, children, ...rest }) => {
            const isBlock = Boolean(className && className.includes('language-'));
            if (isBlock) {
              return (
                <code className={className} {...rest}>
                  {children}
                </code>
              );
            }
            return (
              <code
                className="rounded px-1.5 py-0.5 text-[13px] font-mono bg-slate-100 text-violet-700 dark:bg-white/[0.07] dark:text-sky-300 border border-slate-200/70 dark:border-white/[0.06]"
                {...rest}
              >
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
