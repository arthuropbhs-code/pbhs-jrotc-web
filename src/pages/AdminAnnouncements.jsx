import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Megaphone, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { writeLog } from '../lib/writeLog';
import { ROLE_HIERARCHY } from '../constants';
import AdminPageHeader from '../components/AdminPageHeader';

const AdminAnnouncements = () => {
  const { user, userData, role } = useAuth();
  const [text, setText] = useState('');
  const [sent, setSent] = useState(false);
  const [existingAnnouncements, setExistingAnnouncements] = useState([]);

  const userPower = ROLE_HIERARCHY[role] || 1;
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { id, issuerLevel }
  const [toast, setToast] = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setExistingAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error(err));
    return () => unsubscribe();
  }, []);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "announcements"), {
        content: text,
        timestamp: serverTimestamp(),
        issuer: `${userData?.rank || ''} ${userData?.fullName || userData?.name || 'Staff'}`.trim(),
        issuerLevel: userPower,
        target: 'All',
        active: true,
      });
      setText('');
      setSent(true);
      setTimeout(() => setSent(false), 3000);
      writeLog({
        type: 'announcement', action: 'create',
        description: `Broadcast sent: "${text.substring(0, 80)}"`,
        userId: user?.uid || '', userFullName: userData?.fullName || '',
        userRole: role || '',
      });
    } catch (err) {
      console.error("Broadcast Error:", err);
      showToast('error', 'Broadcast failed. Try again.');
    }
  };

  const requestDelete = (id, issuerLevel) => {
    if (userPower < issuerLevel) {
      showToast('error', 'Priority Restriction: Cannot delete a broadcast from a superior officer.');
      return;
    }
    setDeleteConfirm({ id, issuerLevel });
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDoc(doc(db, "announcements", deleteConfirm.id));
      setDeleteConfirm(null);
      showToast('success', 'Broadcast removed.');
      writeLog({
        type: 'announcement', action: 'delete',
        description: `Deleted broadcast`,
        userId: user?.uid || '', userFullName: userData?.fullName || '',
        userRole: role || '', targetId: deleteConfirm.id,
      });
    } catch (err) {
      console.error("Delete error:", err);
      setDeleteConfirm(null);
      showToast('error', 'Delete failed — check Firestore rules.');
    }
  };

  return (
    <div className="flex-1 p-6 md:p-10 w-full">
      <div className="max-w-6xl mx-auto">

        <AdminPageHeader icon={Megaphone} title="Global Broadcast" />

        <div className="grid lg:grid-cols-2 gap-8">
          {/* CREATE ANNOUNCEMENT CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl dark:shadow-none h-fit">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
              <Megaphone className="text-yellow-500" size={20} /> Send Broadcast
            </h2>

            <form onSubmit={handleBroadcast} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Details</label>
                <textarea required value={text} onChange={(e) => setText(e.target.value)} className="w-full h-32 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-slate-900 dark:text-white resize-none outline-none focus:border-yellow-500 transition-all" placeholder="Enter broadcast details..." />
              </div>

              <button type="submit" disabled={sent} className={`w-full font-black py-4 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all ${sent ? "bg-green-600 text-white" : "bg-yellow-500 text-slate-950 hover:bg-yellow-400 shadow-lg shadow-yellow-500/20"}`}>
                {sent ? "SENT" : "SEND BROADCAST"}
              </button>
            </form>
          </div>

          {/* HISTORY CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl dark:shadow-none overflow-y-auto max-h-[700px]">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 px-2">Broadcast History</h2>
            <div className="space-y-4">
              {existingAnnouncements.map(item => (
                <div key={item.id} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-white/5 flex justify-between items-start hover:border-yellow-500/30 transition-all shadow-sm dark:shadow-none">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border border-yellow-500/50 text-yellow-500 bg-white dark:bg-slate-900">{item.eventType}</span>
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400">To: {item.target}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pr-4 font-medium italic">"{item.content}"</p>
                    <div className="flex items-center gap-2 mt-2">
                       <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">Issued By: {item.issuer}</p>
                       <span className="text-[8px] text-slate-400 dark:text-slate-500 font-black px-1 rounded bg-slate-200 dark:bg-white/10">LVL {item.issuerLevel}</span>
                    </div>
                  </div>
                  <button title="Delete announcement" onClick={() => requestDelete(item.id, item.issuerLevel)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 p-2 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {existingAnnouncements.length === 0 && (
                <p className="text-center text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-widest py-10">No records found</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DELETE CONFIRM */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/90">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-10 rounded-[2.5rem] max-w-sm w-full text-center shadow-2xl">
            <Trash2 size={40} className="text-red-500 mx-auto mb-6" />
            <h3 className="text-xl font-black uppercase italic mb-3 text-slate-900 dark:text-white">Delete Broadcast?</h3>
            <p className="text-slate-500 text-xs mb-8 leading-relaxed">This announcement will be permanently removed.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleDelete} className="w-full bg-red-600 py-4 rounded-xl font-black text-white uppercase text-[10px] tracking-widest hover:bg-red-500 transition-all">Confirm Delete</button>
              <button onClick={() => setDeleteConfirm(null)} className="w-full py-4 rounded-xl font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all uppercase text-[10px] tracking-widest bg-slate-100 dark:bg-white/5">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            className={`fixed bottom-8 right-8 px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-3 shadow-2xl z-[200] ${
              toast.type === 'success' ? 'bg-yellow-500 text-slate-950' : 'bg-red-600 text-white'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
            {toast.msg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminAnnouncements;
