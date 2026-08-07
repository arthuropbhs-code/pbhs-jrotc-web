import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Target,
  Users,
  Award,
  ArrowLeft,
  ChevronRight,
  History,
  MapPin,
  School
} from 'lucide-react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { DEFAULT_ABOUT } from '../data/defaultPageContent';
import { usePageMeta } from '../hooks/usePageMeta';
import Reveal from '../components/Reveal';

// History/pillar icons are structural (fixed per position), not editable content.
const HISTORY_ICONS = [History, MapPin, School];
const PILLAR_ICONS = [Shield, Target, Users, Award];

const AboutPage = () => {
  usePageMeta({
    title: 'About',
    description: 'Learn about Pompano Beach High School JROTC - the Tornado Battalion\'s history, mission, and program.',
    path: '/about',
  });
  const [content, setContent] = useState(DEFAULT_ABOUT);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "pageContent", "about"), (snap) => {
      if (snap.exists()) setContent({ ...DEFAULT_ABOUT, ...snap.data() });
    });
    return () => unsubscribe();
  }, []);

  const values = content.pillars.map((p, i) => {
    const Icon = PILLAR_ICONS[i] || Award;
    return { icon: <Icon className="text-yellow-500" size={24} />, title: p.title, desc: p.desc };
  });

  return (
    <div className="min-h-screen transition-colors duration-300 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-yellow-500/30">
      
      {/* Hero Section */}
      <div className="relative h-[50vh] flex items-center justify-center overflow-hidden border-b border-slate-200 dark:border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500/10 via-transparent to-transparent opacity-50" />
        <div className="z-10 text-center px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 text-xs font-black uppercase tracking-widest transition-all">
            <ArrowLeft size={14} /> Back to Command
          </Link>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter">
            About <span className="text-yellow-500">JROTC</span>
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.4em] mt-4 text-xs md:text-sm">
            Pompano Beach High School JROTC
          </p>
          <p className="text-yellow-500 font-black uppercase tracking-[0.35em] mt-3 text-xs">
            Above and Beyond
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-20 space-y-32">
        
        {/* Mission Statement */}
        <section className="grid md:grid-cols-2 gap-12 items-center">
          <Reveal className="space-y-6">
            <h2 className="text-3xl font-black uppercase italic border-l-4 border-yellow-500 pl-6 flex items-center gap-3">
              <Target className="text-yellow-500" /> The Mission
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              {content.missionText}
            </p>
          </Reveal>
          <Reveal delay={0.15} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 p-8 rounded-3xl shadow-xl dark:shadow-2xl relative transition-colors duration-300">
            <div className="absolute -top-4 -right-4 bg-yellow-500 text-slate-950 p-3 rounded-xl font-black rotate-12 uppercase text-xs">Academic Credit</div>
            <h3 className="text-yellow-500 font-black uppercase tracking-widest text-xs mb-4">The Student-Led Experience</h3>
            <p className="text-slate-500 dark:text-slate-400 italic text-sm leading-loose">
              {content.studentLedText}
            </p>
          </Reveal>
        </section>

        {/* Triple History Section */}
        <section className="space-y-16">
          <Reveal className="text-center">
            <h2 className="text-3xl font-black uppercase italic">Historical Context</h2>
            <div className="w-24 h-1 bg-yellow-500 mx-auto mt-4"></div>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8">
            {content.history.map((card, i) => {
              const Icon = HISTORY_ICONS[i] || History;
              return (
                <Reveal key={i} delay={i * 0.1} className="bg-white dark:bg-slate-900/40 p-8 rounded-3xl border border-slate-200 dark:border-white/5 hover:border-yellow-500/50 transition-all shadow-sm dark:shadow-none">
                  <Icon className="text-yellow-500 mb-6" size={32} />
                  <h3 className="font-black uppercase italic mb-4">{card.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{card.text}</p>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* Core Pillars */}
        <section className="space-y-12">
          <Reveal className="text-center">
            <h2 className="text-3xl font-black uppercase italic">Program Pillars</h2>
            <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Skills for life beyond high school</p>
          </Reveal>
          <div className="grid md:grid-cols-4 gap-6">
            {values.map((v, i) => (
              <Reveal key={i} delay={i * 0.08} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-8 rounded-3xl hover:border-yellow-500 transition-all group shadow-sm dark:shadow-none">
                <div className="mb-6 bg-slate-100 dark:bg-black/40 w-fit p-4 rounded-2xl group-hover:scale-110 transition-transform">
                  {v.icon}
                </div>
                <h4 className="font-black uppercase italic mb-2">{v.title}</h4>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">{v.desc}</p>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Updated Call to Action */}
        <section className="bg-yellow-500 rounded-[3rem] p-12 text-slate-950 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-yellow-500/10 transition-transform hover:scale-[1.01]">
          <Reveal>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">{content.ctaTitle}</h2>
            <p className="font-bold uppercase tracking-widest text-sm opacity-80 mt-4">
              {content.ctaText}
            </p>
          </Reveal>
          <Reveal delay={0.15}>
            <Link
              to="/cadet-info"
              className="bg-slate-950 text-white px-8 py-5 rounded-2xl font-black uppercase text-sm flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl"
            >
              Learn How to Join <ChevronRight size={18} />
            </Link>
          </Reveal>
        </section>
      </div>

      <footer className="py-20 border-t border-slate-200 dark:border-white/5 text-center bg-white dark:bg-slate-900/20 transition-colors duration-300">
        <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.5em]">
          Character • Leadership • Academic Excellence
        </p>
      </footer>
    </div>
  );
};

export default AboutPage;