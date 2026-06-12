/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Heading1, Heading2, Heading3, List, Link, Code, 
  Eye, Edit3, Trash2, Sparkles, AlertTriangle, FileText, Quote, ClipboardList,
  Columns
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
  const [activeTab, setActiveTab] = useState<'visual' | 'split' | 'write' | 'preview'>('visual');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const isEditingVisual = useRef(false);

  const [editingLineIdx, setEditingLineIdx] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  const [activeFormatting, setActiveFormatting] = useState({
    bold: false,
    italic: false,
    h1: false,
    h2: false,
    h3: false,
    bullets: false,
  });

  // Hot Sync contentEditable html value on state modifications originating outer-bounds
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
    handleVisualInput();
  };

  const insertVisualLink = () => {
    const url = prompt('Enter link destination:', 'https://');
    if (url) {
      execVisualCommand('createLink', url);
    }
  };

  const insertVisualImage = () => {
    const url = prompt('Enter image URL:', 'https://images.unsplash.com/');
    if (url) {
      execVisualCommand('insertImage', url);
    }
  };


  const getLineDetails = (line: string) => {
    if (line.startsWith('# ')) return { prefix: '# ', text: line.substring(2), type: 'h1' };
    if (line.startsWith('## ')) return { prefix: '## ', text: line.substring(3), type: 'h2' };
    if (line.startsWith('### ')) return { prefix: '### ', text: line.substring(4), type: 'h3' };
    if (line.startsWith('> ')) return { prefix: '> ', text: line.substring(2), type: 'blockquote' };
    if (line.startsWith('- ')) return { prefix: '- ', text: line.substring(2), type: 'bullet' };
    if (line.startsWith('* ')) return { prefix: '* ', text: line.substring(2), type: 'bullet2' };
    return { prefix: '', text: line, type: 'p' };
  };

  const startEditing = (idx: number, text: string) => {
    setEditingLineIdx(idx);
    setEditingText(text);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setEditingText(e.target.value);
  };

  const saveEditing = (idx: number, prefix: string) => {
    if (editingLineIdx === null) return;
    const lines = (value || '').split('\n');
    lines[idx] = prefix + editingText;
    onChange(lines.join('\n'));
    setEditingLineIdx(null);
  };

  const wrapEditable = (idx: number, text: string, prefix: string, element: React.ReactNode) => {
    return (
      <div 
        key={idx} 
        onClick={() => startEditing(idx, text)}
        className="group relative hover:bg-orange-500/5 dark:hover:bg-orange-500/10 transition-all rounded-lg p-2 -mx-2 cursor-pointer ring-1 ring-dashed ring-transparent hover:ring-orange-400/40 select-text"
        title="Click to edit block"
      >
        {element}
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-orange-500 text-white rounded p-1 text-[9px] font-bold flex items-center gap-1 shadow-sm selection:bg-transparent cursor-pointer pointer-events-none select-none">
          <Edit3 className="w-2.5 h-2.5" />
          <span>Edit Block</span>
        </div>
      </div>
    );
  };

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

          const { prefix, text: rawLineText, type } = getLineDetails(line);

          // If this line is currently being edited
          if (editingLineIdx === idx) {
            if (type === 'h1') {
              return (
                <div key={idx} className="flex items-center gap-2 w-full py-1 text-left" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editingText}
                    onChange={handleTextChange}
                    onBlur={() => saveEditing(idx, prefix)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditing(idx, prefix);
                      if (e.key === 'Escape') setEditingLineIdx(null);
                    }}
                    className="w-full text-xl font-display font-bold text-slate-900 dark:text-slate-100 border-b-2 border-orange-500 bg-orange-500/5 dark:bg-orange-950/10 px-2 py-1 outline-none rounded-t"
                    autoFocus
                  />
                </div>
              );
            }
            if (type === 'h2') {
              return (
                <div key={idx} className="flex items-center gap-2 w-full py-1 text-left" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editingText}
                    onChange={handleTextChange}
                    onBlur={() => saveEditing(idx, prefix)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditing(idx, prefix);
                      if (e.key === 'Escape') setEditingLineIdx(null);
                    }}
                    className="w-full text-base font-display font-bold text-slate-800 dark:text-slate-200 border-b-2 border-orange-500 bg-orange-500/5 dark:bg-orange-950/10 px-2 py-1 outline-none rounded-t"
                    autoFocus
                  />
                </div>
              );
            }
            if (type === 'h3') {
              return (
                <div key={idx} className="flex items-center gap-2 w-full py-1 text-left" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editingText}
                    onChange={handleTextChange}
                    onBlur={() => saveEditing(idx, prefix)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditing(idx, prefix);
                      if (e.key === 'Escape') setEditingLineIdx(null);
                    }}
                    className="w-full text-sm font-display font-semibold text-slate-700 dark:text-slate-300 border-b-2 border-orange-500 bg-orange-500/5 dark:bg-orange-950/10 px-2 py-1 outline-none rounded-t"
                    autoFocus
                  />
                </div>
              );
            }
            if (type === 'blockquote') {
              return (
                <div key={idx} className="flex items-center gap-2 w-full pl-3.5 border-l-3 border-orange-500 py-1 text-left" onClick={(e) => e.stopPropagation()}>
                  <textarea
                    value={editingText}
                    onChange={handleTextChange}
                    onBlur={() => saveEditing(idx, prefix)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        saveEditing(idx, prefix);
                      }
                      if (e.key === 'Escape') setEditingLineIdx(null);
                    }}
                    rows={Math.max(1, editingText.split('\n').length)}
                    className="w-full text-xs italic text-slate-600 dark:text-slate-400 bg-orange-500/5 dark:bg-orange-950/10 px-2 py-1 outline-none rounded resize-none focus:ring-1 focus:ring-orange-500"
                    autoFocus
                  />
                </div>
              );
            }
            if (type === 'bullet' || type === 'bullet2') {
              return (
                <div key={idx} className="flex items-center gap-2 w-full pl-3.5 py-1 text-left" onClick={(e) => e.stopPropagation()}>
                  <span className="text-orange-500 font-bold mr-1">•</span>
                  <input
                    type="text"
                    value={editingText}
                    onChange={handleTextChange}
                    onBlur={() => saveEditing(idx, prefix)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditing(idx, prefix);
                      if (e.key === 'Escape') setEditingLineIdx(null);
                    }}
                    className="w-full text-xs text-slate-650 dark:text-slate-400 bg-orange-500/5 dark:bg-orange-950/10 px-2 py-0.5 outline-none rounded"
                    autoFocus
                  />
                </div>
              );
            }
            // Paragraph (plain text)
            return (
              <div key={idx} className="flex items-center gap-2 w-full py-1 text-left" onClick={(e) => e.stopPropagation()}>
                <textarea
                  value={editingText}
                  onChange={handleTextChange}
                  onBlur={() => saveEditing(idx, prefix)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      saveEditing(idx, prefix);
                    }
                    if (e.key === 'Escape') setEditingLineIdx(null);
                  }}
                  rows={Math.max(2, editingText.split('\n').length)}
                  className="w-full text-xs text-slate-650 dark:text-slate-400 bg-orange-500/5 dark:bg-orange-950/10 px-2 py-1.5 outline-none rounded resize-none focus:ring-1 focus:ring-orange-500"
                  autoFocus
                />
              </div>
            );
          }

          // Headers
          if (line.startsWith('# ')) {
            return wrapEditable(
              idx,
              rawLineText,
              prefix,
              <h1 className="text-xl font-display font-bold text-slate-900 dark:text-slate-50 border-b border-slate-100 dark:border-slate-800 pb-1.5 mt-4 mb-2">
                {rawLineText}
              </h1>
            );
          }
          if (line.startsWith('## ')) {
            return wrapEditable(
              idx,
              rawLineText,
              prefix,
              <h2 className="text-base font-display font-bold text-slate-800 dark:text-slate-200 mt-3.5 mb-2">
                {rawLineText}
              </h2>
            );
          }
          if (line.startsWith('### ')) {
            return wrapEditable(
              idx,
              rawLineText,
              prefix,
              <h3 className="text-sm font-display font-semibold text-slate-700 dark:text-slate-350 mt-3 mb-1.5">
                {rawLineText}
              </h3>
            );
          }

          // Blockquote
          if (line.startsWith('> ')) {
            return wrapEditable(
              idx,
              rawLineText,
              prefix,
              <blockquote className="pl-3.5 py-1.5 border-l-3 border-orange-500 bg-slate-50/50 dark:bg-slate-900/40 text-xs italic text-slate-600 dark:text-slate-400 my-1 rounded-r-md">
                {rawLineText}
              </blockquote>
            );
          }

          // Unordered Lists
          if (line.startsWith('- ')) {
            return wrapEditable(
              idx,
              rawLineText,
              prefix,
              <li className="list-disc list-inside ml-3.5 text-xs text-slate-600 dark:text-slate-400  leading-relaxed py-0.5">
                {rawLineText}
              </li>
            );
          }
          if (line.startsWith('* ')) {
            return wrapEditable(
              idx,
              rawLineText,
              prefix,
              <li className="list-disc list-inside ml-3.5 text-xs text-slate-600 dark:text-slate-400  leading-relaxed py-0.5">
                {rawLineText}
              </li>
            );
          }

          // Empty spaces
          if (!line.trim()) {
            return <div key={idx} className="h-2"></div>;
          }

          // General text style regex formatting (bold or code backticks)
          let formattedNode: React.ReactNode = rawLineText;

          // Perform inline code matching `code`
          const partsCode = rawLineText.split('`');
          if (partsCode.length > 2) {
            formattedNode = partsCode.map((part, pIdx) => {
              if (pIdx % 2 === 1) {
                return (
                  <code key={pIdx} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[11px] font-mono text-pink-600 dark:text-pink-400 font-semibold border border-slate-200/40 dark:border-slate-800/20">
                    {part}
                  </code>
                );
              }
              // Nested bold formatting check
              return part.includes('**') ? parseBold(part) : part;
            });
          } else {
            formattedNode = rawLineText.includes('**') ? parseBold(rawLineText) : rawLineText;
          }

          return wrapEditable(
            idx,
            rawLineText,
            prefix,
            <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed whitespace-pre-wrap">
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
    setActiveTab('split');
  };

  return (
    <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950 flex flex-col font-sans shadow-xs">
      
      {/* Editor & Preview Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-150 dark:border-slate-800">
        <div className="flex gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('visual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'visual'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Visual Editor</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('split')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'split'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Split Mode</span>
          </button>

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
            <span>Markdown Code</span>
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
            <span>Preview Only</span>
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
      {activeTab !== 'preview' && activeTab !== 'visual' && (
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
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          
          <button
            type="button"
            onClick={() => insertTextToken('[', '](url)')}
            title="Hyperlink Anchor [text](url)"
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <Link className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => insertTextToken('> ', '')}
            title="Blockquote paragraph quote"
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4.5 bg-slate-200 dark:bg-slate-800 mx-1.5 shrink-0" />

          <button
            type="button"
            onClick={() => insertTextToken('`', '`')}
            title="Inline single code token (`)"
            className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
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
      <div className="min-h-[300px] relative flex flex-col flex-grow bg-white dark:bg-slate-950 font-sans leading-relaxed">
        {activeTab === 'visual' && (
          <div className="flex flex-col flex-grow min-h-[400px]">
            {/* Visual Editor Instructions / Hints */}
            <div className="px-4 py-2.5 bg-slate-50/50 dark:bg-slate-900/10 border-b border-slate-150 dark:border-slate-800/50 text-[10px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                <strong>Visual Editor Active:</strong> Type text, highlight words, or use the formatting menu above to style.
              </span>
              <span className="font-mono text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-orange-600 dark:text-orange-450 uppercase tracking-widest font-extrabold">
                HTML + MD Hybrid Sync
              </span>
            </div>

            {/* Formatting Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-150 dark:border-slate-800 shrink-0 select-none">
              <button
                type="button"
                onClick={() => execVisualCommand('formatBlock', '<p>')}
                className={`p-1 px-2 text-[10px] uppercase tracking-wider font-extrabold rounded cursor-pointer transition-all hover:bg-slate-150 dark:hover:bg-slate-800 ${
                  (!activeFormatting.h1 && !activeFormatting.h2 && !activeFormatting.h3) ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                Paragraph
              </button>
              <button
                type="button"
                onClick={() => execVisualCommand('formatBlock', '<h1>')}
                className={`p-1 px-2 text-[10px] uppercase tracking-wider font-extrabold rounded cursor-pointer transition-all hover:bg-slate-150 dark:hover:bg-slate-800 ${
                  activeFormatting.h1 ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => execVisualCommand('formatBlock', '<h2>')}
                className={`p-1 px-2 text-[10px] uppercase tracking-wider font-extrabold rounded cursor-pointer transition-all hover:bg-slate-150 dark:hover:bg-slate-800 ${
                  activeFormatting.h2 ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => execVisualCommand('formatBlock', '<h3>')}
                className={`p-1 px-2 text-[10px] uppercase tracking-wider font-extrabold rounded cursor-pointer transition-all hover:bg-slate-150 dark:hover:bg-slate-800 ${
                  activeFormatting.h3 ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                H3
              </button>

              <div className="w-px h-4.5 bg-slate-200 dark:bg-slate-800 mx-1.5 shrink-0" />

              <button
                type="button"
                onClick={() => execVisualCommand('bold')}
                className={`p-1.5 rounded transition-all hover:bg-slate-150 dark:hover:bg-slate-800 cursor-pointer ${
                  activeFormatting.bold ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Bold Text (Ctrl+B)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => execVisualCommand('italic')}
                className={`p-1.5 rounded transition-all hover:bg-slate-150 dark:hover:bg-slate-800 cursor-pointer ${
                  activeFormatting.italic ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Italic Text (Ctrl+I)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-4.5 bg-slate-200 dark:bg-slate-800 mx-1.5 shrink-0" />

              <button
                type="button"
                onClick={() => execVisualCommand('insertUnorderedList')}
                className={`p-1.5 rounded transition-all hover:bg-slate-150 dark:hover:bg-slate-800 cursor-pointer ${
                  activeFormatting.bullets ? 'bg-orange-500 text-white shadow-xs' : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Bullet Point List"
              >
                <List className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => execVisualCommand('formatBlock', '<blockquote>')}
                className="p-1.5 rounded transition-all hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                title="Insert Blockquote"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={insertVisualCode}
                className="p-1.5 rounded transition-all hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                title="Inline Code Wrapping"
              >
                <Code className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-4.5 bg-slate-200 dark:bg-slate-800 mx-1.5 shrink-0" />

              <button
                type="button"
                onClick={insertVisualLink}
                className="p-1.5 rounded transition-all hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                title="Insert Anchor Hyperlink"
              >
                <Link className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={insertVisualImage}
                className="p-1.5 rounded transition-all hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                title="Insert Image (external link)"
              >
                <Eye className="w-3.5 h-3.5 text-indigo-500" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Are you sure you want to clear formatting on the whole document?')) {
                    execVisualCommand('removeFormat');
                  }
                }}
                className="p-1.5 rounded text-rose-500 transition-all hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer ml-auto"
                title="Clear format styling"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Edit Field Area */}
            <div
              ref={visualRef}
              contentEditable
              onInput={handleVisualInput}
              onKeyUp={checkVisualSelectionState}
              onMouseUp={checkVisualSelectionState}
              placeholder={placeholder}
              className="w-full flex-grow min-h-[400px] p-6 focus:outline-hidden prose dark:prose-invert max-w-none text-left outline-hidden select-text bg-white dark:bg-slate-950 border-0 text-slate-850 dark:text-slate-100 overflow-y-auto selection:bg-orange-500/10 custom-wysiwyg-content leading-relaxed"
              style={{ minHeight: '400px' }}
            />
          </div>
        )}

        {activeTab === 'write' && (
          <textarea
            ref={textareaRef}
            rows={14}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full h-full min-h-[350px] resize-y p-4 bg-transparent border-0 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-0 font-mono text-left leading-relaxed selection:bg-orange-500/10 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-hidden"
            required
          />
        )}
        
        {activeTab === 'preview' && (
          <div className="w-full p-6 select-text bg-slate-50/10 dark:bg-slate-900/5 border-0 leading-normal min-h-[350px] rounded-b-xl overflow-y-auto">
            {renderPreview(value)}
          </div>
        )}

        {activeTab === 'split' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-150 dark:divide-slate-800/80 min-h-[400px]">
            {/* Split Editor Pane */}
            <div className="flex flex-col h-full min-h-[250px] lg:min-h-[400px]">
              <div className="px-3 py-1.5 bg-slate-50/40 dark:bg-slate-900/10 border-b border-slate-150 dark:border-slate-800/40 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Markdown Syntax Editor</span>
                <span className="text-[9px] text-slate-350 dark:text-slate-600 font-normal lowercase font-mono">type here...</span>
              </div>
              <textarea
                ref={textareaRef}
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full h-full flex-grow p-4 bg-transparent border-0 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-0 font-mono text-left leading-relaxed selection:bg-orange-500/10 placeholder-slate-400 dark:placeholder-slate-600 focus:outline-hidden resize-none min-h-[250px]"
                required
              />
            </div>
            
            {/* Split Live Preview Pane */}
            <div className="flex flex-col h-full min-h-[250px] lg:min-h-[400px] bg-slate-50/20 dark:bg-slate-950/25">
              <div className="px-3 py-1.5 bg-slate-50/40 dark:bg-slate-900/10 border-b border-slate-150 dark:border-slate-800/40 text-[9px] font-bold text-orange-600 dark:text-orange-450 uppercase tracking-wider flex items-center justify-between">
                <span>Formatted Live Preview</span>
                <span className="text-[9px] text-amber-500 font-extrabold font-sans uppercase tracking-widest animate-pulse">Live</span>
              </div>
              <div className="p-5 select-text leading-normal flex-grow overflow-y-auto max-h-[450px] bg-white dark:bg-slate-950">
                {renderPreview(value)}
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
