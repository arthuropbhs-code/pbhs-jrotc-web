// src/pages/AdminOrders.jsx
//
// Combined "Orders & Tasks" page.
//   Issue Order  — broadcast to one or more target audiences; stored in /orders.
//   Assign Task  — assign a standing duty to a specific position; stored in /tasks.
//
// Target audience is gated by the issuer's rank:
//   Instructors (95+): any audience
//   S7 Special Projects: S7 Assistants + Company XOs only
//   Other staff (70–90): all staff roles

import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, serverTimestamp, query,
  orderBy, onSnapshot, deleteDoc, doc, limit,
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { writeLog } from '../lib/writeLog';
import AdminPageHeader from '../components/AdminPageHeader';
import { ROLE_HIERARCHY, STAFF_LEVEL, ADMIN_LEVEL } from '../constants';
import {
  Send, Bell, CheckCircle, Check, Trash2,
  RefreshCcw, Clock, AlertTriangle, X, Target, ClipboardList,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ScrambleText from '../components/ScrambleText';

const AdminOrders = () => {
  const { user, userData, role } = useAuth();
  const userLevel    = ROLE_HIERARCHY[role] || 0;
  const isInstructor = userLevel >= 95;
  const isS7         = role === 's7_special_projects'; // kept for any other uses below
  const canDelete    = userLevel >= ADMIN_LEVEL;

  // ── Order state ──────────────────────────────────────────────────────────────
  const [orderText,        setOrderText]        = useState('');
  const [selectedTargets,  setSelectedTargets]  = useState([]);
  const [orderStatus,      setOrderStatus]      = useState({ loading: false, success: false });
  const [recentOrders,     setRecentOrders]     = useState([]);
  const [deleteConfirm,    setDeleteConfirm]    = useState({ show: false, id: null });
  const [errorMessage,     setErrorMessage]     = useState(null);

  // ── Task state ───────────────────────────────────────────────────────────────
  const [taskText,         setTaskText]         = useState('');
  const [taskTarget,       setTaskTarget]       = useState('');
  const [isSending,        setIsSending]        = useState(false);
  const [recentTasks,      setRecentTasks]      = useState([]);
  const [taskDeleteConf,   setTaskDeleteConf]   = useState(null);
  const [toast,            setToast]            = useState(null);

  // ── Target audience lists ────────────────────────────────────────────────────
  const ALL_TARGETS = [
    "All Battalion", "All Staff", "All Company Leadership",
    "Battalion Commander", "Battalion XO", "Battalion CSM", "Sergeant Major",
    "S1 - Adjutant", "S2 - Intelligence", "S3 - Operations",
    "S4 - Logistics", "S5 - Public Affairs", "S6 - Technology", "S7 - Special Projects",
    "Company Commanders", "Company XOs", "First Sergeants",
  ];
  const STAFF_TARGETS = [
    "All Staff",
    "S1 - Adjutant", "S2 - Intelligence", "S3 - Operations",
    "S4 - Logistics", "S5 - Public Affairs", "S6 - Technology", "S7 - Special Projects",
  ];
  const S7_TARGETS = ["S7 - Assistants", "Company XOs"]; // kept for fallback reference

  // Each staff role sees only the sub-groups they directly supervise.
  // Instructors see everyone; S5 + battalion command keep the full STAFF_TARGETS list.
  const getRoleTargets = () => {
    if (isInstructor)                    return ALL_TARGETS;
    if (role === 's1_adjutant')          return ["Company XOs", "S1 - Assistants"];
    if (role === 's2_intelligence')      return ["Company XOs", "S2 - Assistants"];
    if (role === 's3_operations')        return ["Company XOs", "S3 - Assistants"];
    if (role === 's4_logistics')         return ["Company XOs", "S4 - Assistants"];
    if (role === 's6_technology')        return ["Company XOs", "S6 - Assistants"];
    if (role === 's7_special_projects')  return ["Company XOs", "S7 - Assistants"];
    // Sergeant Major issues direction to company command tiers only
    if (role === 'sergeant_major')       return ["Company Commanders", "Company XOs", "First Sergeants"];
    return STAFF_TARGETS; // S5 + battalion XO/BC/CSM keep broad access
  };
  const ORDER_TARGETS = getRoleTargets();
  const TASK_TARGETS  = ORDER_TARGETS.map(v => ({ value: v, label: v }));

  // ── Subscriptions ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setRecentOrders(snap.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 5));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'tasks'), orderBy('timestamp', 'desc'), limit(10));
    const unsub = onSnapshot(q, snap => {
      setRecentTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  // Set initial task target once role loads
  useEffect(() => {
    if (TASK_TARGETS.length > 0 && !taskTarget) {
      setTaskTarget(TASK_TARGETS[0].value);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const toggleTarget = (t) => {
    setSelectedTargets(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  // ── Order submit ──────────────────────────────────────────────────────────────
  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (selectedTargets.length === 0) return showError('Select at least one target audience.');
    if (!orderText.trim())            return showError('Order content cannot be empty.');
    setOrderStatus({ loading: true, success: false });
    try {
      await addDoc(collection(db, 'orders'), {
        content:    orderText,
        targets:    selectedTargets,
        issuer:     `${userData?.rank || ''} ${userData?.fullName || userData?.name || ''}`.trim(),
        issuerRole: role,
        company:    userData?.company || 'Battalion',
        timestamp:  serverTimestamp(),
        active:     true,
      });
      setOrderText('');
      setSelectedTargets([]);
      setOrderStatus({ loading: false, success: true });
      setTimeout(() => setOrderStatus({ loading: false, success: false }), 3000);
      writeLog({
        type: 'order', action: 'create',
        description: `Published order: "${orderText.substring(0, 80)}"`,
        userId: user?.uid || '', userFullName: userData?.fullName || '',
        userRole: role || '', notes: `targets:${selectedTargets.join(',')}`,
      });
    } catch {
      setOrderStatus({ loading: false, success: false });
      showError('Failed to publish order.');
    }
  };

  // ── Order delete ──────────────────────────────────────────────────────────────
  const requestOrderDelete = (item) => {
    const userWeight   = ROLE_HIERARCHY[role] || 0;
    const issuerWeight = ROLE_HIERARCHY[item.issuerRole] ?? 0;
    if (userWeight < issuerWeight) {
      showError('RANK INSUFFICIENT: Cannot delete higher-echelon transmissions.');
      return;
    }
    const sameCompany = !item.company || item.company === 'Battalion' || item.company === userData?.company;
    if (userWeight < STAFF_LEVEL && !sameCompany) {
      showError('ACCESS DENIED: Outside your company\'s transmissions.');
      return;
    }
    setDeleteConfirm({ show: true, id: item.id });
  };

  const confirmOrderDelete = async () => {
    try {
      await deleteDoc(doc(db, 'orders', deleteConfirm.id));
      setDeleteConfirm({ show: false, id: null });
      writeLog({
        type: 'order', action: 'delete',
        description: `Deleted order`,
        userId: user?.uid || '', userFullName: userData?.fullName || '',
        userRole: role || '', targetId: deleteConfirm.id,
      });
    } catch {
      showError('Deletion failed.');
    }
  };

  // ── Task submit ───────────────────────────────────────────────────────────────
  const handleAssignTask = async (e) => {
    e.preventDefault();
    if (!taskText.trim()) return;
    setIsSending(true);
    try {
      await addDoc(collection(db, 'tasks'), {
        taskContent:        taskText,
        assignedBy:         userData?.fullName || userData?.name || '',
        assignedByPos:      userData?.position || '',
        assignedToPosition: taskTarget,
        status:             'pending',
        timestamp:          serverTimestamp(),
      });
      setTaskText('');
      showToast('success', `Task deployed to ${taskTarget}`);
      writeLog({
        type: 'order', action: 'create',
        description: `Assigned task to ${taskTarget}: "${taskText.substring(0, 80)}"`,
        userId: user?.uid || '', userFullName: userData?.fullName || '',
        userRole: role || '', notes: `assignedTo:${taskTarget}`,
      });
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to deploy task.');
    } finally {
      setIsSending(false);
    }
  };

  // ── Task delete ───────────────────────────────────────────────────────────────
  const handleDeleteTask = async () => {
    if (!taskDeleteConf) return;
    try {
      await deleteDoc(doc(db, 'tasks', taskDeleteConf));
      setTaskDeleteConf(null);
      showToast('success', 'Task removed.');
      writeLog({
        type: 'order', action: 'delete',
        description: `Deleted task`,
        userId: user?.uid || '', userFullName: userData?.fullName || '',
        userRole: role || '', targetId: taskDeleteConf,
      });
    } catch {
      setTaskDeleteConf(null);
      showToast('error', 'Delete failed.');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 p-6 md:p-10 w-full">
      <AdminPageHeader icon={Send} title="Orders & Tasks" />

      {/* Error toast */}
      {errorMessage && (
        <div className="fixed top-8 right-8 z-[110] flex items-center gap-4 bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-300">
          <AlertTriangle size={20} />
          <p className="text-[10px] font-black uppercase tracking-widest">{errorMessage}</p>
          <button onClick={() => setErrorMessage(null)} aria-label="Dismiss error" className="ml-4 hover:rotate-90 transition-transform">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto space-y-16">

        {/* ── ISSUE ORDER ─────────────────────────────────────────────────────── */}
        <section>
          <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="w-full md:w-auto text-center md:text-left">
              <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                <ScrambleText text="Issue " trigger="mount" /><span className="text-yellow-500"><ScrambleText text="Orders" trigger="mount" /></span>
              </h1>
              <p className="text-blue-600 dark:text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-3">
                Broadcast transmission to target audience
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Bell size={16} className="text-yellow-500" />
              <span className="text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-widest">Broadcast</span>
            </div>
          </header>

          <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-xl">
            <form onSubmit={handleSubmitOrder} className="space-y-8">
              <div>
                <label className="flex items-center gap-2 text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-widest mb-4">
                  <Target size={14} className="text-yellow-500" /> Target Audience
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {ORDER_TARGETS.map(t => (
                    <button key={t} type="button" onClick={() => toggleTarget(t)}
                      className={`px-3 py-3.5 rounded-2xl text-[9px] font-bold uppercase transition-all border-2 flex items-center justify-between ${
                        selectedTargets.includes(t)
                          ? 'bg-blue-50/50 border-yellow-500 text-yellow-500 dark:bg-yellow-500/10'
                          : 'bg-white dark:bg-slate-950 border-blue-50 dark:border-white/5 text-slate-400 hover:border-blue-100'
                      }`}
                    >
                      <span className="truncate mr-1">{t}</span>
                      {selectedTargets.includes(t) && <Check size={12} strokeWidth={3} className="flex-shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                value={orderText}
                onChange={e => setOrderText(e.target.value)}
                className="w-full bg-blue-50/30 dark:bg-black/40 border-2 border-blue-50 dark:border-white/5 rounded-3xl p-6 text-slate-900 dark:text-white text-sm focus:border-yellow-500 focus:bg-white outline-none transition-all min-h-[140px] placeholder:text-blue-200 font-medium shadow-inner"
                placeholder="Enter battalion orders for broadcast…"
              />

              <button disabled={orderStatus.loading}
                className={`w-full font-black uppercase py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl ${
                  orderStatus.success
                    ? 'bg-green-500 text-white shadow-green-500/20'
                    : 'bg-yellow-500 text-slate-950 hover:bg-yellow-400 shadow-yellow-500/30 disabled:opacity-50'
                }`}>
                {orderStatus.loading ? <RefreshCcw className="animate-spin" size={20} /> : orderStatus.success ? <CheckCircle size={20} /> : <Send size={20} />}
                {orderStatus.loading ? 'Synchronizing…' : orderStatus.success ? 'Published' : 'Execute Transmission'}
              </button>
            </form>
          </div>

          {/* Recent orders */}
          <div className="mt-10 space-y-4">
            <div className="flex items-center px-2">
              <h3 className="text-[10px] font-black text-blue-600 dark:text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <Clock size={14} /> Recent Orders
              </h3>
              <div className="h-px flex-1 bg-blue-100 dark:bg-white/5 mx-4" />
            </div>
            <div className="grid gap-4">
              {recentOrders.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-600 text-xs italic py-4 text-center">No orders issued yet.</p>
              ) : recentOrders.map(item => (
                <div key={item.id} className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 p-6 rounded-[2rem] flex justify-between items-center group hover:border-yellow-500/30 shadow-sm transition-all">
                  <div className="max-w-[80%] pl-4 border-l-[3px] border-yellow-500 rounded-sm">
                    <p className="text-sm text-slate-800 dark:text-slate-200 font-bold mb-1.5 leading-tight">{item.content}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
                      <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Targets: {item.targets?.join(', ')}</span>
                      <span className="text-[9px] text-blue-600 dark:text-slate-400 font-bold uppercase tracking-widest">| By: {item.issuer}</span>
                    </div>
                  </div>
                  {(ROLE_HIERARCHY[role] || 0) >= (ROLE_HIERARCHY[item.issuerRole] || 0) && (
                    <button onClick={() => requestOrderDelete(item)} title="Delete"
                      className="p-3.5 text-slate-300 dark:text-slate-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all">
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── ASSIGN TASK ──────────────────────────────────────────────────────── */}
        <section>
          <header className="mb-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="w-full md:w-auto text-center md:text-left">
              <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
                <ScrambleText text="Assign " trigger="mount" /><span className="text-yellow-500"><ScrambleText text="Tasks" trigger="mount" /></span>
              </h2>
              <p className="text-blue-600 dark:text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-3">
                Standing duty assignment to a specific position
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ClipboardList size={16} className="text-yellow-500" />
              <span className="text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-widest">Assignment</span>
            </div>
          </header>

          <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-xl">
            <form onSubmit={handleAssignTask} className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 block">Target Position</label>
                <select
                  value={taskTarget}
                  onChange={e => setTaskTarget(e.target.value)}
                  className="w-full bg-blue-50/30 dark:bg-black/40 border-2 border-blue-50 dark:border-white/5 p-4 rounded-2xl text-slate-900 dark:text-white focus:border-yellow-500 outline-none transition-all font-bold text-sm"
                >
                  {TASK_TARGETS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 block">Duty Instructions</label>
                <textarea
                  value={taskText}
                  onChange={e => setTaskText(e.target.value)}
                  placeholder="Ex: Ensure all Alpha Company merit logs are updated by 1500 Friday."
                  className="w-full bg-blue-50/30 dark:bg-black/40 border-2 border-blue-50 dark:border-white/5 p-5 rounded-2xl text-slate-900 dark:text-white h-36 focus:border-yellow-500 outline-none transition-all text-sm resize-none"
                />
              </div>

              <button type="submit" disabled={isSending}
                className={`w-full font-black py-5 rounded-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-widest shadow-xl ${
                  isSending ? 'bg-slate-200 dark:bg-slate-800 text-slate-500' : 'bg-yellow-500 text-slate-950 hover:bg-yellow-400 shadow-yellow-500/30'
                }`}>
                <Send size={18} /> {isSending ? 'Deploying…' : 'Deploy Task'}
              </button>
            </form>
          </div>

          {/* Recent tasks */}
          <div className="mt-10 space-y-4">
            <div className="flex items-center px-2">
              <h3 className="text-[10px] font-black text-blue-600 dark:text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
                <Clock size={14} /> Recent Tasks
              </h3>
              <div className="h-px flex-1 bg-blue-100 dark:bg-white/5 mx-4" />
            </div>
            <div className="space-y-3">
              {recentTasks.length === 0 ? (
                <p className="text-slate-500 dark:text-slate-600 text-xs italic py-4 text-center">No tasks assigned yet.</p>
              ) : recentTasks.map(t => (
                <div key={t.id} className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-2xl p-5 flex justify-between items-start gap-4 hover:border-yellow-500/20 transition-all shadow-sm">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800 dark:text-slate-200 font-bold leading-tight">{t.taskContent}</p>
                    <p className="text-[9px] text-blue-600 dark:text-slate-500 font-black uppercase tracking-widest mt-2">
                      To: {t.assignedToPosition} · By: {t.assignedBy}
                    </p>
                  </div>
                  {canDelete && (
                    <button onClick={() => setTaskDeleteConf(t.id)} title="Delete task"
                      className="text-slate-300 dark:text-slate-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-2 rounded-xl transition-all flex-shrink-0">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>


      {/* ── Order delete confirmation ── */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-blue-100/20 dark:bg-slate-950/80 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 p-8 rounded-[2rem] max-w-sm w-full shadow-2xl relative overflow-hidden text-center">
            <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />
            <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-2">Confirm <span className="text-red-500">Destruction</span></h3>
            <p className="text-blue-600 dark:text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-8 leading-relaxed px-4">This transmission will be permanently scrubbed.</p>
            <div className="flex flex-col gap-3">
              <button onClick={confirmOrderDelete} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl transition-all shadow-xl shadow-red-600/20">Confirm Destruction</button>
              <button onClick={() => setDeleteConfirm({ show: false, id: null })} className="w-full py-4 bg-blue-50 dark:bg-slate-800 text-blue-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] rounded-xl transition-all">Abort Mission</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Task delete confirmation ── */}
      {taskDeleteConf && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/90">
          <div className="bg-white dark:bg-slate-900 border border-white/10 p-10 rounded-[2.5rem] max-w-sm w-full text-center shadow-2xl">
            <Trash2 size={40} className="text-red-500 mx-auto mb-6" />
            <h3 className="text-xl font-black uppercase italic mb-3 text-slate-900 dark:text-white">Delete Task?</h3>
            <p className="text-slate-400 text-xs mb-8 leading-relaxed">This task assignment will be permanently removed.</p>
            <div className="flex flex-col gap-3">
              <button onClick={handleDeleteTask} className="w-full bg-red-600 py-4 rounded-xl font-black text-white uppercase text-[10px] tracking-widest hover:bg-red-500 transition-all">Confirm Delete</button>
              <button onClick={() => setTaskDeleteConf(null)} className="w-full py-4 rounded-xl font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all uppercase text-[10px] tracking-widest bg-blue-50 dark:bg-white/5">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
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

export default AdminOrders;
