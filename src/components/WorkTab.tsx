/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useProfile } from '../profileContext';
import { ProjectItem } from '../types';
import { ArrowLeft, Github, ExternalLink, Tag, Cpu, FileText } from 'lucide-react';

export default function WorkTab() {
  const { profile, loading } = useProfile();
  const { projects } = profile;
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [activeProject, setActiveProject] = useState<ProjectItem | null>(null);

  // Helper parser for basic Markdown syntax with rich inline elements (bold, italic, code, links)
  const parseInlineElements = (text: string): React.ReactNode[] => {
    if (!text) return [];
    
    // Regex for markdown anchor links: [label](href)
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      const textBefore = text.substring(lastIndex, matchIndex);
      
      if (textBefore) {
        parts.push(...parseBoldAndItalics(textBefore));
      }

      const linkText = match[1];
      const linkUrl = match[2];

      parts.push(
        <a 
          key={`link-${matchIndex}`} 
          href={linkUrl} 
          target="_blank" 
          rel="noreferrer" 
          className="text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 font-semibold underline cursor-pointer inline-flex items-center"
        >
          {linkText}
        </a>
      );

      lastIndex = linkRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(...parseBoldAndItalics(text.substring(lastIndex)));
    }

    return parts;
  };

  const parseBoldAndItalics = (text: string): React.ReactNode[] => {
    const parts = text.split('**');
    return parts.flatMap((part, partIdx) => {
      const isBold = partIdx % 2 === 1;
      
      // Inline Code splitting (e.g. `const app = true;`)
      const codeParts = part.split('`');
      const renderedParts = codeParts.map((subPart, subIdx) => {
        const isCode = subIdx % 2 === 1;
        if (isCode) {
          return (
            <code 
              key={`code-${partIdx}-${subIdx}`} 
              className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-orange-600 dark:text-orange-400 rounded font-mono text-[10px] md:text-xs"
            >
              {subPart}
            </code>
          );
        }
        return subPart;
      });

      if (isBold) {
        return [
          <strong key={`b-${partIdx}`} className="font-semibold text-slate-900 dark:text-slate-50">
            {renderedParts}
          </strong>
        ];
      }
      return renderedParts;
    });
  };

  const parseMarkdown = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Header 1
      if (line.startsWith('# ')) {
        return (
          <h1 key={idx} className="text-xl md:text-2xl font-bold font-display text-slate-900 dark:text-slate-50 mt-6 mb-3 border-b border-slate-100 dark:border-slate-800/65 pb-2">
            {line.substring(2)}
          </h1>
        );
      }
      // Header 2
      if (line.startsWith('## ')) {
        return (
          <h2 key={idx} className="text-lg md:text-xl font-bold font-display text-slate-850 dark:text-slate-100 mt-5 mb-2.5">
            {line.substring(3)}
          </h2>
        );
      }
      // Header 3
      if (line.startsWith('### ')) {
        return (
          <h3 key={idx} className="text-base md:text-lg font-bold font-display text-slate-850 dark:text-slate-200 mt-4 mb-2">
            {line.substring(4)}
          </h3>
        );
      }
      // Bullet items
      if (line.startsWith('- ')) {
        return (
          <li key={idx} className="list-disc list-inside ml-3.5 text-xs md:text-sm text-slate-600 dark:text-slate-350 leading-relaxed py-1 font-sans">
            {parseInlineElements(line.substring(2))}
          </li>
        );
      }
      if (line.startsWith('* ')) {
        return (
          <li key={idx} className="list-disc list-inside ml-3.5 text-xs md:text-sm text-slate-600 dark:text-slate-350 leading-relaxed py-1 font-sans">
            {parseInlineElements(line.substring(2))}
          </li>
        );
      }
      // Empty spaces
      if (!line.trim()) {
        return <div key={idx} className="h-2"></div>;
      }

      return (
        <p key={idx} className="text-xs md:text-sm leading-relaxed text-slate-605 dark:text-slate-350 mb-3 font-sans">
          {parseInlineElements(line)}
        </p>
      );
    });
  };

  // Dynamically obtain unique categories present across active projects
  const rawCategories = Array.from(new Set(projects.map((p) => p.category).filter(Boolean))) as string[];
  const filters: string[] = ['All', ...rawCategories];

  // Helper to fallback to robust professional placeholder templates when URL is empty
  const getProjectImage = (project: ProjectItem) => {
    if (project.imageUrl) return project.imageUrl;

    const lowerTitle = project.title.toLowerCase();
    const lowerCategory = project.category?.toLowerCase() || '';

    if (lowerTitle.includes('analytics') || lowerCategory.includes('analytics')) {
      return 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop';
    }
    if (lowerTitle.includes('loyalty') || lowerCategory.includes('loyalty')) {
      return 'https://images.unsplash.com/photo-1513151233558-d860c5398176?q=80&w=600&auto=format&fit=crop';
    }
    if (lowerTitle.includes('form') || lowerTitle.includes('builder') || lowerCategory.includes('automation')) {
      return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop';
    }
    if (lowerTitle.includes('seo') || lowerCategory.includes('seo')) {
      return 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=600&auto=format&fit=crop';
    }
    if (lowerTitle.includes('micro') || lowerCategory.includes('micro') || lowerTitle.includes('mfe')) {
      return 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=600&auto=format&fit=crop';
    }
    return 'https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?q=80&w=600&auto=format&fit=crop';
  };

  // Filter project items correctly
  const filteredProjects = projects.filter((project) => {
    if (selectedFilter === 'All') return true;
    return project.category === selectedFilter;
  });

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Title skeleton */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h2 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100 flex items-center gap-6 shrink-0">
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-28"></div>
            <span className="h-0.5 rounded-full bg-slate-200 dark:bg-slate-800 flex-grow max-w-[240px]"></span>
          </h2>
          
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-7 bg-slate-100 dark:bg-slate-800 rounded-full w-16"></div>
            ))}
          </div>
        </div>

        {/* Project grid skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-101 dark:border-slate-800/20 bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden flex flex-col space-y-4 pb-5">
              <div className="aspect-[16/10] bg-slate-200 dark:bg-slate-800 w-full animate-pulse"></div>
              <div className="px-5 space-y-3 flex-grow">
                <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-3/4"></div>
              </div>
              <div className="px-5 pt-2 flex items-center justify-between">
                <div className="h-3 bg-slate-200 dark:bg-slate-850 rounded w-1/3"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-850 rounded-full w-4"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // RENDER DEDICATED PROJECT DETAILS PREVIEW PAGE
  if (activeProject) {
    const techStack = activeProject.technologies ? activeProject.technologies.split(',').map(s => s.trim()).filter(Boolean) : [];

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="project-details-page"
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -10 }}
          transition={{ duration: 0.3 }}
          className="space-y-6 text-left"
        >
          {/* Back button and metadata header */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/70 pb-5">
            <button
              id="back-to-portfolio"
              type="button"
              onClick={() => setActiveProject(null)}
              className="group flex items-center gap-2 py-1.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-orange-500 font-semibold text-xs leading-4 transition-all cursor-pointer shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Projects</span>
            </button>

            <div className="bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 font-bold font-sans uppercase tracking-widest text-[9px] py-1 px-2.5 rounded-full flex items-center gap-1">
              <Tag className="w-2.5 h-2.5" />
              <span>{activeProject.category}</span>
            </div>
          </div>

          {/* Project Title Headings */}
          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-slate-850 dark:text-slate-50 leading-tight">
              {activeProject.title}
            </h2>
            {activeProject.description && (
              <p className="text-sm md:text-base leading-relaxed text-slate-500 dark:text-slate-400 font-sans italic">
                {activeProject.description}
              </p>
            )}
          </div>

          {/* Double Column content breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Primary content area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Cover Render Banner */}
              <div className="aspect-[16/10] w-full rounded-2xl overflow-hidden bg-slate-150 dark:bg-slate-850 border border-slate-101 dark:border-slate-800/50 shadow-sm relative group">
                <img
                  src={getProjectImage(activeProject) || null}
                  alt={activeProject.title}
                  className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Detailed Content / Rich parsing area */}
              <div className="bg-white dark:bg-slate-900/30 border border-slate-100/50 dark:border-slate-800/40 rounded-2xl p-6 space-y-4">
                <h3 className="text-md uppercase font-bold text-orange-500 tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>Project Overview & Details</span>
                </h3>
                
                <div className="prose dark:prose-invert max-w-none space-y-2 select-text">
                  {activeProject.details && activeProject.details.trim() !== "" ? (
                    parseMarkdown(activeProject.details)
                  ) : (
                    <div className="text-slate-400 dark:text-slate-500 text-xs italic leading-relaxed space-y-2.5 py-4">
                      <p>No extra project development logs available for this project yet.</p>
                      <p className="text-[10px] uppercase tracking-wider not-italic text-slate-400 font-bold">
                        Tip: Open "Admin &rarr; Profile &rarr; Work Portfolio Projects" tab to edit project details using simple Markdown headers, bullet points, and description parameters.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Sidebar quick metadata cards info */}
            <div className="space-y-5 lg:sticky lg:top-4">
              {/* CTAs / Links Box */}
              {(activeProject.liveUrl || activeProject.githubUrl) && (
                <div className="bg-gradient-to-r from-orange-500/10 to-red-600/10 dark:from-orange-950/15 dark:to-red-950/10 border border-orange-200/40 dark:border-orange-900/20 rounded-2xl p-5 space-y-3.5">
                  <h4 className="text-xs font-bold uppercase text-slate-800 dark:text-slate-200 tracking-wider">
                    Project Links
                  </h4>
                  
                  <div className="flex flex-col gap-2.5">
                    {activeProject.liveUrl && (
                      <a
                        href={activeProject.liveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-all cursor-pointer font-sans scale-100 active:scale-98"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Visit Live Platform</span>
                      </a>
                    )}
                    
                    {activeProject.githubUrl && (
                      <a
                        href={activeProject.githubUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-705 dark:text-slate-100 font-semibold text-xs rounded-xl transition-all cursor-pointer font-sans"
                      >
                        <Github className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span>Source Code</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Technologies Spec Box */}
              <div className="bg-slate-50/50 dark:bg-slate-900/35 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-5 space-y-4">
                <h4 className="text-xs font-bold uppercase text-slate-800 dark:text-slate-200 tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-orange-500" />
                  <span>Tech Details</span>
                </h4>

                {techStack.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {techStack.map((tech) => (
                      <span
                        key={tech}
                        className="text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350 px-2.5 py-1 rounded-lg border border-slate-200/40 dark:border-slate-700/60"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No technologies specified for this project.</p>
                )}
              </div>

              {/* Tips block */}
              <div className="bg-slate-50/20 dark:bg-slate-950/10 border border-slate-100/30 dark:border-slate-800/20 rounded-2xl p-4 text-[10px] leading-relaxed text-slate-400 dark:text-slate-500 font-sans italic text-center">
                Detailed notes can be written using markdown syntax to design headers, bold styles, and timelines dynamically.
              </div>
            </div>
          </div>

          {/* Bottom Back Button */}
          <div className="pt-8 flex justify-center border-t border-slate-100 dark:border-slate-800/40">
            <button
              onClick={() => {
                setActiveProject(null);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-1.5 text-xs font-semibold text-orange-500 hover:text-orange-600 hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Projects List</span>
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="space-y-8">
      {/* Title with Gradient layout line */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-display font-bold text-slate-850 dark:text-slate-100 flex items-center gap-6 shrink-0">
          <span>Portfolio</span>
          <span className="h-0.5 rounded-full bg-gradient-to-r from-orange-400 to-transparent flex-grow max-w-[240px]"></span>
        </h2>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-2 md:self-end">
          {filters.map((filter) => (
            <button
              id={`filter-btn-${filter.replace(/\s+/g, '-').toLowerCase()}`}
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`py-1.5 px-3.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                selectedFilter === filter
                  ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-xs scale-102 font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Grid view of projects */}
      <motion.div
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6"
      >
        <AnimatePresence mode="popLayout">
          {filteredProjects.map((project: ProjectItem) => (
            <motion.div
              layout
              id={`project-${project.title.replace(/\s+/g, '-').toLowerCase()}`}
              key={project.title}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              onClick={() => setActiveProject(project)}
              className="group overflow-hidden rounded-2xl bg-[#fdf2e9]/25 dark:bg-slate-800/10 border border-[#fae5d3]/50 dark:border-slate-800/20 shadow-xs flex flex-col hover:shadow-md transition-all hover:translate-y-[-2px] duration-300 cursor-pointer"
            >
              {/* Cover Image Container */}
              <div className="aspect-[16/10] overflow-hidden bg-slate-100 dark:bg-slate-800 relative">
                <img
                  src={getProjectImage(project) || null}
                  alt={project.title}
                  className="w-full h-full object-cover group-hover:scale-106 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                
                {/* Visual Category overlay tag */}
                <div className="absolute top-3 left-3 bg-white/95 dark:bg-slate-900/95 shadow-sm px-3 py-1 rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider backdrop-blur-xs">
                  {project.category}
                </div>
              </div>

              {/* Card Meta Content */}
              <div className="p-5 flex-1 flex flex-col justify-between bg-white dark:bg-slate-900/40">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {project.category}
                  </span>
                  <h3 className="text-lg font-display font-semibold text-slate-800 dark:text-slate-100 mt-1 line-clamp-2 leading-tight">
                    {project.title}
                  </h3>
                  {project.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2 font-sans leading-relaxed">
                      {project.description || ""}
                    </p>
                  )}
                </div>
                
                <div className="mt-4 flex items-center justify-between text-xs text-orange-500 dark:text-orange-400 font-semibold group-hover:underline pt-2 border-t border-slate-50 dark:border-slate-800/30">
                  <span>View Project Details</span>
                  <span>&rarr;</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Safe Empty state */}
      {filteredProjects.length === 0 && (
        <div className="text-center py-20 text-slate-400">
          No projects available matching this filter.
        </div>
      )}
    </div>
  );
}
