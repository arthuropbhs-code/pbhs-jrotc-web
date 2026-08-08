import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  Calendar,
  BookOpen,
  Users,
  Award,
  Phone,
  MapPin,
  Clock,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import Reveal from '../components/Reveal';

const STEPS = [
  {
    step: '01',
    title: 'Register for JROTC at PBHS',
    desc: 'JROTC is offered as a full-credit elective at Pompano Beach High School. Sign up for LET 1 (Leadership Education and Training, Level 1) during standard course registration with your school counselor.',
    icon: BookOpen,
  },
  {
    step: '02',
    title: 'Attend the first class',
    desc: 'No prior military experience is required. All equipment, uniforms, and training materials are provided at no cost to enrolled cadets. Show up ready to learn.',
    icon: Calendar,
  },
  {
    step: '03',
    title: 'Get issued your uniform',
    desc: 'After enrollment is confirmed, cadets are issued their Army JROTC uniform. The battalion logistics team (S-4) manages issuance and tracks all issued items.',
    icon: Award,
  },
  {
    step: '04',
    title: 'Join a special team (optional)',
    desc: 'Once enrolled, cadets can try out for extracurricular special teams — Drill, Raiders, Color Guard, Drone Operations, and more. Teams compete regionally and nationally.',
    icon: Users,
  },
];

const FAQS = [
  {
    q: 'Do I need any prior experience?',
    a: 'None whatsoever. JROTC is designed for students with no military background. Everything is taught from the ground up.',
  },
  {
    q: 'Is there a cost to join?',
    a: 'No. Uniforms, training materials, and equipment are provided by the Army at no cost to enrolled cadets or their families.',
  },
  {
    q: 'Does JROTC count as an academic credit?',
    a: 'Yes. JROTC counts as a full academic elective credit. LET levels 1–4 are offered across four years of enrollment.',
  },
  {
    q: 'What is the time commitment?',
    a: 'JROTC meets as a regular class period during the school day. Special teams and extracurricular events require additional time after school, depending on the team.',
  },
  {
    q: 'Will joining JROTC obligate me to join the military?',
    a: 'No. JROTC is a leadership and citizenship program, not a military recruiting program. Joining creates zero military service obligation.',
  },
  {
    q: 'When can I sign up?',
    a: 'Course registration happens through your school counselor during the normal scheduling period, typically in the spring for the following school year. Contact the JROTC instructor for late additions.',
  },
];

const HowToJoin = () => {
  usePageMeta({
    title: 'How to Join JROTC',
    description: 'Learn how to enroll in PBHS JROTC - steps, requirements, FAQs, and contact information.',
    path: '/how-to-join',
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans">

      {/* HERO */}
      <div className="relative pt-32 pb-24 px-6 border-b border-slate-200 dark:border-white/5 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-500/10 via-transparent to-transparent opacity-60 pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <Link to="/about" className="inline-flex items-center gap-2 text-slate-500 hover:text-yellow-500 mb-8 text-xs font-black uppercase tracking-widest transition-colors">
            <ArrowLeft size={14} /> Back to About
          </Link>
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="text-yellow-500" size={20} />
            <span className="text-xs font-black text-yellow-500 uppercase tracking-[0.4em]">Enlistment Guide</span>
          </div>
          <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter mb-6 leading-none">
            How to <span className="text-yellow-500">Join</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300 font-medium max-w-2xl leading-relaxed">
            Joining PBHS JROTC is straightforward — no prior experience, no cost, and no military obligation. Here's everything you need to know.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-20 space-y-24">

        {/* QUICK FACTS */}
        <Reveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: CheckCircle, label: 'No experience needed', color: 'text-green-500' },
              { icon: Award, label: 'Free uniform & gear', color: 'text-yellow-500' },
              { icon: BookOpen, label: 'Counts as elective credit', color: 'text-blue-500' },
              { icon: Users, label: 'Open to all students', color: 'text-purple-500' },
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl p-5 text-center shadow-sm dark:shadow-none">
                <Icon className={`${color} mx-auto mb-3`} size={24} />
                <p className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* ENROLLMENT STEPS */}
        <section>
          <Reveal>
            <h2 className="text-3xl font-black uppercase italic mb-12 border-l-4 border-yellow-500 pl-6">
              Enrollment Steps
            </h2>
          </Reveal>
          <div className="space-y-6">
            {STEPS.map(({ step, title, desc, icon: Icon }, i) => (
              <Reveal key={step} delay={i * 0.1}>
                <div className="flex gap-6 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-3xl p-8 shadow-sm dark:shadow-none hover:border-yellow-500/30 transition-all">
                  <div className="shrink-0">
                    <div className="w-14 h-14 rounded-2xl bg-yellow-500 text-slate-950 flex items-center justify-center font-black text-lg">
                      {step}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="text-yellow-500" size={18} />
                      <h3 className="text-lg font-black uppercase italic tracking-tight">{title}</h3>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CONTACT */}
        <Reveal>
          <section className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-3xl p-10 shadow-sm dark:shadow-none">
            <h2 className="text-2xl font-black uppercase italic mb-6">Get in Touch</h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-8 max-w-xl">
              Have questions or want to speak with an instructor before enrolling? Contact the battalion directly.
            </p>
            <div className="grid sm:grid-cols-3 gap-6">
              <div className="flex items-center gap-3">
                <MapPin className="text-yellow-500 shrink-0" size={18} />
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-0.5">Location</p>
                  <p className="text-sm font-bold">600 NE 13th Ave, Pompano Beach, FL 33060</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="text-yellow-500 shrink-0" size={18} />
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-0.5">Phone</p>
                  <p className="text-sm font-bold">(754) 322-2000</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="text-yellow-500 shrink-0" size={18} />
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-0.5">School Hours</p>
                  <p className="text-sm font-bold">Mon–Fri, 7:30 AM – 3:00 PM</p>
                </div>
              </div>
            </div>
          </section>
        </Reveal>

        {/* FAQ */}
        <section>
          <Reveal>
            <h2 className="text-3xl font-black uppercase italic mb-10 border-l-4 border-yellow-500 pl-6">
              Frequently Asked Questions
            </h2>
          </Reveal>
          <div className="space-y-4">
            {FAQS.map(({ q, a }, i) => (
              <Reveal key={i} delay={i * 0.06}>
                <div className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm dark:shadow-none">
                  <h3 className="font-black uppercase text-sm tracking-wide mb-2 text-slate-900 dark:text-white">{q}</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{a}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* CTA */}
        <Reveal>
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-yellow-500 rounded-3xl p-10 text-slate-950">
            <div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter leading-none mb-2">Ready to join?</h2>
              <p className="font-bold text-sm opacity-80">Talk to your school counselor to add JROTC to your schedule.</p>
            </div>
            <Link
              to="/about"
              className="bg-slate-950 text-white px-8 py-4 rounded-2xl font-black uppercase text-sm flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl whitespace-nowrap shrink-0"
            >
              Learn About Us <ChevronRight size={18} />
            </Link>
          </div>
        </Reveal>

      </div>
    </div>
  );
};

export default HowToJoin;
