/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Bold, Italic, Heading1, Heading2, Heading3, List, Link, Code, 
  Eye, Edit3, Trash2, Sparkles, FileText, Quote, Columns
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
  const [activeTab, setActiveTab] = useState<'visual' | 'write' | 'preview'>('visual');
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
    handleVisualInput();
  };

  const insertVisualLink = () => {
    const url = prompt('Enter the link destination URL:', 'https://');
    if (url) {
      execVisualCommand('createLink', url);
    }
  };

  const insertVisualImage = () => {
    const url = prompt('Enter the image source URL:', 'https://images.unsplash.com/');
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
        className="group relative hover:bg-orange-500/5 dark:hover:bg-orange-500/10 transition-all rounded-lg p-1.5 -mx-1.5 cursor-pointer ring-1 ring-dashed ring-transparent hover:ring-orange-400/40 select-text"
        title="Click to edit block"
      >
        {element}
        <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity bg-orange-500 text-white rounded p-1 text-[9px] font-bold flex items-center gap-1 shadow-sm selection:bg-transparent cursor-pointer pointer-events-none select-none">
          <Edit3 className="w-2.5 h-2.5" />
          <span>Edit</span>
        </div>
      </div>
    );
  };

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
          const { prefix, text: rawLineText, type } = getLineDetails(line);

          // If this line is currently being edited
          if (editingLineIdx === idx) {
            if (type === 'h1') {
              return (
                <div key={idx} className="flex items-center gap-2 w-full py-0.5 text-left" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editingText}
                    onChange={handleTextChange}
                    onBlur={() => saveEditing(idx, prefix)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditing(idx, prefix);
                      if (e.key === 'Escape') setEditingLineIdx(null);
                    }}
                    className="w-full text-lg font-bold text-slate-800 dark:text-slate-100 border-b border-orange-500 bg-orange-500/5 dark:bg-orange-950/10 px-1.5 py-0.5 outline-none font-sans"
                    autoFocus
                  />
                </div>
              );
            }
            if (type === 'h2') {
              return (
                <div key={idx} className="flex items-center gap-2 w-full py-0.5 text-left" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editingText}
                    onChange={handleTextChange}
                    onBlur={() => saveEditing(idx, prefix)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditing(idx, prefix);
                      if (e.key === 'Escape') setEditingLineIdx(null);
                    }}
                    className="w-full text-md font-bold text-slate-800 dark:text-slate-200 border-b border-orange-500 bg-orange-500/5 dark:bg-orange-950/10 px-1.5 py-0.5 outline-none font-sans"
                    autoFocus
                  />
                </div>
              );
            }
            if (type === 'h3') {
              return (
                <div key={idx} className="flex items-center gap-2 w-full py-0.5 text-left" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="text"
                    value={editingText}
                    onChange={handleTextChange}
                    onBlur={() => saveEditing(idx, prefix)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveEditing(idx, prefix);
                      if (e.key === 'Escape') setEditingLineIdx(null);
                    }}
                    className="w-full text-sm font-bold text-slate-700 dark:text-slate-350 border-b border-orange-500 bg-orange-500/5 dark:bg-orange-950/10 px-1.5 py-0.5 outline-none font-sans"
                    autoFocus
                  />
                </div>
              );
            }
            if (type === 'blockquote') {
              return (
                <div key={idx} className="flex items-center gap-2 w-full pl-2.5 border-l-2 border-orange-500 py-0.5 text-left" onClick={(e) => e.stopPropagation()}>
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
                    className="w-full text-xs italic text-slate-600 dark:text-slate-400 bg-orange-500/5 dark:bg-orange-950/10 px-1.5 py-0.5 outline-none rounded resize-none font-sans"
                    autoFocus
                  />
                </div>
              );
            }
            if (type === 'bullet' || type === 'bullet2') {
              return (
                <div key={idx} className="flex items-center gap-2 w-full pl-2.5 py-0.5 text-left" onClick={(e) => e.stopPropagation()}>
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
                    className="w-full text-xs text-slate-650 dark:text-slate-400 bg-orange-500/5 dark:bg-orange-950/10 px-1.5 py-0.5 outline-none rounded font-sans"
                    autoFocus
                  />
                </div>
              );
            }
            // Paragraph
            return (
              <div key={idx} className="flex items-center gap-2 w-full py-0.5 text-left" onClick={(e) => e.stopPropagation()}>
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
                  className="w-full text-xs text-slate-650 dark:text-slate-400 bg-orange-500/5 dark:bg-orange-950/10 px-1.5 py-1 outline-none rounded resize-none focus:ring-1 focus:ring-orange-500 font-sans"
                  autoFocus
                />
              </div>
            );
          }

          if (line.startsWith('# ')) {
            return wrapEditable(
              idx,
              rawLineText,
              prefix,
              <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 col-span-full border-b border-slate-100 dark:border-slate-800 pb-1 mt-3 mb-1.5">
                {rawLineText}
              </h1>
            );
          }
          if (line.startsWith('## ')) {
            return wrapEditable(
              idx,
              rawLineText,
              prefix,
              <h2 className="text-md font-bold text-slate-800 dark:text-slate-200 mt-2.5 mb-1.5">
                {rawLineText}
              </h2>
            );
          }
          if (line.startsWith('### ')) {
            return wrapEditable(
              idx,
              rawLineText,
              prefix,
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350 mt-2 mb-1">
                {rawLineText}
              </h3>
            );
          }
          if (line.startsWith('- ')) {
            return wrapEditable(
              idx,
              rawLineText,
              prefix,
              <li className="list-disc list-inside ml-2.5 text-xs text-slate-650 dark:text-slate-400 leading-relaxed py-0.5">
                {rawLineText}
              </li>
            );
          }
          if (line.startsWith('* ')) {
            return wrapEditable(
              idx,
              rawLineText,
              prefix,
              <li className="list-disc list-inside ml-2.5 text-xs text-slate-650 dark:text-slate-400 leading-relaxed py-0.5">
                {rawLineText}
              </li>
            );
          }
          if (!line.trim()) {
            return <div key={idx} className="h-1.5"></div>;
          }

          // **bold** phrasing parser
          let formattedLine: React.ReactNode = rawLineText;
          if (rawLineText.includes('**')) {
            const parts = rawLineText.split('**');
            formattedLine = parts.map((part, partIdx) => {
              if (partIdx % 2 === 1) {
                return <strong key={partIdx} className="font-semibold text-slate-900 dark:text-slate-50">{part}</strong>;
              }
              return part;
            });
          }

          return wrapEditable(
            idx,
            rawLineText,
            prefix,
            <p className="text-xs text-slate-600 dark:text-slate-450 leading-relaxed whitespace-pre-wrap mb-1">
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
            onClick={() => setActiveTab('visual')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'visual'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-650 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3 h-3 animate-pulse" />
            <span>Visual Editor</span>
          </button>

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
            <span>Markdown Code</span>
          </button>
          
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
              activeTab === 'preview'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
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
          
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1"></div>

          <button
            type="button"
            onClick={() => insertText('**', '**')}
            title="Bold selection"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('_', '_')}
            title="Italic selection"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1"></div>

          <button
            type="button"
            onClick={() => insertText('- ', '')}
            title="Bullet list item"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('[', '](url)')}
            title="Anchor Hyperlink"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <Link className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertText('`', '`')}
            title="Inline code expression"
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Editor Panel Wrapper Content */}
      <div className="min-h-[160px] relative flex flex-col flex-grow bg-white dark:bg-slate-950 leading-relaxed font-sans">
        {activeTab === 'visual' && (
          <div className="flex flex-col flex-grow min-h-[300px]">
            {/* Visual Editor Instructions / Hints */}
            <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-900/10 border-b border-slate-150 dark:border-slate-800/50 text-[10px] text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2 select-none">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                <strong>Visual Mode:</strong> Style content instantly. Highlight text to apply formatting.
              </span>
              <span className="font-mono text-[9px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-orange-600 dark:text-orange-450 uppercase tracking-widest font-extrabold">
                Live Sync
              </span>
            </div>

            {/* Formatting Toolbar */}
            <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-150 dark:border-slate-800 shrink-0 select-none">
              <button
                type="button"
                onClick={() => execVisualCommand('formatBlock', '<p>')}
                className={`p-1 px-1.5 text-[10px] uppercase tracking-wider font-extrabold rounded cursor-pointer transition-all hover:bg-slate-150 dark:hover:bg-slate-800 ${
                  (!activeFormatting.h1 && !activeFormatting.h2 && !activeFormatting.h3) ? 'bg-orange-500/10 text-orange-600' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                P
              </button>
              <button
                type="button"
                onClick={() => execVisualCommand('formatBlock', '<h1>')}
                className={`p-1 px-1.5 text-[10px] uppercase tracking-wider font-extrabold rounded cursor-pointer transition-all hover:bg-slate-150 dark:hover:bg-slate-800 ${
                  activeFormatting.h1 ? 'bg-orange-500/15 text-orange-600' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => execVisualCommand('formatBlock', '<h2>')}
                className={`p-1 px-1.5 text-[10px] uppercase tracking-wider font-extrabold rounded cursor-pointer transition-all hover:bg-slate-150 dark:hover:bg-slate-800 ${
                  activeFormatting.h2 ? 'bg-orange-500/15 text-orange-600' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => execVisualCommand('formatBlock', '<h3>')}
                className={`p-1 px-1.5 text-[10px] uppercase tracking-wider font-extrabold rounded cursor-pointer transition-all hover:bg-slate-150 dark:hover:bg-slate-800 ${
                  activeFormatting.h3 ? 'bg-orange-500/15 text-orange-600' : 'text-slate-600 dark:text-slate-400'
                }`}
              >
                H3
              </button>

              <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1 shrink-0" />

              <button
                type="button"
                onClick={() => execVisualCommand('bold')}
                className={`p-1 rounded transition-all hover:bg-slate-150 dark:hover:bg-slate-800 cursor-pointer ${
                  activeFormatting.bold ? 'bg-orange-500 text-white' : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Bold"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => execVisualCommand('italic')}
                className={`p-1 rounded transition-all hover:bg-slate-150 dark:hover:bg-slate-800 cursor-pointer ${
                  activeFormatting.italic ? 'bg-orange-500 text-white' : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Italic"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1 shrink-0" />

              <button
                type="button"
                onClick={() => execVisualCommand('insertUnorderedList')}
                className={`p-1 rounded transition-all hover:bg-slate-150 dark:hover:bg-slate-800 cursor-pointer ${
                  activeFormatting.bullets ? 'bg-orange-500 text-white' : 'text-slate-600 dark:text-slate-400'
                }`}
                title="Bullet list"
              >
                <List className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => execVisualCommand('formatBlock', '<blockquote>')}
                className="p-1 rounded transition-all hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                title="Blockquote"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={insertVisualCode}
                className="p-1 rounded transition-all hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                title="Inline Code"
              >
                <Code className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={insertVisualLink}
                className="p-1 rounded transition-all hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 cursor-pointer"
                title="Insert Link"
              >
                <Link className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => execVisualCommand('removeFormat')}
                className="p-1 rounded text-rose-500 transition-all hover:bg-rose-50 dark:hover:bg-rose-950/20 cursor-pointer ml-auto"
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
              className="w-full flex-grow min-h-[300px] p-4 focus:outline-hidden prose dark:prose-invert max-w-none text-left outline-hidden select-text bg-white dark:bg-slate-950 border-0 text-slate-800 dark:text-slate-100 overflow-y-auto selection:bg-orange-500/10 custom-wysiwyg-content leading-relaxed text-xs"
              style={{ minHeight: '300px' }}
            />
          </div>
        )}

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
