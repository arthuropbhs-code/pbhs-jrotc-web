import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Newspaper, Download, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { usePageMeta } from '../hooks/usePageMeta';
import Reveal from '../components/Reveal';
import ScrambleText from '../components/ScrambleText';
import Footer from '../components/Footer';

const formatDate = (val) => {
  if (!val) return '';
  // Firestore Timestamp
  if (val?.toDate) return val.toDate().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  // ISO string or plain string
  const d = new Date(val);
  if (!isNaN(d)) return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return val;
};

const NewsletterCard = ({ item }) => {
  const [expanded, setExpanded] = useState(false);
  const hasBody = Boolean(item.body?.trim());
  const hasPdf  = Boolean(item.fileUrl);

  return (
    <article className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm hover:shadow-md dark:shadow-none transition-all">
      {/* Top bar accent */}
      <div className="h-1 w-full bg-gradient-to-r from-yellow-500 to-yellow-400" />
      <div className="p-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            {item.issue && (
              <span className="inline-block text-[9px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full mb-2">
                {item.issue}
              </span>
            )}
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-tight">
              {item.title}
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">
              {formatDate(item.date)}
            </p>
          </div>
          <Newspaper className="text-yellow-500 shrink-0 mt-1" size={28} />
        </div>

        {item.summary && (
          <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-6">
            {item.summary}
          </p>
        )}

        {/* Expanded text body */}
        {expanded && hasBody && (
          <div className="mt-4 mb-6 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap border-t border-slate-100 dark:border-white/5 pt-6">
            {item.body}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3 mt-2">
          {hasBody && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-yellow-500 text-slate-950 hover:bg-yellow-400 transition-all"
            >
              {expanded ? <><ChevronUp size={13} /> Collapse</> : <><ChevronDown size={13} /> Read Issue</>}
            </button>
          )}
          {hasPdf && (
            <a
              href={item.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-yellow-500/10 hover:text-yellow-600 dark:hover:text-yellow-500 transition-all"
            >
              <ExternalLink size={13} /> Open PDF
            </a>
          )}
          {hasPdf && (
            <a
              href={item.fileUrl}
              download
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
            >
              <Download size={13} /> Download
            </a>
          )}
        </div>
      </div>
    </article>
  );
};

const Newsletters = () => {
  usePageMeta({
    title: 'Newsletter',
    description: 'Battalion newsletters from PBHS JROTC Tornado Battalion — stay informed with the latest issues.',
    path: '/newsletter',
  });

  const [newsletters, setNewsletters] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'newsletters'),
      where('status', '==', 'published'),
      orderBy('publishedAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setNewsletters(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen transition-colors duration-300 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-yellow-500/30">

      {/* Hero */}
      <div className="relative h-[40vh] flex items-center justify-center overflow-hidden border-b border-slate-200 dark:border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500/10 via-transparent to-transparent opacity-50" />
        <div className="z-10 text-center px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 text-xs font-black uppercase tracking-widest transition-all">
            <ArrowLeft size={14} /> Back to Command
          </Link>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter">
            <ScrambleText text="Battalion " trigger="mount" />
            <span className="text-yellow-500"><ScrambleText text="Newsletter" trigger="mount" /></span>
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.4em] mt-4 text-xs md:text-sm">
            Tornado Battalion · PBHS JROTC
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-20">
        {/* Loading skeletons */}
        {loading && (
          <div className="grid md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map(n => (
              <div key={n} className="bg-white dark:bg-slate-900/60 rounded-3xl h-64 animate-pulse border border-slate-200 dark:border-white/5" />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && newsletters.length === 0 && (
          <div className="text-center py-20">
            <Newspaper className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={48} />
            <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-sm">
              No newsletters published yet
            </p>
          </div>
        )}

        {/* Newsletter grid */}
        {!loading && newsletters.length > 0 && (
          <div className="grid md:grid-cols-2 gap-6">
            {newsletters.map((item, i) => (
              <Reveal key={item.id} delay={i * 0.06}>
                <NewsletterCard item={item} />
              </Reveal>
            ))}
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default Newsletters;
