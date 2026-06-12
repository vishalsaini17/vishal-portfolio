/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import {
  SocialLink,
  ContactInfo,
  ServiceCard,
  EducationItem,
  ExperienceItem,
  ProjectItem,
  HomeSection,
  HomeSectionCard,
  ResumeSection,
  ResumeSectionCard,
} from './types';

export interface ProfileDetails {
  profileName: string;
  profileTitle: string;
  profileAvatar: string;
  socialLinks: SocialLink[];
  contactInfo: ContactInfo;
  services: ServiceCard[];
  educationHistory: EducationItem[];
  experienceHistory: ExperienceItem[];
  workSkills: string[];
  softSkills: string[];
  projects: ProjectItem[];
  aboutTitle?: string;
  aboutDescription?: string;
  homeSections?: HomeSection[];
  resumeSections?: ResumeSection[];
  contactTitle?: string;
  contactDescription?: string;
  blogTitle?: string;
  blogDescription?: string;
  blogEnabled?: boolean;
}

interface ProfileContextType {
  profile: ProfileDetails;
  loading: boolean;
  saveProfile: (updatedProfile: ProfileDetails) => Promise<void>;
}

const defaultProfile: ProfileDetails = {
  profileName: 'Vishal Saini',
  profileTitle: 'Senior Front-End Developer | React.js',
  profileAvatar: '',
  blogTitle: 'Tech Insights',
  blogDescription: 'My writings, logs, and thoughts on deep frontend tech, optimization and libraries.',
  blogEnabled: true,
  socialLinks: [
    {
      platform: 'linkedin',
      url: ''
    },
    {
      platform: 'github',
      url: 'https://github.com/vishalsaini17/vishal-portfolio'
    }
  ],
  contactInfo: {
    phone: [
      '+91-8467849784'
    ],
    email: 'vsaini17@hotmail.com',
    location: 'Gurugram, Haryana, India'
  },
  services: [
    {
      title: 'Frontend Development',
      description: 'Building scalable web applications using React.js and TypeScript.',
      iconName: 'code',
      colorTheme: 'orange'
    },
    {
      title: 'Micro Frontend Architecture',
      description: 'Developing scalable micro frontend applications using Webpack Module Federation.',
      iconName: 'layers',
      colorTheme: 'blue'
    },
    {
      title: 'Performance Optimization',
      description: 'Improving application performance, load times, rendering efficiency and Core Web Vitals.',
      iconName: 'zap',
      colorTheme: 'purple'
    },
    {
      title: 'UI Component Libraries',
      description: 'Creating reusable design systems and component libraries.',
      iconName: 'layout',
      colorTheme: 'amber'
    }
  ],
  educationHistory: [
    {
      period: '2013-2017',
      degree: 'B.Tech (Computer Science Engineering)',
      institution: 'DPG I.T.M (MDU)',
      width: '100%',
      description: 'Focused on Algorithms, Software Architecture, and Web Engineering. Graduated with honors.'
    },
    {
      period: '2012-2013',
      degree: 'Class 12 Science',
      institution: 'Happy Model Sr. Sec. School',
      width: '100%',
      description: 'Physics, Chemistry, and Mathematics specialization.'
    }
  ],
  experienceHistory: [
    {
      period: 'Dec 2024 - Present',
      role: 'Senior Software Engineer',
      company: 'Programming.com',
      width: '100%',
      description: 'Led development of enterprise react modules and modern web application layers.'
    },
    {
      period: 'Sep 2024 - Oct 2024',
      role: 'Senior Software Engineer',
      company: 'GlobalLogic',
      width: '100%',
      description: 'Designed advanced micro frontend pipelines utilizing federated asset delivery networks.'
    },
    {
      period: 'Aug 2022 - May 2024',
      role: 'Senior Software Developer',
      company: 'Kellton Tech Solutions',
      width: '100%',
      description: 'Developed scalable client dashboards using React, Redux Toolkit, and atomic UI frameworks.'
    },
    {
      period: 'Dec 2021 - Aug 2022',
      role: 'Senior Software Developer',
      company: 'Pristyn Care',
      width: '100%',
      description: 'Engineered high-performance medical billing software platforms with offline capability.'
    },
    {
      period: 'Feb 2020 - Dec 2021',
      role: 'Frontend Developer',
      company: 'Sprinklr',
      width: '100%',
      description: 'Developed modern microservices interfaces for leading social media analytics systems.'
    },
    {
      period: 'Oct 2017 - Feb 2020',
      role: 'UI Developer',
      company: 'Bhadani Technologies',
      width: '100%',
      description: 'Crafted dynamic wireframes and pixel-perfect interactive web views using SCSS and React.'
    },
    {
      period: 'Oct 2017 - Feb 2020',
      role: 'Frontend Developer',
      company: 'Z1-Media',
      width: '100%',
      description: 'Collaborated on rich ad network delivery SDKs and real-time publisher dashboards.'
    }
  ],
  workSkills: [
    'React.js',
    'Redux Toolkit',
    'JavaScript',
    'TypeScript',
    'GraphQL',
    'REST API',
    'HTML5',
    'CSS3',
    'SCSS',
    'Git',
    'GitHub',
    'Bitbucket',
    'Jest',
    'MUI',
    'Theme UI',
    'Bootstrap',
    'jQuery',
    'Chart.js',
    'Node.js',
    'WordPress',
    'MySQL'
  ],
  softSkills: [
    'Leadership',
    'Communication',
    'Mentorship',
    'Problem Solving',
    'Team Collaboration',
    'Agile Development'
  ],
  projects: [
    {
      title: 'SupportLogic Analytics Dashboard',
      category: 'Enterprise Analytics',
      imageUrl: '',
      description: 'An AI-driven enterprise analytics dashboard providing real-time ticket triage and sentiment analysis scores.',
      technologies: 'React.js, Redux Toolkit, Tailwind CSS, Recharts, D3.js',
      githubUrl: 'https://github.com/vishalsaini17/vishal-portfolio',
      liveUrl: 'https://supportlogic.com',
      details: '## Overview\nSupportLogic Analytics is a responsive high-performance dashboard that empowers support and success teams by extracting emotional intelligence and priority signals from incoming tickets.\n\n### Core Deliverables & Architecture\n- Built premium scalable visual representation components using Recharts & D3 for real-time customer data streaming.\n- Implemented dynamic customer health state rules configured via Webhooks.\n- Achieved 45% reduction in page load latency by tuning memory caching and query configurations.'
    },
    {
      title: 'KFC Loyalty System',
      category: 'Loyalty Platform',
      imageUrl: '',
      description: 'A cloud-based loyalty ledger and campaign engine handling millions of customer scan actions smoothly.',
      technologies: 'React.js, TypeScript, Headless UI, Node.js, Firebase',
      githubUrl: 'https://github.com/vishalsaini17/vishal-portfolio',
      details: '## Legacy Reconstruction\nThis loyalty system acts as a high-throughput transaction scanner for automated points calculations and rewards distribution.\n\n### Key Contributions\n- Integrated high-fidelity barcode generation components for physical point-of-sale scanner actions.\n- Scaled server-side real-time state synchronization using Firestore listener hooks.'
    },
    {
      title: 'Evise.ai Form Builder',
      category: 'Workflow Automation',
      imageUrl: '',
      description: 'An advanced drag-and-drop form builder featuring dynamic conditional rendering and complex schemas.',
      technologies: 'React.js, Dnd-kit, Tailwind CSS, JSON Schema, React Hook Form',
      liveUrl: 'https://evise.ai',
      details: '## The Challenge\nBuilding a low-code UI where custom validation and interactive inputs can be designed visually without code.\n\n### Tech Stack & Features\n- Designed atomic field properties (text, date, select, upload) using React Hook Form.\n- Optimized layout shifting and coordinates computation during active drag interactions.'
    },
    {
      title: 'Pristyn AMP Dashboard',
      category: 'SEO Platform',
      imageUrl: '',
      description: 'Underlying tech delivering ultra-fast pixel-dense medical landing pages for improved SEO indexing.',
      technologies: 'Next.js, Tailwind CSS, Web Vitals Optimization',
      details: '## High Performance Optimization\nA heavy focus on Core Web Vitals (LCP, FID, CLS) to optimize high-traffic medical consultation portals.\n\n### Outcome\n- Shifted dynamic client loads to high-speed pre-rendered modules.\n- Achieved 98+ Lighthouse scores across thousands of highly nested medical pathways.'
    },
    {
      title: 'Access Corp Micro Frontend',
      category: 'Micro Frontend',
      imageUrl: '',
      description: 'A robust scalable core Shell hosting autonomous business microapps compiled on the fly.',
      technologies: 'React.js, Webpack Module Federation, Jest, Vite',
      githubUrl: 'https://github.com/vishalsaini17/vishal-portfolio',
      details: '## Micro-Frontend Orchestration\nCo-orchestrated the transition from a heavy monolith structure to micro-frontend modules.\n\n### Implementation Insights\n- Implemented custom shared authentication context and event buses across runtime borders.\n- Established strict unit testing rules reaching 90% coverage.'
    }
  ],
  aboutTitle: 'ABOUT ME',
  aboutDescription: "Hello there! I'm thrilled to welcome you to my portfolio. I am a passionate and versatile full-stack developer with a keen interest in exploring the latest cutting-edge technologies. My journey in the world of web development has been nothing short of exhilarating, and I constantly strive to enhance my skills and embrace emerging trends in the industry.",
  homeSections: [
    {
      id: 'default-grid-section',
      title: 'What I do!',
      type: 'grid',
      cards: [
        {
          id: 'card-1',
          title: 'Frontend Development',
          description: 'Building scalable web applications using React.js and TypeScript.',
          iconName: 'code',
          colorTheme: 'orange'
        },
        {
          id: 'card-2',
          title: 'Micro Frontend Architecture',
          description: 'Developing scalable micro frontend applications using Webpack Module Federation.',
          iconName: 'layers',
          colorTheme: 'blue'
        },
        {
          id: 'card-3',
          title: 'Performance Optimization',
          description: 'Improving application performance, load times, rendering efficiency and Core Web Vitals.',
          iconName: 'zap',
          colorTheme: 'purple'
        },
        {
          id: 'card-4',
          title: 'UI Component Libraries',
          description: 'Creating reusable design systems and component libraries.',
          iconName: 'layout',
          colorTheme: 'amber'
        }
      ]
    }
  ],
  resumeSections: [
    {
      id: 'default-edu-section',
      title: 'Education',
      iconName: 'GraduationCap',
      width: '50%',
      type: 'education',
      cards: [
        {
          id: 'edu-card-1',
          title: 'B.Tech (Computer Science Engineering)',
          subtitle: 'DPG I.T.M (MDU)',
          period: '2013-2017',
          width: '100%',
          description: 'Focused on Algorithms, Software Architecture, and Web Engineering. Graduated with honors.'
        },
        {
          id: 'edu-card-2',
          title: 'Class 12 Science',
          subtitle: 'Happy Model Sr. Sec. School',
          period: '2012-2013',
          width: '100%',
          description: 'Physics, Chemistry, and Mathematics specialization.'
        }
      ]
    },
    {
      id: 'default-exp-section',
      title: 'Experience',
      iconName: 'Briefcase',
      width: '50%',
      type: 'experience',
      cards: [
        {
          id: 'exp-card-1',
          title: 'Senior Software Engineer',
          subtitle: 'Programming.com',
          period: 'Dec 2024 - Present',
          width: '100%',
          description: 'Led development of enterprise react modules and modern web application layers.'
        },
        {
          id: 'exp-card-2',
          title: 'Senior Software Engineer',
          subtitle: 'GlobalLogic',
          period: 'Sep 2024 - Oct 2024',
          width: '100%',
          description: 'Designed advanced micro frontend pipelines utilizing federated asset delivery networks.'
        },
        {
          id: 'exp-card-3',
          title: 'Senior Software Developer',
          subtitle: 'Kellton Tech Solutions',
          period: 'Aug 2022 - May 2024',
          width: '100%',
          description: 'Developed scalable client dashboards using React, Redux Toolkit, and atomic UI frameworks.'
        },
        {
          id: 'exp-card-4',
          title: 'Senior Software Developer',
          subtitle: 'Pristyn Care',
          period: 'Dec 2021 - Aug 2022',
          width: '100%',
          description: 'Engineered high-performance medical billing software platforms with offline capability.'
        },
        {
          id: 'exp-card-5',
          title: 'Frontend Developer',
          subtitle: 'Sprinklr',
          period: 'Feb 2020 - Dec 2021',
          width: '100%',
          description: 'Developed modern microservices interfaces for leading social media analytics systems.'
        },
        {
          id: 'exp-card-6',
          title: 'UI Developer',
          subtitle: 'Bhadani Technologies',
          period: 'Oct 2017 - Feb 2020',
          width: '100%',
          description: 'Crafted dynamic wireframes and pixel-perfect interactive web views using SCSS and React.'
        },
        {
          id: 'exp-card-7',
          title: 'Frontend Developer',
          subtitle: 'Z1-Media',
          period: 'Oct 2017 - Feb 2020',
          width: '100%',
          description: 'Collaborated on rich ad network delivery SDKs and real-time publisher dashboards.'
        }
      ]
    },
    {
      id: 'default-skills-section',
      title: 'Work Skills',
      iconName: 'Code',
      width: '100%',
      type: 'skills'
    }
  ],
  contactTitle: 'Contact',
  contactDescription: 'I am always open to discussing new projects, opportunities in tech world, partnerships and more so mentorship.'
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<ProfileDetails>(defaultProfile);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'profile', 'details');
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          let rawSections = data.resumeSections ?? defaultProfile.resumeSections;
          const legacyEdu = data.educationHistory || defaultProfile.educationHistory || [];
          const legacyExp = data.experienceHistory || defaultProfile.experienceHistory || [];

          const migratedSections = rawSections.map((section: any) => {
            if (section.type === 'education' && (!section.cards || section.cards.length === 0)) {
              return {
                ...section,
                cards: legacyEdu.map((edu: any, index: number) => ({
                  id: `migrated-edu-${index}`,
                  title: edu.degree || '',
                  subtitle: edu.institution || '',
                  period: edu.period || '',
                  description: edu.description || '',
                  width: edu.width || '100%'
                }))
              };
            }
            if (section.type === 'experience' && (!section.cards || section.cards.length === 0)) {
              return {
                ...section,
                cards: legacyExp.map((exp: any, index: number) => ({
                  id: `migrated-exp-${index}`,
                  title: exp.role || '',
                  subtitle: exp.company || '',
                  period: exp.period || '',
                  description: exp.description || '',
                  width: exp.width || '100%'
                }))
              };
            }
            return section;
          });

          setProfile({
            profileName: data.profileName ?? defaultProfile.profileName,
            profileTitle: data.profileTitle ?? defaultProfile.profileTitle,
            profileAvatar: data.profileAvatar ?? defaultProfile.profileAvatar,
            socialLinks: (data.socialLinks ?? defaultProfile.socialLinks).map((link: any) => {
              if (link.platform === 'github' && (!link.url || link.url === '' || link.url === 'https://github.com')) {
                return { ...link, url: 'https://github.com/vishalsaini17/vishal-portfolio' };
              }
              return link;
            }),
            contactInfo: data.contactInfo ?? defaultProfile.contactInfo,
            services: data.services ?? defaultProfile.services,
            educationHistory: data.educationHistory ?? defaultProfile.educationHistory,
            experienceHistory: data.experienceHistory ?? defaultProfile.experienceHistory,
            workSkills: data.workSkills ?? defaultProfile.workSkills,
            softSkills: data.softSkills ?? defaultProfile.softSkills,
            projects: (data.projects ?? defaultProfile.projects).map((proj: any) => {
              if (!proj.githubUrl || proj.githubUrl === '' || proj.githubUrl === 'https://github.com') {
                return { ...proj, githubUrl: 'https://github.com/vishalsaini17/vishal-portfolio' };
              }
              return proj;
            }),
            aboutTitle: data.aboutTitle ?? defaultProfile.aboutTitle,
            aboutDescription: data.aboutDescription ?? defaultProfile.aboutDescription,
            homeSections: data.homeSections ?? defaultProfile.homeSections,
            resumeSections: migratedSections,
            contactTitle: data.contactTitle ?? defaultProfile.contactTitle,
            contactDescription: data.contactDescription ?? defaultProfile.contactDescription,
            blogTitle: data.blogTitle ?? defaultProfile.blogTitle,
            blogDescription: data.blogDescription ?? defaultProfile.blogDescription,
            blogEnabled: data.blogEnabled ?? defaultProfile.blogEnabled,
          });
        } else {
          setProfile(defaultProfile);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching live profile from Firestore:', error);
        setLoading(false);
        try {
          handleFirestoreError(error, OperationType.GET, 'profile/details');
        } catch (err) {
          // Keep it from crashing client-side initial mount if we have no permissions
        }
      }
    );

    return () => unsubscribe();
  }, []);

  const saveProfile = async (updatedProfile: ProfileDetails) => {
    const docRef = doc(db, 'profile', 'details');
    try {
      await setDoc(docRef, updatedProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'profile/details');
    }
  };

  return (
    <ProfileContext.Provider value={{ profile, loading, saveProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
