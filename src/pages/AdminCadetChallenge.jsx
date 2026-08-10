// src/pages/AdminCadetChallenge.jsx
//
// Cadet Challenge paperwork submission and management page.
//
// Access tiers (internal — ProtectedRoute has no restrictions so that
// company assistants at level 35 can reach this page without being blocked):
//
//   Level ≥ 70 (staff+)     → canManage: see all companies, verify, delete
//   Level ≥ 45 (command)    → canViewCompany: see own company's records
//   Roles s1/s3_assistant   → canSubmit: submit form + see own company records
//
// Firestore rule must mirror these tiers — ship the rule alongside this page.

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, where, serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { useCompanies } from '../hooks/useCompanies';
import { ROLE_HIERARCHY, ROLE_LABELS, STAFF_LEVEL, COMMAND_LEVEL } from '../constants';
import {
  Activity, Plus, Trash2, Edit3, X, Loader2, CheckCircle2,
  ShieldCheck, Filter, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Footer from '../components/Footer';
import ScrambleText from '../components/ScrambleText';

// ── helpers ──────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  cadetName: '', company: '', date: '',
  pushUps: '', sitUps: '', pullUps: '', shuttleRun: '', milePace: '',
  notes: '',
};

const inputClass = 'w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-3 rounded-xl outline-none focus:border-yellow-500 text-sm font-bold text-slate-900 dark:text-white transition-all';
const labelClass = 'text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 block mb-1 tracking-widest';

const formatDate = (val) => {
  if (!val) return '—';
  const d = new Date(val.includes('-') ? val + 'T00:00:00' : val);
  return isNaN(d) ? val : d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatTs = (ts) => {
  if (!ts) return '';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// ── main component ────────────────────────────────────────────────────────────

const AdminCadetChallenge = () => {
  const { user, userData, role, loading: authLoading } = useAuth();
  const { companies } = useCompanies();

  const userLevel   = !authLoading ? (ROLE_HIERARCHY[role] || 0) : 0;
  // Staff (70+) can see all submissions, verify, and delete
  const canManage   = userLevel >= STAFF_LEVEL;
  // Company command (45+) can view their company's records and submit
  const canViewComp = userLevel >= COMMAND_LEVEL;
  // S1/S3 assistants at company level can submit + see own company
  const SUBMIT_ROLES = ['company_s1_assistant', 'company_s3_assistant'];
  const canSubmit   = SUBMIT_ROLES.includes(role) || userLevel >= COMMAND_LEVEL;
  // What company does this user belong to?
  const myCompany   = userData?.company || '';

  const [records,     setRecords]     = useState([]);
  const [users,       setUsers]       = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [showModal,   setShowModal]   = useState(false);
  const [editingId,   setEditingId]   = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [deleteConf,  setDeleteConf]  = useState(null); // { id, cadetName }
  const [toast,       setToast]       = useState(null);

  // Filter state (staff view)
  const [filterCompany, setFilterCompany] = useState('All');
  const [filterStatus,  setFilterStatus]  = useState('All');

  // ── data subscriptions ────────────────────────────────────────────────────

  useEffect(() => {
    if (authLoading) return;

    let q;
    if (canManage) {
      // Staff+: all records
      q = query(collection(db, 'cadet_challenge'), orderBy('submittedAt', 'desc'));
    } else if (canViewComp || SUBMIT_ROLES.includes(role)) {
      // Company-level: own company only
      q = query(
        collection(db, 'cadet_challenge'),
        where('company', '==', myCompany),
        orderBy('submittedAt', 'desc'),
      );
    } else {
      setDataLoading(false);
      return;
    }

    const unsub = onSnapshot(q, (snap) => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setDataLoading(false);
    }, () => setDataLoading(false));

    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, role, myCompany]);

  // Fetch users for the cadet name picker
  useEffect(() => {
    if (authLoading) return;
    const unsub = onSnapshot(
      query(collection(db, 'users'), orderBy('fullName', 'asc')),
      (snap) => setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() }))),
    );
    return () => unsub();
  }, [authLoading]);

  // ── derived list (client-side filter) ────────────────────────────────────

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (filterCompany !== 'All' && r.company !== filterCompany) return false;
      if (filterStatus  !== 'All' && r.status  !== filterStatus)  return false;
      return true;
    });
  }, [records, filterCompany, filterStatus]);

  // Cadets selectable in the form (if staff: all; if company-level: own company)
  const cadetOptions = useMemo(() => {
    const base = users.filter(u => u.approved && u.fullName);
    if (canManage) return base;
    return base.filter(u => u.company === myCompany);
  }, [users, canManage, myCompany]);

  // ── toast helper ─────────────────────────────────────────────────────────

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // ── modal helpers ─────────────────────────────────────────────────────────

  const openCreate = () => {
    setForm({
      ...EMPTY_FORM,
      company: myCompany,
      date: new Date().toISOString().slice(0, 10),
    });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (rec) => {
    setForm({
      cadetName:   rec.cadetName   || '',
      company:     rec.company     || '',
      date:        rec.date        || '',
      pushUps:     rec.pushUps     ?? '',
      sitUps:      rec.sitUps      ?? '',
      pullUps:     rec.pullUps     ?? '',
      shuttleRun:  rec.shuttleRun  || '',
      milePace:    rec.milePace    || '',
      notes:       rec.notes       || '',
    });
    setEditingId(rec.id);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.cadetName.trim() || !form.date || !form.company) return;
    setSaving(true);
    try {
      const payload = {
        cadetName:  form.cadetName.trim(),
        company:    form.company,
        date:       form.date,
        pushUps:    Number(form.pushUps)    || 0,
        sitUps:     Number(form.sitUps)     || 0,
        pullUps:    form.pullUps  !== '' ? Number(form.pullUps)  : null,
        shuttleRun: form.shuttleRun.trim()  || null,
        milePace:   form.milePace.trim()    || null,
        notes:      form.notes.trim()       || null,
      };

      if (editingId) {
        await updateDoc(doc(db, 'cadet_challenge', editingId), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
        showToast('Record updated');
      } else {
        await addDoc(collection(db, 'cadet_challenge'), {
          ...payload,
          status:          'submitted',
          submittedBy:     userData?.fullName  || '',
          submittedByUid:  user.uid,
          submittedByRole: role                || '',
          submittedAt:     serverTimestamp(),
        });
        showToast('Record submitted');
      }
      closeModal();
    } catch (err) {
      console.error('Save failed:', err);
      showToast('Save failed — try again');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify = async (id) => {
    try {
      await updateDoc(doc(db, 'cadet_challenge', id), {
        status:     'verified',
        verifiedBy: userData?.fullName || '',
        verifiedAt: serverTimestamp(),
      });
      showToast('Marked as verified');
    } catch {
      showToast('Update failed');
    }
  };

  const handleDelete = async () => {
    if (!deleteConf) return;
    try {
      await deleteDoc(doc(db, 'cadet_challenge', deleteConf.id));
      setDeleteConf(null);
      showToast('Record deleted');
    } catch {
      showToast('Delete failed');
    }
  };

  // ── loading state ─────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-yellow-500" size={40} />
      </div>
    );
  }

  // Users who can neither manage nor submit have nothing to do here
  if (!canSubmit && !canManage && !canViewComp) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex items-center justify-center p-8 text-center">
        <div>
          <Activity className="mx-auto text-yellow-500 mb-4" size={40} />
          <p className="font-black uppercase text-sm text-slate-500">Access Restricted</p>
          <p className="text-xs text-slate-400 mt-2">This page is available to S1 &amp; S3 Assistants and above.</p>
        </div>
      </div>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 text-slate-900 dark:text-slate-100">
      <main className="p-6 md:p-10 max-w-6xl">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-10 gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
              <ScrambleText text="Cadet " trigger="mount" />
              <span className="text-yellow-500"><ScrambleText text="Challenge" trigger="mount" /></span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 mt-1">
              Physical Fitness Records · {ROLE_LABELS[role] || role}
            </p>
          </div>
          {canSubmit && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-widest px-5 py-3 rounded-xl transition-all shadow-lg shadow-yellow-500/20"
            >
              <Plus size={16} /> New Record
            </button>
          )}
        </div>

        {/* ── Filters (staff view) ── */}
        {canManage && (
          <div className="flex flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-xl px-4 py-2 shadow-sm">
              <Filter size={13} className="text-slate-400" />
              <select
                value={filterCompany}
                onChange={e => setFilterCompany(e.target.value)}
                className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-transparent outline-none pr-2"
              >
                <option>All</option>
                {companies.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-xl px-4 py-2 shadow-sm">
              <ChevronDown size={13} className="text-slate-400" />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-transparent outline-none pr-2"
              >
                <option>All</option>
                <option>submitted</option>
                <option>verified</option>
              </select>
            </div>
            <span className="ml-auto text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 self-center tracking-widest">
              {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* ── Records table ── */}
        {dataLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(n => (
              <div key={n} className="h-16 bg-slate-100 dark:bg-slate-900/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl">
            <Activity className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={40} />
            <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-sm">
              No records yet
            </p>
            {canSubmit && (
              <button onClick={openCreate} className="mt-4 text-yellow-500 text-xs font-black uppercase tracking-widest hover:text-yellow-400 transition-colors">
                + Submit first record
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRecords.map(rec => (
              <div
                key={rec.id}
                className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm hover:border-yellow-500/20 transition-all"
              >
                {/* Status dot + name */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${rec.status === 'verified' ? 'bg-green-500' : 'bg-yellow-400'}`} />
                  <div className="min-w-0">
                    <p className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight truncate">{rec.cadetName}</p>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{rec.company} · {formatDate(rec.date)}</p>
                  </div>
                </div>

                {/* Scores */}
                <div className="flex flex-wrap gap-4 sm:mx-auto text-center">
                  <ScoreChip label="Push-Ups"  value={rec.pushUps} />
                  <ScoreChip label="Sit-Ups"   value={rec.sitUps} />
                  {rec.pullUps != null   && <ScoreChip label="Pull-Ups"    value={rec.pullUps} />}
                  {rec.shuttleRun        && <ScoreChip label="Shuttle (s)" value={rec.shuttleRun} />}
                  {rec.milePace          && <ScoreChip label="1-Mile"      value={rec.milePace} />}
                </div>

                {/* Status + actions */}
                <div className="flex items-center gap-2 shrink-0 ml-auto">
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    rec.status === 'verified'
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400'
                      : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                  }`}>
                    {rec.status}
                  </span>

                  {canManage && rec.status !== 'verified' && (
                    <button
                      onClick={() => handleVerify(rec.id)}
                      title="Mark verified"
                      className="p-2 rounded-lg text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 transition-all"
                    >
                      <ShieldCheck size={16} />
                    </button>
                  )}
                  {canManage && (
                    <button
                      onClick={() => openEdit(rec)}
                      className="p-2 rounded-lg text-slate-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 transition-all"
                    >
                      <Edit3 size={16} />
                    </button>
                  )}
                  {canManage && (
                    <button
                      onClick={() => setDeleteConf({ id: rec.id, cadetName: rec.cadetName })}
                      className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Footer />
      </main>

      {/* ── Submit / Edit Modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/10 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="p-6 border-b border-blue-100 dark:border-white/5 flex items-center justify-between">
                <h2 className="font-black uppercase text-sm tracking-widest text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity size={16} className="text-yellow-500" />
                  {editingId ? 'Edit Record' : 'New Cadet Challenge Record'}
                </h2>
                <button onClick={closeModal} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-5">
                {/* Cadet name — picker if roster available, fallback text */}
                <div>
                  <label className={labelClass}>Cadet Name *</label>
                  {cadetOptions.length > 0 ? (
                    <select
                      required
                      value={form.cadetName}
                      onChange={e => setForm(f => ({ ...f, cadetName: e.target.value }))}
                      className={inputClass}
                    >
                      <option value="">— Select Cadet —</option>
                      {cadetOptions.map(u => (
                        <option key={u.uid} value={u.fullName}>
                          {u.fullName}{u.rank ? ` (${u.rank})` : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      required
                      type="text"
                      placeholder="LAST, FIRST"
                      value={form.cadetName}
                      onChange={e => setForm(f => ({ ...f, cadetName: e.target.value }))}
                      className={inputClass}
                    />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Company */}
                  <div>
                    <label className={labelClass}>Company *</label>
                    <select
                      required
                      value={form.company}
                      onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                      className={inputClass}
                      disabled={!canManage && !!myCompany}
                    >
                      <option value="">— Select —</option>
                      {companies.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  {/* Date */}
                  <div>
                    <label className={labelClass}>Test Date *</label>
                    <input
                      required
                      type="date"
                      value={form.date}
                      onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                      className={inputClass}
                    />
                  </div>
                </div>

                {/* Event scores */}
                <div>
                  <p className="text-[10px] font-black uppercase text-yellow-500 tracking-widest mb-3">Event Scores</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass}>Push-Ups (reps)</label>
                      <input
                        type="number" min="0" max="999"
                        value={form.pushUps}
                        onChange={e => setForm(f => ({ ...f, pushUps: e.target.value }))}
                        placeholder="0"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Sit-Ups (reps)</label>
                      <input
                        type="number" min="0" max="999"
                        value={form.sitUps}
                        onChange={e => setForm(f => ({ ...f, sitUps: e.target.value }))}
                        placeholder="0"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Pull-Ups (optional)</label>
                      <input
                        type="number" min="0" max="999"
                        value={form.pullUps}
                        onChange={e => setForm(f => ({ ...f, pullUps: e.target.value }))}
                        placeholder="—"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Shuttle Run (sec)</label>
                      <input
                        type="text"
                        value={form.shuttleRun}
                        onChange={e => setForm(f => ({ ...f, shuttleRun: e.target.value }))}
                        placeholder="e.g. 11.3"
                        className={inputClass}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className={labelClass}>1-Mile Run (MM:SS)</label>
                      <input
                        type="text"
                        value={form.milePace}
                        onChange={e => setForm(f => ({ ...f, milePace: e.target.value }))}
                        placeholder="e.g. 8:45"
                        className={inputClass}
                      />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className={labelClass}>Notes (optional)</label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Any additional observations..."
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><CheckCircle2 size={14} /> {editingId ? 'Save Changes' : 'Submit Record'}</>}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete Confirmation ── */}
      <AnimatePresence>
        {deleteConf && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-500/20 rounded-3xl p-8 max-w-sm w-full text-center"
            >
              <Trash2 className="mx-auto text-red-500 mb-4" size={32} />
              <h3 className="font-black uppercase text-sm tracking-widest text-slate-900 dark:text-white mb-2">Delete Record?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                This will permanently remove the challenge record for <strong>{deleteConf.cadetName}</strong>.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConf(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 font-black text-xs uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest px-5 py-3 rounded-2xl shadow-xl z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── ScoreChip sub-component ──────────────────────────────────────────────────

const ScoreChip = ({ label, value }) => (
  <div className="text-center">
    <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">{label}</p>
    <p className="text-sm font-black text-slate-900 dark:text-white">{value ?? '—'}</p>
  </div>
);

export default AdminCadetChallenge;
