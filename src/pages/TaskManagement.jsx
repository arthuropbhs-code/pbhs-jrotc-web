import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy, limit, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Send, ClipboardList, ArrowLeft, Clock, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROLE_HIERARCHY, ADMIN_LEVEL } from '../constants';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';

const TaskManagement = () => {
  const { userData, role } = useAuth();
  const [task, setTask] = useState('');
  const [targetPos, setTargetPos] = useState('Company XO');
  const [isSending, setIsSending] = useState(false);
  const [recentTasks, setRecentTasks] = useState([]);

  const canDelete = (ROLE_HIERARCHY[role] || 0) >= ADMIN_LEVEL;
  const [deleteConfirm, setDeleteConfirm] = useState(null); // task id pending deletion
  const [toast, setToast] = useState(null); // { type: 'success'|'error', msg }

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    const q = query(collection(db, "tasks"), orderBy("timestamp", "desc"), limit(10));
    const unsub = onSnapshot(q, (snapshot) => {
      setRecentTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!task.trim()) return;

    setIsSending(true);
    try {
      await addDoc(collection(db, "tasks"), {
        taskContent: task,
        assignedBy: userData.fullName || userData.name,
        assignedByPos: userData.position,
        assignedToPosition: targetPos,
        status: 'pending',
        timestamp: serverTimestamp(),
      });
      setTask('');
      showToast('success', `Task deployed to all ${targetPos}s`);
    } catch (err) {
      console.error("Error deploying task:", err);
      showToast('error', 'Failed to deploy task.');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDoc(doc(db, "tasks", deleteConfirm));
      setDeleteConfirm(null);
      showToast('success', 'Task removed.');
    } catch (err) {
      console.error("Error deleting task:", err);
      setDeleteConfirm(null);
      showToast('error', 'Delete failed — check Firestore rules.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 pt-20">
      <div className="max-w-2xl mx-auto">
        <Link to="/admin/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-yellow-500 mb-8 transition-colors text-sm font-bold uppercase tracking-widest">
          <ArrowLeft size={16} /> Back to Command
        </Link>

        <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 shadow-2xl">
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <ClipboardList className="text-yellow-500" size={24} />
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Task Management</h2>
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Battalion Command Channel</p>
          </header>

          <form onSubmit={handleAssign} className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Target Personnel</label>
              <select 
                value={targetPos} 
                onChange={(e) => setTargetPos(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 p-4 rounded-xl text-white focus:border-yellow-500 outline-none transition-all font-bold text-sm"
              >
                <option value="Company XO">Company XOs</option>
                <option value="S1 Assistant">S1 Assistants</option>
                <option value="S2 Assistant">S2 Assistants</option>
                <option value="S3 Assistant">S3 Assistants</option>
                <option value="S4 Assistant">S4 Assistants</option>
                <option value="S5 Assistant">S5 Assistants</option>
                <option value="Company Commander">Company Commanders</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Duty Instructions</label>
              <textarea 
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Ex: Ensure all Alpha Company merit logs are updated by 1500 Friday."
                className="w-full bg-slate-950 border border-white/10 p-4 rounded-xl text-white h-40 focus:border-yellow-500 outline-none transition-all text-sm resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={isSending}
              className={`w-full font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${
                isSending ? 'bg-slate-800 text-slate-500' : 'bg-yellow-500 text-slate-950 hover:bg-yellow-400'
              }`}
            >
              <Send size={18} /> {isSending ? 'Deploying...' : 'Deploy Task'}
            </button>
          </form>
        </div>

        <div className="mt-10 space-y-4">
          <h3 className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
            <Clock size={14} /> Recent Tasks
          </h3>
          <div className="space-y-3">
            {recentTasks.length === 0 ? (
              <p className="text-slate-600 text-xs italic py-6 text-center">No tasks published yet.</p>
            ) : (
              recentTasks.map(t => (
                <div key={t.id} className="bg-slate-900 border border-white/5 rounded-2xl p-5 flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-200 font-bold leading-tight">{t.taskContent}</p>
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-2">
                      To: {t.assignedToPosition} &middot; By: {t.assignedBy}
                    </p>
                  </div>
                  {canDelete && (
                    <button title="Delete task" onClick={() => setDeleteConfirm(t.id)} className="text-slate-600 hover:text-red-500 transition-colors flex-shrink-0">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <Footer />

      {/* DELETE CONFIRM */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 p-10 rounded-[2.5rem] max-w-sm w-full text-center shadow-2xl">
            <Trash2 size={40} className="text-red-500 mx-auto mb-6" />
            <h3 className="text-xl font-black uppercase italic mb-3 text-white">Delete Task?</h3>
            <p className="text-slate-400 text-xs mb-8 leading-relaxed">This task will be permanently removed.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleDeleteTask} className="w-full bg-red-600 py-4 rounded-xl font-black text-white uppercase text-[10px] tracking-widest hover:bg-red-500 transition-all">Confirm Delete</button>
              <button onClick={() => setDeleteConfirm(null)} className="w-full py-4 rounded-xl font-bold text-slate-400 hover:text-white transition-all uppercase text-[10px] tracking-widest bg-white/5">Cancel</button>
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

export default TaskManagement;