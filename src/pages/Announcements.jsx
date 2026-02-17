import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Megaphone, Clock, ShieldCheck, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Announcements = () => {
  const { userData, role } = useAuth();
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    // Define who should see what
    const targetList = ["All", "Battalion Wide"];
    if (userData?.company) {
      targetList.push(userData.company + " Company");
      targetList.push(userData.company); // Catch-all for simple naming
    }

    // UPDATED: Now pointing to "announcements" collection specifically
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
          // AUTO-EXPIRY LOGIC:
          // If no expiry date exists, show it. 
          // If it exists, only show if it hasn't passed yet.
          return !post.expiresAt || post.expiresAt > now;
        });

      setAnnouncements(filteredData);
    }, (error) => {
      console.error("Firestore Error:", error);
    });

    return () => unsubscribe();
  }, [userData?.company]);

  return (
    <div className="min-h-screen bg-slate-950 p-6 pt-32 text-white">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation / Return for Admins */}
        <div className="flex justify-between items-center mb-8">
          {role === 'admin' || role === 'officer' ? (
            <Link 
              to="/admin/dashboard" 
              className="flex items-center gap-2 text-slate-500 hover:text-yellow-500 transition-all font-black uppercase text-[10px] tracking-widest"
            >
              <ChevronLeft size={16} /> Admin Dashboard
            </Link>
          ) : <div />}
        </div>

        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter flex items-center gap-4">
            <Megaphone className="text-yellow-500" size={40} /> 
            <span>Battalion <span className="text-yellow-500">Announcements</span></span>
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-2">Information for the Corps of Cadets</p>
        </header>

        <div className="space-y-6">
          {announcements.map((post) => (
            <div key={post.id} className="bg-slate-900/50 border border-white/5 p-8 rounded-3xl shadow-xl hover:border-yellow-500/20 transition-all backdrop-blur-sm relative overflow-hidden group">
              {/* Subtle accent for targeted posts */}
              {post.target !== "All" && (
                <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500/40" />
              )}

              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-yellow-500" size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500">Official Bulletin</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Clock size={12} /> {post.timestamp?.toDate().toLocaleDateString()}
                </span>
              </div>

              <p className="text-lg text-slate-200 font-medium leading-relaxed mb-8 whitespace-pre-wrap">
                {post.content}
              </p>

              <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Issuing Authority</p>
                  <p className="text-sm font-bold text-white uppercase italic">{post.issuer}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-slate-500 tracking-tighter">Distribution</p>
                  <p className="text-xs font-bold text-yellow-500/80 uppercase">{post.target}</p>
                </div>
              </div>
            </div>
          ))}

          {announcements.length === 0 && (
            <div className="text-center py-32 bg-[#0f172a]/30 rounded-[2.5rem] border-2 border-dashed border-white/5">
              <ShieldCheck className="text-slate-800 mx-auto mb-4" size={48} />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">At Ease. No active announcements.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Announcements;