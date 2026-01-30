import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Megaphone, Clock, ShieldCheck } from 'lucide-react';

const Announcements = () => {
  const { userData } = useAuth();
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    // Queries for global announcements or those for the user's specific company
    const q = query(
      collection(db, "orders"),
      where("target", "in", ["All", userData?.company + " Company"]),
      where("active", "==", true),
      orderBy("timestamp", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [userData?.company]);

  return (
    <div className="min-h-screen bg-slate-950 p-10 ml-64 text-white">
      <header className="mb-12">
        <h1 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-4">
          <Megaphone className="text-yellow-500" size={36} /> Battalion <span className="text-yellow-500">Orders</span>
        </h1>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.3em] mt-2">Official Command Communication</p>
      </header>

      <div className="max-w-4xl space-y-6">
        {announcements.map((post) => (
          <div key={post.id} className="bg-slate-900 border border-white/5 p-8 rounded-3xl shadow-xl hover:border-yellow-500/20 transition-all">
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
                <p className="text-sm font-bold text-white uppercase italic">{post.issuer}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black uppercase text-slate-500">Distribution</p>
                <p className="text-xs font-bold text-yellow-500/80 uppercase">{post.target}</p>
              </div>
            </div>
          </div>
        ))}

        {announcements.length === 0 && (
          <div className="text-center py-20 bg-slate-900/50 rounded-3xl border-2 border-dashed border-white/5">
            <p className="text-slate-500 italic">Stand by for orders. No active announcements.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;