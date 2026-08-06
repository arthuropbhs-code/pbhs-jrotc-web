import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../firebase'; // Ensure your firebase config is exported from here
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { 
  Crosshair, Shield, Flag, Trophy, Target, 
  ChevronRight, Clock, MapPin, Lock, Globe, 
  Moon, ArrowLeft, Ban
} from 'lucide-react';
import { TeamsPageSkeleton } from '../components/Skeleton';
import { usePageMeta } from '../hooks/usePageMeta';

const Teams = () => {
  usePageMeta({
    title: 'Battalion Teams',
    description: 'Extracurricular battalion teams - Drill, Raiders, Color Guard, and more. See schedules and joining requirements.',
    path: '/teams',
  });
  const navigate = useNavigate();
  const [activeTeam, setActiveTeam] = useState(null);
  const [teamsData, setTeamsData] = useState({});
  const [loading, setLoading] = useState(true);

  // Map icons to strings stored in Database
  const iconMap = {
    Shield: <Shield className="text-yellow-500" size={32} />,
    Trophy: <Trophy className="text-orange-500" size={32} />,
    Flag: <Flag className="text-blue-500" size={32} />,
    Crosshair: <Crosshair className="text-red-500" size={32} />,
    Target: <Target className="text-purple-500" size={32} />,
  };

  useEffect(() => {
    // Listen to the 'specialTeams' collection in Firestore
    const q = query(collection(db, "specialTeams"), orderBy("name", "asc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const teams = {};
snapshot.docs.forEach(doc => {
  const data = doc.data();
  // We use the name as the key for the state object
  teams[data.name] = { 
    id: doc.id, // This captures 'drones-team'
    ...data,
    icon: iconMap[data.iconName] || <Shield size={32} /> 
  };
});
      
      setTeamsData(teams);
      
      // Set the first team as active if none is selected
      if (snapshot.docs.length > 0 && !activeTeam) {
        setActiveTeam(snapshot.docs[0].data().name);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const currentTeam = teamsData[activeTeam];

const handleContactCommander = () => {
  const isOutOfSeason = currentTeam?.status === "Out of Season" || currentTeam?.status === "Not in Season";
  const isRosterFull = currentTeam?.status === "Closed Practice";
  
  if (!isOutOfSeason && !isRosterFull) {
    // FIX: Use currentTeam.id (which is the Firestore Doc ID)
    navigate(`/commander/${currentTeam.id}`);
  }
};

  return (
    <div className="min-h-screen bg-slate-950 pt-32 pb-20 px-6 text-left font-sans">
      <div className="max-w-6xl mx-auto">
        
        <Link to="/admin/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-yellow-500 mb-8 transition-colors text-sm font-bold uppercase tracking-widest">
          <ArrowLeft size={16} /> Back to Command
        </Link>

        <header className="mb-12">
          <h2 className="text-xs font-black text-yellow-500 tracking-[0.4em] uppercase mb-4">Extracurricular Activites</h2>
          <h1 className="text-5xl md:text-7xl font-black text-white uppercase italic tracking-tighter font-military">
            Battalion <span className="text-slate-500">Teams</span>
          </h1>
        </header>

        {loading ? (
          <TeamsPageSkeleton />
        ) : (
        <div className="grid lg:grid-cols-4 gap-8">

          {/* Sidebar Navigation */}
          <div className="space-y-2">
            {Object.keys(teamsData).map((team) => (
              <button
                key={team}
                onClick={() => setActiveTeam(team)}
                className={`w-full p-4 rounded-xl border text-left transition-all flex items-center justify-between group ${
                  activeTeam === team
                  ? 'bg-yellow-500 border-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20'
                  : 'bg-slate-900/50 border-white/5 text-slate-400 hover:border-slate-700'
                }`}
              >
                <span className="font-black uppercase italic tracking-wider text-sm">{team}</span>
                <ChevronRight size={16} className={activeTeam === team ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity'} />
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {currentTeam && (
                <motion.div
                  key={activeTeam}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`bg-slate-900 border border-white/5 p-8 rounded-3xl border-t-4 shadow-2xl relative overflow-hidden ${currentTeam.color}`}
                >
                  {/* Status Badge */}
                  <div className={`absolute top-6 right-8 px-3 py-1 rounded-full border border-white/10 flex items-center gap-2 text-[10px] font-black uppercase tracking-tighter ${currentTeam.statusColor}`}>
                    {currentTeam.status}
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
                    <div className="p-4 bg-slate-950 border border-white/5 rounded-2xl w-fit">
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
                          {currentTeam.highlights?.map((h, i) => (
                            <span key={i} className="px-3 py-1 bg-slate-950 border border-white/5 rounded-full text-[10px] text-slate-400 font-bold uppercase">
                              {h}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/50 rounded-2xl p-6 border border-white/5">
                      <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em] mb-4">Joining Requirements</h4>
                      <ul className="space-y-3 mb-6">
                        {currentTeam.requirements?.map((req, i) => (
                          <li key={i} className="flex items-center gap-3 text-slate-300 text-xs">
                            <div className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                            {req}
                          </li>
                        ))}
                      </ul>
                      
                      <button 
                        onClick={handleContactCommander}
                        className={`w-full py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg
                          ${(currentTeam.status !== "Closed Practice" && currentTeam.status !== "Out of Season" && currentTeam.status !== "Not in Season")
                            ? 'bg-yellow-500 text-slate-950 hover:bg-yellow-400 shadow-yellow-500/10' 
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5 shadow-none opacity-60'
                          }`}
                        disabled={currentTeam.status === "Closed Practice" || currentTeam.status === "Out of Season" || currentTeam.status === "Not in Season"}
                      >
                        {currentTeam.status === "Closed Practice" ? <Lock size={14}/> : (currentTeam.status === "Out of Season" || currentTeam.status === "Not in Season") ? <Ban size={14}/> : null}
                        
                        {currentTeam.status === "Closed Practice" ? "Roster Full" : 
                         (currentTeam.status === "Out of Season" || currentTeam.status === "Not in Season") ? "No Active Commander" : 
                         "Contact Team Commander"}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        )}
      </div>
    </div>
  );
};

export default Teams;