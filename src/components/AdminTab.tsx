/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogIn, LogOut, Mail, Trash2, Calendar, FileText, Upload, CheckCircle2, 
  AlertTriangle, Shield, User, Plus, Image, ExternalLink, RefreshCw, Home, Phone, Layers,
  ArrowUp, ArrowDown, Search, Download, BookOpen, Sparkles, Send, Tag, Save
} from 'lucide-react';
import { 
  auth, db, GoogleAuthProvider, signInWithPopup, signOut, handleFirestoreError, OperationType 
} from '../firebase';
import { 
  onAuthStateChanged, User as FirebaseUser 
} from 'firebase/auth';
import { 
  collection, query, orderBy, onSnapshot, deleteDoc, doc, getDoc, setDoc, serverTimestamp 
} from 'firebase/firestore';
import { useProfile, ProfileDetails } from '../profileContext';
import { ServiceCard, EducationItem, ExperienceItem, ProjectItem, SocialLink, HomeSection, HomeSectionCard, ResumeSection, ResumeSectionCard } from '../types';
import MarkdownEditor from './MarkdownEditor';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: any;
}

interface ActiveResume {
  fileName: string;
  size: number;
  updatedAt: string | null;
}

const AUTHORIZED_ADMIN_EMAIL = 'vishalsaini154@gmail.com';

const maskEmail = (email: string | null | undefined): string => {
  if (!email) return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [local, domain] = parts;
  if (local.length <= 3) {
    return local[0] + 'x'.repeat(local.length - 1) + '@' + domain;
  }
  const first = local[0];
  const last = local[local.length - 1];
  const middle = 'x'.repeat(local.length - 2);
  return `${first}${middle}${last}@${domain}`;
};

const compressAndResizeImage = (file: File, maxDim: number = 800, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = document.createElement('img');
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => {
        reject(new Error('Failed to load image for compression'));
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    reader.readAsDataURL(file);
  });
};

interface SkillsTextInputProps {
  cards: any[];
  onChange: (updatedCards: any[]) => void;
}

const SkillsTextInput: React.FC<SkillsTextInputProps> = ({ cards, onChange }) => {
  const [text, setText] = useState(() => cards?.map((c) => c.title).join(', ') || '');

  useEffect(() => {
    const currentJoined = cards?.map((c) => c.title).join(', ') || '';
    const parsedTextTags = text.split(',').map((t) => t.trim()).filter(Boolean);
    const parsedCardTags = cards?.map((c) => c.title.trim()) || [];
    if (JSON.stringify(parsedTextTags) !== JSON.stringify(parsedCardTags)) {
      setText(currentJoined);
    }
  }, [cards]);

  const handleChange = (val: string) => {
    setText(val);
    const tags = val.split(',').map((t) => t.trim()).filter(Boolean);
    const updatedCards = tags.map((t, idx) => ({
      id: `skill-tag-${idx}-${Date.now()}`,
      title: t
    }));
    onChange(updatedCards);
  };

  return (
    <textarea
      rows={4}
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      placeholder="e.g. NEXT.js, React.js, HTML 5, CSS 3"
      className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-xs font-sans outline-none focus:border-orange-400 font-medium leading-relaxed resize-none bg-slate-50/10"
    />
  );
};

export default function AdminTab() {
  const navigate = useNavigate();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Custom Admin sub-tabs
  const [adminActiveTab, setAdminActiveTab] = useState<'profile' | 'inbox' | 'resume' | 'blog'>('inbox');
  const [profileSubTab, setProfileSubTab] = useState<'common' | 'home' | 'resume' | 'work' | 'contact' | 'blog'>('common');

  // Blog writing / manager state
  const [allBlogs, setAllBlogs] = useState<any[]>([]);
  const [blogsLoading, setBlogsLoading] = useState(false);
  const [blogToDelete, setBlogToDelete] = useState<any | null>(null);
  const [editingBlog, setEditingBlog] = useState<any | null>(null); // null means list view, non-null means editor view
  const [isNewBlog, setIsNewBlog] = useState(false);
  const [blogSaveStatus, setBlogSaveStatus] = useState<{ success?: boolean; error?: string; loading?: boolean }>({});

  // Contact inbox state
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  // Resume state
  const [activeResume, setActiveResume] = useState<ActiveResume | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{ success?: boolean; error?: string; loading?: boolean }>({});
  const [downloadingActive, setDownloadingActive] = useState(false);
  const [deletingActive, setDeletingActive] = useState(false);
  const [showResumeDeleteConfirm, setShowResumeDeleteConfirm] = useState(false);

  // Profile Form state
  const { profile, saveProfile } = useProfile();
  const [profileForm, setProfileForm] = useState<ProfileDetails | null>(null);
  const [profileSaveStatus, setProfileSaveStatus] = useState<{ success?: boolean; error?: string; loading?: boolean }>({});
  const [projectSearchQuery, setProjectSearchQuery] = useState('');

  // Sync Auth State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Map global context profile to local form state on load
  useEffect(() => {
    if (profile) {
      setProfileForm(JSON.parse(JSON.stringify(profile))); // deep clone
    }
  }, [profile]);

  // Sync Live Contact Submissions
  useEffect(() => {
    if (!user || user.email !== AUTHORIZED_ADMIN_EMAIL) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);
    setMessagesError('');

    const q = query(collection(db, 'contacts'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: ContactMessage[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          fetched.push({
            id: doc.id,
            name: data.name || '',
            email: data.email || '',
            message: data.message || '',
            createdAt: data.createdAt,
          });
        });
        setMessages(fetched);
        setMessagesLoading(false);
      },
      (error) => {
        setMessagesLoading(false);
        try {
          handleFirestoreError(error, OperationType.LIST, 'contacts');
        } catch (errInfo: any) {
          setMessagesError('Unauthorized: Access denied by security rules.');
        }
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Sync Live blogs for logged-in admin
  useEffect(() => {
    if (!user || user.email !== AUTHORIZED_ADMIN_EMAIL) {
      setAllBlogs([]);
      return;
    }

    setBlogsLoading(true);
    const q = query(collection(db, 'blogs'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const fetched: any[] = [];
        snapshot.forEach((doc) => {
          fetched.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setAllBlogs(fetched);
        setBlogsLoading(false);
      },
      (error) => {
        setBlogsLoading(false);
        console.error('Failed to listen to all blogs:', error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Sync Current Resume details from DB
  useEffect(() => {
    if (!user || user.email !== AUTHORIZED_ADMIN_EMAIL) return;
    fetchCurrentResumeMeta();
  }, [user]);

  const fetchCurrentResumeMeta = async () => {
    try {
      const docRef = doc(db, 'resumes', 'latest');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const contentStr = data.content || '';
        let dateStr = '';
        if (data.updatedAt) {
          const date = data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt);
          dateStr = date.toLocaleString();
        }
        setActiveResume({
          fileName: data.fileName || 'Resume_Vishal_Saini.txt',
          size: contentStr.length,
          updatedAt: dateStr,
        });
      } else {
        setActiveResume(null);
      }
    } catch (err) {
      console.error('Failed to parse resume meta info', err);
      try {
        handleFirestoreError(err, OperationType.GET, 'resumes/latest');
      } catch (logErr) {
        console.error(logErr);
      }
    }
  };

  // Google Authentication Trigger
  const handleAdminLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error('Login error:', err);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Delete contact submission message
  const executeDeleteMessage = async () => {
    if (!deleteConfirmationId) return;
    try {
      await deleteDoc(doc(db, 'contacts', deleteConfirmationId));
      setDeleteConfirmationId(null);
    } catch (err) {
      setDeleteConfirmationId(null);
      try {
        handleFirestoreError(err, OperationType.DELETE, `contacts/${deleteConfirmationId}`);
      } catch (logErr) {
        setMessagesError('Failed to delete message. Insufficient permissions.');
      }
    }
  };

  // Drag & Drop Handlers for Resume Updates
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSetFile(files[0]);
    }
    e.target.value = '';
  };

  const validateAndSetFile = (file: File) => {
    setUploadStatus({});
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setUploadStatus({ error: 'Only PDF files (.pdf) are supported.' });
      setResumeFile(null);
      return;
    }
    if (file.size > 1048000) {
      setUploadStatus({ error: 'PDF file exceeds maximum allowable size of 1MB (Firestore document limit).' });
      setResumeFile(null);
      return;
    }
    setResumeFile(file);
  };

  const handleUploadResume = async () => {
    if (!resumeFile) return;
    setUploadStatus({ loading: true });

    const reader = new FileReader();
    reader.onload = async (e) => {
      const contentText = e.target?.result as string;
      if (!contentText) {
        setUploadStatus({ error: 'Could not read document contents.' });
        return;
      }

      try {
        const resumeDocRef = doc(db, 'resumes', 'latest');
        await setDoc(resumeDocRef, {
          id: 'latest',
          fileName: resumeFile.name,
          content: contentText,
          updatedAt: serverTimestamp(),
        });
        setUploadStatus({ success: true });
        setResumeFile(null);
        fetchCurrentResumeMeta();
      } catch (err) {
        try {
          handleFirestoreError(err, OperationType.WRITE, 'resumes/latest');
        } catch (logErr) {
          setUploadStatus({ error: 'Failed uploading resume. Secure policy restrictions.' });
        }
      }
    };

    reader.onerror = () => {
      setUploadStatus({ error: 'FileReader exception reading files.' });
    };

    reader.readAsDataURL(resumeFile);
  };

  const handleDownloadActiveCurrent = async () => {
    if (downloadingActive) return;
    setDownloadingActive(true);
    setUploadStatus({});
    try {
      const docRef = doc(db, 'resumes', 'latest');
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const resumeContent = data.content || '';
        const resumeName = data.fileName || 'Resume.pdf';

        if (!resumeContent) {
          setUploadStatus({ error: 'This CV document exists but contains no data contents.' });
          return;
        }

        let url = '';
        let blob: Blob | null = null;

        if (resumeContent.startsWith('data:')) {
          const response = await fetch(resumeContent);
          blob = await response.blob();
          url = URL.createObjectURL(blob);
        } else {
          blob = new Blob([resumeContent], { type: 'text/plain;charset=utf-8' });
          url = URL.createObjectURL(blob);
        }

        if (url) {
          const link = document.createElement('a');
          link.href = url;
          link.download = resumeName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          setUploadStatus({ success: true, error: undefined });
        }
      } else {
        setUploadStatus({ error: 'No active CV document found in database.' });
      }
    } catch (err) {
      console.error('Failed to download current resume:', err);
      setUploadStatus({ error: 'Failed accessing the database to download the CV.' });
    } finally {
      setDownloadingActive(false);
    }
  };

  const handleDeleteActiveResume = async () => {
    if (deletingActive) return;
    setDeletingActive(true);
    setUploadStatus({});
    try {
      const docRef = doc(db, 'resumes', 'latest');
      await deleteDoc(docRef);
      setActiveResume(null);
      setUploadStatus({ success: true });
    } catch (err) {
      console.error('Failed to delete resume card:', err);
      try {
        handleFirestoreError(err, OperationType.DELETE, 'resumes/latest');
      } catch (logErr) {
        setUploadStatus({ error: 'Failed to delete the active CV document from Firestore.' });
      }
    } finally {
      setDeletingActive(false);
      setShowResumeDeleteConfirm(false);
    }
  };

  // Helper selectors for Social Media lists inside Profile Form
  const getSocialValue = (platform: 'facebook' | 'linkedin' | 'twitter' | 'github'): string => {
    if (!profileForm) return '';
    const found = profileForm.socialLinks.find((s) => s.platform === platform);
    return found ? found.url : '';
  };

  const updateSocialUrl = (platform: 'facebook' | 'linkedin' | 'twitter' | 'github', url: string) => {
    if (!profileForm) return;
    const socialLinks = [...profileForm.socialLinks];
    const index = socialLinks.findIndex((s) => s.platform === platform);
    if (index >= 0) {
      socialLinks[index].url = url;
    } else {
      socialLinks.push({ platform, url });
    }
    setProfileForm({ ...profileForm, socialLinks });
  };

  // --- Dynamic Sections Control Logic ---
  const handleAddSection = () => {
    if (!profileForm) return;
    const sections = [...(profileForm.homeSections || [])];
    const newSection: HomeSection = {
      id: `section-${Date.now()}`,
      title: 'New Section',
      type: 'grid',
      cards: []
    };
    sections.push(newSection);
    setProfileForm({ ...profileForm, homeSections: sections });
  };

  const handleDeleteSection = (index: number) => {
    if (!profileForm) return;
    const sections = [...(profileForm.homeSections || [])];
    sections.splice(index, 1);
    setProfileForm({ ...profileForm, homeSections: sections });
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    if (!profileForm) return;
    const sections = [...(profileForm.homeSections || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const temp = sections[index];
    sections[index] = sections[targetIdx];
    sections[targetIdx] = temp;
    setProfileForm({ ...profileForm, homeSections: sections });
  };

  const handleUpdateSectionTitle = (index: number, title: string) => {
    if (!profileForm) return;
    const sections = JSON.parse(JSON.stringify(profileForm.homeSections || []));
    sections[index].title = title;
    setProfileForm({ ...profileForm, homeSections: sections });
  };

  const handleUpdateSectionType = (index: number, type: 'grid') => {
    if (!profileForm) return;
    const sections = JSON.parse(JSON.stringify(profileForm.homeSections || []));
    sections[index].type = type;
    setProfileForm({ ...profileForm, homeSections: sections });
  };

  const handleAddCardToSection = (sectionIdx: number) => {
    if (!profileForm) return;
    const sections = JSON.parse(JSON.stringify(profileForm.homeSections || []));
    if (!sections[sectionIdx]) return;
    
    const newCard: HomeSectionCard = {
      id: `card-${Date.now()}`,
      title: 'New Card Title',
      description: 'Provide brief description of what this card represents.',
      iconName: 'code',
      colorTheme: 'orange'
    };
    
    sections[sectionIdx].cards.push(newCard);
    setProfileForm({ ...profileForm, homeSections: sections });
  };

  const handleDeleteCardFromSection = (sectionIdx: number, cardIdx: number) => {
    if (!profileForm) return;
    const sections = JSON.parse(JSON.stringify(profileForm.homeSections || []));
    if (!sections[sectionIdx]) return;
    sections[sectionIdx].cards.splice(cardIdx, 1);
    setProfileForm({ ...profileForm, homeSections: sections });
  };

  const handleMoveCard = (sectionIdx: number, cardIdx: number, direction: 'up' | 'down') => {
    if (!profileForm) return;
    const sections = JSON.parse(JSON.stringify(profileForm.homeSections || []));
    const section = sections[sectionIdx];
    if (!section) return;
    const targetIdx = direction === 'up' ? cardIdx - 1 : cardIdx + 1;
    if (targetIdx < 0 || targetIdx >= section.cards.length) return;
    const temp = section.cards[cardIdx];
    section.cards[cardIdx] = section.cards[targetIdx];
    section.cards[targetIdx] = temp;
    setProfileForm({ ...profileForm, homeSections: sections });
  };

  const handleUpdateCardField = (sectionIdx: number, cardIdx: number, field: keyof HomeSectionCard, value: any) => {
    if (!profileForm) return;
    const sections = JSON.parse(JSON.stringify(profileForm.homeSections || []));
    if (!sections[sectionIdx]?.cards[cardIdx]) return;
    sections[sectionIdx].cards[cardIdx][field] = value;
    setProfileForm({ ...profileForm, homeSections: sections });
  };

  // --- Resume Dynamic Sections Control Logic ---
  const handleAddResumeSection = () => {
    if (!profileForm) return;
    const sections = [...(profileForm.resumeSections || [])];
    const newSection: ResumeSection = {
      id: `resume-section-${Date.now()}`,
      title: 'New Resume Section',
      iconName: '',
      width: '50%',
      type: 'cards',
      cards: [],
      isNew: true
    };
    sections.push(newSection);
    setProfileForm({ ...profileForm, resumeSections: sections });
  };

  const handleDeleteResumeSection = (index: number) => {
    if (!profileForm) return;
    const sections = [...(profileForm.resumeSections || [])];
    sections.splice(index, 1);
    setProfileForm({ ...profileForm, resumeSections: sections });
  };

  const handleMoveResumeSection = (index: number, direction: 'up' | 'down') => {
    if (!profileForm) return;
    const sections = [...(profileForm.resumeSections || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= sections.length) return;
    const temp = sections[index];
    sections[index] = sections[targetIdx];
    sections[targetIdx] = temp;
    setProfileForm({ ...profileForm, resumeSections: sections });
  };

  const handleUpdateResumeSectionField = (index: number, field: keyof ResumeSection, value: any) => {
    if (!profileForm) return;
    const sections = JSON.parse(JSON.stringify(profileForm.resumeSections || []));
    if (!sections[index]) return;
    sections[index][field] = value;

    if (field === 'type' && value === 'skills') {
      if (sections[index].isNew) {
        sections[index].cards = [];
      } else {
        if (!sections[index].cards || sections[index].cards.length === 0) {
          const prefilledSkills = [
            "NEXT.js", "React.js", "HTML 5", "CSS 3", "Tailwind CSS", "Figma", "JavaScript", "Mongo DB", "SQL", "Angular", "Android", "Git"
          ];
          sections[index].cards = prefilledSkills.map((tag, idx) => ({
            id: `skill-tag-${idx}-${Date.now()}`,
            title: tag
          }));
        }
      }
    }

    setProfileForm({ ...profileForm, resumeSections: sections });
  };

  const handleAddCardToResumeSection = (sectionIdx: number) => {
    if (!profileForm) return;
    const sections = JSON.parse(JSON.stringify(profileForm.resumeSections || []));
    if (!sections[sectionIdx]) return;
    
    if (!sections[sectionIdx].cards) {
      sections[sectionIdx].cards = [];
    }
    
    let newCard: ResumeSectionCard;
    const type = sections[sectionIdx].type;
    
    if (type === 'education') {
      newCard = {
        id: `resume-card-${Date.now()}`,
        title: 'B.Tech (Computer Science)',
        subtitle: 'University Name',
        period: '2020-2024',
        description: '',
        width: '50%'
      };
    } else if (type === 'experience') {
      newCard = {
        id: `resume-card-${Date.now()}`,
        title: 'Software Engineer',
        subtitle: 'Company Name',
        period: '2024 - Present',
        description: '',
        width: '50%'
      };
    } else {
      newCard = {
        id: `resume-card-${Date.now()}`,
        title: 'New Card / Milestone',
        description: 'Detail explaining this milestone or skill highlights.',
        iconName: 'code',
        colorTheme: 'orange',
        width: '50%'
      };
    }
    
    sections[sectionIdx].cards.push(newCard);
    setProfileForm({ ...profileForm, resumeSections: sections });
  };

  const handleDeleteCardFromResumeSection = (sectionIdx: number, cardIdx: number) => {
    if (!profileForm) return;
    const sections = JSON.parse(JSON.stringify(profileForm.resumeSections || []));
    if (!sections[sectionIdx]?.cards) return;
    sections[sectionIdx].cards.splice(cardIdx, 1);
    setProfileForm({ ...profileForm, resumeSections: sections });
  };

  const handleMoveCardInResumeSection = (sectionIdx: number, cardIdx: number, direction: 'up' | 'down') => {
    if (!profileForm) return;
    const sections = JSON.parse(JSON.stringify(profileForm.resumeSections || []));
    const section = sections[sectionIdx];
    if (!section || !section.cards) return;
    const targetIdx = direction === 'up' ? cardIdx - 1 : cardIdx + 1;
    if (targetIdx < 0 || targetIdx >= section.cards.length) return;
    const temp = section.cards[cardIdx];
    section.cards[cardIdx] = section.cards[targetIdx];
    section.cards[targetIdx] = temp;
    setProfileForm({ ...profileForm, resumeSections: sections });
  };

  const handleUpdateCardFieldInResumeSection = (sectionIdx: number, cardIdx: number, field: keyof ResumeSectionCard, value: any) => {
    if (!profileForm) return;
    const maxRetries = 10; // safeguard
    const sections = JSON.parse(JSON.stringify(profileForm.resumeSections || []));
    if (!sections[sectionIdx]?.cards?.[cardIdx]) return;
    sections[sectionIdx].cards[cardIdx][field] = value;
    setProfileForm({ ...profileForm, resumeSections: sections });
  };

  const handleSaveBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlog || !user) return;

    setBlogSaveStatus({ loading: true });
    try {
      const blogId = editingBlog.id || `blog-${Date.now()}`;
      const docRef = doc(db, 'blogs', blogId);

      const timestamp = serverTimestamp();

      const payload = {
        id: blogId,
        title: editingBlog.title || 'Untitled Post',
        excerpt: editingBlog.excerpt || '',
        content: editingBlog.content || '',
        status: editingBlog.status || 'draft',
        createdAt: isNewBlog ? timestamp : (editingBlog.createdAt || timestamp),
        updatedAt: timestamp,
        tags: editingBlog.tags || [],
        coverImage: editingBlog.coverImage || '',
      };

      await setDoc(docRef, payload);
      setBlogSaveStatus({ success: true });
      setTimeout(() => {
        setEditingBlog(null);
        setBlogSaveStatus({});
      }, 1000);
    } catch (err) {
      console.error('Failed to save blog:', err);
      try {
        handleFirestoreError(err, OperationType.WRITE, `blogs/${editingBlog?.id || 'new'}`);
      } catch (logErr: any) {
        setBlogSaveStatus({ error: 'Failed to write blog post. Verify your credentials/rules.' });
      }
    }
  };

  const handleDeleteBlog = async () => {
    if (!blogToDelete || !user) return;
    try {
      const docRef = doc(db, 'blogs', blogToDelete.id);
      await deleteDoc(docRef);
      setBlogToDelete(null);
    } catch (err) {
      console.error('Failed to delete blog:', err);
      try {
        handleFirestoreError(err, OperationType.DELETE, `blogs/${blogToDelete.id}`);
      } catch (logErr) {
        alert('Failed to delete blog post.');
      }
    }
  };

  // Save profile state to Firebase Firestore
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm) return;
    setProfileSaveStatus({ loading: true });

    try {
      await saveProfile(profileForm);
      setProfileSaveStatus({ success: true });
      setTimeout(() => setProfileSaveStatus({}), 4000);
    } catch (err) {
      console.error('Failed to update profile details', err);
      let errorText = 'Internal permission constraint error updating details.';
      if (err instanceof Error) {
        errorText = err.message;
      }
      setProfileSaveStatus({ error: errorText });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <svg className="animate-spin h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm text-slate-500 dark:text-slate-400 font-mono">Authenticating System...</span>
      </div>
    );
  }

  const isAuthorized = user && user.email === AUTHORIZED_ADMIN_EMAIL;

  return (
    <div className="space-y-8">
      {/* Dynamic Header Titles */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <h2 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
            <Shield className="w-8 h-8 text-orange-500 shrink-0" />
            <span>Admin Terminal</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
            SECURE PORTFOLIO CONTROL BOARD
          </p>
        </div>

        {isAuthorized && (
          <button
            onClick={handleAdminLogout}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold font-sans text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {!isAuthorized ? (
          <motion.div
            key="login-view"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="flex flex-col items-center justify-center text-center max-w-md mx-auto py-12 px-6 rounded-3xl bg-[#fdfaf7] dark:bg-slate-900/40 border border-orange-100/50 dark:border-slate-800/50 shadow-sm space-y-6"
          >
            <div className="p-4 rounded-2xl bg-orange-100/60 dark:bg-orange-950/20 text-orange-500">
              <Shield className="w-10 h-10 stroke-[2.2]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-display font-bold text-slate-800 dark:text-slate-100">
                Administrative Lock
              </h3>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-400 font-sans">
                Access is strictly restricted to verified owner profile: <br />
                <strong className="text-orange-600 dark:text-orange-400 font-semibold">{maskEmail(AUTHORIZED_ADMIN_EMAIL)}</strong>
              </p>
            </div>

            {user && user.email !== AUTHORIZED_ADMIN_EMAIL && (
              <div className="flex items-center gap-2 p-3.5 bg-red-50 dark:bg-red-950/15 border border-red-200/50 dark:border-red-900/20 rounded-xl text-red-800 dark:text-red-400 text-xs text-left max-w-sm">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Rogue login detected: ({maskEmail(user.email)}). Permission denied.</span>
              </div>
            )}

            <button
              id="btn-admin-login"
              onClick={handleAdminLogin}
              className="w-full flex items-center justify-center gap-2.5 py-3 px-5 rounded-2xl font-semibold font-sans text-sm text-white bg-gradient-to-r from-orange-500 to-red-600 shadow-sm hover:from-orange-600 hover:to-red-700 select-none cursor-pointer transition-all active:scale-[0.98]"
            >
              <LogIn className="w-4 h-4" />
              Sign In with Google
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="dashboard-view"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="space-y-8"
          >
            {/* Admin Badge Info */}
            <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-50 dark:bg-slate-800/30 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 text-sm">
              <div className="flex items-center gap-3 w-full">
                {user?.photoURL && user.photoURL.trim() !== "" ? (
                  <img src={user.photoURL || null} alt={user.displayName || 'Admin'} className="w-9 h-9 rounded-full" />
                ) : (
                  <div className="p-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    <User className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                    {user?.displayName || 'Active Admin'}
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                    Owner Verification: {user?.email}
                  </p>
                </div>
              </div>
              <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden md:block"></div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2.5 py-1 rounded-md uppercase shrink-0">
                Verifiably Authenticated
              </span>
            </div>

            {/* Inner Sub-tabs for clean layout navigation */}
            <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 pb-2.5 overflow-x-auto">
              <button
                id="tab-admin-inbox"
                onClick={() => setAdminActiveTab('inbox')}
                className={`py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer shrink-0 transition-all focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${
                  adminActiveTab === 'inbox'
                    ? 'bg-gradient-to-r from-orange-400 to-red-500 text-white shadow-xs'
                    : 'bg-slate-150/10 dark:bg-slate-800/20 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                📥 Contact Inbox ({messages.length})
              </button>
              <button
                id="tab-admin-blog"
                onClick={() => setAdminActiveTab('blog')}
                className={`py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer shrink-0 transition-all focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${
                  adminActiveTab === 'blog'
                    ? 'bg-gradient-to-r from-orange-400 to-red-500 text-white shadow-xs'
                    : 'bg-slate-100/10 dark:bg-slate-800/20 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                ✍️ Blog Manager
              </button>
              <button
                id="tab-admin-profile"
                onClick={() => setAdminActiveTab('profile')}
                className={`py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer shrink-0 transition-all focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${
                  adminActiveTab === 'profile'
                    ? 'bg-gradient-to-r from-orange-400 to-red-500 text-white shadow-xs'
                    : 'bg-slate-150/10 dark:bg-slate-800/20 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                📝 Edit Profile Details
              </button>
              <button
                id="tab-admin-resume"
                onClick={() => setAdminActiveTab('resume')}
                className={`py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer shrink-0 transition-all focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${
                  adminActiveTab === 'resume'
                    ? 'bg-gradient-to-r from-orange-400 to-red-500 text-white shadow-xs'
                    : 'bg-slate-150/10 dark:bg-slate-800/20 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50'
                }`}
              >
                📄 Upload Resume CV
              </button>
            </div>

            <AnimatePresence mode="popLayout">
              {/* EDIT PROFILE TAB */}
              {adminActiveTab === 'profile' && profileForm && (
                <motion.form
                  key="admin-profile-editor"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  onSubmit={handleSaveProfile}
                  className="space-y-8 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-6 shadow-xs text-left"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800/60 pb-4">
                    <div>
                      <h3 className="text-lg font-display font-semibold text-slate-800 dark:text-slate-100">
                        Portfolio Content Settings
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        These will update all sections of your website instantly via real-time sync.
                      </p>
                    </div>

                    <button
                      id="btn-save-profile"
                      type="submit"
                      disabled={profileSaveStatus.loading}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-semibold font-sans text-xs text-white bg-gradient-to-r from-orange-500 to-red-600 shadow-md hover:from-orange-600 hover:to-red-700 select-none cursor-pointer duration-200 shrink-0"
                    >
                      {profileSaveStatus.loading ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Live Changes'
                      )}
                    </button>
                  </div>

                  {/* Settings Alerts */}
                  {profileSaveStatus.success && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/15 border border-emerald-200/50 dark:border-emerald-900/30 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 shrink-0" />
                      <span>Portfolio details successfully saved to Firebase Firestore rules.</span>
                    </div>
                  )}

                  {profileSaveStatus.error && (
                    <div className="p-4 bg-red-50 dark:bg-red-950/15 border border-red-200/50 dark:border-red-900/20 rounded-xl text-red-800 dark:text-red-400 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <span>Failed: {profileSaveStatus.error}</span>
                    </div>
                  )}

                 {/* Separate Area Navigation / Sub-tabs inside profile form for modifying pages */}
                  <div className="flex flex-wrap gap-2 p-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 rounded-2xl">
                    <button
                      type="button"
                      id="profile-subtab-common"
                      onClick={() => setProfileSubTab('common')}
                      className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-semibold cursor-pointer transition-all focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${
                        profileSubTab === 'common'
                          ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs border border-slate-200/50 dark:border-slate-700/60'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                      }`}
                    >
                      <User className="w-3.5 h-3.5 text-teal-500" />
                      <span>Common Info</span>
                    </button>
                    <button
                      type="button"
                      id="profile-subtab-home"
                      onClick={() => setProfileSubTab('home')}
                      className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-semibold cursor-pointer transition-all focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${
                        profileSubTab === 'home'
                          ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs border border-slate-200/50 dark:border-slate-700/60'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                      }`}
                    >
                      <Home className="w-3.5 h-3.5 text-orange-500" />
                      <span>Home</span>
                    </button>
                    <button
                      type="button"
                      id="profile-subtab-resume"
                      onClick={() => setProfileSubTab('resume')}
                      className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-semibold cursor-pointer transition-all focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${
                        profileSubTab === 'resume'
                          ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs border border-slate-200/50 dark:border-slate-700/60'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 text-yellow-500" />
                      <span>Resume</span>
                    </button>
                    <button
                      type="button"
                      id="profile-subtab-work"
                      onClick={() => setProfileSubTab('work')}
                      className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-semibold cursor-pointer transition-all focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${
                        profileSubTab === 'work'
                          ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs border border-slate-200/50 dark:border-slate-700/60'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5 text-rose-500" />
                      <span>Work</span>
                    </button>
                    <button
                      type="button"
                      id="profile-subtab-contact"
                      onClick={() => setProfileSubTab('contact')}
                      className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-semibold cursor-pointer transition-all focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${
                        profileSubTab === 'contact'
                          ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs border border-slate-200/50 dark:border-slate-700/60'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                      }`}
                    >
                      <Phone className="w-3.5 h-3.5 text-sky-500" />
                      <span>Contact</span>
                    </button>
                    <button
                      type="button"
                      id="profile-subtab-blog"
                      onClick={() => setProfileSubTab('blog')}
                      className={`flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-semibold cursor-pointer transition-all focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 ${
                        profileSubTab === 'blog'
                          ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-xs border border-slate-200/50 dark:border-slate-700/60'
                          : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5 text-pink-500" />
                      <span>Blog Settings</span>
                    </button>
                  </div>

                  <AnimatePresence mode="wait">
                    {/* SUBTAB CONTENT: COMMON INFO */}
                    {profileSubTab === 'common' && (
                      <motion.div
                        key="subtab-common"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        className="space-y-8"
                      >
                      {/* SECTION 1: Personal Branding */}
                      <div className="space-y-4 font-sans">
                        <h4 className="text-xs uppercase font-bold text-teal-500 tracking-wider">
                          Personal Branding Details
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="flex flex-col space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Name:</label>
                            <input
                              type="text"
                              value={profileForm.profileName}
                              onChange={(e) => setProfileForm({ ...profileForm, profileName: e.target.value })}
                              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-sm focus:border-orange-400 outline-none transition-colors"
                              placeholder="E.g. Vishal Saini"
                              required
                            />
                          </div>
                          <div className="flex flex-col space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Title:</label>
                            <input
                              type="text"
                              value={profileForm.profileTitle}
                              onChange={(e) => setProfileForm({ ...profileForm, profileTitle: e.target.value })}
                              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-sm focus:border-orange-400 outline-none transition-colors"
                              placeholder="E.g. FullStack Developer"
                              required
                            />
                          </div>
                          <div className="flex flex-col space-y-1.5 md:col-span-2">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Avatar Photo Link or Upload Image:</label>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <div className="flex-grow flex gap-2">
                                <input
                                  type="text"
                                  value={profileForm.profileAvatar}
                                  onChange={(e) => setProfileForm({ ...profileForm, profileAvatar: e.target.value })}
                                  className="flex-grow px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-sm focus:border-orange-400 outline-none transition-colors"
                                  placeholder="URL to Unsplash image, etc. (Optional)"
                                />
                                <input
                                  id="avatar-upload-file"
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    if (!file.type.startsWith('image/')) {
                                      alert('Please select an image file.');
                                      return;
                                    }
                                    try {
                                      const base64 = await compressAndResizeImage(file);
                                      setProfileForm({ ...profileForm, profileAvatar: base64 });
                                    } catch (err) {
                                      console.error('Avatar upload/compression failed:', err);
                                      alert('Could not set avatar. Please check image format and try again.');
                                    }
                                    e.target.value = '';
                                  }}
                                />
                                <button
                                  type="button"
                                  onClick={() => document.getElementById('avatar-upload-file')?.click()}
                                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                                >
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Upload</span>
                                </button>
                                {profileForm.profileAvatar && (
                                  <button
                                    type="button"
                                    onClick={() => setProfileForm({ ...profileForm, profileAvatar: '' })}
                                    className="px-3 py-2 rounded-xl border border-red-200 dark:border-red-950/40 bg-red-50/50 dark:bg-red-950/20 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors shrink-0 cursor-pointer"
                                  >
                                    Clear
                                  </button>
                                )}
                              </div>
                              <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-center self-center">
                                {(profileForm.profileAvatar && profileForm.profileAvatar.trim() !== "") ? (
                                  <img 
                                    src={profileForm.profileAvatar} 
                                    alt="preview" 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=300'; }} 
                                  />
                                ) : (
                                  <User className="w-5 h-5 text-slate-400" />
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] text-slate-500">Provide an image URL or choose a local photo (under 1MB). Saved directly to your profile.</span>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 3: Contact details & Location */}
                      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 font-sans">
                        <h4 className="text-xs uppercase font-bold text-teal-500 tracking-wider">
                          Contact Details & Location Address
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                          <div className="flex flex-col space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Phone Number:</label>
                            <input
                              type="text"
                              value={profileForm.contactInfo.phone[0] || ''}
                              onChange={(e) => setProfileForm({
                                ...profileForm,
                                contactInfo: {
                                  ...profileForm.contactInfo,
                                  phone: [e.target.value]
                                }
                              })}
                              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-805 dark:text-slate-100 text-sm focus:border-orange-400 outline-none transition-colors"
                              placeholder="E.g. +91-8467849784"
                            />
                          </div>
                          <div className="flex flex-col space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email Address:</label>
                            <input
                              type="email"
                              value={profileForm.contactInfo.email}
                              onChange={(e) => setProfileForm({
                                ...profileForm,
                                contactInfo: {
                                  ...profileForm.contactInfo,
                                  email: e.target.value
                                }
                              })}
                              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-sm focus:border-orange-400 outline-none transition-colors"
                              placeholder="E.g. email@domain.com"
                            />
                          </div>
                          <div className="flex flex-col space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Location Address:</label>
                            <input
                              type="text"
                              value={profileForm.contactInfo.location}
                              onChange={(e) => setProfileForm({
                                ...profileForm,
                                contactInfo: {
                                  ...profileForm.contactInfo,
                                  location: e.target.value
                                }
                              })}
                              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-sm focus:border-orange-400 outline-none transition-colors"
                              placeholder="E.g. City, Country"
                            />
                          </div>
                        </div>
                      </div>

                      {/* SECTION 4: Social Links */}
                      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/60 font-sans">
                        <h4 className="text-xs uppercase font-bold text-teal-500 tracking-wider">
                          Social Media Connections (Specify full links or empty to hide)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div className="flex flex-col space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">LinkedIn Profile URL:</label>
                            <input
                              type="url"
                              value={getSocialValue('linkedin')}
                              onChange={(e) => updateSocialUrl('linkedin', e.target.value)}
                              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-sm focus:border-orange-400 outline-none transition-colors"
                              placeholder="LinkedIn Profile link..."
                            />
                          </div>
                          <div className="flex flex-col space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">GitHub Profile URL:</label>
                            <input
                              type="url"
                              value={getSocialValue('github')}
                              onChange={(e) => updateSocialUrl('github', e.target.value)}
                              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-sm focus:border-orange-400 outline-none transition-colors"
                              placeholder="GitHub Profile link..."
                            />
                          </div>
                          <div className="flex flex-col space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Facebook Page/Profile URL:</label>
                            <input
                              type="url"
                              value={getSocialValue('facebook')}
                              onChange={(e) => updateSocialUrl('facebook', e.target.value)}
                              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-sm focus:border-orange-400 outline-none transition-colors"
                              placeholder="Facebook link..."
                            />
                          </div>
                          <div className="flex flex-col space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Twitter (X) URL:</label>
                            <input
                              type="url"
                              value={getSocialValue('twitter')}
                              onChange={(e) => updateSocialUrl('twitter', e.target.value)}
                              className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-sm focus:border-orange-400 outline-none transition-colors"
                              placeholder="Twitter link..."
                            />
                          </div>
                        </div>
                      </div>
                      </motion.div>
                    )}

                    {/* SUBTAB CONTENT: HOME PAGE */}
                    {profileSubTab === 'home' && (
                      <motion.div
                        key="subtab-home"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        className="space-y-8 font-sans"
                      >
                      {/* About Section details editing */}
                      <div className="space-y-4">
                        <h4 className="text-xs uppercase font-bold text-orange-500 tracking-wider">
                          About Section Config
                        </h4>
                        <div className="flex flex-col space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Page Navigation Title:</label>
                          <input
                            type="text"
                            value={profileForm.aboutTitle || 'ABOUT ME'}
                            onChange={(e) => setProfileForm({ ...profileForm, aboutTitle: e.target.value })}
                            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-sm focus:border-orange-400 outline-none transition-colors"
                            placeholder="E.g. About Me"
                            required
                          />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">About Description Paragraph:</label>
                          <MarkdownEditor
                            editorId="about-description-editor"
                            value={profileForm.aboutDescription || ''}
                            onChange={(newVal) => setProfileForm({ ...profileForm, aboutDescription: newVal })}
                            placeholder="Write description paragraphs about yourself... You can use **bold**, *italics*, lists, and links."
                            templateType="blog"
                          />
                        </div>
                      </div>

                      {/* Dynamic Sections Manager */}
                      <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800/60 font-sans font-sans">
                        <div className="flex justify-between items-center">
                          <div className="space-y-0.5">
                            <h4 className="text-xs uppercase font-bold text-orange-500 tracking-wider">
                              Dynamic Homepage Layout Sections
                            </h4>
                            <p className="text-[10px] text-slate-400 font-mono">
                              CREATE AND SORT UNLIMITED GRIDS OR SECTIONS
                            </p>
                          </div>
                          
                          <button
                            type="button"
                            onClick={handleAddSection}
                            className="flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-all cursor-pointer shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Section
                          </button>
                        </div>

                        {/* List of sections */}
                        <div className="space-y-6">
                          {(!profileForm.homeSections || profileForm.homeSections.length === 0) ? (
                            <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-400 font-mono">
                              NO SECTIONS DEFINED. CLICK "ADD SECTION" TO START.
                            </div>
                          ) : (
                            profileForm.homeSections.map((section, sIdx) => (
                              <div
                                key={section.id}
                                className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 relative space-y-4"
                              >
                                {/* Header control bar for sections */}
                                <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-100 dark:border-slate-800/60">
                                  <div className="flex items-center gap-2 font-mono">
                                    <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md">
                                      Section #{sIdx + 1}
                                    </span>
                                  </div>
                                  
                                  {/* reordering and deleting section */}
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      disabled={sIdx === 0}
                                      onClick={() => handleMoveSection(sIdx, 'up')}
                                      className="p-1 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-350 disabled:opacity-30 cursor-pointer"
                                      title="Move Section Up"
                                    >
                                      <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={sIdx === profileForm.homeSections!.length - 1}
                                      onClick={() => handleMoveSection(sIdx, 'down')}
                                      className="p-1 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-350 disabled:opacity-30 cursor-pointer"
                                      title="Move Section Down"
                                    >
                                      <ArrowDown className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteSection(sIdx)}
                                      className="p-1 text-slate-450 hover:text-rose-500 cursor-pointer ml-1"
                                      title="Delete Section"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* Section configurations */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="flex flex-col space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Section Title:</label>
                                    <input
                                      type="text"
                                      value={section.title}
                                      onChange={(e) => handleUpdateSectionTitle(sIdx, e.target.value)}
                                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-orange-400 transition-colors"
                                      placeholder="E.g. What I do!"
                                      required
                                    />
                                  </div>
                                  <div className="flex flex-col space-y-1 col-span-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase">Section Type Selection:</label>
                                    <select
                                      value={section.type}
                                      onChange={(e) => handleUpdateSectionType(sIdx, e.target.value as 'grid')}
                                      className="pl-3 pr-10 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-sm text-slate-800 dark:text-slate-100 outline-none focus:border-orange-400 transition-colors font-sans cursor-pointer"
                                    >
                                      <option value="grid">Grid Card Section (e.g. Services Grid)</option>
                                    </select>
                                  </div>
                                </div>

                                {/* Section Card management */}
                                {section.type === 'grid' && (
                                  <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                                    <div className="flex justify-between items-center">
                                      <h5 className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wide">
                                        Grid Cards / Service Items
                                      </h5>
                                      <button
                                        type="button"
                                        onClick={() => handleAddCardToSection(sIdx)}
                                        className="flex items-center gap-1 text-[10px] font-bold text-orange-500 hover:text-orange-600 cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        Add Card
                                      </button>
                                    </div>

                                    {/* List of cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {section.cards.map((card, cIdx) => (
                                        <div
                                          key={card.id}
                                          className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/35 dark:bg-slate-900/30 relative space-y-2.5"
                                        >
                                          {/* Control button row inside card */}
                                          <div className="absolute top-3 right-3 flex items-center gap-1.5">
                                            <button
                                              type="button"
                                              disabled={cIdx === 0}
                                              onClick={() => handleMoveCard(sIdx, cIdx, 'up')}
                                              className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                              title="Move Card Up"
                                            >
                                              <ArrowUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              disabled={cIdx === section.cards.length - 1}
                                              onClick={() => handleMoveCard(sIdx, cIdx, 'down')}
                                              className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                              title="Move Card Down"
                                            >
                                              <ArrowDown className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteCardFromSection(sIdx, cIdx)}
                                              className="text-slate-450 hover:text-rose-500 cursor-pointer"
                                              title="Delete Card"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>

                                          <div className="space-y-2.5 pr-20">
                                            <div className="flex flex-col space-y-1">
                                              <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Card Title:</label>
                                              <input
                                                type="text"
                                                value={card.title}
                                                onChange={(e) => handleUpdateCardField(sIdx, cIdx, 'title', e.target.value)}
                                                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100"
                                                placeholder="Card heading..."
                                                required
                                              />
                                            </div>
                                            
                                            <div className="grid grid-cols-3 gap-2">
                                              <div className="flex flex-col space-y-1 animate-fade-in font-sans">
                                                <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Icon Picker:</label>
                                                <select
                                                  value={card.iconName}
                                                  onChange={(e) => handleUpdateCardField(sIdx, cIdx, 'iconName', e.target.value)}
                                                  className="pl-2 pr-8 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 cursor-pointer"
                                                >
                                                  <option value="code">Code Block</option>
                                                  <option value="smartphone">Smartphone</option>
                                                  <option value="palette">Paint Palette</option>
                                                  <option value="users">People Box</option>
                                                  <option value="layers">Layers Stack</option>
                                                  <option value="zap">Zap Volt</option>
                                                  <option value="layout">Page Layout</option>
                                                  <option value="monitor">Desktop Monitor</option>
                                                  <option value="globe">Web Globe</option>
                                                  <option value="database">Database Server</option>
                                                  <option value="shield">Secure Shield</option>
                                                  <option value="award">Award Medal</option>
                                                  <option value="star">Rating Star</option>
                                                  <option value="heart">Health Heart</option>
                                                </select>
                                              </div>

                                              <div className="flex flex-col space-y-1 font-sans font-sans">
                                                <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Theme Color:</label>
                                                <select
                                                  value={card.colorTheme || 'orange'}
                                                  onChange={(e) => handleUpdateCardField(sIdx, cIdx, 'colorTheme', e.target.value)}
                                                  className="pl-2 pr-8 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 cursor-pointer"
                                                >
                                                  <option value="orange">Orange Pastel</option>
                                                  <option value="blue">Blue Pastel</option>
                                                  <option value="purple">Purple Pastel</option>
                                                  <option value="amber">Amber Pastel</option>
                                                  <option value="teal">Teal Pastel</option>
                                                  <option value="rose">Rose Pastel</option>
                                                  <option value="sky">Sky Pastel</option>
                                                  <option value="emerald">Emerald Pastel</option>
                                                </select>
                                              </div>

                                              <div className="flex flex-col space-y-1 font-sans">
                                                <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Card Width:</label>
                                                <select
                                                  value={card.width || '50%'}
                                                  onChange={(e) => handleUpdateCardField(sIdx, cIdx, 'width', e.target.value)}
                                                  className="pl-2 pr-8 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 font-sans cursor-pointer"
                                                >
                                                  <option value="25%">25% Width</option>
                                                  <option value="50%">50% Width</option>
                                                  <option value="75%">75% Width</option>
                                                  <option value="100%">100% Width</option>
                                                </select>
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex flex-col space-y-1">
                                            <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Description Text:</label>
                                            <textarea
                                              rows={2}
                                              value={card.description}
                                              onChange={(e) => handleUpdateCardField(sIdx, cIdx, 'description', e.target.value)}
                                              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 font-sans"
                                              placeholder="Provide details..."
                                              required
                                            />
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      </motion.div>
                    )}

                    {/* SUBTAB CONTENT: RESUME CONTENTS */}
                    {profileSubTab === 'resume' && (
                      <motion.div
                        key="subtab-resume"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        className="space-y-8"
                      >
                      {/* Section: Dynamic Layout Builder */}
                      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-150 dark:border-slate-800 pb-4">
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 font-display">
                              Resume Layout & Sections Config
                            </h4>
                            <p className="text-xs text-slate-400 font-sans">
                              Arranges, sizes (25% to 100%) and selects contents displayed on your Professional Resume tab.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddResumeSection}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shrink-0 cursor-pointer shadow-xs self-start sm:self-center"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Layout Section
                          </button>
                        </div>

                        {(!profileForm.resumeSections || profileForm.resumeSections.length === 0) ? (
                          <div className="text-center py-8 text-xs italic text-slate-400 font-mono">
                            No resume layout sections configured. Add one above to build your page!
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {profileForm.resumeSections.map((section, sIdx) => (
                              <div key={section.id} className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 relative space-y-4 shadow-3xs">
                                {/* Actions Bar */}
                                <div className="absolute top-4 right-4 flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleMoveResumeSection(sIdx, 'up')}
                                    disabled={sIdx === 0}
                                    className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-900 ${sIdx === 0 ? 'text-slate-200 dark:text-slate-800 cursor-not-allowed' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-250 cursor-pointer'}`}
                                    title="Move section up"
                                  >
                                    <ArrowUp className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleMoveResumeSection(sIdx, 'down')}
                                    disabled={sIdx === profileForm.resumeSections!.length - 1}
                                    className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-900 ${sIdx === profileForm.resumeSections!.length - 1 ? 'text-slate-200 dark:text-slate-800 cursor-not-allowed' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-250 cursor-pointer'}`}
                                    title="Move section down"
                                  >
                                    <ArrowDown className="w-4 h-4" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteResumeSection(sIdx)}
                                    className="p-1 rounded text-slate-400 hover:text-rose-500 cursor-pointer hover:bg-rose-50 dark:hover:bg-rose-950/10"
                                    title="Delete entire section"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>

                                {/* Section configurations row - configured in two lines */}
                                <div className="space-y-4 pr-24">
                                  {/* Line 1: Icon, Title, Width */}
                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="flex flex-col space-y-1 md:col-span-3">
                                      <label className="text-[10px] font-mono font-bold uppercase text-slate-400">Section Icon:</label>
                                      <select
                                        value={section.iconName || ''}
                                        onChange={(e) => handleUpdateResumeSectionField(sIdx, 'iconName', e.target.value)}
                                        className="pl-2 pr-8 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 font-sans cursor-pointer"
                                      >
                                        <option value="">No Icon / None</option>
                                        <option value="GraduationCap">Graduation Cap</option>
                                        <option value="Briefcase">Professional Suitcase</option>
                                        <option value="Code">Source Code</option>
                                        <option value="Layers">Layers Stack</option>
                                        <option value="Zap">Zap Speed</option>
                                        <option value="Layout">Interactive Card</option>
                                        <option value="Award">Winner Badge</option>
                                      </select>
                                    </div>

                                    <div className="flex flex-col space-y-1 md:col-span-6">
                                      <label className="text-[10px] font-mono font-bold uppercase text-slate-400">Section Title:</label>
                                      <input
                                        type="text"
                                        value={section.title}
                                        onChange={(e) => handleUpdateResumeSectionField(sIdx, 'title', e.target.value)}
                                        className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 font-sans font-medium"
                                        placeholder="Section heading..."
                                        required
                                      />
                                    </div>

                                    <div className="flex flex-col space-y-1 md:col-span-3">
                                      <label className="text-[10px] font-mono font-bold uppercase text-slate-400">Section Width:</label>
                                      <select
                                        value={section.width}
                                        onChange={(e) => handleUpdateResumeSectionField(sIdx, 'width', e.target.value)}
                                        className="pl-2 pr-8 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 font-sans cursor-pointer"
                                      >
                                        <option value="25%">25% Width</option>
                                        <option value="50%">50% Width</option>
                                        <option value="75%">75% Width</option>
                                        <option value="100%">100% Width</option>
                                      </select>
                                    </div>
                                  </div>

                                  {/* Line 2: Content Type */}
                                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                    <div className="flex flex-col space-y-1 md:col-span-4">
                                      <label className="text-[10px] font-mono font-bold uppercase text-slate-400">Section Content Type:</label>
                                      <select
                                        value={section.type}
                                        onChange={(e) => handleUpdateResumeSectionField(sIdx, 'type', e.target.value)}
                                        className="pl-2 pr-8 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 font-sans cursor-pointer"
                                      >
                                        <option value="education">Education Milestone Database</option>
                                        <option value="experience">Professional Job History</option>
                                        <option value="skills">Skills Set Configuration</option>
                                        <option value="cards">Custom Info Bento Cards</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>

                                {/* Content Nested Cards Editor when content type is 'cards', 'education', or 'experience' */}
                                {(section.type === 'cards' || section.type === 'education' || section.type === 'experience') && (
                                  <div className="pt-4 border-t border-dashed border-slate-150 dark:border-slate-800 space-y-4">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] uppercase font-bold text-slate-450 font-mono tracking-wider">
                                        {section.type === 'education' ? 'Education Cards List' : section.type === 'experience' ? 'Experience Cards List' : 'Nested Resume Cards List'}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleAddCardToResumeSection(sIdx)}
                                        className="flex items-center gap-1 text-[11px] font-bold text-orange-500 hover:text-orange-600 hover:underline cursor-pointer"
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                        {section.type === 'education' ? 'Add Education Card' : section.type === 'experience' ? 'Add Experience Card' : 'Add Custom Card Content'}
                                      </button>
                                    </div>

                                    {(!section.cards || section.cards.length === 0) ? (
                                      <div className="text-center py-4 text-xs italic text-slate-400 font-mono">
                                        No item cards in this section. Add one above!
                                      </div>
                                    ) : (
                                      <div className="space-y-4">
                                        {section.cards.map((card, cIdx) => (
                                          <div key={card.id} className="p-4 rounded-lg border border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-950/20 relative space-y-3">
                                            <div className="absolute top-3 right-3 flex items-center gap-1.5">
                                              <button
                                                type="button"
                                                onClick={() => handleMoveCardInResumeSection(sIdx, cIdx, 'up')}
                                                disabled={cIdx === 0}
                                                className={`p-1 rounded ${cIdx === 0 ? 'text-slate-200 dark:text-slate-800 cursor-not-allowed' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer'}`}
                                                title="Move card up"
                                              >
                                                <ArrowUp className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleMoveCardInResumeSection(sIdx, cIdx, 'down')}
                                                disabled={cIdx === section.cards!.length - 1}
                                                className={`p-1 rounded ${cIdx === section.cards!.length - 1 ? 'text-slate-200 dark:text-slate-800 cursor-not-allowed' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer'}`}
                                                title="Move card down"
                                              >
                                                <ArrowDown className="w-3.5 h-3.5" />
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => handleDeleteCardFromResumeSection(sIdx, cIdx)}
                                                className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/10 cursor-pointer"
                                                title="Delete card"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>

                                            {/* Top inputs: adjust title/period/subtitle based on type */}
                                            {section.type === 'education' || section.type === 'experience' ? (
                                              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pr-24">
                                                <div className="flex flex-col space-y-1">
                                                  <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">
                                                    {section.type === 'education' ? 'Degree / Program:' : 'Job Title / Role:'}
                                                  </label>
                                                  <input
                                                    type="text"
                                                    value={card.title}
                                                    onChange={(e) => handleUpdateCardFieldInResumeSection(sIdx, cIdx, 'title', e.target.value)}
                                                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 font-sans"
                                                    placeholder={section.type === 'education' ? 'B.Tech / MBA etc.' : 'Senior Engineer / Lead etc.'}
                                                    required
                                                  />
                                                </div>

                                                <div className="flex flex-col space-y-1">
                                                  <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">
                                                    {section.type === 'education' ? 'School / University:' : 'Company Name:'}
                                                  </label>
                                                  <input
                                                    type="text"
                                                    value={card.subtitle || ''}
                                                    onChange={(e) => handleUpdateCardFieldInResumeSection(sIdx, cIdx, 'subtitle', e.target.value)}
                                                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 font-sans"
                                                    placeholder={section.type === 'education' ? 'Stanford University' : 'Google Inc.'}
                                                  />
                                                </div>

                                                <div className="flex flex-col space-y-1">
                                                  <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Period / Timeline:</label>
                                                  <input
                                                    type="text"
                                                    value={card.period || ''}
                                                    onChange={(e) => handleUpdateCardFieldInResumeSection(sIdx, cIdx, 'period', e.target.value)}
                                                    className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 font-sans"
                                                    placeholder="e.g. 2018 - 2022"
                                                  />
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="flex flex-col space-y-1 w-[calc(100%-100px)]">
                                                <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Card Title:</label>
                                                <input
                                                  type="text"
                                                  value={card.title}
                                                  onChange={(e) => handleUpdateCardFieldInResumeSection(sIdx, cIdx, 'title', e.target.value)}
                                                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 font-sans"
                                                  placeholder="Card heading..."
                                                  required
                                                />
                                              </div>
                                            )}

                                            {/* Sub Configurations Line */}
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                              {section.type === 'cards' && (
                                                <>
                                                  <div className="flex flex-col space-y-1 font-sans">
                                                    <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Icon Picker:</label>
                                                    <select
                                                      value={card.iconName}
                                                      onChange={(e) => handleUpdateCardFieldInResumeSection(sIdx, cIdx, 'iconName', e.target.value)}
                                                      className="pl-2 pr-8 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 cursor-pointer"
                                                    >
                                                      <option value="code">Code Block</option>
                                                      <option value="smartphone">Smartphone</option>
                                                      <option value="palette">Paint Palette</option>
                                                      <option value="users">People Box</option>
                                                      <option value="layers">Layers Stack</option>
                                                      <option value="zap">Zap Volt</option>
                                                      <option value="layout">Page Layout</option>
                                                      <option value="monitor">Desktop Monitor</option>
                                                      <option value="globe">Web Globe</option>
                                                      <option value="database">Database Server</option>
                                                      <option value="shield">Secure Shield</option>
                                                      <option value="award">Award Medal</option>
                                                      <option value="star">Rating Star</option>
                                                      <option value="heart">Health Heart</option>
                                                    </select>
                                                  </div>

                                                  <div className="flex flex-col space-y-1 font-sans">
                                                    <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Theme Color:</label>
                                                    <select
                                                      value={card.colorTheme || 'orange'}
                                                      onChange={(e) => handleUpdateCardFieldInResumeSection(sIdx, cIdx, 'colorTheme', e.target.value)}
                                                      className="pl-2 pr-8 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 cursor-pointer"
                                                    >
                                                      <option value="orange">Orange Pastel</option>
                                                      <option value="blue">Blue Pastel</option>
                                                      <option value="purple">Purple Pastel</option>
                                                      <option value="amber">Amber Pastel</option>
                                                      <option value="teal">Teal Pastel</option>
                                                      <option value="rose">Rose Pastel</option>
                                                      <option value="sky">Sky Pastel</option>
                                                      <option value="emerald">Emerald Pastel</option>
                                                    </select>
                                                  </div>
                                                </>
                                              )}

                                              {/* Width is shown for all section card types! */}
                                              <div className="flex flex-col space-y-1 font-sans">
                                                <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Content Card Width/Size:</label>
                                                <select
                                                  value={card.width || '50%'}
                                                  onChange={(e) => handleUpdateCardFieldInResumeSection(sIdx, cIdx, 'width', e.target.value)}
                                                  className="pl-2 pr-8 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 font-sans cursor-pointer"
                                                >
                                                  <option value="25%">25% width</option>
                                                  <option value="50%">50% width</option>
                                                  <option value="75%">75% width</option>
                                                  <option value="100%">100% width</option>
                                                </select>
                                              </div>
                                            </div>

                                            <div className="flex flex-col space-y-1">
                                              <label className="text-[9px] font-mono text-slate-400 uppercase font-bold">Description Text (Optional):</label>
                                              <textarea
                                                rows={2}
                                                value={card.description || ''}
                                                onChange={(e) => handleUpdateCardFieldInResumeSection(sIdx, cIdx, 'description', e.target.value)}
                                                className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 font-sans"
                                                placeholder="Provide details..."
                                              />
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Content Editor when content type is 'skills' */}
                                {section.type === 'skills' && (
                                  <div className="pt-4 border-t border-dashed border-slate-150 dark:border-slate-800 space-y-4">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[10px] uppercase font-bold text-slate-450 font-mono tracking-wider">
                                        Skills Set Configuration
                                      </span>
                                    </div>
                                    <div className="flex flex-col space-y-1.5 font-sans">
                                      <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                        Skills (Comma separated list):
                                      </label>
                                      <SkillsTextInput
                                        cards={section.cards || []}
                                        onChange={(updatedCards) => handleUpdateResumeSectionField(sIdx, 'cards', updatedCards)}
                                      />
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                      {(section.cards || []).map((card) => (
                                        <span
                                          key={card.id}
                                          className="py-1 px-2.5 rounded-lg bg-slate-150/50 dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800 text-[11px] font-sans font-medium text-slate-600 dark:text-slate-300"
                                        >
                                          {card.title}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Explicit Submit Resume Data inside layout section as requested */}
                      <div className="pt-6 border-t border-slate-200/50 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 font-sans">
                        <p className="text-xs text-slate-400">
                          Verify your sections, width settings, and cards content. Hit "Save Layout Config" to commit updates.
                        </p>
                        <button
                          type="submit"
                          disabled={profileSaveStatus.loading}
                          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-orange-500 to-red-650 hover:from-orange-600 hover:to-red-750 shadow-md select-none cursor-pointer duration-200 shrink-0"
                        >
                          {profileSaveStatus.loading ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              Saving Configuration...
                            </>
                          ) : (
                            'Save Layout Config'
                          )}
                        </button>
                      </div>
                      </motion.div>
                    )}

                    {/* SUBTAB CONTENT: WORK PAGE */}
                    {profileSubTab === 'work' && (
                      <motion.div
                        key="subtab-work"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        className="space-y-8"
                      >
                      {/* SECTION 7: Projects Editor */}
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-xs uppercase font-bold text-orange-500 tracking-wider">
                            Work Portfolio Projects
                          </h4>
                          <button
                            type="button"
                            onClick={() => {
                              const projects = [...profileForm.projects];
                              projects.push({
                                title: 'New Project App',
                                category: 'Web Development',
                                imageUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=400'
                              });
                              setProfileForm({ ...profileForm, projects });
                            }}
                            className="flex items-center gap-1.5 text-xs font-bold text-orange-500 hover:text-orange-600 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Add Portfolio Project
                          </button>
                        </div>

                        {/* Search Input Bar */}
                        <div className="relative font-sans">
                          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                            <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                          </span>
                          <input
                            type="text"
                            value={projectSearchQuery}
                            onChange={(e) => setProjectSearchQuery(e.target.value)}
                            placeholder="Search projects by title, category, description, tech, or markdown..."
                            className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all"
                          />
                          {projectSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setProjectSearchQuery('')}
                              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-650 dark:hover:text-slate-250 text-xs cursor-pointer font-bold transition-colors"
                            >
                              Clear
                            </button>
                          )}
                        </div>

                        {/* Filtered List container */}
                        {(() => {
                          const indexedProjects = (profileForm.projects || []).map((project, index) => ({
                            project,
                            originalIndex: index,
                          }));
                          const filtered = indexedProjects.filter(({ project }) => {
                            if (!projectSearchQuery.trim()) return true;
                            const query = projectSearchQuery.toLowerCase();
                            return (
                              project.title?.toLowerCase().includes(query) ||
                              project.category?.toLowerCase().includes(query) ||
                              project.description?.toLowerCase().includes(query) ||
                              project.technologies?.toLowerCase().includes(query) ||
                              project.details?.toLowerCase().includes(query)
                            );
                          });

                          if (filtered.length === 0) {
                            return (
                              <div className="text-center py-10 bg-slate-50/50 dark:bg-slate-950/10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                  No projects found matching your search.
                                </p>
                              </div>
                            );
                          }

                          return (
                            <div className="grid grid-cols-1 gap-5">
                              {filtered.map(({ project, originalIndex }) => (
                                <div key={originalIndex} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 relative space-y-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const projects = [...profileForm.projects];
                                      projects.splice(originalIndex, 1);
                                      setProfileForm({ ...profileForm, projects });
                                    }}
                                    className="absolute top-3 right-3 text-slate-400 hover:text-rose-500 cursor-pointer"
                                    title="Delete Project Card"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>

                                  <div className="flex flex-col md:flex-row gap-5 items-start">
                                    <div className="flex flex-col items-center gap-2 shrink-0 w-full md:w-auto">
                                      <div className="w-full md:w-36 h-36 md:h-36 rounded-xl border border-slate-200/55 dark:border-slate-800 overflow-hidden bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                                        <img 
                                          src={(project.imageUrl && project.imageUrl.trim() !== "") ? project.imageUrl : null} 
                                          alt="preview" 
                                          className="w-full h-full object-cover" 
                                          onError={(e) => {e.currentTarget.src='https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=350';}} 
                                        />
                                      </div>
                                      
                                      {/* Live upload elements */}
                                      <div className="flex gap-1.5 w-full">
                                        <button
                                          type="button"
                                          onClick={() => document.getElementById(`project-image-file-${originalIndex}`)?.click()}
                                          className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[10px] font-bold text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-orange-500 transition-colors cursor-pointer w-full"
                                        >
                                          <Upload className="w-3.5 h-3.5 text-orange-500" />
                                          <span>Upload</span>
                                        </button>
                                        
                                        <input
                                          id={`project-image-file-${originalIndex}`}
                                          type="file"
                                          accept="image/*"
                                          onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            try {
                                              const base64 = await compressAndResizeImage(file);
                                              const projects = [...profileForm.projects];
                                              projects[originalIndex].imageUrl = base64;
                                              setProfileForm({ ...profileForm, projects });
                                            } catch (err) {
                                              console.error('Project image upload failed:', err);
                                              alert('Failed to compress or upload project image. Please try another image.');
                                            }
                                            e.target.value = '';
                                          }}
                                          className="hidden"
                                        />

                                        {project.imageUrl && (
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const projects = [...profileForm.projects];
                                              projects[originalIndex].imageUrl = '';
                                              setProfileForm({ ...profileForm, projects });
                                            }}
                                            className="p-1 px-2 text-xs rounded-lg border border-red-200 dark:border-red-950/40 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors cursor-pointer"
                                            title="Clear Image"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    <div className="flex-grow space-y-3 w-full">
                                      <div className="flex flex-col space-y-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase">Project Title:</label>
                                        <input
                                          type="text"
                                          value={project.title}
                                          onChange={(e) => {
                                            const projects = [...profileForm.projects];
                                            projects[originalIndex].title = e.target.value;
                                            setProfileForm({ ...profileForm, projects });
                                          }}
                                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-100 w-full focus:border-orange-400 outline-none font-sans"
                                        />
                                      </div>

                                      <div className="flex flex-col space-y-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Category Tag:</label>
                                        <select
                                          value={project.category}
                                          onChange={(e) => {
                                            const projects = [...profileForm.projects];
                                            projects[originalIndex].category = e.target.value as any;
                                            setProfileForm({ ...profileForm, projects });
                                          }}
                                          className="pl-2.5 pr-8 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-xs text-slate-800 dark:text-slate-150 cursor-pointer focus:border-orange-400 outline-none w-full"
                                        >
                                          <option value="App Development">App Development</option>
                                          <option value="Web Development">Web Development</option>
                                          <option value="Design">UI/UX Design</option>
                                          <option value="Mentorship">Mentorship</option>
                                          <option value="Blog">Technical Blog</option>
                                        </select>
                                      </div>

                                      <div className="flex flex-col space-y-1">
                                        <label className="text-[9px] font-bold text-slate-400 uppercase font-mono">Image URL (Fallback / External):</label>
                                        <input
                                          type="url"
                                          value={project.imageUrl.startsWith('data:') ? 'Local base64 image file uploaded' : project.imageUrl}
                                          disabled={project.imageUrl.startsWith('data:')}
                                          onChange={(e) => {
                                            const projects = [...profileForm.projects];
                                            projects[originalIndex].imageUrl = e.target.value;
                                            setProfileForm({ ...profileForm, projects });
                                          }}
                                          className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-[11px] disabled:opacity-60 disabled:cursor-not-allowed text-slate-705 dark:text-slate-350 focus:border-orange-400 outline-none w-full"
                                          placeholder="https://images.unsplash.com/photo-..."
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* Expandable Project Details (Like Blog Post) */}
                                  <div className="pt-2.5 border-t border-slate-101 dark:border-slate-800/65">
                                    <details className="group">
                                      <summary className="text-[10px] uppercase tracking-wider font-bold text-orange-500 hover:text-orange-600 flex items-center justify-between cursor-pointer select-none">
                                        <span>Detailed Information & Links (Optional)</span>
                                        <span className="transition-transform group-open:rotate-180">&darr;</span>
                                      </summary>
                                      
                                      <div className="mt-3 space-y-3 pt-2">
                                        <div className="flex flex-col space-y-1">
                                          <label className="text-[9px] font-bold text-slate-400 uppercase">Short Description:</label>
                                          <textarea
                                            rows={2}
                                            value={project.description || ''}
                                            onChange={(e) => {
                                              const projects = [...profileForm.projects];
                                              projects[originalIndex].description = e.target.value;
                                              setProfileForm({ ...profileForm, projects });
                                            }}
                                            className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-transparent text-[11px] text-slate-700 dark:text-slate-100 w-full focus:border-orange-400 outline-none font-sans"
                                            placeholder="E.g. A brief overview of the project"
                                          />
                                        </div>

                                        <div className="flex flex-col space-y-1">
                                          <label className="text-[9px] font-bold text-slate-400 uppercase">Technologies:</label>
                                          <input
                                            type="text"
                                            value={project.technologies || ''}
                                            onChange={(e) => {
                                              const projects = [...profileForm.projects];
                                              projects[originalIndex].technologies = e.target.value;
                                              setProfileForm({ ...profileForm, projects });
                                            }}
                                            className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-transparent text-[11px] text-slate-700 dark:text-slate-100 w-full"
                                            placeholder="E.g. React.js, Tailwind CSS, Node.js"
                                          />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="flex flex-col space-y-1">
                                            <label className="text-[9px] font-bold text-slate-400 uppercase">GitHub Link:</label>
                                            <input
                                              type="url"
                                              value={project.githubUrl || ''}
                                              onChange={(e) => {
                                                const projects = [...profileForm.projects];
                                                projects[originalIndex].githubUrl = e.target.value;
                                                setProfileForm({ ...profileForm, projects });
                                              }}
                                              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-transparent text-[11px] text-slate-700 dark:text-slate-100 w-full"
                                              placeholder="https://github.com/..."
                                            />
                                          </div>
                                          <div className="flex flex-col space-y-1">
                                            <label className="text-[9px] font-bold text-slate-400 uppercase">Live Demo Link:</label>
                                            <input
                                              type="url"
                                              value={project.liveUrl || ''}
                                              onChange={(e) => {
                                                const projects = [...profileForm.projects];
                                                projects[originalIndex].liveUrl = e.target.value;
                                                setProfileForm({ ...profileForm, projects });
                                              }}
                                              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-800 bg-transparent text-[11px] text-slate-700 dark:text-slate-100 w-full"
                                              placeholder="https://..."
                                            />
                                          </div>
                                        </div>

                                        <div className="flex flex-col space-y-1">
                                          <div className="flex justify-between items-center">
                                            <label className="text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1">
                                              <span>Detailed Project Content (Markdown / Blog style):</span>
                                            </label>
                                            <span className="text-[8px] text-slate-400 font-mono">Supports: # Headers, - Lists, **Bold**</span>
                                          </div>
                                          <MarkdownEditor
                                            editorId={`project-editor-${originalIndex}`}
                                            value={project.details || ''}
                                            onChange={(newDetails) => {
                                              const projects = [...profileForm.projects];
                                              projects[originalIndex].details = newDetails;
                                              setProfileForm({ ...profileForm, projects });
                                            }}
                                            placeholder="## Overview&#10;Describe your project modules, setup steps, architectural decisions, and design details exactly like a rich technical blog post."
                                            templateType="project"
                                          />
                                        </div>
                                      </div>
                                    </details>
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                      </motion.div>
                    )}
                               {/* SUBTAB CONTENT: CONTACT PAGE */}
                    {profileSubTab === 'contact' && (
                      <motion.div
                        key="subtab-contact"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        className="space-y-8 font-sans"
                      >
                      {/* SECTION 2: Contact Options & Headings Config */}
                      <div className="space-y-4">
                        <h4 className="text-xs uppercase font-bold text-orange-500 tracking-wider">
                          Contact Page Headings Config
                        </h4>
                        <div className="flex flex-col space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Contact Section Main Title:</label>
                          <input
                            type="text"
                            value={profileForm.contactTitle || 'Contact'}
                            onChange={(e) => setProfileForm({ ...profileForm, contactTitle: e.target.value })}
                            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-sm focus:border-orange-400 outline-none transition-colors"
                            placeholder="E.g. Let's Connect!"
                            required
                          />
                        </div>
                        <div className="flex flex-col space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Contact Section Caption Paragraph:</label>
                          <textarea
                            rows={4}
                            value={profileForm.contactDescription || ''}
                            onChange={(e) => setProfileForm({ ...profileForm, contactDescription: e.target.value })}
                            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-800 dark:text-slate-100 text-sm focus:border-orange-400 outline-none transition-colors font-sans"
                            placeholder="Write details for the Contact caption text..."
                            required
                          />
                        </div>
                      </div>
                      </motion.div>
                    )}

                    {/* SUBTAB CONTENT: BLOG SETTINGS */}
                    {profileSubTab === 'blog' && (
                      <motion.div
                        key="subtab-blog"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.12 }}
                        className="space-y-8 font-sans"
                      >
                      <div className="space-y-4">
                        <h4 className="text-xs uppercase font-bold text-pink-500 tracking-wider flex items-center gap-2">
                          <BookOpen className="w-4 h-4" />
                          <span>Blog Configuration</span>
                        </h4>

                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/15 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 select-none">
                          <div className="space-y-0.5">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Enable Portfolio Blog
                            </span>
                            <p className="text-[10px] text-slate-400">
                              Toggle whether the Blog section is visible and accessible to the public.
                            </p>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => setProfileForm({ ...profileForm, blogEnabled: !profileForm.blogEnabled })}
                            className={`w-11 h-6 p-0.5 rounded-full duration-200 cursor-pointer border flex items-center ${
                              profileForm.blogEnabled 
                                ? 'bg-orange-500 border-orange-600 text-white' 
                                : 'bg-slate-300 dark:bg-slate-700 border-slate-400 dark:border-slate-600'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-full bg-white shadow-md duration-200 ${
                              profileForm.blogEnabled ? 'translate-x-5' : 'translate-x-0'
                            }`} />
                          </button>
                        </div>

                        <div className="flex flex-col space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Blog Directory / Category Title:</label>
                          <input
                            type="text"
                            value={profileForm.blogTitle || ''}
                            onChange={(e) => setProfileForm({ ...profileForm, blogTitle: e.target.value })}
                            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-850 dark:text-slate-100 text-sm focus:border-orange-400 outline-none transition-colors"
                            placeholder="E.g. Engineering Log, Tech Insights, etc."
                            required
                          />
                        </div>

                        <div className="flex flex-col space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Blog Section Caption Paragraph:</label>
                          <textarea
                            rows={3}
                            value={profileForm.blogDescription || ''}
                            onChange={(e) => setProfileForm({ ...profileForm, blogDescription: e.target.value })}
                            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent text-slate-850 dark:text-slate-100 text-sm focus:border-orange-400 outline-none transition-colors font-sans"
                            placeholder="Briefly state what this blog section covers..."
                            required
                          />
                        </div>
                      </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* BOTTOM SAVE CONTROLLER ROW */}
                  <div className="pt-5 border-t border-slate-100 dark:border-slate-800/60 flex justify-end">
                    <button
                      id="btn-save-profile-bottom"
                      type="submit"
                      disabled={profileSaveStatus.loading}
                      className="px-8 py-3 rounded-xl font-bold font-sans text-sm text-white bg-gradient-to-r from-orange-500 to-red-600 shadow-md hover:from-orange-600 hover:to-red-700 select-none cursor-pointer duration-200"
                    >
                      {profileSaveStatus.loading ? 'Saving live schema...' : 'Save Portfolio Details'}
                    </button>
                  </div>
                </motion.form>
              )}

              {/* CONTACT INBOX TAB */}
              {adminActiveTab === 'inbox' && (
                <motion.div
                  key="admin-inbox-pane"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-5 space-y-5 text-left"
                >
                  <div className="flex items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                    <h3 className="text-lg font-display font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Mail className="w-5 h-5 text-orange-500" />
                      <span>Contact Submission Inbox ({messages.length})</span>
                    </h3>
                  </div>

                  {messagesError && (
                    <div className="p-4 bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{messagesError}</span>
                    </div>
                  )}

                  {messagesLoading ? (
                    <div className="py-12 text-center text-slate-400 font-mono text-xs">
                      Loading Firestore Records...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-16 text-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center space-y-2">
                      <Mail className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                      <p className="text-sm font-sans">Inbox is completely clear!</p>
                      <p className="text-xs">No users have filled out the contact form yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                      {messages.map((msg) => (
                        <div
                          key={msg.id}
                          className="p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/65 bg-slate-50/40 dark:bg-slate-900/20 space-y-2.5 transition-all hover:bg-slate-50/70"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="text-sm font-bold text-slate-850 dark:text-slate-200">
                                {msg.name}
                              </h4>
                              <a
                                href={`mailto:${msg.email}`}
                                className="text-xs text-orange-500 hover:underline inline-block font-sans break-all"
                              >
                                {msg.email}
                              </a>
                            </div>

                            <div className="flex items-center gap-2">
                              {msg.createdAt && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {msg.createdAt.toDate ? msg.createdAt.toDate().toLocaleDateString() : new Date(msg.createdAt).toLocaleDateString()}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmationId(msg.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 shrink-0 cursor-pointer"
                                title="Delete Message"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <div className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-lg text-xs leading-5 text-slate-600 dark:text-slate-400 whitespace-pre-wrap select-text">
                            {msg.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {/* RESUME FILES TAB */}
              {adminActiveTab === 'resume' && (
                <motion.div
                  key="admin-resume-pane"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-6 space-y-6 text-left"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/60">
                    <div>
                      <h3 className="text-lg font-display font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-orange-500" />
                        <span>Curriculum Vitae (CV) Manager</span>
                      </h3>
                      <p className="text-xs text-slate-450 dark:text-slate-500 mt-1">
                        Upload or replace your professional resume file. Visitors can view/download this directly from your portfolio sidebar.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                    {/* LEFT COLUMN: ACTIVE RESUME DETAILS & STATUS */}
                    <div className="flex flex-col bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 justify-between space-y-5">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2. w-2 relative">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${activeResume ? 'bg-emerald-400' : 'bg-amber-400'} opacity-75`}></span>
                            <span className={`relative inline-flex rounded-full h-2 w-2 ${activeResume ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                            Active Resume Status in Firestore
                          </span>
                        </div>

                        {activeResume ? (
                          <div className="flex items-start gap-4">
                            <div className="p-4 bg-orange-500/10 dark:bg-orange-500/5 text-orange-500 rounded-xl border border-orange-500/20 shrink-0">
                              <FileText className="w-8 h-8" />
                            </div>
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <h4 className="font-semibold text-sm text-slate-705 dark:text-slate-300 break-all leading-tight">
                                {activeResume.fileName}
                              </h4>
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                                <div>
                                  <span className="text-slate-401 dark:text-slate-600 block">File Size</span>
                                  <span className="font-semibold text-slate-605 dark:text-slate-400">
                                    {(activeResume.size / 1024).toFixed(2)} KB
                                  </span>
                                </div>
                                <div>
                                  <span className="text-slate-401 dark:text-slate-600 block">Last Active</span>
                                  <span className="font-semibold text-slate-605 dark:text-slate-400 text-[9px] truncate block" title={activeResume.updatedAt}>
                                    {activeResume.updatedAt.split(',')[0] || activeResume.updatedAt}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-4 py-3">
                            <div className="p-4 bg-slate-300/10 text-slate-400 rounded-xl border border-dashed border-slate-300 shrink-0 dark:border-slate-800">
                              <FileText className="w-8 h-8" />
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-slate-550 dark:text-slate-400">
                                No custom file found.
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                                Your portfolio currently uses the default text-based CV layout.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Active Actions */}
                      {activeResume && (
                        <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800/60 w-full">
                          <button
                            type="button"
                            onClick={handleDownloadActiveCurrent}
                            disabled={downloadingActive}
                            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 border border-slate-200 dark:border-slate-800 hover:border-orange-400/50 dark:hover:border-slate-705 transition-all cursor-pointer disabled:opacity-50 flex-1 min-w-[130px]"
                          >
                            <Download className={`w-3.5 h-3.5 text-orange-500 ${downloadingActive ? 'animate-bounce' : ''}`} />
                            <span>{downloadingActive ? 'Retrieving...' : 'Download'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowResumeDeleteConfirm(true)}
                            disabled={deletingActive}
                            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-red-50/40 dark:bg-red-950/10 hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-950/40 hover:border-red-200 dark:hover:border-red-900/60 transition-all cursor-pointer disabled:opacity-50 flex-1 min-w-[110px]"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            <span>{deletingActive ? 'Deleting...' : 'Delete File'}</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* RIGHT COLUMN: INTERACTIVE UPLOAD SECTION */}
                    <div className="flex flex-col space-y-4 justify-between">
                      {/* Interactive Drag Drop uploads */}
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => document.getElementById('resume-file-input')?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all h-full min-h-[170px] ${
                          isDragging 
                            ? 'border-orange-500 bg-orange-500/5 scale-[0.99] shadow-inner shadow-orange-500/5' 
                            : 'border-slate-200 dark:border-slate-800 hover:border-orange-400 dark:hover:border-slate-700 bg-slate-50/20 dark:bg-slate-950/5'
                        }`}
                      >
                        <input
                          id="resume-file-input"
                          type="file"
                          accept=".pdf"
                          onChange={handleFileChange}
                          className="hidden"
                        />
                        <div className={`p-3 rounded-full mb-3 transition-colors ${isDragging ? 'bg-orange-500/15 text-orange-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-550'}`}>
                          <Upload className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-sans font-bold text-slate-700 dark:text-slate-300">
                          Click to browse or drag & drop PDF
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 max-w-[210px] leading-relaxed">
                          Only PDF documents (.pdf) up to <b className="text-slate-550 dark:text-slate-400 font-bold">1 MB</b> are supported
                        </span>
                      </div>

                      {/* Chosen draft file block */}
                      {resumeFile && (
                        <div className="flex items-center justify-between p-3.5 bg-orange-50/45 dark:bg-orange-950/10 border border-orange-100 dark:border-orange-900/30 rounded-xl animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="min-w-0 pr-3 flex items-center gap-3">
                            <span className="p-2 bg-rose-500/10 text-rose-500 rounded-lg text-[10px] font-bold font-sans">
                              PDF
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate leading-4">
                                {resumeFile.name}
                              </p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                                {(resumeFile.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setResumeFile(null)}
                              className="p-1 px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 text-slate-550 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Cancel upload"
                            >
                              Discard
                            </button>

                            <button
                              type="button"
                              onClick={handleUploadResume}
                              disabled={uploadStatus.loading}
                              className="px-4 py-1.5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-bold text-xs rounded-lg transition-all cursor-pointer font-sans shadow-sm hover:shadow-md shadow-orange-500/10"
                            >
                              {uploadStatus.loading ? 'Saving...' : 'Upload'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Operational Status Feedbacks */}
                  {(uploadStatus.success || uploadStatus.error) && (
                    <div className="pt-2 animate-in fade-in duration-250">
                      {uploadStatus.success && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                          <span>Action completed successfully! Your records are up-to-date in Firestore.</span>
                        </div>
                      )}
                      {uploadStatus.error && (
                        <div className="p-3 bg-rose-50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                          <span>{uploadStatus.error}</span>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* BLOG WRITING & MANAGER TAB */}
              {adminActiveTab === 'blog' && (
                <motion.div
                  key="admin-blog-pane"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-6 space-y-6 text-left animate-fade-in"
                >
                  {/* Blog Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800/60 font-sans">
                    <div>
                      <h3 className="text-lg font-display font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-orange-500 animate-pulse" />
                        <span>Technical BlogPost Manager</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Write and edit articles. Drafts are safely cached, and published posts show up on your live blog instantly.
                      </p>
                    </div>

                    {!editingBlog && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBlog({
                            title: '',
                            excerpt: '',
                            content: '',
                            status: 'draft',
                            tags: [],
                            coverImage: ''
                          });
                          setIsNewBlog(true);
                          setBlogSaveStatus({});
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer font-sans whitespace-nowrap shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Write New Post</span>
                      </button>
                    )}
                  </div>

                  {/* LIST OR FORM RENDER SWITCHER */}
                  {editingBlog ? (
                    /* BLOG POST EDITOR FORM */
                    <form onSubmit={handleSaveBlog} className="space-y-6 animate-fade-in font-sans">
                      {/* Top editor navigation subheader */}
                      <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/20 px-4 py-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
                        <div className="flex items-center gap-2">
                          <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                          <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                            {isNewBlog ? 'New Entry Workspace' : 'Editing Saved Entry'}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingBlog(null)}
                            className="px-3 py-1 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            Discard & Leave
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* LEFT COLUMN: PRIMARY WORKSPACE (2/3 width) */}
                        <div className="lg:col-span-2 space-y-5 text-left">
                          {/* Title Input */}
                          <div className="flex flex-col space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-350 tracking-wide flex items-center gap-1.5">
                              <BookOpen className="w-3.5 h-3.5 text-orange-500" />
                              <span>Article Title</span>
                            </label>
                            <input
                              type="text"
                              value={editingBlog.title || ''}
                              onChange={(e) => setEditingBlog({ ...editingBlog, title: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-sm font-semibold placeholder:text-slate-450 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all shadow-xs"
                              placeholder="e.g., Deep Dive into React Compiler and State Optimization..."
                              required
                            />
                          </div>

                          {/* Excerpt Input */}
                          <div className="flex flex-col space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-350 tracking-wide flex items-center gap-1.5">
                              <FileText className="w-3.5 h-3.5 text-slate-400" />
                              <span>Short Summary / Excerpt</span>
                            </label>
                            <textarea
                              rows={2.5}
                              value={editingBlog.excerpt || ''}
                              onChange={(e) => setEditingBlog({ ...editingBlog, excerpt: e.target.value })}
                              className="w-full px-4 py-2.5 rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs placeholder:text-slate-450 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all resize-none shadow-xs"
                              placeholder="Provide a compelling 1-2 sentence preview to engage readers on the main listing grid..."
                              required
                            />
                          </div>

                          {/* Tags & Categories card */}
                          <div className="flex flex-col space-y-1.5">
                            <label className="text-xs font-bold text-slate-700 dark:text-slate-350 tracking-wide flex items-center gap-1.5">
                              <Tag className="w-3.5 h-3.5 text-orange-500" />
                              <span>Tags / Categories</span>
                            </label>
                            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 space-y-3 shadow-xs">
                              <input
                                type="text"
                                value={editingBlog.tags ? editingBlog.tags.join(', ') : ''}
                                onChange={(e) => {
                                  const tagsArray = e.target.value.split(',').map(t => t.trim()).filter(Boolean);
                                  setEditingBlog({ ...editingBlog, tags: tagsArray });
                                }}
                                className="w-full px-3 py-2 rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none"
                                placeholder="React, TypeScript, Optimization..."
                              />
                              <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-normal">
                                Separate each category with a comma. These tags will be searchable and filterable.
                              </p>
                              {editingBlog.tags && editingBlog.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {editingBlog.tags.map((tag: string, i: number) => (
                                    <span key={i} className="px-2.5 py-0.5 rounded bg-orange-50 dark:bg-orange-950/30 text-[10px] font-bold text-orange-600 dark:text-orange-450 border border-orange-100 dark:border-orange-950/20">
                                      #{tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* RIGHT COLUMN: METADATA & SETTINGS SIDEBAR (1/3 width) */}
                        <div className="lg:col-span-1 space-y-5">
                          {/* Cover Image Settings Card */}
                          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 space-y-3.5 shadow-xs flex flex-col h-full justify-between">
                            <div className="space-y-3.5">
                              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                                  <Image className="w-3.5 h-3.5 text-orange-500" />
                                  <span>Cover Image</span>
                                </h4>
                                {editingBlog.coverImage && (
                                  <button
                                    type="button"
                                    onClick={() => setEditingBlog({ ...editingBlog, coverImage: '' })}
                                    className="text-[10px] text-rose-500 hover:text-rose-600 transition-colors cursor-pointer font-bold flex items-center gap-0.5"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>

                              {/* Live Cover Preview Container */}
                              <div className="relative aspect-video rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 flex flex-col justify-center items-center text-center p-3">
                                {editingBlog.coverImage ? (
                                  <>
                                    <img
                                      src={editingBlog.coverImage}
                                      alt="Cover Preview"
                                      className="absolute inset-0 w-full h-full object-cover z-0"
                                      referrerPolicy="no-referrer"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400';
                                      }}
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 to-slate-950/10 p-2 z-10 flex flex-col items-start text-left">
                                      <span className="text-[8px] uppercase tracking-widest font-black text-orange-400 bg-orange-950/40 px-1 py-0.5 rounded border border-orange-950/10">Header Preview</span>
                                      <p className="text-[10px] text-white font-medium truncate w-full mt-1">
                                        {editingBlog.coverImage.startsWith('data:') 
                                          ? `Uploaded File (${(editingBlog.coverImage.length / 1024).toFixed(1)} KB)`
                                          : editingBlog.coverImage
                                        }
                                      </p>
                                    </div>
                                  </>
                                ) : (
                                  <div className="space-y-1.5 text-slate-400 dark:text-slate-600">
                                    <Image className="w-8 h-8 mx-auto stroke-[1.5] text-slate-350 dark:text-slate-705" />
                                    <div>
                                      <p className="text-[10px] font-bold text-slate-550 dark:text-slate-400">No Image Configured</p>
                                      <p className="text-[9px] text-slate-440 dark:text-slate-500 max-w-[180px] mx-auto mt-0.5 leading-normal">
                                        Enter a custom URL below or upload a compressed local image file
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2 mt-4">
                              {/* Text Input for URL */}
                              <div className="relative">
                                <input
                                  type="text"
                                  value={editingBlog.coverImage && editingBlog.coverImage.startsWith('data:') ? 'Local Image File Uploaded' : (editingBlog.coverImage || '')}
                                  disabled={!!(editingBlog.coverImage && editingBlog.coverImage.startsWith('data:'))}
                                  onChange={(e) => setEditingBlog({ ...editingBlog, coverImage: e.target.value })}
                                  className="w-full px-3 py-2 rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 text-xs focus:ring-1 focus:ring-orange-500 focus:border-orange-500 outline-none disabled:bg-slate-50 dark:disabled:bg-slate-955/40 disabled:text-slate-400 pr-8"
                                  placeholder="Paste Unsplash or external image URL..."
                                />
                                {editingBlog.coverImage && editingBlog.coverImage.startsWith('data:') && (
                                  <div className="absolute right-3 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" title="Local upload active" />
                                )}
                              </div>

                              {/* Upload Button Trigger & Input */}
                              <button
                                type="button"
                                onClick={() => document.getElementById('blog-cover-upload-file')?.click()}
                                className="w-full flex items-center justify-center gap-1.5 bg-white dark:bg-slate-955 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 transition duration-250 cursor-pointer shadow-xs"
                              >
                                <Upload className="w-3.5 h-3.5 text-slate-500" />
                                <span>Upload Image File</span>
                              </button>
                              <input
                                id="blog-cover-upload-file"
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const base64 = await compressAndResizeImage(file);
                                    setEditingBlog({ ...editingBlog, coverImage: base64 });
                                  } catch (err) {
                                    console.error('Image upload/compression failed:', err);
                                    alert('Could not set cover image. Please check image format and try again.');
                                  }
                                  e.target.value = '';
                                }}
                                className="hidden"
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ARTICLE BODY (MARKDOWN SUPPORTED) Spans FULL WIDTH */}
                      <div className="flex flex-col space-y-2 text-left pt-6 border-t border-slate-150 dark:border-slate-800/60">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-350 tracking-wide flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
                          <span>Article Body (Markdown Supported)</span>
                        </label>
                        <div className="border border-slate-150 dark:border-slate-800/80 rounded-2xl overflow-hidden focus-within:ring-1 focus-within:ring-orange-500 focus-within:border-orange-500 shadow-xs">
                          <MarkdownEditor
                            editorId="blog-editor-field"
                            value={editingBlog.content || ''}
                            onChange={(newContent) => setEditingBlog({ ...editingBlog, content: newContent })}
                            placeholder="Start writing your thoughts, tutorial guides, or system architectural notes. You can use standard Markdown tags, lists, links, and code blocks..."
                            templateType="blog"
                          />
                        </div>
                      </div>

                      {/* PUBLISHING SETTINGS (Full-width card, matching design template in image) */}
                      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 space-y-4 shadow-xs text-left">
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5 border-b border-slate-150 dark:border-slate-800/50 pb-2.5">
                          <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                          <span>Publishing Settings</span>
                        </h4>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest font-mono">Current Status:</span>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black font-sans uppercase tracking-widest border ${
                              editingBlog.status === 'published' 
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' 
                                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            }`}>
                              {editingBlog.status || 'draft'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setEditingBlog({ ...editingBlog, status: 'draft' })}
                              className={`px-6 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 min-w-[130px] justify-center ${
                                editingBlog.status === 'draft'
                                  ? 'bg-amber-550 text-white shadow-md shadow-amber-500/20 bg-orange-500'
                                  : 'bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              <span className="w-2 h-2 rounded-full bg-current" />
                              <span>Keep Draft</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingBlog({ ...editingBlog, status: 'published' })}
                              className={`px-6 py-3 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 min-w-[130px] justify-center ${
                                editingBlog.status === 'published'
                                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                  : 'bg-white hover:bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Publish Now</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Error & Success persistent feedback messages from DB */}
                      {blogSaveStatus.error && (
                        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/15 border border-rose-100 dark:border-rose-950/30 text-rose-600 dark:text-rose-400 rounded-xl text-xs flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                          <span>{blogSaveStatus.error}</span>
                        </div>
                      )}

                      {blogSaveStatus.success && (
                        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/15 border border-emerald-100 dark:border-emerald-900/10 text-emerald-600 dark:text-emerald-450 rounded-xl text-xs flex items-center gap-2 animate-pulse">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                          <span>Awesome! Blog post safely logged and updated in databases.</span>
                        </div>
                      )}

                      {/* Controls Footer buttons */}
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/60 font-sans">
                        <span className="text-[10px] text-slate-400 font-mono hidden md:inline-block">
                          {isNewBlog ? 'New entries default to local memory' : `ID: ${editingBlog.id}`}
                        </span>

                        <div className="flex items-center gap-2.5 ml-auto">
                          <button
                            type="button"
                            onClick={() => setEditingBlog(null)}
                            className="px-4.5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>

                          <button
                            type="submit"
                            disabled={blogSaveStatus.loading}
                            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all cursor-pointer font-sans flex items-center gap-1.5"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>{blogSaveStatus.loading ? 'Saving Entry...' : 'Save & Close'}</span>
                          </button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    /* BLOG POST LIST MANAGER ROWS */
                    <div className="space-y-4 font-sans animate-fade-in">
                      {blogsLoading ? (
                        <div className="py-20 text-center space-y-2">
                          <div className="inline-block w-6 h-6 rounded-full border-4 border-slate-100 dark:border-slate-800 border-t-orange-500 animate-spin" />
                          <p className="text-[10px] text-slate-400 font-mono animate-pulse">Syncing complete logs list...</p>
                        </div>
                      ) : allBlogs.length === 0 ? (
                        <div className="py-16 text-center border border-dashed border-slate-150 dark:border-slate-800 rounded-3xl space-y-3">
                          <div className="inline-flex p-3 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400">
                            <BookOpen className="w-6 h-6 stroke-[1.8]" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No blog posts found</p>
                            <p className="text-[10px] text-slate-400 max-w-xs mx-auto leading-relaxed mt-1">
                              You haven't written or logged any articles yet. Create your very first technical post!
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl overflow-hidden bg-slate-50/10 dark:bg-slate-900/40">
                          {allBlogs.map((blog) => (
                            <div key={blog.id} className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900/20 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                <div className="w-12 h-12 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-800 shrink-0 flex items-center justify-center">
                                  {blog.coverImage ? (
                                    <img src={blog.coverImage} alt={blog.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <BookOpen className="w-5 h-5 text-slate-400" />
                                  )}
                                </div>

                                <div className="min-w-0 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-xs font-bold text-slate-805 dark:text-slate-150 truncate max-w-sm">
                                      {blog.title}
                                    </h4>
                                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-extrabold uppercase shrink-0 ${
                                      blog.status === 'published' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-450' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                    }`}>
                                      {blog.status}
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                    Last Updated: {blog.updatedAt ? (blog.updatedAt.toDate ? blog.updatedAt.toDate().toLocaleDateString() : new Date(blog.updatedAt).toLocaleDateString()) : 'Recently'}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingBlog(blog);
                                    setIsNewBlog(false);
                                    setBlogSaveStatus({});
                                  }}
                                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-orange-500/50 text-slate-650 dark:text-slate-350 hover:text-orange-500 text-[10px] font-bold bg-white dark:bg-slate-900 transition-colors cursor-pointer"
                                >
                                  Edit Post
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setBlogToDelete(blog)}
                                  className="px-3 py-1.5 rounded-lg border border-rose-100 dark:border-rose-950/40 hover:border-rose-300 text-rose-600 dark:text-rose-400 text-[10px] font-bold bg-rose-50/20 dark:bg-rose-950/10 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal for Contact Deletions */}
      <AnimatePresence>
        {deleteConfirmationId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmationId(null)}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4 text-left"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 shrink-0">
                  <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="space-y-1.5 flex-grow">
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 font-display">
                    Delete Contact Message?
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-sans">
                    Are you absolutely sure you want to delete this submission forever? This action is permanent and cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pr-0.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmationId(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold font-sans text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeDeleteMessage}
                  className="px-4 py-2 rounded-xl text-xs font-semibold font-sans text-white bg-rose-500 hover:bg-rose-600 shadow-sm transition-colors cursor-pointer"
                >
                  Delete Forever
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal for Resume Deletions */}
      <AnimatePresence>
        {showResumeDeleteConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowResumeDeleteConfirm(false)}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4 text-left"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-full bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 shrink-0">
                  <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="space-y-1.5 flex-grow">
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 font-display">
                    Delete Custom Resume/CV?
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-sans">
                    Are you absolutely sure you want to delete your custom uploaded resume from Firestore? Visitors will instantly see the default text/portfolio representation on your web card.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pr-0.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => setShowResumeDeleteConfirm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold font-sans text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteActiveResume}
                  disabled={deletingActive}
                  className="px-4 py-2 rounded-xl text-xs font-semibold font-sans text-white bg-rose-500 hover:bg-rose-600 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {deletingActive ? 'Deleting...' : 'Delete Forever'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Confirmation Modal for Blog Deletions */}
      <AnimatePresence>
        {blogToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 select-none">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setBlogToDelete(null)}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', duration: 0.35 }}
              className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-4 text-left"
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-full bg-rose-100 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 shrink-0">
                  <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div className="space-y-1.5 flex-grow">
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-100 font-display">
                    Delete Blog Article?
                  </h4>
                  <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400 font-sans">
                    Are you absolutely sure you want to delete <b className="text-slate-700 dark:text-slate-350">{blogToDelete.title}</b> forever? This action is permanent and cannot be undone from databases.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pr-0.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => setBlogToDelete(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold font-sans text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteBlog}
                  className="px-4 py-2 rounded-xl text-xs font-semibold font-sans text-white bg-rose-500 hover:bg-rose-600 shadow-sm transition-colors cursor-pointer"
                >
                  Delete Forever
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
