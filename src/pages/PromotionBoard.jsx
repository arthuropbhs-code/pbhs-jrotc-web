import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle, Shield, ChevronLeft, LayoutGrid } from 'lucide-react';
import { Link } from 'react-router-dom';

const PromotionBoard = () => {
  const [selectedRank, setSelectedRank] = useState('Squad Member');
  const [activeAsst, setActiveAsst] = useState('S-1');

  // Ensure page starts at top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const boardData = {
    'Squad Member': {
      knowledge: ["Cadet Creed", "JROTC Meaning", "LET Meaning", "SAI (Who & Meaning)", "AI (Who & Meaning)", "Mission Statement", "LDRSHIP Meaning", "10 Ranks", "Military Bearing", "Company & Battalion Org"],
      duties: [
        "Maintain and wear the entire uniform immaculately when told",
        "Properly care for all equipment and materials given to you",
        "Ensure you are on time for all official formations",
        "Conduct yourself in a manner that brings credit to the Tornado Battalion",
        "If called upon be ready to perform as squad leader"
      ],
      leadership: "5/11 Principles",
    },
    'Squad Leader': {
      knowledge: ["Cadet Creed", "LDRSHIP with definitions", "JROTC/LET Meaning", "Mission Statement", "SAI & AI Roles", "Company Leadership to squad members", "All Cadet Ranks"],
      duties: [
        "Responsible for all squad activities",
        "Sets the standard and direction of their squad",
        "Communicates information and end dates from leadership to squad members",
        "Encourages squad members to act appropriately in compliance with policies",
        "Responsible for personal accountability, uniform, equipment, and training plans"
      ],
      leadership: "5/11 Principles",
    },
    'Platoon Sergeant': {
      knowledge: ["Cadet Creed", "LDRSHIP with definitions", "JROTC/LET Meaning", "SAI & AI Roles", "Company Leadership to Platoon", "All Cadet Ranks"],
      duties: [
        "Responsible for all platoon activities",
        "Sets the standard and direction of their platoon",
        "Communicates information and end dates from leadership to platoon",
        "Encourages platoon to act appropriately in compliance with policies",
        "Responsible for personal accountability, uniform, equipment, and training plans"
      ],
      leadership: "5/11 Principles",
    },
    'Platoon Leader': {
      knowledge: ["Cadet Creed", "LDRSHIP with definitions", "JROTC/LET Meaning", "Mission Statement", "SAI & AI Roles", "Company Leadership to Squad Leaders", "All Cadet Ranks"],
      duties: [
        "Responsible for all platoon activities",
        "Sets the standard and direction of their platoon",
        "Communicates information and end dates from leadership to platoon sergeant",
        "Encourages platoon to act appropriately in compliance with policies",
        "Responsible for personal accountability, uniform, equipment, and training plans"
      ],
      leadership: "7/11 Principles",
    },
    'Company 1SG': {
      knowledge: ["Cadet Creed", "LDRSHIP definitions", "SAI & AI Roles", "Top 5 & Company Chain of Command", "All Cadet Ranks"],
      duties: [
        "Coordinating with platoon sergeants to ensure proper training",
        "Responsible for passing information and data from platoon to CC and CC to platoon",
        "Advises CC on planning and coordinating company activities and training",
        "Accomplishes duties that are given by the CC, XO, and/or Army Instructor",
        "Responsible for the safety and risk assessment of all company events"
      ],
      leadership: "8/11 Principles",
    },
    'Company XO': {
      knowledge: ["Cadet Creed", "LDRSHIP definitions", "SAI & AI Roles", "Top 5 & Company Chain of Command", "All Cadet Ranks"],
      duties: [
        "Assumes command and responsibilities in CC absence",
        "Serves as Chief of Staff; supervises and coordinates company staff",
        "Responsible for passing information/data between company staff and CC",
        "Accomplishes those duties that are given by the company commander",
        "Responsible for the safety and risk assessment of all company events"
      ],
      leadership: "8/11 Principles",
    },
    'Company Commander': {
      knowledge: ["Cadet Creed", "LDRSHIP definitions", "SAI & AI Roles", "Top 5 & Company Chain", "Mission Statement", "All Cadet Ranks"],
      duties: [
        "Responsible for all company level activities",
        "Keeps the battalion commander informed of the status of the company",
        "Ensures the company is prepared to accomplish its assigned mission",
        "Build effective company chain of command",
        "Sets the standard and direction of the company",
        "Consult training schedules and ensure peer preparation to instruct",
        "Execute the orders of the battalion commander"
      ],
      leadership: "9/11 Principles",
    },
    'Staff Assistants': {
      knowledge: ["Cadet Creed", "LDRSHIP definitions", "JROTC/LET Meaning", "SAI & AI Roles", "Leadership: Co. to Squad Leaders of Platoon", "All Cadet Ranks"],
      leadership: "5/11 Principles",
      sections: [
        { 
          id: "S-1", 
          title: "Administrative Assistant", 
          asst: [
            "Responsible for all matters concerning human resources within the company",
            "Provide administrative support within the company",
            "Responsible for the recording of all company data",
            "Responsible for the execution of all company level award ceremonies"
          ]
        },
        { 
          id: "S-2", 
          title: "Safety & Security Assistant", 
          asst: [
            "Supervises company physical security and makes periodic inspections of all drill weapons",
            "Ensures that all Company activities are conducted in a safe manner",
            "Serves on event staff for planning and conducting company training events"
          ]
        },
        { 
          id: "S-3", 
          title: "Training Assistant", 
          asst: [
            "Responsible for all matters concerning training operations and plans within the company",
            "Plans, organizes and supervises the conduct of cadet training within the company",
            "Ensures that all training listed within scheduling is rehearsed by the company",
            "Ensures the use of all schedules provided by the Battalion (S-3)"
          ]
        },
        { 
          id: "S-4", 
          title: "Supply Assistant", 
          asst: [
            "Responsible for the distribution and maintenance of supply within the company",
            "Serve as a link between cadets and the Battalion (S-4)",
            "Serves on event staff for planning and conducting company training events"
          ]
        },
        { 
          id: "S-5", 
          title: "Public Affairs Assistant", 
          asst: [
            "Responsible for taking video and picture documentation of all events within the company"
          ]
        },
        { 
          id: "S-6", 
          title: "Automation Assistant", 
          asst: [
            "Assist in making periodic inspections of automation equipment",
            "Maintain and ensure the proper operation of all automation equipment used within the company"
          ]
        }
      ]
    }
  };

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
                      <p className="text-[10px] text-slate-500 uppercase font-black">Leadership Standard</p>
                      <p className="text-sm font-bold text-white uppercase">5/11 Principles</p>
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
                    <p className="text-[10px] font-black text-yellow-500 uppercase tracking-widest mb-4">Core Knowledge Base</p>
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
                  <BookOpen className="text-yellow-500" size={20} /> Required Knowledge
                </h3>
                <div className="mb-6 p-3 bg-white/5 rounded border border-white/5">
                  <p className="text-[10px] text-yellow-500 font-black uppercase mb-1">Leadership Standard</p>
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