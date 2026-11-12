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
    <div className="my-3 rounded-lg overflow-hidden border border-gray-200 bg-[#f8f9fa] text-[#1f2937] text-sm">
      <div className="flex items-center justify-between px-4 py-1.5 bg-[#f1f3f5] border-b border-gray-200 text-xs text-gray-600 font-mono">
        <span>{language || 'text'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-gray-200 text-gray-700 transition-colors"
        >
          {copied ? <CheckIcon className="w-3.5 h-3.5 text-emerald-600" /> : <CopyIcon className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied!' : 'Copy code'}</span>
        </button>
      </div>
      <pre className="p-4 overflow-x-auto font-mono text-[13px] leading-relaxed text-[#111827]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function ImageCard({ src, alt }: { src: string; alt: string }) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // If local media path and no host, prepend backend URL if needed
  const effectiveSrc = src.startsWith('/media')
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + src
    : src;

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = document.createElement('a');
    a.href = effectiveSrc;
    a.download = `${alt || 'chatgpt-generated-image'}.jpg`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <>
      <div className="my-3 relative group rounded-2xl overflow-hidden border border-[rgba(255,255,255,0.15)] bg-[#12121e] max-w-lg shadow-xl cursor-pointer">
        {!loaded && (
          <div className="w-full h-64 bg-[#1f1f30] animate-pulse flex items-center justify-center text-xs text-gray-400">
            <span>🎨 Loading generated image...</span>
          </div>
        )}
        <img
          src={effectiveSrc}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onClick={() => setIsZoomed(true)}
          className={`w-full h-auto object-cover transition-transform duration-300 group-hover:scale-[1.02] ${
            loaded ? 'block' : 'hidden'
          }`}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
          <span className="text-xs text-white/90 font-medium truncate max-w-[70%]">{alt}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow-md transition-colors flex items-center gap-1"
              title="Download image"
            >
              ⬇️ Save
            </button>
            <button
              onClick={() => setIsZoomed(true)}
              className="px-2.5 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-medium backdrop-blur-sm transition-colors"
              title="Full preview"
            >
              🔍 View
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {isZoomed && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setIsZoomed(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
            <img
              src={effectiveSrc}
              alt={alt}
              className="max-w-full max-h-[80vh] rounded-xl object-contain shadow-2xl border border-[rgba(255,255,255,0.2)]"
            />
            <div className="mt-3 flex items-center justify-between w-full text-sm text-gray-200">
              <span className="truncate mr-4 text-xs font-mono">{alt}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownload}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium shadow transition-colors"
                >
                  Download Full Image
                </button>
                <button
                  onClick={() => setIsZoomed(false)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
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

  return <div className="space-y-2 text-[#1f2937] text-[15px] leading-relaxed">{elements}</div>;
}

function ParsedMarkdownText({ rawText }: { rawText: string }) {
  const lines = rawText.split('\n');

  return (
    <>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Markdown Image: ![alt](url)
        const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (imgMatch) {
          return <ImageCard key={idx} alt={imgMatch[1]} src={imgMatch[2]} />;
        }

        // Heading 3
        if (trimmed.startsWith('### ')) {
          return (
            <h3 key={idx} className="text-base font-bold text-[#0d0d0d] mt-3 mb-1">
              {formatInlineStyles(trimmed.slice(4))}
            </h3>
          );
        }
        // Heading 2
        if (trimmed.startsWith('## ')) {
          return (
            <h2 key={idx} className="text-lg font-bold text-[#0d0d0d] mt-4 mb-2">
              {formatInlineStyles(trimmed.slice(3))}
            </h2>
          );
        }
        // Heading 1
        if (trimmed.startsWith('# ')) {
          return (
            <h1 key={idx} className="text-xl font-bold text-[#0d0d0d] mt-4 mb-2">
              {formatInlineStyles(trimmed.slice(2))}
            </h1>
          );
        }
        // Blockquote
        if (trimmed.startsWith('> ')) {
          return (
            <blockquote key={idx} className="border-l-4 border-emerald-500 pl-3 py-1 my-2 text-gray-700 italic bg-gray-50 rounded-r">
              {formatInlineStyles(trimmed.slice(2))}
            </blockquote>
          );
        }
        // Bullet list
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <li key={idx} className="ml-5 list-disc text-[#1f2937] my-1">
              {formatInlineStyles(trimmed.slice(2))}
            </li>
          );
        }
        // Numbered list
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <li key={idx} className="ml-5 list-decimal text-[#1f2937] my-1">
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
          <p key={idx} className="my-1.5 leading-relaxed text-[#1f2937]">
            {formatInlineStyles(line)}
          </p>
        );
      })}
    </>
  );
}

function formatInlineStyles(text: string): React.ReactNode[] {
  // Matches markdown images inside paragraph ![alt](url), inline code `...`, bold **...**, italics *...*
  const tokenRegex = /(!\[[^\]]*\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, i) => {
    if (part.startsWith('![') && part.includes('](') && part.endsWith(')')) {
      const match = part.match(/!\[(.*?)\]\((.*?)\)/);
      if (match) {
        return <ImageCard key={i} alt={match[1]} src={match[2]} />;
      }
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded font-mono text-xs text-emerald-800">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-[#0d0d0d]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return (
        <em key={i} className="italic text-gray-700">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

