/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  GraduationCap,
  Briefcase,
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

export default function ResumeTab() {
  const { profile, loading } = useProfile();
  const { educationHistory, experienceHistory, workSkills, softSkills } = profile;
  const resumeSections = profile.resumeSections || [];

  // Helper as dynamic icon resolver
  const getIconElement = (iconName: string, colorClass = "text-orange-500") => {
    if (!iconName || iconName.toLowerCase() === 'none') return null;
    const iconClass = `w-6 h-6 stroke-[2.2] ${colorClass}`;
    switch (iconName.toLowerCase()) {
      case 'graduationcap':
      case 'graduation-cap':
        return <GraduationCap className={iconClass} />;
      case 'briefcase':
        return <Briefcase className={iconClass} />;
      case 'code':
        return <Code className={iconClass} />;
      case 'smartphone':
        return <Smartphone className={iconClass} />;
      case 'palette':
        return <Palette className={iconClass} />;
      case 'users':
        return <Users className={iconClass} />;
      case 'layers':
        return <Layers className={iconClass} />;
      case 'zap':
        return <Zap className={iconClass} />;
      case 'layout':
        return <Layout className={iconClass} />;
      case 'monitor':
        return <Monitor className={iconClass} />;
      case 'globe':
        return <Globe className={iconClass} />;
      case 'database':
        return <Database className={iconClass} />;
      case 'shield':
        return <Shield className={iconClass} />;
      case 'award':
        return <Award className={iconClass} />;
      case 'star':
        return <Star className={iconClass} />;
      case 'heart':
        return <Heart className={iconClass} />;
      default:
        return null;
    }
  };

  // Proportional section width calculations based on 24px gap between sections
  const getSectionWidthClass = (width: '25%' | '50%' | '75%' | '100%') => {
    switch (width) {
      case '25%': return 'w-full md:w-[calc(25%-18px)]';
      case '50%': return 'w-full md:w-[calc(50%-12px)]';
      case '75%': return 'w-full md:w-[calc(75%-6px)]';
      case '100%':
      default:
        return 'w-full';
    }
  };

  // Card size width calculations inline inside dynamic cards lists
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

  // Color theme specifications
  const cardThemes = {
    orange: {
      bg: 'bg-[#fff5ee] dark:bg-orange-950/10',
      border: 'border-orange-100/75 dark:border-orange-900/20',
      iconBg: 'bg-orange-100 dark:bg-orange-900/30',
      iconColor: 'text-orange-600 dark:text-orange-400'
    },
    blue: {
      bg: 'bg-[#f4f8fc] dark:bg-blue-950/10',
      border: 'border-blue-100/75 dark:border-blue-900/20',
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400'
    },
    purple: {
      bg: 'bg-[#f9f7fc] dark:bg-purple-950/10',
      border: 'border-purple-100/75 dark:border-purple-900/20',
      iconBg: 'bg-purple-100 dark:bg-purple-900/30',
      iconColor: 'text-purple-600 dark:text-purple-400'
    },
    amber: {
      bg: 'bg-[#fdf9f4] dark:bg-amber-950/10',
      border: 'border-amber-100/75 dark:border-amber-900/20',
      iconBg: 'bg-amber-100 dark:bg-amber-900/30',
      iconColor: 'text-amber-600 dark:text-amber-400'
    },
    teal: {
      bg: 'bg-[#f0fdf4] dark:bg-teal-950/10',
      border: 'border-teal-100/75 dark:border-teal-900/20',
      iconBg: 'bg-teal-100 dark:bg-teal-900/30',
      iconColor: 'text-teal-600 dark:text-teal-400'
    },
    rose: {
      bg: 'bg-[#fff1f2] dark:bg-rose-950/10',
      border: 'border-rose-100/75 dark:border-rose-900/20',
      iconBg: 'bg-rose-100 dark:bg-rose-900/30',
      iconColor: 'text-rose-600 dark:text-rose-400'
    },
    sky: {
      bg: 'bg-[#f0f9ff] dark:bg-sky-950/10',
      border: 'border-sky-100/75 dark:border-sky-900/20',
      iconBg: 'bg-sky-100 dark:bg-sky-900/30',
      iconColor: 'text-sky-600 dark:text-sky-400'
    },
    emerald: {
      bg: 'bg-[#ecfdf5] dark:bg-emerald-950/10',
      border: 'border-emerald-100/75 dark:border-emerald-900/20',
      iconBg: 'bg-emerald-100 dark:bg-emerald-900/30',
      iconColor: 'text-emerald-600 dark:text-emerald-400'
    }
  };

  if (loading) {
    return (
      <div className="space-y-12 animate-pulse">
        <h2 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100 flex items-center gap-6">
          <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-28"></div>
          <span className="h-0.5 rounded-full bg-slate-200 dark:bg-slate-800 flex-grow max-w-[240px]"></span>
        </h2>

        <div className="flex flex-wrap gap-6 md:gap-8">
          {[1, 2].map((col) => (
            <div key={col} className="w-full md:w-[calc(50%-12px)] space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-800"></div>
                <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-md w-24"></div>
              </div>
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="p-5 rounded-2xl bg-slate-100/55 dark:bg-slate-900/10 border border-slate-100 dark:border-slate-850/20 space-y-3">
                    <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
                    <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
                    <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* Title */}
      <h2 className="text-3xl font-display font-bold text-slate-800 dark:text-slate-100 flex items-center gap-6">
        <span>Resume</span>
        <span className="h-0.5 rounded-full bg-gradient-to-r from-orange-400 to-transparent flex-grow max-w-[240px]"></span>
      </h2>

      {/* Flexible sections wrapper */}
      <div className="flex flex-wrap gap-y-10 gap-x-6">
        {resumeSections.map((section) => {
          const widthClass = getSectionWidthClass(section.width || '100%');
          const sectionIcon = getIconElement(section.iconName, "text-orange-500");
          return (
            <div key={section.id} className={`${widthClass} space-y-6 flex flex-col`}>
              <div className="flex items-center gap-3 mb-2">
                {sectionIcon}
                <h3 className="text-xl font-display font-semibold text-slate-800 dark:text-slate-100">
                  {section.title}
                </h3>
              </div>

              {/* RENDER CONTENT BY SECTION TYPE */}
              {section.type === 'education' && (
                <div className="flex flex-wrap gap-5 pt-2 flex-grow w-full">
                  {(!section.cards || section.cards.length === 0) ? (
                    <div className="text-sm italic text-slate-400 font-mono text-center py-6 w-full">
                      No educational achievements entered yet.
                    </div>
                  ) : (
                    section.cards.map((card) => {
                      const cardWidthClass = getCardWidthClass(card.width || '50%');
                      return (
                        <div
                          key={card.id}
                          className={`p-5 rounded-2xl bg-[#fdf2e9]/55 dark:bg-amber-950/5 border border-[#fae5d3]/50 dark:border-amber-900/10 flex flex-col space-y-2 transition-all hover:translate-x-0.5 shadow-3xs hover:shadow-2xs duration-300 ${cardWidthClass}`}
                        >
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
                            {card.period || 'Period'}
                          </span>
                          <h4 className="text-[14px] md:text-[15px] font-display font-semibold text-slate-800 dark:text-slate-100">
                            {card.title}
                          </h4>
                          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-sans">
                            {card.subtitle}
                          </p>
                          {card.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-2 whitespace-pre-wrap leading-relaxed border-t border-dashed border-[#fae5d3]/50 dark:border-amber-900/10 pt-2">
                              {card.description}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {section.type === 'experience' && (
                <div className="flex flex-wrap gap-5 pt-2 flex-grow w-full">
                  {(!section.cards || section.cards.length === 0) ? (
                    <div className="text-sm italic text-slate-400 font-mono text-center py-6 w-full">
                      No positions configured yet.
                    </div>
                  ) : (
                    section.cards.map((card) => {
                      const cardWidthClass = getCardWidthClass(card.width || '50%');
                      return (
                        <div
                          key={card.id}
                          className={`p-5 rounded-2xl bg-[#fdf2e9]/55 dark:bg-amber-950/5 border border-[#fae5d3]/50 dark:border-amber-900/10 flex flex-col space-y-2 transition-all hover:translate-x-0.5 shadow-3xs hover:shadow-2xs duration-300 ${cardWidthClass}`}
                        >
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
                            {card.period || 'Period'}
                          </span>
                          <h4 className="text-[14px] md:text-[15px] font-display font-semibold text-slate-800 dark:text-slate-100">
                            {card.title}
                          </h4>
                          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 font-sans">
                            {card.subtitle}
                          </p>
                          {card.description && (
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans mt-2 whitespace-pre-wrap leading-relaxed border-t border-dashed border-[#fae5d3]/50 dark:border-amber-900/10 pt-2">
                              {card.description}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {section.type === 'skills' && (
                <div className="flex flex-wrap gap-2 pt-2 flex-grow w-full">
                  {(!section.cards || section.cards.length === 0) ? (
                    <div className="text-sm italic text-slate-400 font-mono text-center py-6 w-full">
                      No skill tags configured yet.
                    </div>
                  ) : (
                    section.cards.map((card) => (
                      <span
                        key={card.id}
                        className="py-1.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-xs font-sans font-medium text-slate-600 dark:text-slate-300 transition-colors hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 select-none shadow-3xs"
                      >
                        {card.title}
                      </span>
                    ))
                  )}
                </div>
              )}

              {section.type === 'cards' && (
                <div className="flex flex-wrap gap-5 pt-2 flex-grow w-full">
                  {(!section.cards || section.cards.length === 0) ? (
                    <div className="text-sm italic text-slate-400 font-mono text-center py-6 w-full">
                      No info cards content configured yet.
                    </div>
                  ) : (
                    section.cards.map((card) => {
                      const theme = cardThemes[card.colorTheme || 'orange'] || cardThemes.orange;
                      const cardWidthClass = getCardWidthClass(card.width || '50%');
                      return (
                        <div
                          key={card.id}
                          className={`flex flex-col p-6 rounded-2xl border ${theme.bg} ${theme.border} ${cardWidthClass} shadow-3xs transition-all hover:translate-y-[-2px] hover:shadow-2xs duration-300`}
                        >
                          <div className="flex items-center gap-4">
                            {card.iconName && card.iconName.toLowerCase() !== 'none' && (
                              <div className={`p-3 rounded-xl ${theme.iconBg} shrink-0`}>
                                {getIconElement(card.iconName, theme.iconColor)}
                              </div>
                            )}
                            <h4 className="text-base md:text-lg font-display font-semibold text-slate-800 dark:text-slate-100">
                              {card.title}
                            </h4>
                          </div>
                          {card.description && (
                            <p className="mt-4 text-xs md:text-sm leading-6 text-slate-600 dark:text-slate-400 font-sans whitespace-pre-wrap">
                              {card.description}
                            </p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
