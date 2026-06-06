/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Code,
  Smartphone,
  Palette,
  Users,
  Layers,
  Zap,
  Layout,
  Monitor,
  Globe,
  Database,
  Shield,
  Award,
  Star,
  Heart
} from 'lucide-react';
import { useProfile } from '../profileContext';

export default function HomeTab() {
  const { profile, loading } = useProfile();

  // Service icon resolver based on string
  const getServiceIcon = (iconName: string, theme: string) => {
    const iconClass = `w-6 h-6 stroke-[2.2]`;
    switch (iconName) {
      case 'code':
        return <Code className={`${iconClass} text-orange-600 dark:text-orange-400`} />;
      case 'smartphone':
        return <Smartphone className={`${iconClass} text-sky-600 dark:text-sky-400`} />;
      case 'palette':
        return <Palette className={`${iconClass} text-indigo-600 dark:text-indigo-400`} />;
      case 'users':
        return <Users className={`${iconClass} text-amber-600 dark:text-amber-400`} />;
      case 'layers':
        return <Layers className={`${iconClass} text-blue-600 dark:text-blue-400`} />;
      case 'zap':
        return <Zap className={`${iconClass} text-purple-600 dark:text-purple-400`} />;
      case 'layout':
        return <Layout className={`${iconClass} text-amber-600 dark:text-amber-400`} />;
      case 'monitor':
        return <Monitor className={`${iconClass} text-teal-600 dark:text-teal-400`} />;
      case 'globe':
        return <Globe className={`${iconClass} text-sky-600 dark:text-sky-400`} />;
      case 'database':
        return <Database className={`${iconClass} text-rose-600 dark:text-rose-400`} />;
      case 'shield':
        return <Shield className={`${iconClass} text-emerald-600 dark:text-emerald-400`} />;
      case 'award':
        return <Award className={`${iconClass} text-yellow-600 dark:text-yellow-400`} />;
      case 'star':
        return <Star className={`${iconClass} text-amber-600 dark:text-amber-400`} />;
      case 'heart':
        return <Heart className={`${iconClass} text-red-600 dark:text-red-400`} />;
      default:
        return <Code className={iconClass} />;
    }
  };

  // Color resolvers for themes matching the image
  const cardThemes = {
    orange: {
      bg: 'bg-[#fff5ee] dark:bg-orange-950/10',
      border: 'border-orange-100/75 dark:border-orange-900/20',
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
    },
    blue: {
      bg: 'bg-[#f4f8fc] dark:bg-blue-950/10',
      border: 'border-blue-100/75 dark:border-blue-900/20',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    purple: {
      bg: 'bg-[#f9f7fc] dark:bg-purple-950/10',
      border: 'border-purple-100/75 dark:border-purple-900/20',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
    },
    amber: {
      bg: 'bg-[#fdf9f4] dark:bg-amber-950/10',
      border: 'border-amber-100/75 dark:border-amber-900/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    },
    teal: {
      bg: 'bg-[#f0fdf4] dark:bg-teal-950/10',
      border: 'border-teal-100/75 dark:border-teal-900/20',
      iconBg: 'bg-teal-100 dark:bg-teal-900/30',
    },
    rose: {
      bg: 'bg-[#fff1f2] dark:bg-rose-950/10',
      border: 'border-rose-100/75 dark:border-rose-900/20',
      iconBg: 'bg-rose-100 dark:bg-rose-900/30',
    },
    sky: {
      bg: 'bg-[#f0f9ff] dark:bg-sky-950/10',
      border: 'border-sky-100/75 dark:border-sky-900/20',
      iconBg: 'bg-sky-100 dark:bg-sky-900/30',
    },
    emerald: {
      bg: 'bg-[#ecfdf5] dark:bg-emerald-950/10',
      border: 'border-emerald-100/75 dark:border-emerald-900/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    }
  };

  const getCardWidthClass = (width?: '25%' | '50%' | '75%' | '100%') => {
    switch (width) {
      case '25%': return 'w-full sm:w-[calc(25%-15px)]';
      case '50%': return 'w-full sm:w-[calc(50%-10px)]';
      case '75%': return 'w-full sm:w-[calc(75%-5px)]';
      case '100%':
      default:
        return 'w-full';
    }
  };

  if (loading) {
    return (
      <div className="space-y-10 animate-pulse">
        {/* Title skeleton */}
        <div className="space-y-4">
          <div className="flex items-center gap-6">
            <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-40"></div>
            <div className="h-0.5 bg-slate-200 dark:bg-slate-800 flex-grow max-w-[240px]"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
          </div>
        </div>

        {/* Section title */}
        <div className="space-y-6">
          <div className="h-7 bg-slate-200 dark:bg-slate-800 rounded-lg w-28"></div>
          
          {/* Card grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col p-6 rounded-2xl border border-slate-100 dark:border-slate-80/60 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-800"></div>
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-full"></div>
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded w-4/5"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const aboutTitle = profile.aboutTitle || 'ABOUT ME';
  const aboutDescription = profile.aboutDescription || '';
  const homeSections = profile.homeSections || [];

  return (
    <div className="space-y-10">
      {/* Title with distinct active color bar on the right */}
      <div className="space-y-4">
        <h2 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100 flex items-center gap-6">
          <span>{aboutTitle}</span>
          <span className="h-0.5 rounded-full bg-gradient-to-r from-orange-400 to-transparent flex-grow max-w-[240px]"></span>
        </h2>

        {aboutDescription && (
          <p className="text-[15px] leading-7 text-slate-600 dark:text-slate-300 font-sans tracking-wide whitespace-pre-wrap">
            {aboutDescription}
          </p>
        )}
      </div>

      {/* Dynamic Sections */}
      {homeSections.map((section) => (
        <div key={section.id} className="space-y-6">
          <h3 className="text-2xl font-display font-semibold text-slate-800 dark:text-slate-100">
            {section.title}
          </h3>

          {section.type === 'grid' && (
            /* Bento-inspired Grid */
            <div className="flex flex-wrap gap-5">
              {section.cards.map((card) => {
                const theme = cardThemes[card.colorTheme || 'orange'] || cardThemes.orange;
                const cardWidthClass = getCardWidthClass(card.width || '50%');

                return (
                  <div
                    key={card.id}
                    className={`flex flex-col p-6 rounded-2xl border ${theme.bg} ${theme.border} ${cardWidthClass} shadow-xs transition-all hover:translate-y-[-2px] hover:shadow-sm duration-300`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Icon Block */}
                      <div className={`p-3 rounded-xl ${theme.iconBg} shrink-0`}>
                        {getServiceIcon(card.iconName, card.colorTheme || 'orange')}
                      </div>

                      <h4 className="text-lg font-display font-semibold text-slate-800 dark:text-slate-100">
                        {card.title}
                      </h4>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-400 font-sans whitespace-pre-wrap">
                      {card.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

