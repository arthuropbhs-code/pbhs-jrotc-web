import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { Megaphone, Send, CheckCircle, ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const AdminAnnouncements = () => {
  const { role, userData, loading } = useAuth();
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);

  // 1. Handle Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-yellow-500 font-black animate-pulse uppercase tracking-widest">
          Verifying Credentials...
        </div>
      </div>
    );
  }

  // 2. Security Gate: Only allow specific roles
  const authorizedRoles = ['battalion_4', 'battalion_staff'];
  if (!authorizedRoles.includes(role)) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="text-center bg-red-500/10 border border-red-500/20 p-12 rounded-3xl max-w-md">
          <ShieldAlert className="text-red-500 mx-auto mb-4" size={48} />
          <h2 className="text-white font-black uppercase italic text-xl mb-2">Access Denied</h2>
          <p className="text-slate-400 text-sm">
            This terminal is restricted to Battalion Staff. Your attempt has been logged.
          </p>
        </div>
      </div>
    );
  }

  // 3. Post Function
  const postAnnouncement = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "announcements"), {
        content: text,
        timestamp: serverTimestamp(),
        // Uses the real data from your Firestore 'users' document
        author: `${userData?.rank || ''} ${userData?.name || 'Staff'}`.trim(),
        role: role
      });
      setText('');
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) {
      console.error("Transmission Error:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-32 px-6">
      <div className="max-w-2xl mx-auto bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Megaphone className="text-yellow-500" size={32} />
            <h2 className="text-2xl font-black text-white uppercase italic">Post Announcement</h2>
          </div>
          <span className="text-[10px] bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full font-bold uppercase tracking-widest border border-yellow-500/20">
            {role.replace('_', ' ')}
          </span>
        </div>

        <form onSubmit={postAnnouncement} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">
              Message Content
            </label>
            <textarea 
              required
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Attention to Orders..."
              className="w-full h-48 bg-slate-950 border border-white/10 rounded-2xl p-6 text-white outline-none focus:border-yellow-500 transition-all resize-none shadow-inner"
            />
          </div>
          
          <button 
            type="submit"
            disabled={sent}
            className={`w-full font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all uppercase tracking-widest ${
              sent 
              ? "bg-green-500 text-white" 
              : "bg-yellow-500 text-slate-950 hover:bg-yellow-400 hover:-translate-y-1 shadow-lg shadow-yellow-500/10"
            }`}
          >
            {sent ? <CheckCircle size={20} /> : <Send size={20} />}
            {sent ? "TRANSMITTED" : "BROADCAST TO BATTALION"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminAnnouncements;