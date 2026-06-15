import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Megaphone, Clock, ShieldCheck, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const Announcements = () => {
  const { userData, role } = useAuth();
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    // Define who should see what based on user metadata
    const targetList = ["All", "Battalion Wide"];
    if (userData?.company) {
      targetList.push(userData.company + " Company");
      targetList.push(userData.company);
    }

    const q = query(
      collection(db, "announcements"), 
      where("target", "in", targetList),
      where("active", "==", true),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = new Date().getTime();
      
      const filteredData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(post => {
          // AUTO-EXPIRY LOGIC
          return !post.expiresAt || post.expiresAt > now;
        });

      setAnnouncements(filteredData);
    }, (error) => {
      console.error("Firestore Error:", error);
    });

    return () => unsubscribe();
  }, [userData?.company]);

  return (
    /* Increased pt-32 to pt-48 to push content further below the global nav */
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-6 md:p-12 pt-48 font-sans transition-colors duration-300">
      <div className="max-w-4xl mx-auto mt-12"> {/* Added mt-12 for extra vertical breathing room */}
        
        {/* Navigation / Return for Admins */}
        <div className="flex justify-between items-center mb-10"> {/* Increased mb-8 to mb-10 */}
          {(role === 'admin' || role === 'officer' || role === 'staff') ? (
            <Link 
              to="/admin/dashboard" 
              className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-yellow-600 dark:hover:text-yellow-500 transition-all font-black uppercase text-[10px] tracking-widest"
            >
              <ChevronLeft size={16} /> Admin Dashboard
            </Link>
          ) : <div />}
        </div>

        <header className="mb-16"> {/* Increased mb-12 to mb-16 to separate header from first post */}
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter flex items-center gap-4"
          >
            <Megaphone className="text-yellow-600 dark:text-yellow-500" size={40} /> 
            <span>Battalion <span className="text-yellow-600 dark:text-yellow-500">Announcements</span></span>
          </motion.h1>
          <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-3 ml-1">
            Information for the Corps of Cadets
          </p>
        </header>

        <div className="space-y-8"> {/* Increased space-y-6 to space-y-8 for more gap between cards */}
          <AnimatePresence mode="popLayout">
            {announcements.map((post, index) => (
              <motion.div 
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-8 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none hover:border-yellow-500/30 transition-all backdrop-blur-sm relative overflow-hidden group"
              >
                {/* Visual indicator for targeted posts */}
                {post.target !== "All" && (
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-500/40" />
                )}

                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="text-yellow-600 dark:text-yellow-500" size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-500">
                      Official Bulletin
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
                    <Clock size={12} /> {post.timestamp?.toDate().toLocaleDateString()}
                  </span>
                </div>

                <p className="text-lg text-slate-800 dark:text-slate-200 font-medium leading-relaxed mb-8 whitespace-pre-wrap">
                  {post.content}
                </p>

                <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-tighter">Issuing Authority</p>
                    <p className="text-sm font-bold text-slate-900 dark:text-white uppercase italic">{post.issuer}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-tighter">Distribution</p>
                    <p className="text-xs font-bold text-yellow-600 dark:text-yellow-500/80 uppercase">{post.target}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {announcements.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-32 bg-slate-100/50 dark:bg-slate-900/30 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-white/5"
            >
              <ShieldCheck className="text-slate-300 dark:text-slate-800 mx-auto mb-4" size={48} />
              <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-xs">At Ease. No active announcements.</p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Announcements;