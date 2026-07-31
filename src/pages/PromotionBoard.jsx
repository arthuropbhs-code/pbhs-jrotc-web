import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle, Shield, ChevronLeft, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { DEFAULT_PROMOTION_BOARD } from '../data/defaultPageContent';

const PromotionBoard = () => {
  const [selectedRank, setSelectedRank] = useState('Squad Member');
  const [activeAsst, setActiveAsst] = useState('S-1');
  const [content, setContent] = useState(DEFAULT_PROMOTION_BOARD);

  // Ensure page starts at top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "pageContent", "promotion-board"), (snap) => {
      if (snap.exists()) setContent({ ...DEFAULT_PROMOTION_BOARD, ...snap.data() });
    });
    return () => unsubscribe();
  }, []);

  // Reshape the array-based Firestore doc back into the name-keyed lookup
  // the rest of this component was already written around.
  const boardData = {};
  content.ranks.forEach(r => {
    boardData[r.name] = { knowledge: r.knowledge, duties: r.duties, leadership: r.leadership };
  });
  boardData['Staff Assistants'] = content.staffAssistants;

  const currentAsst = boardData['Staff Assistants'].sections.find(s => s.id === activeAsst);

  return (
    <div className="min-h-screen bg-slate-950 pt-32 pb-20 px-6 text-left">
      <div className="max-w-6xl mx-auto">
        <Link to="/cadet-info" className="inline-flex items-center text-slate-500 hover:text-yellow-500 mb-8 transition-colors text-xs font-bold uppercase tracking-widest">
          <ChevronLeft size={16} className="mr-1" /> Back
        </Link>

        <header className="mb-12">
          <h1 className="text-4xl md:text-6xl font-black text-white uppercase italic font-military tracking-tighter">
            Promotion <span className="text-yellow-500">Board</span>
          </h1>
        </header>

        {/* RANK SELECTOR */}
        <div className="flex gap-2 mb-12 flex-wrap">
          {Object.keys(boardData).map((rank) => (
            <button
              key={rank}
              onClick={() => setSelectedRank(rank)}
              className={`px-4 py-2 rounded border text-[10px] font-black uppercase tracking-widest transition-all ${
                selectedRank === rank ? 'bg-yellow-500 border-yellow-500 text-slate-950 shadow-lg' : 'border-slate-800 text-slate-500 hover:border-slate-600'
              }`}
            >
              {rank}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {selectedRank === 'Staff Assistants' ? (
            <motion.div 
              key="asst-view"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="grid lg:grid-cols-3 gap-8"
            >
              {/* SIDEBAR SELECTOR */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <LayoutGrid size={12} /> Assistant Roles
                </p>
                {boardData['Staff Assistants'].sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveAsst(section.id)}
                    className={`w-full p-4 rounded-xl border text-left transition-all ${
                      activeAsst === section.id 
                      ? 'bg-yellow-500 border-yellow-500 text-slate-950 shadow-lg font-black' 
                      : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <span className="italic block text-lg">{section.id}</span>
                    <span className={`text-[10px] uppercase font-bold tracking-tighter ${activeAsst === section.id ? 'text-slate-900' : 'text-slate-500'}`}>
                      {section.title}
                    </span>
                  </button>
                ))}
              </div>

              {/* CONTENT AREA */}
              <div className="lg:col-span-2 space-y-6">
                <div className="glass-card p-8 border-t-2 border-blue-500">
                  <div className="flex justify-between items-start mb-8">
                    <h3 className="text-2xl font-black text-white uppercase italic">
                      {currentAsst?.id} Assistant Duties
                    </h3>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-500 uppercase font-black">Principles of Leadership Requirement</p>
                      <p className="text-sm font-bold text-white uppercase">{boardData['Staff Assistants'].leadership}</p>
                    </div>
                  </div>

                  <ul className="space-y-4">
                    {currentAsst?.asst.map((duty, i) => (
                      <li key={i} className="flex items-start gap-4 text-slate-300 text-sm leading-relaxed">
                        <CheckCircle size={18} className="text-blue-500 shrink-0 mt-0.5" />
                        {duty}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8 pt-8 border-t border-slate-800/50">
                    <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-4">Promotion Board Requirement</p>
                    <ul className="grid md:grid-cols-2 gap-x-6 gap-y-2">
                      {boardData['Staff Assistants'].knowledge.map((item, i) => (
                        <li key={i} className="text-slate-500 text-[11px] flex items-center gap-2">
                          <div className="h-1 w-1 rounded-full bg-slate-700" /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key={selectedRank}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="grid lg:grid-cols-2 gap-6"
            >
              <div className="glass-card p-8 border-t-2 border-yellow-500">
                <h3 className="text-xl font-bold text-white uppercase italic mb-6 flex items-center gap-2">
                  <BookOpen className="text-yellow-500" size={20} /> Promotion Board Requirement
                </h3>
                <div className="mb-6 p-3 bg-white/5 rounded border border-white/5">
                  <p className="text-[10px] text-yellow-500 font-black uppercase mb-1">Principles of Leadership Requirement</p>
                  <p className="text-lg font-black text-white">{boardData[selectedRank].leadership}</p>
                </div>
                <ul className="grid grid-cols-1 gap-3">
                  {boardData[selectedRank].knowledge.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-slate-400 text-xs">
                      <CheckCircle size={14} className="text-yellow-600 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="glass-card p-8 border-t-2 border-blue-500">
                <h3 className="text-xl font-bold text-white uppercase italic mb-6 flex items-center gap-2">
                  <Shield className="text-blue-500" size={20} /> Duties & Responsibilities
                </h3>
                <ul className="space-y-4">
                  {boardData[selectedRank].duties.map((duty, i) => (
                    <li key={i} className="flex items-start gap-3 text-slate-300 text-sm leading-relaxed">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-2 shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                      {duty}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PromotionBoard;