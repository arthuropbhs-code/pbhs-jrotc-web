import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Megaphone, Clock, ShieldCheck } from 'lucide-react';

const Announcements = () => {
  const { userData } = useAuth();
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    // If userData isn't loaded yet, default to "All" to show general orders
    const targetList = ["Battalion Wide", "All"];
    if (userData?.company) {
      targetList.push(userData.company + " Company");
    }

    const q = query(
      collection(db, "orders"),
      where("target", "in", targetList),
      where("active", "==", true),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Firestore Error:", error);
      // NOTE: If you see a "The query requires an index" error in the console, 
      // click the link provided in the error to create it automatically.
    });

    return () => unsubscribe();
  }, [userData?.company]);

  return (
    // REMOVED ml-64 to fix the alignment issue shown in your screenshot
    <div className="min-h-screen bg-slate-950 p-6 pt-32 text-white">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12">
          <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter flex items-center gap-4">
            <Megaphone className="text-yellow-500" size={40} /> 
            <span>Battalion <span className="text-yellow-500">Orders</span></span>
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-2">Official Command Communication</p>
        </header>

        <div className="space-y-6">
          {announcements.map((post) => (
            <div key={post.id} className="bg-slate-900/50 border border-white/5 p-8 rounded-3xl shadow-xl hover:border-yellow-500/20 transition-all backdrop-blur-sm">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="text-yellow-500" size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-yellow-500">Official Release</span>
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-2">
                  <Clock size={12} /> {post.timestamp?.toDate().toLocaleDateString()}
                </span>
              </div>

              <p className="text-lg text-slate-200 font-medium leading-relaxed mb-8">
                {post.content}
              </p>

              <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-500">Issuing Authority</p>
                  <p className="text-sm font-bold text-white uppercase italic">{post.issuer || post.author}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-slate-500">Distribution</p>
                  <p className="text-xs font-bold text-yellow-500/80 uppercase">{post.target}</p>
                </div>
              </div>
            </div>
          ))}

          {announcements.length === 0 && (
            <div className="text-center py-32 bg-[#0f172a]/30 rounded-[2.5rem] border-2 border-dashed border-white/5">
              <ShieldCheck className="text-slate-800 mx-auto mb-4" size={48} />
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Stand by for orders. No active announcements.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Announcements;