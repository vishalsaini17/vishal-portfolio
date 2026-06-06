/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Sun, Moon, Home, FileText, Briefcase, Mail, Shield, BookOpen } from 'lucide-react';
import { TabType } from '../types';
import { useProfile } from '../profileContext';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  darkMode: boolean;
  setDarkMode: (dark: boolean) => void;
  isAdminLoggedIn?: boolean;
}

export default function Header({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  isAdminLoggedIn,
}: HeaderProps) {
  const { profile } = useProfile();
  const nameParts = profile.profileName.split(' ');
  const firstName = nameParts[0] || '';
  const lastName = nameParts.slice(1).join(' ') || '';

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'resume', label: 'Resume', icon: FileText },
    { id: 'work', label: 'Work', icon: Briefcase },
    { id: 'contact', label: 'Contact', icon: Mail },
    ...(profile.blogEnabled ? [{ id: 'blog' as const, label: 'Blog', icon: BookOpen }] : []),
    ...(isAdminLoggedIn ? [{ id: 'admin' as const, label: 'Admin', icon: Shield }] : []),
  ];

  return (
    <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 w-full max-w-7xl mx-auto px-4 pt-6 md:pt-8 select-none">
      {/* Brand logo with styled fonts */}
      <div className="flex items-center justify-between w-full md:w-auto">
        <div className="text-2xl font-display font-bold flex items-center tracking-tight transition-colors duration-200 text-slate-800 dark:text-slate-100">
          {firstName} &nbsp;<span className="text-orange-500 font-extrabold italic">{lastName}</span>
        </div>

        {/* Theme Toggle - Mobile Only (shows next to logo on smaller views) */}
        <button
          id="theme-toggle-mobile"
          onClick={() => setDarkMode(!darkMode)}
          className="flex md:hidden items-center justify-center p-2.5 rounded-full ring-1 ring-slate-200/50 dark:ring-slate-800/80 bg-white/95 dark:bg-slate-900/90 shadow-sm text-slate-700 dark:text-slate-300 transition-all hover:scale-105 active:scale-95"
          aria-label="Toggle light/dark theme"
        >
          {darkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>

      {/* Floating navigation pill and theme toggle */}
      <div className="flex items-center gap-4 self-center md:self-auto w-full md:w-auto justify-end">
        {/* Navigation block */}
        <div className="w-full md:w-auto overflow-x-auto ring-1 ring-slate-200/50 dark:ring-slate-800/80 bg-white/90 dark:bg-slate-900/90 rounded-2xl p-2 shadow-sm">
          <nav className="flex justify-between md:justify-start gap-1 md:gap-2 min-w-[280px]">
            {tabs.map((tab) => {
              const IconComponent = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  id={`nav-tab-${tab.id}`}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex flex-col items-center justify-center py-2.5 px-3 md:px-5 min-w-[64px] md:min-w-[80px] rounded-xl text-[11px] md:text-xs font-medium font-sans transition-all duration-300 focus:outline-none cursor-pointer ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/55 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {/* Glowing background for active state using motion layoutId */}
                  {isActive && (
                    <motion.div
                      layoutId="activeTabGlow"
                      className="absolute inset-0 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl shadow-md cursor-pointer"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}

                  {/* Icon and label container */}
                  <span className="relative z-10 flex flex-col items-center gap-1">
                    <IconComponent className={`w-4 h-4 md:w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'}`} />
                    <span>{tab.label}</span>
                  </span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Theme Toggle - Desktop Only */}
        <button
          id="theme-toggle-desktop"
          onClick={() => setDarkMode(!darkMode)}
          className="hidden md:flex items-center justify-center w-12 h-12 rounded-full ring-1 ring-slate-200/50 dark:ring-slate-800/80 bg-white/90 dark:bg-slate-900/90 shadow-sm text-slate-700 dark:text-slate-300 transition-all hover:scale-105 active:scale-95 cursor-pointer"
          aria-label="Toggle theme"
        >
          {darkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
}
