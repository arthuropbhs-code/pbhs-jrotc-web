import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Users, ChevronDown } from 'lucide-react';

const Leadership = () => {
  const [activeTab, setActiveTab] = useState('staff');

  // Command Team Data - Added portrait paths
  const bc = { 
    role: "Battalion Commander", 
    rank: "c/LTC", 
    name: "Nicholas Pacheco",
    portrait: "/portraits/pacheco.jpg" // Replace with actual image paths
  };
  const deputy = { 
    role: "Deputy Commander", 
    rank: "c/MAJ", 
    name: "Thomas Kitts",
    portrait: "/portraits/t_kitts.jpg" 
  };
  const xo = { 
    role: "Executive Officer", 
    rank: "c/MAJ", 
    name: "Grayson Kitts",
    portrait: "/portraits/g_kitts.jpg" 
  };
  const csm = { 
    role: "Command Sergeant Major", 
    rank: "c/CSM", 
    name: "Bryan Morrison",
    portrait: "/portraits/morrison.jpg" 
  };
  const smm = { 
    role: "Sergeant Major", 
    rank: "c/SGM", 
    name: "Kiryn Williams",
    portrait: "/portraits/williams.jpg" 
  };

  const staff = [
    { role: "S-1 Adjutant", name: "Chealse Valcourt", desc: "Personnel & Administration" },
    { role: "S-2 Security", name: "Jack Nulty", desc: "Security & Intelligence" },
    { role: "S-3 Operations", name: "Patrick Brown", desc: "Training & Operations" },
    { role: "S-4 Logistics", name: "Micah McMorris", desc: "Supply & Logistics" },
    { role: "S-5 Public Affairs", name: "Jasmin Morales", desc: "Media & Recruiting" },
    { role: "S-6 Technology", name: "Kourtney Savage", desc: "Technology & Algorithms" },
    { role: "S-7 Assistance", name: "Layla Jarussi-Hasan", desc: "Assistance & Budgeting" },
  ];

  const companies = [
    { 
      name: "Uniform Company", 
      staff: [{ pos: "Commander", name: "Clarkson" }, { pos: "Executive Officer", name: "De Jesus" }, { pos: "First Sergeant", name: "Boehm" }]
    },
    { 
      name: "Victor Company", 
      staff: [{ pos: "Commander", name: "Moreno" }, { pos: "Executive Officer", name: "Demio" }, { pos: "First Sergeant", name: "Ramos" }]
    },
    { 
      name: "Whisky Company", 
      staff: [{ pos: "Commander", name: "Almeida" }, { pos: "Executive Officer", name: "Tufo" }, { pos: "First Sergeant", name: "Washington" }]
    },
    { 
      name: "X-Ray Company", 
      staff: [{ pos: "Commander", name: "Stewart" }, { pos: "Executive Officer", name: "De Almeida" }, { pos: "First Sergeant", name: "Smith" }]
    },
    { 
      name: "Yankee Company", 
      staff: [{ pos: "Commander", name: "Rodriguez" }, { pos: "Executive Officer", name: "Schneider" }, { pos: "First Sergeant", name: "Floral" }]
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto text-center">
        
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-16 text-center">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tighter uppercase italic">
            Chain of <span className="text-yellow-500">Command</span>
          </h1>
          <div className="h-1 w-24 bg-yellow-500 mx-auto rounded-full" />
        </motion.div>

        <div className="flex flex-col items-center gap-10">
          <div className="w-full max-w-lg">
            <CommandBox data={bc} variant="gold" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl items-start justify-center">
             <CommandBox data={xo} variant="blue" />
             <CommandBox data={deputy} variant="blue" />
             
             {/* NCO COLUMN */}
             <div className="flex flex-col items-center gap-2 w-full">
                <div className="bg-slate-900 border border-yellow-500/30 p-6 rounded-2xl w-full transition-all hover:-translate-y-1 text-left flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full border-2 border-yellow-500/50 overflow-hidden flex-shrink-0 bg-slate-800">
                      <img src={csm.portrait} alt={csm.name} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black tracking-widest text-yellow-500 uppercase">{csm.role}</p>
                      <h3 className="text-xl font-black text-white uppercase italic leading-none">{csm.name}</h3>
                      <p className="text-sm font-bold text-slate-500 mt-1">{csm.rank}</p>
                    </div>
                </div>
                
                <ChevronDown className="text-yellow-500/50" size={24} />

                <div className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl w-full transition-all hover:-translate-y-1 text-left flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full border border-white/10 overflow-hidden flex-shrink-0 bg-slate-800">
                      <img src={smm.portrait} alt={smm.name} className="w-full h-full object-cover grayscale" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase">{smm.role}</p>
                      <h3 className="text-md font-black text-slate-200 uppercase italic leading-none">{smm.name}</h3>
                      <p className="text-xs font-bold text-slate-600 mt-0.5">{smm.rank}</p>
                    </div>
                </div>
             </div>
          </div>
        </div>

        {/* Tab Section */}
        <div className="mt-24 max-w-4xl mx-auto">
          <div className="flex justify-center gap-4 mb-12">
            {['staff', 'company'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-8 py-3 rounded-full font-black uppercase tracking-widest text-xs transition-all ${activeTab === tab ? 'bg-yellow-500 text-slate-950' : 'bg-slate-900 text-slate-500 border border-slate-800'}`}
              >
                {tab === 'staff' ? 'Battalion Staff' : 'Company Leadership'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'staff' ? (
              <motion.div key="staff" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="grid gap-4 text-left">
                {staff.map((s, i) => (
                  <div key={i} className="glass-card p-5 border-l-4 border-yellow-600 flex justify-between items-center group">
                    <div>
                      <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1">{s.role}</p>
                      <h4 className="text-xl font-bold text-white italic">{s.name}</h4>
                      <p className="text-xs text-slate-500 font-medium">{s.desc}</p>
                    </div>
                    <ShieldCheck className="text-slate-800 group-hover:text-yellow-600 transition-colors" />
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div key="company" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid md:grid-cols-2 gap-6">
                {companies.map((co, i) => (
                  <div key={i} className="glass-card p-6 text-left border-t-2 border-yellow-600/50 relative overflow-hidden group">
                    <h4 className="text-xl font-black text-white uppercase italic mb-6 flex items-center gap-2">
                      <Users size={18} className="text-yellow-500" />
                      {co.name}
                    </h4>
                    <div className="space-y-4">
                      {co.staff.map((person, idx) => (
                        <div key={idx} className="flex justify-between items-center border-b border-white/5 pb-2 last:border-0">
                          <div>
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">{person.pos}</p>
                            <p className="text-sm font-bold text-slate-200 uppercase tracking-tight">{person.name}</p>
                          </div>
                          <div className="h-1.5 w-1.5 rounded-full bg-yellow-600/20 group-hover:bg-yellow-500 transition-colors" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

const CommandBox = ({ data, variant }) => (
  <motion.div whileHover={{ y: -5 }} className={`${variant === 'gold' ? 'bg-yellow-500 text-slate-950 shadow-[0_0_40px_rgba(234,179,8,0.2)]' : 'bg-slate-900 border border-slate-800 text-white'} p-6 rounded-2xl w-full relative transition-all flex items-center gap-5 text-left`}>
    <div className={`w-20 h-20 rounded-full border-2 overflow-hidden flex-shrink-0 bg-slate-800 ${variant === 'gold' ? 'border-slate-900' : 'border-yellow-500/50'}`}>
      <img src={data.portrait} alt={data.name} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all" />
    </div>
    <div>
      <p className={`text-[10px] font-black tracking-[0.2em] uppercase mb-1 ${variant === 'gold' ? 'text-slate-800' : 'text-yellow-500'}`}>
        {data.role}
      </p>
      <h3 className="text-2xl font-black uppercase italic leading-none">{data.name}</h3>
      <p className={`text-sm font-bold mt-2 ${variant === 'gold' ? 'text-slate-900' : 'text-slate-500'}`}>
        {data.rank}
      </p>
    </div>
  </motion.div>
);

export default Leadership;