/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { BlogPost } from '../types';
import { useProfile } from '../profileContext';
import { Calendar, Clock, BookOpen, ChevronLeft, Search, Tag, MessageSquare, Newspaper, AlertCircle } from 'lucide-react';

export default function BlogTab() {
  const { profile } = useProfile();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBlog, setSelectedBlog] = useState<BlogPost | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Sync published blogs
  useEffect(() => {
    const blogsRef = collection(db, 'blogs');
    const q = query(
      blogsRef,
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveBlogs: BlogPost[] = [];
      snapshot.forEach((doc) => {
        liveBlogs.push({
          id: doc.id,
          ...doc.data()
        } as BlogPost);
      });
      setBlogs(liveBlogs);
      setLoading(false);
    }, (error) => {
      console.error('Failed to listen to published blogs:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const calculateReadTime = (text: string) => {
    const wordsPerMinute = 200;
    const words = text ? text.split(/\s+/).length : 0;
    const minutes = Math.ceil(words / wordsPerMinute);
    return `${minutes} min read`;
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Recently';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Find all unique tags
  const allTags = Array.from(
    new Set(blogs.flatMap((blog) => blog.tags || []))
  ).filter(Boolean);

  // Filter posts
  const filteredBlogs = blogs.filter((blog) => {
    const matchesSearch =
      blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      blog.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTag = selectedTag ? (blog.tags || []).includes(selectedTag) : true;

    return matchesSearch && matchesTag;
  });

  // Custom formatted renderer to mimic markdown without introducing fat libraries
  const renderBlogContent = (text: string) => {
    if (!text) return null;
    const lines = text.split('\n');
    let codeBlockActive = false;
    let codeLines: string[] = [];

    return lines.map((line, idx) => {
      // Code snippet toggle
      if (line.trim().startsWith('```')) {
        if (codeBlockActive) {
          codeBlockActive = false;
          const content = codeLines.join('\n');
          codeLines = [];
          return (
            <pre key={`code-${idx}`} className="my-5 p-4 rounded-xl bg-slate-900 text-slate-100 dark:bg-slate-950 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
              <code>{content}</code>
            </pre>
          );
        } else {
          codeBlockActive = true;
          return null;
        }
      }

      if (codeBlockActive) {
        codeLines.push(line);
        return null;
      }

      // Headings
      if (line.trim().startsWith('###')) {
        return (
          <h4 key={idx} className="text-sm md:text-base font-bold text-slate-800 dark:text-slate-100 font-display mt-6 mb-3">
            {line.replace('###', '').trim()}
          </h4>
        );
      }
      if (line.trim().startsWith('##')) {
        return (
          <h3 key={idx} className="text-base md:text-lg font-extrabold text-slate-800 dark:text-slate-100 font-display mt-8 mb-4 border-b border-slate-100 dark:border-slate-800 pb-1 pb-1">
            {line.replace('##', '').trim()}
          </h3>
        );
      }
      if (line.trim().startsWith('#')) {
        return (
          <h2 key={idx} className="text-lg md:text-xl font-black text-slate-900 dark:text-slate-50 font-display mt-8 mb-4">
            {line.replace('#', '').trim()}
          </h2>
        );
      }

      // List points
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        const cleaned = line.replace(/^[-*]\s+/, '');
        return (
          <ul key={idx} className="list-disc pl-5 my-2 space-y-1 text-slate-600 dark:text-slate-300 font-sans text-xs md:text-sm">
            <li>{cleaned}</li>
          </ul>
        );
      }

      // Empty space
      if (line.trim() === '') {
        return <div key={idx} className="h-3" />;
      }

      // Standard paragraphs
      return (
        <p key={idx} className="text-xs md:text-sm leading-relaxed text-slate-600 dark:text-slate-350 font-sans mb-4">
          {line}
        </p>
      );
    });
  };

  // Check if blog is completely disabled/offline
  if (!profile.blogEnabled) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="p-4 rounded-full bg-orange-50 dark:bg-orange-950/20 text-orange-500">
          <AlertCircle className="w-12 h-12" />
        </div>
        <div>
          <h3 className="text-xl font-bold font-display text-slate-800 dark:text-slate-100">
            Blog is Currently Offline
          </h3>
          <p className="text-xs text-slate-500 max-w-md mt-1">
            The owner has temporarily disabled this view. Come back later to catch recent technical posts and tutorials.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 select-none text-left">
      <AnimatePresence mode="wait">
        {!selectedBlog ? (
          <motion.div
            key="list-view"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-6"
          >
            {/* Header section with profile detail syncing */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-150/50 dark:border-slate-800/80 pb-6">
              <div className="space-y-1.5 flex-1 pr-6">
                <h2 className="text-2xl md:text-3xl font-black font-display text-slate-800 dark:text-slate-100 tracking-tight">
                  {profile.blogTitle || 'Tech Writings'}
                </h2>
                <p className="text-xs text-slate-500 leading-relaxed font-sans max-w-2xl">
                  {profile.blogDescription || 'A clean catalog of written ideas, concepts, and technical summaries.'}
                </p>
              </div>

              {/* Quick statistics badge */}
              <div className="flex items-center gap-2.5 px-4.5 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 shrink-0 self-start md:self-auto">
                <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-950/30 text-orange-500">
                  <Newspaper className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[11px] font-medium text-slate-400">Total Posts</div>
                  <div className="text-xs font-extrabold text-slate-700 dark:text-slate-200 font-mono">
                    {blogs.length} published
                  </div>
                </div>
              </div>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Query articles by title, tags or content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-orange-500/80 transition-colors"
                />
              </div>

              {/* Tag Filters list */}
              {allTags.length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 max-w-full md:max-w-xs scrollbar-none shrink-0">
                  <button
                    onClick={() => setSelectedTag(null)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                      !selectedTag
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800'
                    }`}
                  >
                    All Tags
                  </button>
                  {allTags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                        tag === selectedTag
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800'
                      }`}
                    >
                      <Tag className="w-3 h-3 text-orange-400" />
                      <span>{tag}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Blogs List block */}
            {loading ? (
              <div className="py-24 text-center space-y-3">
                <div className="inline-block w-8 h-8 rounded-full border-4 border-slate-200 dark:border-slate-800 border-t-orange-500 animate-spin" />
                <p className="text-xs text-slate-400 font-mono">Digging up logs from database...</p>
              </div>
            ) : filteredBlogs.length === 0 ? (
              <div className="py-24 text-center border border-dashed border-slate-200 dark:border-slate-800/60 rounded-[32px] space-y-3">
                <div className="inline-flex p-3 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400">
                  <BookOpen className="w-8 h-8 stroke-[1.5]" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 font-display">No articles found</p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    We couldn't find any articles matching your filters. Try search keywords or stay tuned for updates.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
                {filteredBlogs.map((blog) => (
                  <motion.article
                    key={blog.id}
                    onClick={() => setSelectedBlog(blog)}
                    className="group relative flex flex-col justify-between p-5 md:p-6 rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs hover:shadow-md hover:border-orange-500/40 cursor-pointer transition-all duration-300"
                    whileHover={{ y: -3 }}
                  >
                    <div className="space-y-4">
                      {/* Cover Photo / Default header graphic */}
                      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/60 dark:to-slate-800 border border-slate-100 dark:border-slate-800 shadow-inner shrink-0 flex items-center justify-center">
                        {blog.coverImage ? (
                          <img
                            src={blog.coverImage}
                            alt={blog.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 duration-500"
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-tr from-orange-400/10 to-red-600/10 dark:from-orange-500/5 dark:to-red-600/5 flex items-center justify-center">
                            <Newspaper className="w-10 h-10 stroke-[1.2] text-orange-500/45 dark:text-orange-500/30 group-hover:rotate-6 transition-all duration-500" />
                          </div>
                        )}

                        {/* Relative Category Badge */}
                        {blog.tags && blog.tags.length > 0 && (
                          <span className="absolute top-3 left-3 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-wider bg-orange-500 text-white shadow-xs select-none">
                            {blog.tags[0]}
                          </span>
                        )}
                      </div>

                      {/* Content Info block */}
                      <div className="space-y-2 text-left">
                        {/* Dates + Read time row */}
                        <div className="flex items-center gap-3 text-[10px] text-slate-400 font-medium font-mono">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {formatDate(blog.createdAt)}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {calculateReadTime(blog.content)}
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="text-sm md:text-base font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-orange-500 transition-colors font-display line-clamp-2 leading-snug">
                          {blog.title}
                        </h4>

                        {/* Excerpt */}
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-sans line-clamp-3 leading-relaxed">
                          {blog.excerpt || 'Read the full writeup detailing standard web designs, pipelines and architectural outcomes.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/50 pt-4 mt-5">
                      {/* Secondary Tags List snippet */}
                      <div className="flex gap-1.5 overflow-hidden max-w-[70%]">
                        {blog.tags && blog.tags.slice(1, 3).map((tg) => (
                          <span key={tg} className="text-[9px] text-slate-400 dark:text-slate-500 font-mono truncate">
                            #{tg}
                          </span>
                        ))}
                      </div>

                      <span className="text-[10px] font-bold text-orange-500 group-hover:translate-x-1 duration-200 block shrink-0">
                        Read Story &rarr;
                      </span>
                    </div>
                  </motion.article>
                ))}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="article-view"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 10 }}
            className="space-y-6 max-w-3xl mx-auto"
          >
            {/* Back Button */}
            <button
              onClick={() => setSelectedBlog(null)}
              className="group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-orange-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer border border-slate-200 dark:border-slate-800/80 mr-auto self-start"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Articles</span>
            </button>

            {/* Hero Cover Graphic */}
            <div className="relative aspect-video w-full rounded-3xl overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900/60 dark:to-slate-800 border border-slate-200 dark:border-slate-800 shadow-md flex items-center justify-center">
              {selectedBlog.coverImage ? (
                <img
                  src={selectedBlog.coverImage}
                  alt={selectedBlog.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-tr from-orange-400/10 to-red-650/10 dark:from-orange-500/10 dark:to-red-600/5 flex items-center justify-center">
                  <Newspaper className="w-16 h-16 stroke-[1] text-orange-500/40" />
                </div>
              )}
            </div>

            {/* Meta Row */}
            <div className="flex flex-wrap items-center gap-3 border-b border-slate-150/50 dark:border-slate-800/60 pb-5">
              <span className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {formatDate(selectedBlog.createdAt)}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {calculateReadTime(selectedBlog.content)}
              </span>

              {/* Tags inside the meta */}
              {selectedBlog.tags && selectedBlog.tags.length > 0 && (
                <div className="flex gap-2 ml-auto items-center">
                  <Tag className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <div className="flex flex-wrap gap-1">
                    {selectedBlog.tags.map((tag) => (
                      <span key={tag} className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-350">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Heading Context */}
            <div className="space-y-3">
              <h1 className="text-xl md:text-3xl font-black font-display text-slate-800 dark:text-slate-50 tracking-tight leading-tight">
                {selectedBlog.title}
              </h1>
            </div>

            {/* Custom parsed Markdown body */}
            <div className="prose dark:prose-invert max-w-none pt-4 pb-12 line-clamp-none">
              {renderBlogContent(selectedBlog.content)}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
