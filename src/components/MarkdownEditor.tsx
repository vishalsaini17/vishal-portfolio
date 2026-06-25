/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Heading1, Heading2, Heading3, List, Link, Code, 
  Eye, Edit3, Trash2, Sparkles, FileText, Quote, Columns, Image, Upload
} from 'lucide-react';

// BI-DIRECTIONAL PARSERS: Convert HTML <-> Markdown flawlessly
export function markdownToHtml(md: string): string {
  if (!md) return '';
  const lines = md.split('\n');
  let html = '';
  let inList = false;
  let inCodeBlock = false;
  let codeContent = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks parsing helper
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        html += `<pre class="p-3 bg-slate-900 text-slate-100 font-mono text-xs rounded-xl border border-slate-800"><code>${escapeHtml(codeContent.trim())}</code></pre>\n`;
        codeContent = '';
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += line + '\n';
      continue;
    }

    // List items check
    const isListItem = line.startsWith('- ') || line.startsWith('* ');
    if (isListItem) {
      if (!inList) {
        html += '<ul class="list-disc pl-5 space-y-1">\n';
        inList = true;
      }
      const itemText = line.substring(2);
      html += `<li>${inlineMarkdownToHtml(itemText)}</li>\n`;
      continue;
    } else {
      if (inList) {
        html += '</ul>\n';
        inList = false;
      }
    }

    // Spacing enter break handler
    if (!line.trim()) {
      html += '<p><br></p>\n';
      continue;
    }

    // Headings & Blockquote translation
    if (line.startsWith('# ')) {
      html += `<h1>${inlineMarkdownToHtml(line.substring(2))}</h1>\n`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${inlineMarkdownToHtml(line.substring(3))}</h2>\n`;
    } else if (line.startsWith('### ')) {
      html += `<h3>${inlineMarkdownToHtml(line.substring(4))}</h3>\n`;
    } else if (line.startsWith('> ')) {
      html += `<blockquote>${inlineMarkdownToHtml(line.substring(2))}</blockquote>\n`;
    } else {
      html += `<p>${inlineMarkdownToHtml(line)}</p>\n`;
    }
  }

  if (inList) {
    html += '</ul>\n';
  }
  if (inCodeBlock) {
    html += `<pre class="p-3 bg-slate-900 text-slate-100 font-mono text-xs rounded-xl border border-slate-800"><code>${escapeHtml(codeContent.trim())}</code></pre>\n`;
  }

  return html;
}

function inlineMarkdownToHtml(text: string): string {
  let result = text;
  // Parse images first so they don't get matched as links: ![alt](url)
  result = result.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-3 shadow-md inline-block" />');
  // Parse links: [text](url)
  result = result.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-orange-500 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>');
  result = result.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  result = result.replace(/\*(.*?)\*/g, '<em>$1</em>');
  result = result.replace(/`(.*?)`/g, '<code>$1</code>');
  return result;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function htmlToMarkdown(html: string): string {
  if (!html) return '';
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  return nodeToMarkdown(doc.body).trim();
}

function nodeToMarkdown(element: Node): string {
  let md = '';
  const childNodes = Array.from(element.childNodes);

  for (const node of childNodes) {
    if (node.nodeType === 3) { // Text Node
      md += node.textContent || '';
    } else if (node.nodeType === 1) { // Element Node
      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();

      if (tagName === 'h1') {
        md += `# ${nodeToMarkdown(el).trim()}\n\n`;
      } else if (tagName === 'h2') {
        md += `## ${nodeToMarkdown(el).trim()}\n\n`;
      } else if (tagName === 'h3') {
        md += `### ${nodeToMarkdown(el).trim()}\n\n`;
      } else if (tagName === 'blockquote') {
        md += `> ${nodeToMarkdown(el).trim()}\n\n`;
      } else if (tagName === 'p') {
        const text = nodeToMarkdown(el).trim();
        if (text) {
          md += `${text}\n\n`;
        } else {
          md += '\n';
        }
      } else if (tagName === 'ul') {
        md += nodeToMarkdown(el);
      } else if (tagName === 'li') {
        md += `- ${nodeToMarkdown(el).trim()}\n`;
      } else if (tagName === 'pre') {
        md += `\`\`\`\n${el.innerText.trim()}\n\`\`\`\n\n`;
      } else if (tagName === 'a') {
        const href = el.getAttribute('href') || '';
        md += `[${nodeToMarkdown(el).trim()}](${href})`;
      } else if (tagName === 'img') {
        const src = el.getAttribute('src') || '';
        const alt = el.getAttribute('alt') || 'image';
        md += `![${alt}](${src})`;
      } else if (tagName === 'strong' || tagName === 'b') {
        md += `**${nodeToMarkdown(el)}**`;
      } else if (tagName === 'em' || tagName === 'i') {
        md += `*${nodeToMarkdown(el)}*`;
      } else if (tagName === 'code') {
        if (el.parentElement?.tagName.toLowerCase() === 'pre') {
          md += nodeToMarkdown(el);
        } else {
          md += `\`${nodeToMarkdown(el)}\``;
        }
      } else if (tagName === 'br') {
        md += '\n';
      } else if (tagName === 'div') {
        const text = nodeToMarkdown(el).trim();
        if (text) {
          md += `${text}\n\n`;
        } else {
          md += '\n';
        }
      } else {
        md += nodeToMarkdown(el);
      }
    }
  }

  return md;
}

interface MarkdownEditorProps {
  value: string;
  onChange: (newValue: string) => void;
  placeholder?: string;
  editorId?: string;
  templateType?: 'blog' | 'project';
}

export default function MarkdownEditor({ 
  value, 
  onChange, 
  placeholder = 'Write custom content with markdown syntax...', 
  editorId = 'markdown-editor',
  templateType = 'blog'
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<'visual' | 'preview'>('visual');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const isEditingVisual = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image is quite large. For best performance, consider using images smaller than 5MB.");
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      if (activeTab === 'visual') {
        execVisualCommand('insertImage', dataUrl);
      } else {
        insertText(`![${file.name.split('.')[0]}](${dataUrl})`, '');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const [activeFormatting, setActiveFormatting] = useState({
    bold: false,
    italic: false,
    h1: false,
    h2: false,
    h3: false,
    bullets: false,
  });

  // Keep Visual Content Editable DIV in absolute sync with markdown value state
  useEffect(() => {
    if (activeTab === 'visual' && visualRef.current && !isEditingVisual.current) {
      visualRef.current.innerHTML = markdownToHtml(value || '');
    }
  }, [value, activeTab]);

  const handleVisualInput = () => {
    if (!visualRef.current) return;
    isEditingVisual.current = true;
    const html = visualRef.current.innerHTML;
    const md = htmlToMarkdown(html);
    onChange(md);
    setTimeout(() => {
      isEditingVisual.current = false;
    }, 10);
  };

  const checkVisualSelectionState = () => {
    if (activeTab !== 'visual') return;
    try {
      const bold = document.queryCommandState('bold');
      const italic = document.queryCommandState('italic');
      
      let h1 = false;
      let h2 = false;
      let h3 = false;
      let bullets = false;
      
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        let parent: HTMLElement | null = selection.getRangeAt(0).startContainer.parentElement;
        while (parent && parent !== visualRef.current) {
          const tag = parent.tagName.toLowerCase();
          if (tag === 'h1') h1 = true;
          if (tag === 'h2') h2 = true;
          if (tag === 'h3') h3 = true;
          if (tag === 'ul' || tag === 'li') bullets = true;
          parent = parent.parentElement;
        }
      }
      
      setActiveFormatting({ bold, italic, h1, h2, h3, bullets });
    } catch (err) {
      // safe bypass inside sandbox environment
    }
  };

  const execVisualCommand = (command: string, arg: string = '') => {
    if (activeTab !== 'visual') return;
    document.execCommand(command, false, arg);
    handleVisualInput();
    setTimeout(checkVisualSelectionState, 20);
  };

  const insertVisualCode = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const selectedText = range.toString() || 'code';
    
    const codeEl = document.createElement('code');
    codeEl.className = "px-1.5 py-0.5 text-pink-600 dark:text-pink-400 font-mono text-[11px] bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-800/40";
    codeEl.innerText = selectedText;

    range.deleteContents();
    range.insertNode(codeEl);
    
    // Position cursor after the node
    range.setStartAfter(codeEl);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
    
    handleVisualInput();
  };

  const insertVisualCodeBlock = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    const selectedText = range.toString() || '// paste code here';

    const preEl = document.createElement('pre');
    preEl.className = "p-3 bg-slate-900 text-slate-100 font-mono text-xs rounded-xl border border-slate-800 my-2";
    const codeEl = document.createElement('code');
    codeEl.innerText = selectedText;
    preEl.appendChild(codeEl);

    range.deleteContents();
    range.insertNode(preEl);
    
    range.setStartAfter(preEl);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);

    handleVisualInput();
  };

  const insertVisualLink = () => {
    const url = prompt('Enter Destination URL Link:', 'https://');
    if (url) {
      execVisualCommand('createLink', url);
    }
  };

  const insertVisualImage = () => {
    const url = prompt('Enter Image Source URL:', 'https://images.unsplash.com/');
    if (url) {
      execVisualCommand('insertImage', url);
    }
  };

  // RAW WRITING PANE MARKDOWN HELPERS
  const insertText = (before: string, after: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = value || '';
    const selectedText = currentVal.substring(start, end);
    const replacement = before + selectedText + after;

    const newVal = currentVal.substring(0, start) + replacement + currentVal.substring(end);
    onChange(newVal);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 50);
  };

  // Load sample template context depending on config type
  const handleInsertTemplate = () => {
    let template = '';
    
    if (templateType === 'project') {
      template = `## SupportLogic Analytics Dashboard

## Overview
An AI-driven enterprise analytics dashboard providing real-time ticket triage and sentiment analysis scores.

### Key Features
- **Interactive Recharts Engine**: Real-time customer ticket charts.
- **Dynamic Priorities Triage**: Reduced incoming message load latency by 45%.
- **Theme Accents Config**: Styled using Tailwind CSS variables with dark support.

## Architecture & Integration
Built on React 19, Tailwind CSS, TypeScript, and Firestore collections. Uses lazy-loading and debounce configurations for super smooth responsiveness.`;
    } else {
      template = `# Optimizing React Performance with Concurrent Features

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
    }

    onChange(template);
    setActiveTab('visual');
  };

  // Custom rendered parsing of markdown safe view inside the app UI
  const renderPreview = (text: string) => {
    const htmlContent = markdownToHtml(text || '');
    if (!htmlContent) {
      return (
        <div className="flex flex-col items-center justify-center py-10 text-slate-400 select-none">
          <FileText className="w-8 h-8 stroke-[1.25] mb-2 text-slate-300 dark:text-slate-700" />
          <p className="text-xs">No markdown content written yet.</p>
        </div>
      );
    }
    return (
      <div 
        className="prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-250 leading-relaxed text-left space-y-4"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    );
  };

  return (
    <div 
      id={editorId}
      className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 flex flex-col font-sans"
    >
      {/* Editor Main Core Window */}
      <div className="min-h-[300px] relative flex flex-col flex-grow bg-white dark:bg-slate-950 font-sans leading-relaxed">
        {activeTab === 'visual' ? (
          <div className="flex flex-col flex-grow min-h-[400px]">
            {/* Formatting Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-150 dark:border-slate-800 shrink-0 select-none">
              <button
                type="button"
                onClick={() => execVisualCommand('formatBlock', '<p>')}
                className={`p-1 px-2 text-[10px] uppercase tracking-wider font-extrabold rounded cursor-pointer transition-all hover:bg-slate-150 dark:hover:bg-slate-800 ${
                  (!activeFormatting.h1 && !activeFormatting.h2 && !activeFormatting.h3) ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                P
              </button>
              <button
                type="button"
                onClick={() => execVisualCommand('formatBlock', '<h1>')}
                className={`p-1 px-2 text-[10px] uppercase tracking-wider font-extrabold rounded cursor-pointer transition-all hover:bg-slate-150 dark:hover:bg-slate-800 ${
                  activeFormatting.h1 ? 'bg-orange-500/15 text-orange-650' : 'text-slate-650 dark:text-slate-450'
                }`}
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => execVisualCommand('formatBlock', '<h2>')}
                className={`p-1 px-2 text-[10px] uppercase tracking-wider font-extrabold rounded cursor-pointer transition-all hover:bg-slate-150 dark:hover:bg-slate-800 ${
                  activeFormatting.h2 ? 'bg-orange-500/15 text-orange-650' : 'text-slate-650 dark:text-slate-450'
                }`}
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => execVisualCommand('formatBlock', '<h3>')}
                className={`p-1 px-2 text-[10px] uppercase tracking-wider font-extrabold rounded cursor-pointer transition-all hover:bg-slate-150 dark:hover:bg-slate-800 ${
                  activeFormatting.h3 ? 'bg-orange-500/15 text-orange-650' : 'text-slate-650 dark:text-slate-450'
                }`}
              >
                H3
              </button>

              <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1.5" />

              <button
                type="button"
                onClick={() => execVisualCommand('bold')}
                className={`p-1 rounded cursor-pointer transition-all hover:bg-slate-150 dark:hover:bg-slate-800 ${
                  activeFormatting.bold ? 'bg-orange-500/15 text-orange-650' : 'text-slate-600 dark:text-slate-450'
                }`}
                title="Bold Text"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => execVisualCommand('italic')}
                className={`p-1 rounded cursor-pointer transition-all hover:bg-slate-150 dark:hover:bg-slate-800 ${
                  activeFormatting.italic ? 'bg-orange-500/15 text-orange-650' : 'text-slate-600 dark:text-slate-450'
                }`}
                title="Italic Text"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1.5" />

              <button
                type="button"
                onClick={() => execVisualCommand('insertUnorderedList')}
                className={`p-1 rounded cursor-pointer transition-all hover:bg-slate-150 dark:hover:bg-slate-800 ${
                  activeFormatting.bullets ? 'bg-orange-500/15 text-orange-650' : 'text-slate-600 dark:text-slate-450'
                }`}
                title="Bullet List"
              >
                <List className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => execVisualCommand('formatBlock', '<blockquote>')}
                className="p-1 rounded transition-all hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                title="Blockquote paragraph"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={insertVisualLink}
                className="p-1 rounded transition-all hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                title="Insert Web Link"
              >
                <Link className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={insertVisualImage}
                className="p-1.5 rounded transition-all hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                title="Insert Image URL (external link)"
              >
                <Image className="w-3.5 h-3.5 text-indigo-500" />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded transition-all hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                title="Upload & Attach Local Image File"
              >
                <Upload className="w-3.5 h-3.5 text-orange-500" />
              </button>

              <button
                type="button"
                onClick={insertVisualCode}
                className="p-1 rounded transition-all hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer font-mono text-[10px]"
                title="Wrap with Code block syntax"
              >
                <Code className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={insertVisualCodeBlock}
                className="p-1.5 rounded transition-all hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer font-mono text-[10px] flex items-center gap-1"
                title="Embed complete Code Block"
              >
                <Code className="w-3 h-3 text-sky-500" />
                <span>Block</span>
              </button>

              {/* Template, Toggle Eye (Preview), and Clear (ml-auto is on Template button) */}
              <button
                type="button"
                onClick={handleInsertTemplate}
                title={`Load ready-made technical ${templateType} post layout draft`}
                className="flex items-center gap-1 px-2.5 py-1 text-[10px] tracking-wider uppercase text-orange-650 dark:text-orange-400 font-extrabold hover:bg-orange-500/10 rounded-lg transition-colors cursor-pointer ml-auto"
              >
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <span className="hidden sm:inline">Template</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className="p-1.5 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all hover:bg-slate-150 dark:hover:bg-slate-800 cursor-pointer"
                title="Preview"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onChange('');
                  if (visualRef.current) {
                    visualRef.current.innerHTML = '';
                  }
                }}
                className="p-1.5 rounded text-rose-500 transition-all hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                title="Clear"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Editable Visual Board */}
            <div
              ref={visualRef}
              contentEditable
              onInput={handleVisualInput}
              onSelect={checkVisualSelectionState}
              onKeyUp={checkVisualSelectionState}
              onMouseUp={checkVisualSelectionState}
              className="w-full flex-grow p-5 min-h-[350px] outline-none prose prose-sm dark:prose-invert max-w-none text-slate-800 dark:text-slate-100 text-left selection:bg-orange-500/15 overflow-y-auto"
              placeholder={placeholder}
              style={{ minHeight: '350px' }}
            />
          </div>
        ) : (
          <div className="flex flex-col flex-grow min-h-[400px]">
            {/* Preview Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-150 dark:border-slate-800 shrink-0 select-none">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500 px-2 py-1 select-none">
                Preview Mode
              </span>

              <button
                type="button"
                onClick={() => setActiveTab('visual')}
                className="p-1.5 rounded text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-all hover:bg-slate-150 dark:hover:bg-slate-800 cursor-pointer ml-auto"
                title="Edit"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  onChange('');
                  if (visualRef.current) {
                    visualRef.current.innerHTML = '';
                  }
                }}
                className="p-1.5 rounded text-rose-500 transition-all hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer"
                title="Clear"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="w-full p-6 select-text bg-slate-50/10 dark:bg-slate-900/5 border-0 leading-normal min-h-[350px] rounded-b-xl overflow-y-auto">
              {renderPreview(value)}
            </div>
          </div>
        )}
      </div>

      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        className="hidden"
        accept="image/*"
      />
    </div>
  );
}
