import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, Download, File } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { DocumentRowSkeleton } from '../components/Skeleton';
import { usePageMeta } from '../hooks/usePageMeta';

const formatBytes = (bytes) => {
  if (!bytes) return '';
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

const Documents = () => {
  usePageMeta({
    title: 'Documents & Regulations',
    description: 'Published reference documents and regulations for PBHS JROTC Tornado Battalion.',
    path: '/documents',
  });
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "documents"), orderBy("uploadedAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsubscribe();
  }, []);

  const grouped = documents.reduce((acc, doc) => {
    const cat = doc.category || 'Other';
    (acc[cat] = acc[cat] || []).push(doc);
    return acc;
  }, {});

  return (
    <div className="min-h-screen transition-colors duration-300 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-yellow-500/30">

      {/* Hero Section */}
      <div className="relative h-[40vh] flex items-center justify-center overflow-hidden border-b border-slate-200 dark:border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500/10 via-transparent to-transparent opacity-50" />
        <div className="z-10 text-center px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 text-xs font-black uppercase tracking-widest transition-all">
            <ArrowLeft size={14} /> Back to Command
          </Link>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter">
            <span className="text-yellow-500">Documents</span> & Regs
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.4em] mt-4 text-xs md:text-sm">
            Battalion Reference Library
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-20">
        {loading && (
          <div className="space-y-4">
            <DocumentRowSkeleton />
            <DocumentRowSkeleton />
            <DocumentRowSkeleton />
          </div>
        )}

        {!loading && documents.length === 0 && (
          <div className="text-center py-20">
            <FileText className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={48} />
            <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-sm">
              No documents published yet
            </p>
          </div>
        )}

        <div className="space-y-16">
          {Object.entries(grouped).map(([category, docs]) => (
            <section key={category}>
              <h2 className="text-2xl font-black uppercase italic border-l-4 border-yellow-500 pl-6 mb-6">
                {category}
              </h2>
              <div className="grid gap-4">
                {docs.map(d => (
                  <a
                    key={d.id}
                    href={d.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 p-6 rounded-3xl flex items-center justify-between gap-4 shadow-sm dark:shadow-none hover:border-yellow-500/50 transition-all group"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="bg-yellow-500/10 text-yellow-500 p-3 rounded-xl flex-shrink-0">
                        <File size={22} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black uppercase italic truncate">{d.title}</p>
                        {d.description && (
                          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 line-clamp-2">{d.description}</p>
                        )}
                        {d.fileSize && (
                          <p className="text-slate-400 dark:text-slate-600 text-[10px] font-bold uppercase tracking-widest mt-1">{formatBytes(d.fileSize)}</p>
                        )}
                      </div>
                    </div>
                    <Download className="text-slate-400 group-hover:text-yellow-500 transition-colors flex-shrink-0" size={20} />
                  </a>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Documents;
