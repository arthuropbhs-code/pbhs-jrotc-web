import React from 'react';
import { motion } from 'framer-motion';
import { Book, Shield, Users, Star, FileText, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const CadetInfo = () => {
  const generalKnowledge = [
    { title: "The Mission", detail: "To motivate young people to be better citizens." },
    { title: "JROTC", detail: "Junior Reserve Officers' Training Corps" },
    { title: "LET", detail: "Leadership Education and Training" },
    { title: "The Key", detail: "The key to success in JROTC is teamwork." }
  ];

  return (
    <div className="min-h-screen bg-slate-950 pt-32 pb-20 px-6 text-left">
      <div className="max-w-6xl mx-auto">
        
        <header className="mb-12">
          <h2 className="text-xs font-black text-yellow-500 tracking-[0.4em] uppercase mb-4">Knowledge Base</h2>
          <h1 className="text-5xl md:text-6xl font-black text-white uppercase italic font-military tracking-tighter">
            General <span className="text-slate-500">Information</span>
          </h1>
        </header>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* LEFT COL: CORE KNOWLEDGE */}
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-8 border-l-4 border-yellow-500">
              <h3 className="text-xl font-black text-white uppercase italic mb-6 flex items-center gap-2">
                <Book className="text-yellow-500" size={20} /> Foundations
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                {generalKnowledge.map((item, i) => (
                  <div key={i} className="bg-white/5 p-4 rounded-lg border border-white/5">
                    <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1">{item.title}</p>
                    <p className="text-sm text-slate-300 font-medium">{item.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-8 border-l-4 border-blue-500">
              <h3 className="text-xl font-black text-white uppercase italic mb-6 flex items-center gap-2">
                <Star className="text-blue-500" size={20} /> The Cadet Creed
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed italic border-l-2 border-slate-800 pl-4">
                "I am an Army Junior ROTC Cadet. I will always conduct myself to bring credit to my family, country, school and the Corps of Cadets. I am loyal and patriotic. I am the future of the United States of America..."
              </p>
              <Link to="/cadet-info/promotion" className="inline-block mt-6 text-xs font-bold text-blue-400 hover:text-white transition-colors">
                View full creed in Promotion Board section →
              </Link>
            </div>
          </div>

          {/* RIGHT COL: QUICK LINKS */}
          <div className="space-y-6">
            <div className="glass-card p-6 bg-yellow-500/5 border border-yellow-500/20">
              <h4 className="text-sm font-black text-white uppercase mb-4">Ready for the Board?</h4>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                Review the specific knowledge and duty requirements for your next rank.
              </p>
              <Link 
                to="/cadet-info/promotion" 
                className="w-full bg-yellow-500 text-slate-950 py-3 rounded font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-yellow-400 transition-all"
              >
                Promotion Board <ChevronRight size={14} />
              </Link>
            </div>

            <div className="glass-card p-6 border-slate-800">
              <h4 className="text-sm font-black text-white uppercase mb-4 flex items-center gap-2">
                <FileText size={16} className="text-slate-500" /> Resources
              </h4>
              <ul className="space-y-3">
                <li className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer flex justify-between">
                  <span>Ribbon Order Chart</span>
                  <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded">PDF</span>
                </li>
                <li className="text-[11px] text-slate-500 hover:text-slate-300 cursor-pointer flex justify-between">
                  <span>Uniform Inspection Checklist</span>
                  <span className="text-[9px] bg-white/5 px-2 py-0.5 rounded">WEB</span>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CadetInfo;