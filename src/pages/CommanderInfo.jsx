import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, Mail, Shield, Award, 
  Star, Calendar, BookOpen, ExternalLink 
} from 'lucide-react';

const CommanderInfo = () => {
  const { id } = useParams();

  // Database of commander details
  const commanderRegistry = {
    'Drill': {
      name: "Bryan Morrison",
      rank: "CDT CSM",
      position: "Command Sergeant Major / Drill Team Lead",
      email: "pacheco@example.edu",
      portrait: "/covers/Morrison.jpg",
      bio: "Leading the battalion with a focus on discipline and academic excellence. Expert in Armed Exhibition and Regulation drill.",
      achievements: ["Superior Cadet Award", "Distinguished Honor Graduate", "Drill Excellence Ribbon"],
      yearsInProgram: "4 Years",
    },
    'Raider': {
      name: "Nicholas Pacheco",
      rank: "CDT LCOL",
      position: "Raider Team Commander",
      email: "tkitts@example.edu",
      portrait: "/covers/Pacheco.jpg",
      bio: "Dedicated to physical readiness and team tactical endurance. Spearheading the Raider conditioning program for the current season.",
      achievements: ["Raider Challenge Medal", "Physical Fitness Excellence", "Leadership Development Ribbon"],
      yearsInProgram: "3 Years",
    },
    'ColorGuard': {
      name: "Nicholas Pacheco",
      rank: "CDT LCOL",
      position: "Battalion Commander / Color Guard Lead",
      email: "morrison@example.edu",
      portrait: "/covers/Pacheco.jpg",
      bio: "Ensuring the highest standards of military bearing and flag etiquette across all battalion ceremonies.",
      achievements: ["NCO of the Year", "Color Guard Excellence", "Perfect Attendance"],
      yearsInProgram: "4 Years",
    },
    'JLAB': {
      name: "Grayson Kitts",
      rank: "c/MAJ",
      position: "JLAB Commander",
      email: "gkitts@example.edu",
      portrait: "/covers/G kitts.jpg",
      bio: "Academic lead for the battalion. Focusing on competitive recall, leadership theory, and JROTC curriculum mastery.",
      achievements: ["Academic Excellence", "JLAB National Qualifier", "Staff Excellence Ribbon"],
      yearsInProgram: "3 Years",
    },
    'Drones': {
      name: "Max Demio",
      rank: "CDT 2LT",
      position: "Drone Team Commander",
      email: "demio@example.edu",
      portrait: "/covers/Demio.jpg",
      bio: "Expert in UAV operations and flight safety. Managing technical missions and pilot navigation training.",
      achievements: ["Tech Excellence Award", "Drone Pilot Certification", "Public Affairs Ribbon"],
      yearsInProgram: "LET 3",
    }
  };

  const commander = commanderRegistry[id];

  // Fallback if ID is not found
  if (!commander) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
        <h2 className="text-2xl font-black uppercase italic mb-4">Personnel File Not Found</h2>
        <Link to="/teams" className="text-yellow-500 font-bold uppercase tracking-widest text-sm flex items-center gap-2">
          <ArrowLeft size={16} /> Return to Operations
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 pt-24 font-sans">
      <div className="max-w-4xl mx-auto">
        
        <Link to="/teams" className="flex items-center gap-2 text-slate-500 hover:text-yellow-500 mb-8 transition-colors text-sm font-bold uppercase tracking-widest">
          <ArrowLeft size={16} /> Back to Teams
        </Link>

        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Profile Sidebar */}
          <div className="md:col-span-1 space-y-6">
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 shadow-2xl overflow-hidden relative group">
              <div className="aspect-square rounded-2xl overflow-hidden mb-6 border border-white/10">
                <img 
                  src={commander.portrait} 
                  alt={commander.name} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                />
              </div>
              <h2 className="text-2xl font-black uppercase italic leading-tight">{commander.name}</h2>
              <p className="text-yellow-500 text-xs font-black uppercase tracking-widest mt-1">{commander.rank}</p>
              
              <div className="mt-6 pt-6 border-t border-white/5 space-y-4">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <Star className="text-yellow-500" size={14} /> {commander.yearsInProgram} Service
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <Shield className="text-yellow-500" size={14} /> Active Duty
                </div>
              </div>
            </div>

            <button 
              onClick={() => window.location.href = `mailto:${commander.email}`}
              className="w-full bg-yellow-500 text-slate-950 py-4 rounded-xl font-black uppercase text-xs tracking-widest hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/10"
            >
              <Mail size={16} /> Secure Message
            </button>
          </div>

          {/* Main Dossier Content */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 shadow-2xl">
              <header className="mb-8 flex justify-between items-start">
                <div>
                  <h3 className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] mb-2">Personnel File</h3>
                  <h4 className="text-3xl font-black uppercase italic tracking-tighter">Command Profile</h4>
                </div>
                <Award className="text-slate-800" size={40} />
              </header>

              <div className="space-y-8">
                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <BookOpen size={16} className="text-yellow-500" />
                    <h5 className="text-xs font-black uppercase tracking-widest text-slate-200">Biography</h5>
                  </div>
                  <p className="text-slate-400 text-sm leading-relaxed italic">
                    "{commander.bio}"
                  </p>
                </section>

                <section>
                  <div className="flex items-center gap-3 mb-4">
                    <Award size={16} className="text-yellow-500" />
                    <h5 className="text-xs font-black uppercase tracking-widest text-slate-200">Decorations & Achievements</h5>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {commander.achievements.map((award, i) => (
                      <div key={i} className="bg-slate-950 border border-white/5 p-3 rounded-lg flex items-center gap-3 text-[10px] font-bold text-slate-300 uppercase tracking-tight">
                        <div className="h-1.5 w-1.5 bg-yellow-500 rounded-full" />
                        {award}
                      </div>
                    ))}
                  </div>
                </section>

                <div className="pt-8 border-t border-white/5 flex justify-between items-center text-[9px] font-black text-slate-600 uppercase tracking-widest">
                  <span>ID: AUTH-BC-{id.toUpperCase()}</span>
                  <span>Classified: Internal Use Only</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CommanderInfo;