/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TabType = 'home' | 'resume' | 'work' | 'contact' | 'admin' | 'blog';

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  status: 'draft' | 'published';
  createdAt: any; // Firestore Timestamp
  updatedAt: any; // Firestore Timestamp
  tags?: string[];
  coverImage?: string;
}

export interface SocialLink {
  platform: 'facebook' | 'linkedin' | 'twitter' | 'github';
  url: string;
}

export interface ContactInfo {
  phone: string[];
  email: string;
  location: string;
}

export interface ServiceCard {
  title: string;
  description: string;
  iconName: string;
  colorTheme: 'orange' | 'blue' | 'purple' | 'amber';
}

export interface EducationItem {
  period: string;
  degree: string;
  institution: string;
  description?: string;
  width?: '25%' | '50%' | '75%' | '100%';
}

export interface ExperienceItem {
  period: string;
  role: string;
  company: string;
  description?: string;
  width?: '25%' | '50%' | '75%' | '100%';
}

export interface ProjectItem {
  title: string;
  category: string;
  imageUrl: string;
  description?: string;
  details?: string;
  githubUrl?: string;
  liveUrl?: string;
  technologies?: string;
}

export interface ContactFormInput {
  name: string;
  email: string;
  message: string;
}

export interface HomeSectionCard {
  id: string;
  title: string;
  description: string;
  iconName: string;
  colorTheme?: 'orange' | 'blue' | 'purple' | 'amber' | 'teal' | 'rose' | 'sky' | 'emerald';
  width?: '25%' | '50%' | '75%' | '100%';
}

export interface HomeSection {
  id: string;
  title: string;
  type: 'grid';
  cards: HomeSectionCard[];
}

export interface ResumeSectionCard {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  period?: string;
  iconName?: string;
  colorTheme?: 'orange' | 'blue' | 'purple' | 'amber' | 'teal' | 'rose' | 'sky' | 'emerald';
  width?: '25%' | '50%' | '75%' | '100%';
}

export interface ResumeSection {
  id: string;
  title: string;
  iconName: string;
  width: '25%' | '50%' | '75%' | '100%';
  type: 'education' | 'experience' | 'skills' | 'cards';
  cards?: ResumeSectionCard[];
  isNew?: boolean;
}


