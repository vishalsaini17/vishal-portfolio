/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  Bold, Italic, Heading1, Heading2, Heading3, List, Link, Code, 
  Eye, Edit3, Trash2, Sparkles, FileText
} from 'lucide-react';

interface ProjectMarkdownEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  projectId: string;
}

export default function ProjectMarkdownEditor({ 
  value, 
  onChange, 
  placeholder = 'Describe your incredible project details...', 
  projectId 
}: ProjectMarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper renderer to preview markdown in real-time within the admin panel
  const renderPreview = (text: string) => {
    if (!text || text.trim() === '') {
      return (
        <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500 italic">
          No content written yet. Tap formatting buttons or write some markdown above!
        </div>
      );
    }

    const lines = text.split('\n');
    return (
      <div className="prose dark:prose-invert max-w-none text-left space-y-2 select-text">
        {lines.map((line, idx) => {
          if (line.startsWith('# ')) {
            return <h1 key={idx} className="text-lg font-bold text-slate-850 dark:text-slate-100 col-span-full border-b border-slate-100 dark:border-slate-800 pb-1 mt-3 mb-1.5">{line.substring(2)}</h1>;
          }
          if (line.startsWith('## ')) {
            return <h2 key={idx} className="text-md font-bold text-slate-800 dark:text-slate-200 mt-2.5 mb-1.5">{line.substring(3)}</h2>;
          }
          if (line.startsWith('### ')) {
            return <h3 key={idx} className="text-sm font-bold text-slate-700 dark:text-slate-350 mt-2 mb-1">{line.substring(4)}</h3>;
          }
          if (line.startsWith('- ')) {
            return <li key={idx} className="list-disc list-inside ml-2.5 text-xs text-slate-650 dark:text-slate-400 leading-relaxed py-0.5">{line.substring(2)}</li>;
          }
          if (line.startsWith('* ')) {
            return <li key={idx} className="list-disc list-inside ml-2.5 text-xs text-slate-650 dark:text-slate-400 leading-relaxed py-0.5">{line.substring(2)}</li>;
          }
          if (!line.trim()) {
            return <div key={idx} className="h-1.5"></div>;
          }

          // **bold** phrasing parser
          let formattedLine: React.ReactNode = line;
          if (line.includes('**')) {
            const parts = line.split('**');
            formattedLine = parts.map((part, partIdx) => {
              if (partIdx % 2 === 1) {
                return <strong key={partIdx} className="font-semibold text-slate-900 dark:text-slate-50">{part}</strong>;
              }
              return part;
            });
          }

          return (
            <p key={idx} className="text-xs text-slate-600 dark:text-slate-450 leading-relaxed whitespace-pre-wrap mb-1">
              {formattedLine}
            </p>
          );
        })}
      </div>
    );
  };

  // Safe Textarea cursor insertions
  const insertText = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.focus();
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = value || '';
    const selection = currentVal.substring(start, end);

    // If no text selected, provide a placeholder inside the formatting tags
    const insertedPlaceholder = selection || 'text';
    const replacement = before + insertedPlaceholder + after;

    const newVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);
    onChange(newVal);

    // Re-offset cursor position nicely
    setTimeout(() => {
      textarea.focus();
      const nextCursorStart = start + before.length;
      const nextCursorEnd = nextCursorStart + insertedPlaceholder.length;
      textarea.setSelectionRange(nextCursorStart, nextCursorEnd);
    }, 50);
  };

  // Complete professional project portfolio markdown developer layout template
  const insertTemplateLoad = () => {
    const template = `## SupportLogic Analytics Dashboard

## Overview
An AI-driven enterprise analytics dashboard providing real-time ticket triage and sentiment analysis scores.

### Key Features
- **Interactive Recharts Engine**: Real-time customer ticket charts.
- **Dynamic Priorities Triage**: Reduced incoming message load latency by 45%.
- **Theme Accents Config**: Styled using Tailwind CSS variables with dark support.

## Architecture & Integration
Built on React 19, Tailwind CSS, TypeScript, and Firestore collections. Uses lazy-loading and debounce configurations for super smooth responsiveness.`;
    
    onChange(template);
    setActiveTab('write');
  };

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 flex flex-col font-sans">
      
      {/* Editor & Preview Mode Switcher Hub */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-180 dark:border-slate-800">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('write')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'write'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-650 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>Write</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'preview'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-650 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Live Preview</span>
          </button>
        </div>

        {/* Action Trigger Buttons (E.g. Template Load) */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={insertTemplateLoad}
            title="Load Developer Portfolio Template Plan"
            className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-orange-600 dark:text-orange-400 font-bold hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-lg transition-colors cursor-pointer"
          >
            <Sparkles className="w-3 h-3" />
            <span>Insert Template</span>
          </button>

          {value && value.trim() !== '' && (
            <button
              type="button"
              onClick={() => onChange('')}
              title="Clear text contents"
              className="p-1.5 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 rounded-lg transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Editor Main Styling Toolbar (Rendered in Editor tab only) */}
      {activeTab === 'write' && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-150 dark:border-slate-800/60 shrink-0">
          <button
            type="button"
            onClick={() => insertText('# ', '')}
            title="Heading 1"
            className="p-1 px-2 rounded hover:bg-slate-150 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 font-serif cursor-pointer"
          >
            H1
          </button>
          <button
            type="button"
            onClick={() => insertText('## ', '')}
            title="Heading 2"
            className="p-1 px-2 rounded hover:bg-slate-150 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 font-serif cursor-pointer"
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => insertText('### ', '')}
            title="Heading 3"
            className="p-1 px-2 rounded hover:bg-slate-150 dark:hover:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-300 font-serif cursor-pointer"
          >
            H3
          </button>
          
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-850 mx-1"></div>

          <button
            type="button"
            onClick={() => insertText('**', '**')}
            title="Bold selection"
            className="p-1.5 rounded hover:bg-slate-150 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('_', '_')}
            title="Italic selection"
            className="p-1.5 rounded hover:bg-slate-150 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-200 dark:bg-slate-850 mx-1"></div>

          <button
            type="button"
            onClick={() => insertText('- ', '')}
            title="Bullet list item"
            className="p-1.5 rounded hover:bg-slate-150 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('[', '](url)')}
            title="Anchor Hyperlink"
            className="p-1.5 rounded hover:bg-slate-150 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <Link className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('`', '`')}
            title="Inline code expression"
            className="p-1.5 rounded hover:bg-slate-150 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editor Panel Wrapper Content */}
      <div className="min-h-[160px] relative flex flex-col flex-grow bg-white dark:bg-slate-950 leading-relaxed font-sans">
        {activeTab === 'write' ? (
          <textarea
            id={`project-editor-${projectId}`}
            ref={textareaRef}
            rows={7}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-full min-h-[160px] resize-y p-3.5 bg-transparent border-0 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-0 font-mono text-left leading-relaxed selection:bg-orange-500/10 placeholder-slate-400 dark:placeholder-slate-600"
          />
        ) : (
          <div className="w-full p-4 select-text bg-slate-50/20 dark:bg-slate-900/10 border-0 leading-normal min-h-[160px] rounded-b-xl overflow-y-auto">
            {renderPreview(value)}
          </div>
        )}
      </div>

    </div>
  );
}
