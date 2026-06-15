import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { 
  ArrowLeft, Mail, Shield, Award, Star, BookOpen, 
  Loader2, CalendarDays, UserCircle, Users, Clock 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CommanderInfo = () => {
  const { id } = useParams();
  const [team, setTeam] = useState(null);
  const [leadershipDossiers, setLeadershipDossiers] = useState([]);
  const [loading, setLoading] = useState(true);

  // YOUR LOGIC: Sorting Priority
  const getRankPriority = (role) => {
    const r = role?.toUpperCase().trim() || '';
    if (r.includes('BATTALION OFFICER')) return 0;
    if (r === 'COMMANDER' || r === 'TEAM COMMANDER' || r.includes('DRONES COMMANDER')) return 1;
    if (r === 'CO-COMMANDER' || r === 'TEAM CO-COMMANDER' || r.includes('CO COMMANDER')) return 2;
    return 3;
  };

  useEffect(() => {
    const fetchTeamAndLeadership = async () => {
      try {
        const normalizedId = id.toLowerCase().replace(/\s+/g, '-');
        const teamSnap = await getDoc(doc(db, "specialTeams", normalizedId));

        if (teamSnap.exists()) {
          const teamData = teamSnap.data();
          setTeam(teamData);

          const leaders = teamData.leadership || [];
          
          const dossiersWithProfiles = await Promise.all(leaders.map(async (leader) => {
            const emailToSearch = (leader.email || "").toLowerCase().trim();
            let userData = {};

            if (emailToSearch) {
              const userQuery = query(collection(db, "users"), where("email", "==", emailToSearch));
              const userSnap = await getDocs(userQuery);
              if (!userSnap.empty) {
                userData = userSnap.docs[0].data();
              }
            }

            // YOUR LOGIC: Image path cleanup
            let profileImg = userData.photoURL || userData.profilePicture || userData.image || null;
            if (profileImg) {
              const cleanPath = (profileImg.startsWith('http') || profileImg.startsWith('/')) 
                ? profileImg 
                : `/${profileImg}`;
              profileImg = cleanPath.replace(/\s/g, '%20');
            }

            return {
              ...userData, 
              ...leader,
              // YOUR LOGIC: Data priority
              displayName: leader.name || userData.displayName || userData.name || "Unknown Cadet",
              displayRank: leader.rank || userData.rank || "Cadet",
              displayRole: (leader.teamRole || leader.role || "Team Officer").toUpperCase(),
              profileImg: profileImg,
              mission: userData.bio || userData.missionStatement || "No mission statement currently filed.",
              availability: userData.practiceDays || "No schedule filed"
            };
          }));

          // YOUR LOGIC: Tactical Sort
          setLeadershipDossiers(dossiersWithProfiles.sort((a, b) => 
            getRankPriority(a.displayRole) - getRankPriority(b.displayRole)
          ));
        }
      } catch (error) {
        console.error("Critical Dossier Fetch Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTeamAndLeadership();
  }, [id]);

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-900 dark:text-white p-6">
      <Loader2 className="text-yellow-600 dark:text-yellow-500 animate-spin mb-4" size={40} />
      <h2 className="text-xs font-black uppercase tracking-[0.3em]">Accessing Battalion Dossiers...</h2>
    </div>
  );

  return (
    /* Increased spacing pt-48 to clear nav */
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-6 md:p-12 pt-48 font-sans transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        <Link to="/teams" className="inline-flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-yellow-600 dark:hover:text-yellow-500 mb-8 transition-all text-xs font-black uppercase tracking-widest group">
          <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" /> Back to Teams
        </Link>

        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* LEFT: PERSONNEL DOSSIERS (Team Leadership) */}
          <div className="lg:col-span-4 space-y-6">
            <h3 className="text-[10px] font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-[0.3em] mb-4 flex items-center gap-2 ml-2">
              <Users size={14} /> Leadership Roster
            </h3>
            
            <AnimatePresence mode="popLayout">
              {leadershipDossiers.map((officer, index) => (
                <motion.div 
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-[2rem] p-6 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden group hover:border-yellow-500/30 transition-all"
                >
                  {/* Background Decoration */}
                  <div className="absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-all duration-500 pointer-events-none">
                    {officer.profileImg ? (
                      <img src={officer.profileImg} alt="" className="w-24 h-24 object-cover rounded-full grayscale" />
                    ) : (
                      <Shield size={60} className="text-slate-900 dark:text-white" />
                    )}
                  </div>

                  <div className="flex items-center gap-4 mb-4 relative z-10">
                    <div className="w-14 h-14 rounded-2xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 shadow-inner overflow-hidden">
                      {officer.profileImg ? (
                        <img 
                          src={officer.profileImg} 
                          alt={officer.displayName} 
                          className="w-full h-full object-cover object-top" 
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <UserCircle className="text-yellow-600 dark:text-yellow-500" size={30} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-md font-black uppercase italic tracking-tight leading-none text-slate-900 dark:text-white">{officer.displayName}</h4>
                      <p className="text-[10px] font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-widest mt-1">
                        {officer.displayRank} • {officer.displayRole}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4 relative z-10">
                    <div className="bg-slate-50 dark:bg-black/20 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <BookOpen size={10} className="text-yellow-600 dark:text-yellow-500" />
                        <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Leadership Bio</span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed italic">
                        "{officer.mission}"
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 dark:bg-black/20 p-3 rounded-lg border border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-1 mb-1">
                          <Star size={10} className="text-yellow-600 dark:text-yellow-500" />
                          <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">Training</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-900 dark:text-white uppercase">{officer.letLevel || 'N/A'}</p>
                      </div>
                      <div className="bg-slate-50 dark:bg-black/20 p-3 rounded-lg border border-slate-100 dark:border-white/5">
                        <div className="flex items-center gap-1 mb-1">
                          <Clock size={10} className="text-yellow-600 dark:text-yellow-500" />
                          <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase">Available</span>
                        </div>
                        <p className="text-[10px] font-bold text-slate-900 dark:text-white uppercase truncate">{officer.availability}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between relative z-10">
                    <span className="text-[8px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">Personnel Record Verified</span>
                    <button 
                      onClick={() => window.location.href = `mailto:${officer.email}`}
                      className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500 text-slate-950 rounded-lg text-[9px] font-black uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20"
                    >
                      <Mail size={12} /> Contact
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* RIGHT: UNIT OPERATIONS (Team Operational File) */}
          <div className="lg:col-span-8 space-y-6">
             <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden"
             >
                <header className="mb-10 flex flex-col md:flex-row justify-between items-start border-b border-slate-100 dark:border-white/5 pb-8 relative z-10 gap-4">
                  <div>
                    <h3 className="text-[10px] font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-[0.4em] mb-2">Team Operational File</h3>
                    <h4 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">{team?.name}</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 font-medium max-w-xl leading-relaxed">{team?.description}</p>
                  </div>
                  <Award className="text-slate-200 dark:text-slate-800 shrink-0" size={64} />
                </header>

                <div className="grid md:grid-cols-2 gap-10">
                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <CalendarDays size={18} className="text-yellow-600 dark:text-yellow-500" />
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-200">Logistics</h5>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/5 p-5 rounded-2xl mb-4">
                      <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">Practice Schedule</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white uppercase">{team?.practice}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-white/5 p-5 rounded-2xl">
                      <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase mb-1">Operational Area</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white uppercase">{team?.location}</p>
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-3 mb-6">
                      <Shield size={18} className="text-yellow-600 dark:text-yellow-500" />
                      <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-slate-200">Team Status</h5>
                    </div>
                    <div className="bg-yellow-500/5 dark:bg-yellow-500/5 border border-yellow-500/20 p-8 rounded-[2rem] border-l-4 border-l-yellow-600 dark:border-l-yellow-500 shadow-inner">
                      <p className="text-2xl font-black text-yellow-700 dark:text-white uppercase italic tracking-tighter leading-none">
                        {team?.status}
                      </p>
                      <p className="text-[10px] font-black text-yellow-600 dark:text-yellow-500/60 uppercase mt-2 tracking-widest">
                        Deployment Active
                      </p>
                    </div>
                  </section>
                </div>
             </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommanderInfo;