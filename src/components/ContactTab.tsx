/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Phone, Send, CheckCircle2, AlertTriangle, MessageSquare } from 'lucide-react';
import { useProfile } from '../profileContext';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

interface Submission {
  id: string;
  name: string;
  email: string;
  message: string;
  timestamp: string;
}

export default function ContactTab() {
  const { profile } = useProfile();
  const { contactInfo } = profile;
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Contact form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const { name, email, message } = formData;

    if (!name.trim()) {
      setErrorMsg('Please state your name.');
      return;
    }

    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (!message.trim() || message.length < 5) {
      setErrorMsg('Please include a detailed message (at least 5 characters).');
      return;
    }

    const generateUUID = () => {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
      return 'id-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);
    };

    const submissionId = generateUUID();

    try {
      const contactDocRef = doc(db, 'contacts', submissionId);
      await setDoc(contactDocRef, {
        id: submissionId,
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
        createdAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Contact form submission direct write failed: ', err);
      let descriptiveText = 'Failed to send message: ';
      if (err instanceof Error) {
        descriptiveText += err.message;
      } else {
        descriptiveText += String(err);
      }
      
      try {
        handleFirestoreError(err, OperationType.WRITE, `contacts/${submissionId}`);
      } catch (logErr) {
        // Log the JSON parsed error but swallow raw throw so it doesn't crash the UI thread
        console.error(logErr);
      }
      setErrorMsg(descriptiveText);
      return;
    }

    // Capture the submission locally
    const newSubmission: Submission = {
      id: submissionId,
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      timestamp: new Date().toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    setSubmissions([newSubmission, ...submissions]);
    setSubmitted(true);
    setFormData({ name: '', email: '', message: '' });

    // Auto-reset success message after 4s
    setTimeout(() => {
      setSubmitted(false);
    }, 4000);
  };

  return (
    <div className="space-y-10">
      {/* Title with Gradient layout line */}
      <h2 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100 flex items-center gap-6">
        <span>{profile.contactTitle || 'Contact'}</span>
        <span className="h-0.5 rounded-full bg-gradient-to-r from-orange-400 to-transparent flex-grow max-w-[240px]"></span>
      </h2>

      {/* Quick Contact Info Cards matching Image 1 styling */}
      {((contactInfo.phone && contactInfo.phone[0]) || contactInfo.email) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Phone Card (Pastel Orange) */}
          {contactInfo.phone && contactInfo.phone[0] && (
            <div className="flex gap-4 p-5 rounded-2xl bg-[#fff5ee] dark:bg-orange-950/10 border border-orange-100/60 dark:border-orange-900/10 shadow-xs">
              <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/30 text-orange-500 shrink-0">
                <Phone className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider font-sans">
                  Phone:
                </h4>
                <p className="text-sm md:text-[15px] font-semibold text-slate-700 dark:text-slate-300">
                  {contactInfo.phone[0]}
                </p>
              </div>
            </div>
          )}

          {/* Email Card (Pastel Blue) */}
          {contactInfo.email && (
            <div className="flex gap-4 p-5 rounded-2xl bg-[#f4f8fc] dark:bg-blue-950/10 border border-blue-100/60 dark:border-blue-900/10 shadow-xs">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-sky-500 shrink-0">
                <Mail className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider font-sans">
                  Email:
                </h4>
                <p className="text-sm md:text-[15px] font-semibold text-slate-700 dark:text-slate-300 break-all">
                  {contactInfo.email}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Dynamic Contact Form Box */}
      <div className="p-6 md:p-8 rounded-[24px] bg-[#f8fafc] dark:bg-slate-800/35 border border-slate-200/40 dark:border-slate-800/40 shadow-xs space-y-6">
        
        {/* Caption */}
        <p className="text-slate-600 dark:text-slate-300 text-[14px] md:text-[15px] leading-6 font-sans whitespace-pre-wrap">
          {profile.contactDescription || 'I am always open to discussing new projects, opportunities in tech world, partnerships and more so mentorship.'}
        </p>

        {/* Dynamic Alerts */}
        <AnimatePresence mode="popLayout">
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-950/15 border border-amber-200/50 dark:border-amber-900/30 rounded-xl text-amber-800 dark:text-amber-300 text-sm"
            >
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {submitted && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-950/15 border border-emerald-200/50 dark:border-emerald-900/30 rounded-xl text-emerald-800 dark:text-emerald-300 text-sm"
            >
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>Message sent successfully! Thank you for reaching out.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Inputs styled exactly like original screenshots */}
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Name Field */}
          <div className="flex flex-col space-y-2">
            <label htmlFor="input-name" className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-sans">
              Name:
            </label>
            <input
              id="input-name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 py-2.5 focus:border-orange-500 dark:focus:border-orange-400 outline-none text-slate-800 dark:text-slate-100 font-sans text-[15px] transition-colors"
              placeholder="Your name"
            />
          </div>

          {/* Email Field */}
          <div className="flex flex-col space-y-2">
            <label htmlFor="input-email" className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-sans">
              Email:
            </label>
            <input
              id="input-email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 py-2.5 focus:border-orange-500 dark:focus:border-orange-400 outline-none text-slate-800 dark:text-slate-100 font-sans text-[15px] transition-colors"
              placeholder="Your email address"
            />
          </div>

          {/* Message Field */}
          <div className="flex flex-col space-y-2">
            <label htmlFor="input-message" className="text-sm font-semibold text-slate-700 dark:text-slate-300 font-sans">
              Message:
            </label>
            <textarea
              id="input-message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={3}
              className="w-full bg-transparent border-b border-slate-200 dark:border-slate-800 py-2.5 focus:border-orange-500 dark:focus:border-orange-400 outline-none text-slate-800 dark:text-slate-100 font-sans text-[15px] transition-colors resize-none"
              placeholder="How can I help you?"
            />
          </div>

          {/* Action Row */}
          <div className="pt-2 flex justify-start">
            <button
              id="btn-submit-contact"
              type="submit"
              className="px-6 py-2.5 rounded-xl border border-orange-500 hover:bg-orange-500 dark:hover:bg-orange-600 hover:text-white text-orange-500 font-sans font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer flex items-center gap-2"
            >
              <Send className="w-4 h-4 stroke-[2.2]" />
              Submit
            </button>
          </div>

        </form>
      </div>

      {/* Local message submissions view (Interactive visual reward for preview test) */}
      {submissions.length > 0 && (
        <div className="mt-8 p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Inbox Simulator (Received Messages: {submissions.length})
          </h4>
          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="p-3 bg-white dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800 shadow-3xs text-xs font-sans space-y-1.5"
              >
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {sub.name} &lt;{sub.email}&gt;
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">{sub.timestamp}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 line-clamp-2">{sub.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
