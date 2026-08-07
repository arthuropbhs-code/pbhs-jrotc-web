import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Users, GraduationCap } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { usePageMeta } from '../hooks/usePageMeta';
import { useCompanies } from '../hooks/useCompanies';

const Leadership = () => {
  usePageMeta({
    title: 'Leadership',
    description: 'Meet the PBHS JROTC Tornado Battalion command staff, company leadership, and instructors.',
    path: '/leadership',
  });
  const { companies: rawCompanies } = useCompanies();
  const [activeTab, setActiveTab] = useState('staff');
  const [cmsEntries, setCmsEntries] = useState([]);
  // Instructors (SAI/AI) live in their own collection, separate from the
  // cadet chain of command in `leadership` - this page's own meta
  // description already promised them, they just weren't actually fetched
  // or rendered anywhere on it.
  const [instructors, setInstructors] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "leadership"), (snapshot) => {
      setCmsEntries(snapshot.docs.map(d => d.data()));
    });
    const unsubInstructors = onSnapshot(collection(db, "instructors"), (snapshot) => {
      setInstructors(snapshot.docs.map(d => d.data()));
    });
    return () => { unsubscribe(); unsubInstructors(); };
  }, []);

  const sai = instructors.find(i => (i.type || '').toUpperCase().trim() === 'SAI');
  const ai = instructors.find(i => (i.type || '').toUpperCase().trim() === 'AI');

  // --- 1. COMMAND TEAM FILTERS ---
  const getRole = (roleTitle, fallbackName) => {
    const found = cmsEntries.find((item) => {
      const role = item?.role || item?.attributes?.role;
      const company = item?.company || item?.attributes?.company;
      
      return role?.trim().toLowerCase() === roleTitle.toLowerCase() && 
             (!company || company.trim() === "" || company.trim().toLowerCase() === "none");
    });

    if (found) {
      return {
        role: found.role || roleTitle,
        rank: found.rank || "N/A",
        name: found.name || fallbackName,
        portrait: found.portrait || "/covers/placeholder.webp"
      };
    }

    return { role: roleTitle, rank: "N/A", name: fallbackName, portrait: "/covers/placeholder.webp" };
  };

  const bc = getRole("Battalion Commander", "Unassigned");
  const xo = getRole("Executive Officer", "Unassigned");
  const csm = getRole("Command Sergeant Major", "Unassigned");

  // DYNAMIC SGM FILTER: Gathers all matching profiles into an array to support 0, 1, or multiple entries
  const sgmMembers = cmsEntries.filter((item) => {
    const role = item?.role || item?.attributes?.role || "";
    const company = item?.company || item?.attributes?.company || "None";
    return role.trim().toLowerCase() === "sergeant major" && 
           (!company || company.trim() === "" || company.trim().toLowerCase() === "none");
  });

  // --- 2. BATTALION STAFF FILTERS ---
  const staff = cmsEntries.filter((item) => {
    const role = item?.role;
    const company = item?.company;
    
    if (!role) return false;
    
    const upperRole = role.toUpperCase().trim();
    // Matches "S-3", "S3", "S-1", "S1", etc.
    const isStaffRole = upperRole.startsWith("S-") || /^S\d/.test(upperRole);
    const isNoCompany = !company || company.trim() === "" || company.trim().toLowerCase() === "none";
    
    return isStaffRole && isNoCompany;
  }).sort((a, b) => (a.role || "").localeCompare(b.role || ""));

  // --- 3. DYNAMIC COMPANY GENERATOR ---
  // Derived from useCompanies() → matches AdminLeadership's format exactly.
  const companyNames = rawCompanies.map(c => `${c} Company`);
  
  const companies = companyNames.map((companyName) => {
    const companyMembers = cmsEntries.filter((item) => {
      const company = item?.company || item?.attributes?.company;
      return company?.trim().toLowerCase() === companyName.toLowerCase();
    });

    const getCompanyPosition = (posName) => {
      const found = companyMembers.find((m) => {
        const role = m?.role || m?.attributes?.role;
        return role?.trim().toLowerCase() === posName.toLowerCase();
      });
      
      return { 
        pos: posName, 
        name: found ? `${found.rank || ''} ${found.name || ''}`.trim() : "None" 
      };
    };

    return {
      name: companyName,
      staff: [
        getCompanyPosition("Commander"),
        getCompanyPosition("Executive Officer"),
        getCompanyPosition("First Sergeant")
      ]
    };
  });

  return (
    <div className="min-h-screen bg-slate-950 pt-32 pb-20 px-4">
      <div className="max-w-7xl mx-auto text-center">
        
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-16 text-center">
          <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tighter uppercase italic">
            Chain of <span className="text-yellow-500">Command</span>
          </h1>
          <div className="h-1 w-24 bg-yellow-500 mx-auto rounded-full" />
        </motion.div>

        {/* INSTRUCTORS (SAI/AI) - real Army/DoD instructors, distinct from the cadet chain of command below */}
        {(sai || ai) && (
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16 max-w-2xl mx-auto">
            {sai && (
              <div className="flex-1 bg-slate-900 border border-white/5 rounded-2xl p-5 flex items-center gap-4 text-left">
                <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-500 shrink-0">
                  <GraduationCap size={22} />
                </div>
                <div>
                  <p className="text-[9px] font-black tracking-widest text-yellow-500 uppercase">Senior Army Instructor</p>
                  <h3 className="text-lg font-black text-white uppercase italic leading-tight">{sai.name}</h3>
                </div>
              </div>
            )}
            {ai && (
              <div className="flex-1 bg-slate-900 border border-white/5 rounded-2xl p-5 flex items-center gap-4 text-left">
                <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-500 shrink-0">
                  <GraduationCap size={22} />
                </div>
                <div>
                  <p className="text-[9px] font-black tracking-widest text-yellow-500 uppercase">Army Instructor</p>
                  <h3 className="text-lg font-black text-white uppercase italic leading-tight">{ai.name}</h3>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TOP COMMAND COMMANDER */}
        <div className="flex flex-col items-center gap-10">
          <div className="w-full max-w-lg">
            <CommandBox data={bc} variant="gold" />
          </div>

          {/* XO AND CSM / SGM GRID LAYOUT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl items-start justify-center">
             
             {/* XO BOX */}
             <CommandBox data={xo} variant="blue" />
             
             {/* CSM + OPTIONAL SGM LAYERED STACK */}
             <div className="flex flex-col gap-4 w-full">
               <div className="bg-slate-900 border border-yellow-500/30 p-6 rounded-2xl w-full transition-all hover:-translate-y-1 text-left flex items-center gap-4">
                   <div className="w-16 h-16 rounded-full border-2 border-yellow-500/50 overflow-hidden flex-shrink-0 bg-slate-800">
                     <img src={csm.portrait} alt={csm.name} className="w-full h-full object-cover" />
                   </div>
                   <div>
                     <p className="text-[10px] font-black tracking-widest text-yellow-500 uppercase">{csm.role}</p>
                     <h3 className="text-xl font-black text-white uppercase italic leading-none">{csm.name}</h3>
                     <p className="text-sm font-bold text-slate-500 mt-1">{csm.rank}</p>
                   </div>
               </div>

               {/* SERGEANT MAJOR CARDS (Conditionally rendered, drops completely out of layout if empty) */}
               {sgmMembers.length > 0 && (
                 <div className="flex flex-col items-center w-full pl-6 border-l-2 border-slate-800/60 gap-3 mt-1">
                   {sgmMembers.map((sgmItem, index) => (
                     <div key={index} className="bg-slate-900/40 border border-slate-800 p-4 rounded-xl w-full transition-all hover:-translate-y-1 text-left flex items-center gap-4">
                         <div className="w-12 h-12 rounded-full border border-white/10 overflow-hidden flex-shrink-0 bg-slate-800">
                           <img src={sgmItem.portrait || "/covers/placeholder.webp"} alt={sgmItem.name} className="w-full h-full object-cover" />
                         </div>
                         <div>
                           <p className="text-[9px] font-black tracking-widest text-slate-500 uppercase">{sgmItem.role || "Sergeant Major"}</p>
                           <h3 className="text-md font-black text-slate-200 uppercase italic leading-none">{sgmItem.name}</h3>
                           <p className="text-xs font-bold text-slate-600 mt-0.5">{sgmItem.rank || "N/A"}</p>
                         </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>

          </div>
        </div>

        {/* TAB NAVIGATION PANEL */}
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
                  <div key={i} className="glass-card bg-slate-900/60 border border-slate-800 p-5 border-l-4 border-yellow-600 flex justify-between items-center group rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full border border-yellow-600/30 overflow-hidden flex-shrink-0 bg-slate-800">
                        <img src={s.portrait || "/covers/placeholder.webp"} alt={s.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-1">{s.role}</p>
                        <h4 className="text-xl font-bold text-white italic">{s.name}</h4>
                        <p className="text-xs text-slate-500 font-medium">{s.desc || 'Battalion Staff Officer'}</p>
                      </div>
                    </div>
                    <ShieldCheck className="text-slate-800 group-hover:text-yellow-600 transition-colors" />
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div key="company" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid md:grid-cols-2 gap-6">
                {companies.map((co, i) => (
                  <div key={i} className="glass-card bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-left border-t-2 border-yellow-600/50 relative overflow-hidden group">
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
      <img src={data.portrait} alt={data.name} className="w-full h-full object-cover" />
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