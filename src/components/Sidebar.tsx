/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Phone, Mail, MapPin, Download, Facebook, Linkedin, Twitter, Github, Check } from 'lucide-react';
import { useProfile } from '../profileContext';
import React, { useState, useEffect } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

export default function Sidebar() {
  const { profile, loading } = useProfile();
  const { profileName, profileTitle, profileAvatar, socialLinks, contactInfo } = profile;
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [hasResume, setHasResume] = useState<boolean>(false);

  // Check if a live resume exists in Firestore and subscribe to its presence
  useEffect(() => {
    const docRef = doc(db, 'resumes', 'latest');
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists() && docSnap.data().content) {
          setHasResume(true);
        } else {
          setHasResume(false);
        }
      },
      (err) => {
        console.error('Failed to listen to resume presence:', err);
        try {
          handleFirestoreError(err, OperationType.GET, 'resumes/latest');
        } catch (logErr) {
          console.error(logErr);
        }
        setHasResume(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Social media icon resolver
  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'facebook':
        return <Facebook className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'linkedin':
        return <Linkedin className="w-5 h-5 text-blue-700 dark:text-blue-400" />;
      case 'twitter':
        return <Twitter className="w-5 h-5 text-sky-500 dark:text-sky-400" />;
      case 'github':
        return <Github className="w-5 h-5 text-slate-800 dark:text-slate-300" />;
      default:
        return null;
    }
  };

  // Safe client-side resume downloader integrated with Firestore
  const handleDownloadResume = async () => {
    if (!hasResume) return;
    setDownloading(true);
    try {
      // Fetch latest CV from database collection
      const docRef = doc(db, 'resumes', 'latest');
      const docSnap = await getDoc(docRef);

      let resumeName = `Resume_${profileName.replace(/\s+/g, '_')}.pdf`;
      let resumeContent = '';

      if (docSnap.exists()) {
        const data = docSnap.data();
        resumeName = data.fileName || resumeName;
        resumeContent = data.content || '';
      }

      let url = '';
      let blob: Blob | null = null;

      if (resumeContent && resumeContent.startsWith('data:')) {
        // Base64 file (e.g., PDF)
        const response = await fetch(resumeContent);
        blob = await response.blob();
        url = URL.createObjectURL(blob);
      } else if (resumeContent) {
        // Standard text file
        blob = new Blob([resumeContent], { type: 'text/plain;charset=utf-8' });
        url = URL.createObjectURL(blob);
      } else {
        // Safe offline fallback
        const fallbackText = `
=========================================
${profileName.toUpperCase()}
${profileTitle} Portfolio Resume
=========================================
Email: ${contactInfo.email}
Phone: ${contactInfo.phone.join(' / ')}
Location: ${contactInfo.location}

-----------------------------------------
PROFESSIONAL SUMMARY
-----------------------------------------
Passionated and versatile Developer.
`;
        blob = new Blob([fallbackText], { type: 'text/plain;charset=utf-8' });
        url = URL.createObjectURL(blob);
        resumeName = `Resume_${profileName.replace(/\s+/g, '_')}.txt`;
      }

      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', resumeName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 3000);
    } catch (err) {
      console.error('Download failed', err);
      try {
        handleFirestoreError(err, OperationType.GET, 'resumes/latest');
      } catch (logErr) {
        console.error(logErr);
      }
    } finally {
      setDownloading(false);
    }
  };

  if (loading) {
    return (
      <aside className="w-full lg:w-96 lg:sticky lg:top-12 shrink-0 flex flex-col items-center">
        <div className="w-full border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-[32px] shadow-sm p-6 flex flex-col items-center mt-12 relative animate-pulse">
          {/* Pulsing Avatar Frame */}
          <div className="absolute -top-16 w-32 h-32 md:w-36 md:h-36 rounded-3xl p-1.5 bg-amber-200 dark:bg-amber-800/25 flex items-center justify-center">
            <div className="w-full h-full rounded-2xl bg-slate-200 dark:bg-slate-800"></div>
          </div>
          
          {/* Pulsing Name and Title */}
          <div className="mt-20 md:mt-24 text-center w-full space-y-3">
            <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-lg w-1/2 mx-auto"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded-md w-2/3 mx-auto"></div>
          </div>

          {/* Social Icons row */}
          <div className="flex gap-3 justify-center items-center mt-6 w-full">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="w-11 h-11 rounded-1.5xl bg-slate-100 dark:bg-slate-800/55"></div>
            ))}
          </div>

          {/* Details list skeleton */}
          <div className="w-full bg-[#f3f6f9]/50 dark:bg-slate-800/30 rounded-2xl p-5 mt-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-800 shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
                </div>
              </div>
            ))}
          </div>

          <div className="w-full h-12 rounded-2xl bg-slate-200 dark:bg-slate-800 mt-6"></div>
        </div>
      </aside>
    );
  }

  // Filter out social links that do not have data
  const activeSocialLinks = socialLinks.filter((link) => link.url && link.url.trim() !== '');

  return (
    <aside className="w-full lg:w-96 lg:sticky lg:top-12 shrink-0 flex flex-col items-center">
      {/* Container Card */}
      <div className="w-full border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-[32px] shadow-sm p-6 flex flex-col items-center mt-12 relative">
        
        {/* Profile Avatar with Yellow Gold Overlay Frame */}
        <div className="absolute -top-16 w-32 h-32 md:w-36 md:h-36 rounded-3xl overflow-hidden shadow-md p-1.5 bg-amber-400 flex items-center justify-center">
          {profileAvatar && profileAvatar.trim() !== "" ? (
            <img
              src={profileAvatar || null}
              alt={profileName}
              className="w-full h-full object-cover object-center rounded-2xl"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-full h-full rounded-2xl bg-gradient-to-tr from-slate-800 to-slate-950 dark:from-slate-755 dark:to-slate-900 flex flex-col items-center justify-center text-white select-none">
              <span className="text-3xl font-display font-black tracking-wider text-amber-400 drop-shadow-xs">
                {profileName.split(' ').map((n: string) => n[0]).join('') || 'VS'}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-slate-300 mt-1 font-mono">
                DEV
              </span>
            </div>
          )}
        </div>

        {/* Profile Info Space spacing */}
        <div className="mt-20 md:mt-24 text-center w-full">
          <h1 className="text-2xl md:text-3xl font-display font-semibold text-slate-800 dark:text-slate-100 tracking-tight">
            {profileName}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-sans mt-1.5 font-medium">
            {profileTitle}
          </p>
        </div>

        {/* Social Icons matching UI Design perfectly - filtered to only show those with data */}
        {activeSocialLinks.length > 0 && (
          <div className="flex gap-3 justify-center items-center mt-6 w-full">
            {activeSocialLinks.map((link) => (
              <a
                key={link.platform}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-11 h-11 rounded-1.5xl bg-[#f2f5f9] dark:bg-slate-800 flex items-center justify-center shadow-sm transition-all hover:-translate-y-1 hover:bg-slate-200 dark:hover:bg-slate-700 hover:shadow-md cursor-pointer"
                title={`${profileName}'s ${link.platform}`}
              >
                {getSocialIcon(link.platform)}
              </a>
            ))}
          </div>
        )}

        {/* Gray contact details box - dynamic blocks to remove fields or dividers when no data */}
        {((contactInfo.phone && contactInfo.phone[0]) || contactInfo.email || contactInfo.location) && (
          <div className="w-full bg-[#f3f6f9] dark:bg-slate-800/50 rounded-2xl p-5 mt-8 space-y-4 font-sans text-left">
            {(() => {
              const rows: React.ReactNode[] = [];
              
              if (contactInfo.phone && contactInfo.phone[0]) {
                rows.push(
                  <div key="phone" className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 text-orange-500 shadow-sm shrink-0">
                      <Phone className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                        Phone
                      </p>
                      <p className="text-[13px] md:text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5 break-words">
                        {contactInfo.phone[0] || 'N/A'}
                      </p>
                    </div>
                  </div>
                );
              }

              if (contactInfo.email) {
                rows.push(
                  <div key="email" className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 text-yellow-500 shadow-sm shrink-0">
                      <Mail className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                        Email
                      </p>
                      <p className="text-[13px] md:text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5 break-all">
                        {contactInfo.email}
                      </p>
                    </div>
                  </div>
                );
              }

              if (contactInfo.location) {
                rows.push(
                  <div key="location" className="flex items-start gap-4">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 text-red-500 shadow-sm shrink-0">
                      <MapPin className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                        Location
                      </p>
                      <p className="text-[13px] md:text-sm font-semibold text-slate-700 dark:text-slate-200 mt-0.5 break-words">
                        {contactInfo.location}
                      </p>
                    </div>
                  </div>
                );
              }

              return rows.reduce((acc, curr, index) => {
                if (index === 0) return [curr];
                return [
                  ...acc,
                  <hr key={`divider-${index}`} className="border-slate-200/60 dark:border-slate-800" />,
                  curr
                ];
              }, [] as React.ReactNode[]);
            })()}
          </div>
        )}

        {/* Action Button: Download Resume */}
        <button
          id="btn-download-resume"
          onClick={handleDownloadResume}
          disabled={downloading || !hasResume}
          className="w-full flex items-center justify-center gap-2 mt-6 py-3 px-5 rounded-2xl font-semibold font-sans text-sm text-white bg-gradient-to-r from-orange-500 to-red-600 shadow-md hover:from-orange-600 hover:to-red-700 select-none cursor-pointer transition-all active:scale-[0.98] disabled:from-slate-300 disabled:to-slate-400 dark:disabled:from-slate-800 dark:disabled:to-slate-700 disabled:opacity-40 disabled:cursor-not-allowed"
          title={!hasResume ? 'No resume file uploaded yet' : 'Download CV'}
        >
          {downloaded ? (
            <>
              <Check className="w-4 h-4 stroke-[3]" />
              Resume Saved!
            </>
          ) : downloading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Downloading...
            </>
          ) : (
            <>
              <Download className="w-4 h-4 stroke-[2.5]" />
              {hasResume ? 'Download Resume' : 'No Resume Available'}
            </>
          )}
        </button>

      </div>
    </aside>
  );
}
