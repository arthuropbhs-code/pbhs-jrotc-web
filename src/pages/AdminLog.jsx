// src/pages/AdminLog.jsx
//
// Activity Log — Staff (70+) only.
// Shows a real-time feed of all adminLog entries: auto-generated action
// records (sign-in, roster edits, uniform/form approvals) plus manual
// duty-log entries written by staff.

import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import {
  collection, onSnapshot, orderBy, query, addDoc, serverTimestamp,
} from 'firebase/firestore';
import {
  ScrollText, Plus, X, Clock, LogIn, Shirt, ClipboardList,
  Users, ShieldCheck, AlertCircle, FileText, Filter, Bell,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { ROLE_HIERARCHY, STAFF_LEVEL } from '../constants';
import { Navigate } from 'react-router-dom';
import Footer from '../components/Footer';
import ScrambleText from '../components/ScrambleText';

// ── Constants ─────────────────────────────────────────────────────────────────

const MANUAL_CATEGORIES = [
  'Duty Note', 'Incident', 'Supply', 'Training', 'Admin', 'Other',
];

const LOG_TYPES = [
  { key: 'all',     label: 'All' },
  { key: 'manual',  label: 'Duty Log' },
  { key: 'auth',    label: 'Sign-ins' },
  { key: 'uniform', label: 'Uniforms' },
  { key: 'form',    label: 'Form Requests' },
  { key: 'roster',  label: 'Roster' },
  { key: 'account', label: 'Accounts' },
];

const TYPE_META = {
  manual:  { icon: FileText,     color: 'text-yellow-500',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20',  label: 'Duty Log'     },
  auth:    { icon: LogIn,        color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    label: 'Sign-in'      },
  uniform: { icon: Shirt,        color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20',  label: 'Uniform'      },
  form:    { icon: ClipboardList,color: 'text-cyan-400',    bg: 'bg-cyan-500/10',    border: 'border-cyan-500/20',    label: 'Form Request' },
  roster:  { icon: Users,        color: 'text-green-400',   bg: 'bg-green-500/10',   border: 'border-green-500/20',   label: 'Roster'       },
  account: { icon: ShieldCheck,  color: 'text-orange-400',  bg: 'bg-orange-500/10',  border: 'border-orange-500/20',  label: 'Account'      },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(ts) {
  if (!ts?.toDate) return '—';
  const secs = Math.floor((Date.now() - ts.toDate().getTime()) / 1000);
  if (secs < 60)   return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return ts.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fullDate(ts) {
  if (!ts?.toDate) return '';
  return ts.toDate().toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

const AdminLog = () => {
  const { role, userData, loading: authLoading } = useAuth();
  const userLevel = ROLE_HIERARCHY[role] || 0;
  const isAuth = userLevel >= STAFF_LEVEL;

  const [entries,    setEntries]    = useState([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading,    setLoading]    = useState(true);

  // Manual entry modal state
  const [modalOpen,    setModalOpen]    = useState(false);
  const [category,     setCategory]     = useState(MANUAL_CATEGORIES[0]);
  const [description,  setDescription]  = useState('');
  const [notes,        setNotes]        = useState('');
  const [saving,       setSaving]       = useState(false);
  const [notification, setNotification] = useState(null);

  const showNotify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const resetModal = () => {
    setCategory(MANUAL_CATEGORIES[0]);
    setDescription('');
    setNotes('');
    setModalOpen(false);
  };

  // ── Live feed ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuth) return;
    const q = query(collection(db, 'adminLog'), orderBy('timestamp', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, [isAuth]);

  // ── Manual entry submit ─────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!description.trim()) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'adminLog'), {
        type:         'manual',
        action:       category.toLowerCase().replace(/\s+/g, '-'),
        description:  description.trim(),
        userId:       auth.currentUser?.uid || '',
        userFullName: userData?.fullName || 'Unknown',
        userRole:     role || '',
        targetId:     null,
        targetName:   null,
        category,
        notes:        notes.trim() || null,
        timestamp:    serverTimestamp(),
      });
      showNotify('Log entry saved');
      resetModal();
    } catch {
      showNotify('Failed to save entry', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (authLoading) return null;
  if (!isAuth) return <Navigate to="/admin/dashboard" />;

  // ── Filtered entries ─────────────────────────────────────────────────────────
  const filtered = typeFilter === 'all'
    ? entries
    : entries.filter(e => e.type === typeFilter);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 pt-24 font-sans">

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -50, x: '-50%' }}
            className={`fixed top-10 left-1/2 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border-l-4 ${
              notification.type === 'error'
                ? 'bg-slate-900 border-red-500 text-red-400'
                : 'bg-slate-900 border-yellow-500 text-yellow-500'
            }`}
          >
            {notification.type === 'error' ? <AlertCircle size={18} /> : <Bell size={18} />}
            <span className="text-[11px] font-black uppercase tracking-wider">{notification.msg}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="max-w-5xl mx-auto mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <Link to="/admin/dashboard" className="text-yellow-500 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-2 hover:opacity-70 transition-all">
            <span className="text-base leading-none">&#8592;</span> Back to Command
          </Link>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
            <ScrollText className="text-yellow-500" />
            <ScrambleText text="Activity Log" trigger="mount" />
          </h1>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500 mt-1">
            {entries.length} total entries
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-yellow-500 text-slate-950 px-6 py-2.5 rounded-xl text-xs font-black uppercase hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/10"
        >
          <Plus size={16} /> Add Duty Log Entry
        </button>
      </div>

      {/* Type filter tabs */}
      <div className="max-w-5xl mx-auto mb-6 flex flex-wrap gap-2">
        {LOG_TYPES.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTypeFilter(key)}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
              typeFilter === key
                ? 'bg-yellow-500 text-slate-950'
                : 'bg-slate-900 text-slate-500 hover:text-slate-300 border border-white/5'
            }`}
          >
            {key !== 'all' && (() => {
              const meta = TYPE_META[key];
              const Icon = meta.icon;
              return <Icon size={10} />;
            })()}
            {label}
            {key !== 'all' && (
              <span className="ml-0.5 opacity-60">
                {entries.filter(e => e.type === key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="max-w-5xl mx-auto space-y-2">
        {loading ? (
          <div className="flex justify-center py-24">
            <Clock size={28} className="text-yellow-500 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-white/10 rounded-3xl">
            <ScrollText className="mx-auto text-slate-600 mb-4" size={36} />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">No entries yet</p>
            {typeFilter === 'all' && (
              <p className="text-slate-600 text-xs mt-2">
                Actions logged by staff will appear here automatically.
              </p>
            )}
          </div>
        ) : (
          filtered.map(entry => {
            const meta = TYPE_META[entry.type] || TYPE_META.manual;
            const Icon = meta.icon;
            return (
              <div
                key={entry.id}
                className="bg-slate-900 border border-white/5 rounded-xl px-5 py-4 flex items-start gap-4 hover:border-white/10 transition-colors"
              >
                {/* Icon */}
                <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${meta.bg} border ${meta.border}`}>
                  <Icon size={14} className={meta.color} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${meta.bg} ${meta.color} border ${meta.border}`}>
                          {entry.category || meta.label}
                        </span>
                        <span className="text-[10px] font-bold uppercase text-slate-500">
                          {entry.action}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-white leading-snug">{entry.description}</p>
                      {entry.notes && (
                        <p className="text-xs text-slate-400 mt-1 italic leading-snug">{entry.notes}</p>
                      )}
                      <p className="text-[10px] text-slate-600 mt-1 font-bold">
                        {entry.userFullName || 'Unknown'}
                        {entry.userRole ? ` · ${entry.userRole.replace(/_/g, ' ')}` : ''}
                      </p>
                    </div>
                    <span className="text-[10px] text-slate-600 font-bold shrink-0" title={fullDate(entry.timestamp)}>
                      {timeAgo(entry.timestamp)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Manual entry modal */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div onClick={resetModal} className="absolute inset-0 bg-slate-950/80" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-slate-900 border border-white/10 w-full max-w-md rounded-[2rem] shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                  <FileText size={18} className="text-yellow-500" /> Duty Log Entry
                </h2>
                <button onClick={resetModal} className="text-slate-500 hover:text-white transition-colors">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                {/* Category */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
                    Category
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {MANUAL_CATEGORIES.map(cat => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${
                          category === cat
                            ? 'bg-yellow-500 text-slate-950 border-yellow-500'
                            : 'bg-white/5 text-slate-400 border-white/5 hover:border-yellow-500/30'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-yellow-500 block mb-1.5">
                    Entry *
                  </label>
                  <input
                    autoFocus
                    type="text"
                    placeholder="Brief summary of the event or action…"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !saving && description.trim() && handleSubmit()}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-yellow-500/40 transition-colors"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">
                    Notes (optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Additional details, follow-up actions, personnel involved…"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-yellow-500/40 transition-colors resize-none"
                  />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={saving || !description.trim()}
                  className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black uppercase text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Clock size={14} className="animate-spin" /> : <Plus size={14} />}
                  {saving ? 'Saving…' : 'Log Entry'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto">
        <Footer />
      </div>
    </div>
  );
};

export default AdminLog;
