import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crosshair, Shield, Flag, Trophy, Target, ChevronRight, Clock, MapPin, Lock, Globe, Moon } from 'lucide-react';

const Teams = () => {
  const [activeTeam, setActiveTeam] = useState('Drill Team');

  const teamsData = {
    'Drill Team': {
      icon: <Shield className="text-yellow-500" size={32} />,
      status: "Closed Practice",
      statusIcon: <Lock size={12} />,
      statusColor: "text-red-400 bg-red-400/10 border-red-400/20",
      seasonText: "In Season / Teams Selected",
      color: 'border-yellow-500',
      description: "Precision, discipline, and sharp execution. The Drill Team represents the height of military bearing through regulation and exhibition drill.",
      requirements: ["Good Grades", "Clean uniform record"],
      practice: "Mon/Wed - 3:30-4:30 PM / Fri - 8:00-11:00 AM",
      location: "JROTC Room",
      highlights: [ "Armed Squad Regulation", "Unarmed Squad Regulation", "Armed Exhibition Program", "LET 1 Squad"]
    },
    'Raider Team': {
      icon: <Trophy className="text-orange-500" size={32} />,
      status: "Out of Season",
      statusIcon: <Moon size={12} />,
      statusColor: "text-slate-500 bg-slate-500/10 border-slate-500/20",
      seasonText: "Conditioning Only",
      color: 'border-orange-500',
      description: "The ultimate physical challenge. Raiders focus on fitness, teamwork, and outdoor skills including rope bridges and tire flips.",
      requirements: ["Sports Physical on file", "High physical endurance", "Team-first mentality"],
      practice: "Out of season",
      location: "JROTC Room / Track",
      highlights: ["5K Team Run", "Rope Bridge", "Cross Country Rescue", "Obstacle Course", "Item Relay"]
    },
    'Color Guard': {
      icon: <Flag className="text-blue-500" size={32} />,
      status: "Closed Practice",
      statusIcon: <Lock size={12} />,
      statusColor: "text-red-400 bg-red-400/10 border-red-400/20",
      seasonText: "In Season / Teams Selected",
      color: 'border-blue-500',
      description: "The most visible team in the battalion. Color Guard presents the National and State flags at games, parades, and formal ceremonies.",
      requirements: ["Exceptional military bearing", "Availability for evening games", "Expert flag/rifle manual"],
      practice: "Thursday - 3:30-5:00 PM",
      location: "JROTC Room",
      highlights: ["Male Color Guard", "Female Color Guard" ]
    },
    'Drones': {
      icon: <Crosshair className="text-red-500" size={32} />,
      status: "Open Practice",
      statusIcon: <Globe size={12} />,
      statusColor: "text-green-400 bg-green-400/10 border-green-400/20",
      seasonText: "New Pilots Welcome",
      color: 'border-red-500',
      description: "Master the skies with drone technology. Focus on flight safety, technical maneuvers, and competitive racing protocols.",
      requirements: ["Technical aptitude", "Safety certification", "Steady coordination"],
      practice: "Mod/Wed - 3:30-4:30 PM",
      location: "JROTC Room / Cyber Room",
      highlights: ["Pilot Navigation Mission", " Autonomous Flight Mission", "Communications Mission", "Teamwork Mission"]
    },
    'JLAB': {
      icon: <Target className="text-purple-500" size={32} />,
      status: "Not in Season",
      statusIcon: <Moon size={12} />,
      statusColor: "text-slate-500 bg-slate-500/10 border-slate-500/20",
      seasonText: "Academic Competition Closed",
      color: 'border-purple-500',
      description: "The 'Brain Team.' JROTC Leadership & Academic Bowl focuses on SAT/ACT style questions, JROTC curriculum, and current events.",
      requirements: ["Strong academic standing", "Quick recall skills", "Study commitment"],
      practice: "Friday - Lunch / After School",
      location: "Classroom 104",
      highlights: ["Academic Competition", "Leadership Theory", "National Championship Bid"]
    }
  };

  const currentTeam = teamsData[activeTeam];

  return (
    <div className="min-h-screen bg-slate-950 pt-32 pb-20 px-6 text-left">
      <div className="max-w-6xl mx-auto">
        
        <header className="mb-12">
          <h2 className="text-xs font-black text-yellow-500 tracking-[0.4em] uppercase mb-4">Extracurricular Teams</h2>
          <h1 className="text-5xl md:text-7xl font-black text-white uppercase italic font-military tracking-tighter">
            Special <span className="text-slate-500">Teams</span>
          </h1>
        </header>

        <div className="grid lg:grid-cols-4 gap-8">
          
          <div className="space-y-2">
            {Object.keys(teamsData).map((team) => (
              <button
                key={team}
                onClick={() => setActiveTeam(team)}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between group ${
                  activeTeam === team 
                  ? 'bg-yellow-500 border-yellow-500 text-slate-950 shadow-lg' 
                  : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="font-black uppercase italic tracking-wider">{team}</span>
                <ChevronRight size={16} className={activeTeam === team ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity'} />
              </button>
            ))}
          </div>

          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTeam}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`glass-card p-8 border-t-4 relative overflow-hidden ${currentTeam.color}`}
              >
                {/* Status Badge */}
                <div className={`absolute top-6 right-8 px-3 py-1 rounded-full border flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter ${currentTeam.statusColor}`}>
                  {currentTeam.statusIcon}
                  {currentTeam.status}
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
                  <div className="p-4 bg-white/5 rounded-2xl w-fit">
                    {currentTeam.icon}
                  </div>
                  <div>
                    <h3 className="text-3xl font-black text-white uppercase italic tracking-tight">{activeTeam}</h3>
                    <p className="text-yellow-500/80 text-[10px] font-bold uppercase tracking-widest mb-1">{currentTeam.seasonText}</p>
                    <p className="text-slate-400 text-sm max-w-xl leading-relaxed">{currentTeam.description}</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em] mb-3">Schedule & Intel</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 text-slate-300 text-xs">
                          <Clock size={14} className="text-slate-500" /> {currentTeam.practice}
                        </div>
                        <div className="flex items-center gap-3 text-slate-300 text-xs">
                          <MapPin size={14} className="text-slate-500" /> {currentTeam.location}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.2em] mb-3">Core Disciplines</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentTeam.highlights.map((h, i) => (
                          <span key={i} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] text-slate-400 font-bold uppercase">
                            {h}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                    <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-4">Joining Requirements</h4>
                    <ul className="space-y-3">
                      {currentTeam.requirements.map((req, i) => (
                        <li key={i} className="flex items-center gap-3 text-slate-300 text-xs">
                          <div className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                          {req}
                        </li>
                      ))}
                    </ul>
                    <button className="w-full mt-6 py-3 bg-white text-slate-950 rounded font-black uppercase text-[10px] tracking-widest hover:bg-yellow-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                      disabled={currentTeam.status === "Closed Practice"}>
                      {currentTeam.status === "Closed Practice" ? "Roster Full" : "Contact Team Commander"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Teams;