/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { TabType } from './types';
import { useProfile } from './profileContext';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';

// Importing Custom Sub-components
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import HomeTab from './components/HomeTab';
import ResumeTab from './components/ResumeTab';
import WorkTab from './components/WorkTab';
import ContactTab from './components/ContactTab';
import BlogTab from './components/BlogTab';
import AdminTab from './components/AdminTab';

export default function App() {
  const { profile } = useProfile();
  const location = useLocation();
  const navigate = useNavigate();

  // Helper to match paths to TabType
  const getActiveTab = (pathname: string): TabType => {
    switch (pathname) {
      case '/resume':
        return 'resume';
      case '/work':
        return 'work';
      case '/contact':
        return 'contact';
      case '/blog':
        return 'blog';
      case '/admin':
        return 'admin';
      case '/':
      default:
        return 'home';
    }
  };

  const activeTab = getActiveTab(location.pathname);

  // Redirect if Blog is disabled but activeTab is 'blog'
  useEffect(() => {
    if (activeTab === 'blog' && !profile.blogEnabled) {
      setActiveTab('home');
    }
  }, [activeTab, profile.blogEnabled]);

  const setActiveTab = (tab: TabType) => {
    const path = tab === 'home' ? '/' : `/${tab}`;
    navigate(path);
  };

  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);

  // Sync Auth State to dynamically adjust Navigation Tabs list
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setIsAdminLoggedIn(!!currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Sync dark mode class onto document root
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Helper to render the active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return <HomeTab />;
      case 'resume':
        return <ResumeTab />;
      case 'work':
        return <WorkTab />;
      case 'contact':
        return <ContactTab />;
      case 'blog':
        return <BlogTab />;
      case 'admin':
        return <AdminTab />;
      default:
        return <HomeTab />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f6f9] dark:bg-[#0b101d] text-slate-800 dark:text-slate-100 flex flex-col transition-all duration-500 overflow-x-clip font-sans pb-16">
      
      {/* Dynamic Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        isAdminLoggedIn={isAdminLoggedIn}
      />

      {/* Main Core Layout Grid */}
      <main className="w-full max-w-7xl mx-auto px-4 md:px-6 flex flex-col lg:flex-row gap-8 items-start mt-6 md:mt-8 flex-1">
        
        {/* Left Profile Sidebar */}
        <Sidebar />

        {/* Right Active Workspace Block */}
        <section className="w-full flex-1 min-w-0">
          <div className="w-full border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-[32px] p-6 md:p-8 lg:p-10 shadow-xs relative mt-0 lg:mt-12 min-h-[500px]">
            
            {/* Smooth Animated Tab switcher */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="w-full"
              >
                {renderTabContent()}
              </motion.div>
            </AnimatePresence>

          </div>

          {/* Simple Subtle Footer inside layout boundaries to keep margins clean */}
          <footer className="mt-8 text-center text-xs text-slate-400 dark:text-slate-600 font-sans tracking-wide">
            &copy; 2026 {profile.profileName}. All Rights Reserved. FullStack Portfolio Engine.
          </footer>
        </section>

      </main>

    </div>
  );
}
