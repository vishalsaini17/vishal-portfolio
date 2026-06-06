/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Bold, Italic, Heading1, Heading2, Heading3, List, Link, Code, 
  Eye, Edit3, Trash2, Sparkles, AlertTriangle, FileText, Quote, ClipboardList
} from 'lucide-react';

interface BlogMarkdownEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
}

export default function BlogMarkdownEditor({ 
  value, 
  onChange, 
  placeholder = 'Write deep system design deep-dives, developer rants, or tutorial guides here...'
}: BlogMarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Markdown parsing for high-fidelity live pre-view in the writer module
  const renderPreview = (text: string) => {
    if (!text || text.trim() === '') {
      return (
        <div className="text-center py-12 text-xs text-slate-400 dark:text-slate-500 italic font-sans flex flex-col items-center justify-center gap-2">
          <FileText className="w-6 h-6 stroke-[1.5] text-slate-300 dark:text-slate-700 animate-pulse" />
          <span>No content written yet. Tap formatting buttons or start writing some markdown!</span>
        </div>
      );
    }

    const lines = text.split('\n');
    let insideCodeBlock = false;
    let codeBlockLines: string[] = [];

    return (
      <div className="prose dark:prose-invert max-w-none text-left space-y-3 font-sans select-text">
        {lines.map((line, idx) => {
          // Code block parsing filter
          if (line.trim().startsWith('```')) {
            if (insideCodeBlock) {
              insideCodeBlock = false;
              const joinedCode = codeBlockLines.join('\n');
              codeBlockLines = [];
              return (
                <pre key={idx} className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto leading-relaxed border border-slate-800 my-2">
                  <code>{joinedCode}</code>
                </pre>
              );
            } else {
              insideCodeBlock = true;
              return null;
            }
          }

          if (insideCodeBlock) {
            codeBlockLines.push(line);
            return null;
          }

          // Headers
          if (line.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-xl font-display font-bold text-slate-900 dark:text-slate-50 border-b border-slate-100 dark:border-slate-800 pb-1.5 mt-4 mb-2">
                {line.substring(2)}
              </h1>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-base font-display font-bold text-slate-800 dark:text-slate-200 mt-3.5 mb-2">
                {line.substring(3)}
              </h2>
            );
          }
          if (line.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-sm font-display font-semibold text-slate-700 dark:text-slate-350 mt-3 mb-1.5">
                {line.substring(4)}
              </h3>
            );
          }

          // Blockquote
          if (line.startsWith('> ')) {
            return (
              <blockquote key={idx} className="pl-3.5 py-1.5 border-l-3 border-orange-500 bg-slate-50/50 dark:bg-slate-900/40 text-xs italic text-slate-600 dark:text-slate-400 my-1 rounded-r-md">
                {line.substring(2)}
              </blockquote>
            );
          }

          // Unordered Lists
          if (line.startsWith('- ')) {
            return (
              <li key={idx} className="list-disc list-inside ml-3.5 text-xs text-slate-650 dark:text-slate-405 leading-relaxed py-0.5">
                {line.substring(2)}
              </li>
            );
          }
          if (line.startsWith('* ')) {
            return (
              <li key={idx} className="list-disc list-inside ml-3.5 text-xs text-slate-650 dark:text-slate-405 leading-relaxed py-0.5">
                {line.substring(2)}
              </li>
            );
          }

          // Empty spaces
          if (!line.trim()) {
            return <div key={idx} className="h-2"></div>;
          }

          // General text style regex formatting (bold or code backticks)
          let formattedNode: React.ReactNode = line;

          // Perform inline code matching `code`
          const partsCode = line.split('`');
          if (partsCode.length > 2) {
            formattedNode = partsCode.map((part, pIdx) => {
              if (pIdx % 2 === 1) {
                return (
                  <code key={pIdx} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-802 rounded text-[11px] font-mono text-pink-600 dark:text-pink-400 font-semibold border border-slate-200/40 dark:border-slate-800/20">
                    {part}
                  </code>
                );
              }
              // Nested bold formatting check
              return part.includes('**') ? parseBold(part) : part;
            });
          } else {
            formattedNode = line.includes('**') ? parseBold(line) : line;
          }

          return (
            <p key={idx} className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
              {formattedNode}
            </p>
          );
        })}
      </div>
    );
  };

  const parseBold = (rawLine: string) => {
    const pieces = rawLine.split('**');
    return pieces.map((piece, pIdx) => {
      if (pIdx % 2 === 1) {
        return <strong key={pIdx} className="font-bold text-slate-900 dark:text-slate-100">{piece}</strong>;
      }
      return piece;
    });
  };

  // Inject markdown text nicely at cursor positions
  const insertTextToken = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = value || '';
    const selection = currentVal.substring(start, end);

    const insertedPlaceholder = selection || 'text';
    const replacement = before + insertedPlaceholder + after;

    const newVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);
    onChange(newVal);

    setTimeout(() => {
      textarea.focus();
      const nextCursorStart = start + before.length;
      const nextCursorEnd = nextCursorStart + insertedPlaceholder.length;
      textarea.setSelectionRange(nextCursorStart, nextCursorEnd);
    }, 50);
  };

  // Load sample technical blog template context
  const handleInsertBlogTemplate = () => {
    const template = `# Optimizing React Performance with Concurrent Features

In modern application engineering, performance is paramount. Users expect smooth layouts, rapid responsiveness, and elegant micro-interactions.

## Understanding Concurrent React
With React 18 and newer, concurrency brings UI updates that are state-interruptible. This means rendering can be paused to keep user interaction responses instant.

### Key Performance Benefits
- **Non-blocking Rendering Loops**: Heavily CPU-bound tasks do not freeze frames.
- **Improved Transitions**: Switch views dynamically while keeping elements interactive.
- **Graceful Loading Fallbacks**: Stream contents natively using server-side Suspense components.

## Implementation Example
Here is how you can batch intensive state operations using the \`useTransition\` hook:

\`\`\`typescript
import { useState, useTransition } from 'react';

function SearchResults() {
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState('');

  const handleChange = (e) => {
    // Keep typing inputs running immediately!
    setQuery(e.target.value);

    // Defer costly queries to the transitional thread:
    startTransition(() => {
      runIntensiveSearchFilter(e.target.value);
    });
  };

  return (
    <div>
      <input type="text" onChange={handleChange} />
      {isPending && <span>Scanning databases...</span>}
    </div>
  );
}
\`\`\`

> "Always measure performance before and after applying concurrent hooks. Over-optimizing static lists might add unneeded hook footprint overheads."

Congratulations! You are now equipped to build lag-free, ultra-responsive web experiences.`;

    onChange(template);
    setActiveTab('write');
  };

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 flex flex-col font-sans shadow-xs">
      
      {/* Editor & Preview Header Row */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-150 dark:border-slate-800">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'write'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Write Article</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'preview'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Live Preview</span>
          </button>
        </div>

        {/* Macros / Helpers */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleInsertBlogTemplate}
            title="Load ready-made technical blog post layout draft"
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] tracking-wider uppercase text-orange-650 dark:text-orange-400 font-extrabold hover:bg-orange-500/10 rounded-lg transition-colors cursor-pointer"
          >
            <Sparkles className="w-3 h-3 text-orange-500" />
            <span>Insert Template</span>
          </button>

          {value && value.trim() !== '' && (
            <button
              type="button"
              onClick={() => onChange('')}
              title="Clear current article content"
              className="p-1.5 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 rounded-lg transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Editor Markdown Format Bar */}
      {activeTab === 'write' && (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50/20 dark:bg-slate-900/10 border-b border-slate-150 dark:border-slate-800/60 shrink-0">
          <button
            type="button"
            onClick={() => insertTextToken('# ', '')}
            title="Inject Heading 1"
            className="p-1 px-2 text-[10px] font-sans font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => insertTextToken('## ', '')}
            title="Inject Heading 2"
            className="p-1 px-2 text-[10px] font-sans font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => insertTextToken('### ', '')}
            title="Inject Heading 3"
            className="p-1 px-2 text-[10px] font-sans font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
          >
            H3
          </button>
          
          <div className="w-px h-4.5 bg-slate-200 dark:bg-slate-800 mx-1.5 shrink-0" />

          <button
            type="button"
            onClick={() => insertTextToken('**', '**')}
            title="Apply Bold Accent selection (**)"
            className="p-1.5 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertTextToken('*', '*')}
            title="Apply Italic selection (*)"
            className="p-1.5 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4.5 bg-slate-200 dark:bg-slate-800 mx-1.5 shrink-0" />

          <button
            type="button"
            onClick={() => insertTextToken('- ', '')}
            title="Bullet Point Item"
            className="p-1.5 text-slate-600 dark:text-slate-355 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          
          <button
            type="button"
            onClick={() => insertTextToken('[', '](url)')}
            title="Hyperlink Anchor [text](url)"
            className="p-1.5 text-slate-600 dark:text-slate-355 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <Link className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertTextToken('> ', '')}
            title="Blockquote paragraph quote"
            className="p-1.5 text-slate-600 dark:text-slate-355 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4.5 bg-slate-200 dark:bg-slate-800 mx-1.5 shrink-0" />

          <button
            type="button"
            onClick={() => insertTextToken('`', '`')}
            title="Inline single code token (`)"
            className="p-1.5 text-slate-600 dark:text-slate-355 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertTextToken('```typescript\n', '\n```')}
            title="Code Block layout panel"
            className="flex items-center gap-1 p-1 px-1.5 text-[10px] font-mono text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors cursor-pointer"
          >
            <Code className="w-3 h-3 text-sky-500" />
            <span>Block</span>
          </button>
        </div>
      )}

      {/* Editor Main Core Window */}
      <div className="min-h-[280px] relative flex flex-col flex-grow bg-white dark:bg-slate-950 font-sans leading-relaxed">
        {activeTab === 'write' ? (
          <textarea
            ref={textareaRef}
            rows={12}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-full min-h-[300px] resize-y p-3.5 bg-transparent border-0 text-xs text-slate-805 dark:text-slate-100 outline-none focus:ring-0 font-mono text-left leading-relaxed selection:bg-orange-500/10 placeholder-slate-400 dark:placeholder-slate-600"
            required
          />
        ) : (
          <div className="w-full p-5 select-text bg-slate-50/10 dark:bg-slate-900/5 border-0 leading-normal min-h-[300px] rounded-b-xl overflow-y-auto">
            {renderPreview(value)}
          </div>
        )}
      </div>

    </div>
  );
}
