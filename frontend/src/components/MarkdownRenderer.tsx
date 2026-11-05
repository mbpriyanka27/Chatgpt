import React, { useState } from 'react';
import { CopyIcon, CheckIcon } from './Icons';

interface CodeBlockProps {
  language: string;
  code: string;
}

function CodeBlock({ language, code }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-lg overflow-hidden border border-[rgba(255,255,255,0.1)] bg-[#0d1117] text-[#c9d1d9] text-sm">
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#161b22] border-b border-[rgba(255,255,255,0.06)] text-xs text-gray-400 font-mono">
        <span>{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-[rgba(255,255,255,0.08)] text-gray-300 hover:text-white transition-colors"
        >
          {copied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <CopyIcon className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy code'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto font-mono text-[13px] leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;

  // Split content by code blocks ```
  const codeBlockRegex = /```([a-zA-Z0-9_\-\.]*)\n([\s\S]*?)```/g;
  const elements: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore) {
      elements.push(<ParsedMarkdownText key={`text-${lastIndex}`} rawText={textBefore} />);
    }

    const language = match[1].trim() || 'code';
    const code = match[2];
    elements.push(<CodeBlock key={`code-${match.index}`} language={language} code={code} />);

    lastIndex = match.index + match[0].length;
  }

  const remainingText = content.substring(lastIndex);
  if (remainingText) {
    elements.push(<ParsedMarkdownText key={`text-${lastIndex}`} rawText={remainingText} />);
  }

  return <div className="space-y-2 text-[#ececf1] leading-relaxed">{elements}</div>;
}

function ParsedMarkdownText({ rawText }: { rawText: string }) {
  const lines = rawText.split('\n');

  return (
    <>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Heading 3
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-base font-semibold text-white mt-3 mb-1">
              {formatInlineStyles(trimmed.slice(4))}
            </h3>
          );
        }
        // Heading 2
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-lg font-bold text-white mt-4 mb-2">
              {formatInlineStyles(trimmed.slice(3))}
            </h2>
          );
        }
        // Heading 1
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-xl font-bold text-white mt-4 mb-2">
              {formatInlineStyles(trimmed.slice(2))}
            </h1>
          );
        }
        // Blockquote
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote key={idx} className="border-l-4 border-emerald-500 pl-3 py-1 my-2 text-gray-300 italic bg-[rgba(255,255,255,0.02)]">
              {formatInlineStyles(trimmed.slice(2))}
            </blockquote>
          );
        }
        // Bullet list
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <li key={idx} className="ml-5 list-disc text-gray-200 my-0.5">
              {formatInlineStyles(trimmed.slice(2))}
            </li>
          );
        }
        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <li key={idx} className="ml-5 list-decimal text-gray-200 my-0.5">
              {formatInlineStyles(numMatch[2])}
            </li>
          );
        }
        // Empty line
        if (!trimmed) {
          return <div key={idx} className="h-2" />;
        }

        // Standard paragraph
        return (
          <p key={idx} className="my-1">
            {formatInlineStyles(line)}
          </p>
        );
      })}
    </>
  );
}

function formatInlineStyles(text: string): React.ReactNode[] {
  // Matches inline code `...`, bold **...**, italics *...*
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 bg-[rgba(255,255,255,0.1)] rounded font-mono text-xs text-emerald-300">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="italic text-gray-300">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}
