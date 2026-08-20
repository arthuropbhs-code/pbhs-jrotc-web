// src/pages/AdminMeetingLogs.jsx
//
// Meeting Logs — create/view/edit official battalion meeting records.
//
// WHO CAN DO WHAT
//   Create / Edit / Delete : battalion_xo  + ADMIN_LEVEL (80+)
//   View (read-only)       : s1_adjutant, battalion_commander, and the editors above
//
// FIELDS PER LOG
//   Meeting number  — auto-incremented (user may override)
//   Date            — calendar date picker
//   Meeting name    — free text
//   Attendance      — free text paragraph
//   Agenda          — bullet-point list
//   Notes           — bullet-point list
//
// DATA MODEL (Firestore)
//   meetingLogs/{id}:
//     meetingNumber  (number)
//     meetingDate    (Timestamp)
//     meetingName    (string)
//     attendance     (string)
//     agendaItems    (string[])
//     noteItems      (string[])
//     createdBy      (uid)
//     createdByName  (string)
//     createdAt      (Timestamp)
//     updatedAt      (Timestamp | null)
//     updatedByName  (string)
//
// GOOGLE SHEETS SYNC
//   After every successful Firestore write, the client POSTs to /api/sync-meeting-logs
//   which rewrites the linked Google Sheet.  Requires:
//     MEETING_LOGS_SHEET_ID env var in Vercel
//     Google Sheets API enabled in the GCP project
//     The sheet shared with the Firebase service-account email (Editor)

import React, { useState, useEffect, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db, auth } from '../firebase';
import {
  collection, query, onSnapshot,
  doc, addDoc, updateDoc, deleteDoc, Timestamp,
} from 'firebase/firestore';
import {
  NotepadText, Plus, X, Pencil, Trash2,
  Eye, ChevronDown, ChevronUp,
  CheckCircle2, AlertCircle, Loader2,
} from 'lucide-react';
import AdminPageHeader from '../components/AdminPageHeader';
import { ROLE_HIERARCHY, ADMIN_LEVEL } from '../constants';

// ── Role constants ─────────────────────────────────────────────────────────────
const CAN_EDIT_ROLES  = ['battalion_xo'];
const CAN_VIEW_ROLES  = ['battalion_xo', 's1_adjutant', 'battalion_commander'];

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDateForSheets(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Convert a date string "YYYY-MM-DD" (from <input type="date">) to Timestamp
function dateStrToTimestamp(str) {
  if (!str) return null;
  // Parse without timezone shift by using UTC date, then set local midnight
  const [y, m, d] = str.split('-').map(Number);
  return Timestamp.fromDate(new Date(y, m - 1, d, 12, 0, 0));
}

function timestampToDateStr(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const y  = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

// ── BulletListEditor ───────────────────────────────────────────────────────────
// Interactive bullet-point list builder (for Agenda and Notes).
function BulletListEditor({ items, onChange, placeholder, readOnly }) {
  const [draft, setDraft] = useState('');

  const addItem = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setDraft('');
  };

  const removeItem = (i) => onChange(items.filter((_, idx) => idx !== i));

  const moveUp   = (i) => {
    if (i === 0) return;
    const next = [...items];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  };
  const moveDown = (i) => {
    if (i === items.length - 1) return;
    const next = [...items];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    onChange(next);
  };

  if (readOnly) {
    if (!items.length) return <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>;
    return (
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
            <span className="text-yellow-500 shrink-0 mt-0.5 font-bold">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 group">
          <span className="text-yellow-500 shrink-0 font-bold text-sm">•</span>
          <p className="flex-1 text-sm text-slate-800 dark:text-slate-200 py-1">{item}</p>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => moveUp(i)}
              disabled={i === 0}
              className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 disabled:opacity-20 transition-colors"
              title="Move up"
            >
              <ChevronUp size={12} />
            </button>
            <button
              onClick={() => moveDown(i)}
              disabled={i === items.length - 1}
              className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 disabled:opacity-20 transition-colors"
              title="Move down"
            >
              <ChevronDown size={12} />
            </button>
            <button
              onClick={() => removeItem(i)}
              className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors"
              title="Remove"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      ))}
      <div className="flex gap-2 mt-1">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
          placeholder={placeholder}
          className="flex-1 bg-blue-50/50 dark:bg-slate-800 border border-blue-100 dark:border-white/5 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-yellow-500/40 transition-colors"
        />
        <button
          onClick={addItem}
          disabled={!draft.trim()}
          className="text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-lg bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 hover:bg-yellow-500 hover:text-slate-950 disabled:opacity-30 transition-all whitespace-nowrap"
        >
          + Add
        </button>
      </div>
    </div>
  );
}

// ── Empty log template ─────────────────────────────────────────────────────────
const EMPTY_FORM = {
  meetingNumber: '',
  meetingDate:   '',
  meetingName:   '',
  attendance:    '',
  agendaItems:   [],
  noteItems:     [],
};

// ── Main page ──────────────────────────────────────────────────────────────────
const AdminMeetingLogs = () => {
  const { userData, role, loading: authLoading } = useAuth();
  const userLevel = ROLE_HIERARCHY[role] || 0;

  // ── Access flags ─────────────────────────────────────────────────────────────
  const isAuthorized = CAN_VIEW_ROLES.includes(role) || userLevel >= ADMIN_LEVEL;
  const canEdit      = CAN_EDIT_ROLES.includes(role) || userLevel >= ADMIN_LEVEL;
  // Delete is restricted to XO only — instructors and BC can edit but not delete
  const canDelete    = role === 'battalion_xo';

  // ── Data state ────────────────────────────────────────────────────────────────
  const [logs,       setLogs]       = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // ── Modal state ───────────────────────────────────────────────────────────────
  // modalMode: null (closed) | 'create' | 'edit' | 'view'
  const [modalMode, setModalMode] = useState(null);
  const [activeLog, setActiveLog] = useState(null); // log being edited/viewed
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [saving,    setSaving]    = useState(false);
  const [deleting,  setDeleting]  = useState(null); // id being deleted

  // ── Sync state ────────────────────────────────────────────────────────────────
  // 'idle' | 'syncing' | 'ok' | 'error'
  const [syncStatus,  setSyncStatus]  = useState('idle');
  const [syncMessage, setSyncMessage] = useState('');

  // ── Firestore subscription ────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthorized) return;
    const q = query(collection(db, 'meetingLogs'));
    return onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.meetingNumber || 0) - (a.meetingNumber || 0));
      setLogs(docs);
      setLoadingLogs(false);
    });
  }, [isAuthorized]);

  // ── Derived ───────────────────────────────────────────────────────────────────
  const nextMeetingNumber = useMemo(() => {
    if (logs.length === 0) return 1;
    return Math.max(...logs.map(l => l.meetingNumber || 0)) + 1;
  }, [logs]);

  // ── Sync to Google Sheets ─────────────────────────────────────────────────────
  // Sends all current logs (sorted ascending by meeting number) to the Sheets API
  // via /api/sync-meeting-logs.
  const syncToSheets = async (currentLogs) => {
    setSyncStatus('syncing');
    setSyncMessage('');
    try {
      const idToken = await auth.currentUser.getIdToken();
      const sorted  = [...currentLogs].sort((a, b) => (a.meetingNumber || 0) - (b.meetingNumber || 0));

      const payload = sorted.map(l => ({
        meetingNumber: l.meetingNumber,
        meetingDate:   fmtDateForSheets(l.meetingDate),
        meetingName:   l.meetingName   || '',
        attendance:    l.attendance    || '',
        agendaItems:   l.agendaItems   || [],
        noteItems:     l.noteItems     || [],
      }));

      const res  = await fetch('/api/sync-meeting-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, logs: payload }),
      });
      const data = await res.json();

      if (data.ok) {
        setSyncStatus('ok');
        setSyncMessage('Synced to Google Sheets');
      } else {
        setSyncStatus('error');
        setSyncMessage(data.error || 'Sync failed');
      }
    } catch (err) {
      console.error('Sheets sync error:', err);
      setSyncStatus('error');
      setSyncMessage('Sync failed — check network');
    }
    // Clear status after a few seconds
    setTimeout(() => { setSyncStatus('idle'); setSyncMessage(''); }, 5000);
  };

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setForm({ ...EMPTY_FORM, meetingNumber: nextMeetingNumber });
    setActiveLog(null);
    setModalMode('create');
  };

  const openEdit = (log) => {
    setForm({
      meetingNumber: log.meetingNumber ?? '',
      meetingDate:   timestampToDateStr(log.meetingDate),
      meetingName:   log.meetingName  || '',
      attendance:    log.attendance   || '',
      agendaItems:   log.agendaItems  || [],
      noteItems:     log.noteItems    || [],
    });
    setActiveLog(log);
    setModalMode('edit');
  };

  const openView = (log) => {
    setActiveLog(log);
    setModalMode('view');
  };

  const closeModal = () => {
    setModalMode(null);
    setActiveLog(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async () => {
    if (!form.meetingDate || !form.meetingName.trim()) return;
    setSaving(true);
    try {
      const payload = {
        meetingNumber: parseInt(form.meetingNumber) || nextMeetingNumber,
        meetingDate:   dateStrToTimestamp(form.meetingDate),
        meetingName:   form.meetingName.trim(),
        attendance:    form.attendance.trim(),
        agendaItems:   form.agendaItems,
        noteItems:     form.noteItems,
        updatedAt:     Timestamp.now(),
        updatedByName: userData?.fullName || '',
      };

      let updatedLogs;
      if (modalMode === 'create') {
        const docRef = await addDoc(collection(db, 'meetingLogs'), {
          ...payload,
          createdBy:    auth.currentUser.uid,
          createdByName: userData?.fullName || '',
          createdAt:    Timestamp.now(),
        });
        // Optimistically build the new log for sheets sync
        // (actual Firestore snapshot will also update `logs` state via listener)
        updatedLogs = [
          ...logs,
          { id: docRef.id, ...payload, createdAt: Timestamp.now() },
        ];
      } else {
        await updateDoc(doc(db, 'meetingLogs', activeLog.id), payload);
        updatedLogs = logs.map(l => l.id === activeLog.id ? { ...l, ...payload } : l);
      }

      closeModal();
      // Sync to Sheets with updated list
      syncToSheets(updatedLogs);
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save meeting log. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (log) => {
    const ok = window.confirm(`Delete Meeting #${log.meetingNumber} — "${log.meetingName}"? This cannot be undone.`);
    if (!ok) return;
    setDeleting(log.id);
    try {
      await deleteDoc(doc(db, 'meetingLogs', log.id));
      const updatedLogs = logs.filter(l => l.id !== log.id);
      syncToSheets(updatedLogs);
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete meeting log.');
    } finally {
      setDeleting(null);
    }
  };

  // ── Guards ────────────────────────────────────────────────────────────────────
  if (authLoading) return (
    <div className="flex-1 flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-yellow-500" />
    </div>
  );

  if (!isAuthorized) return <Navigate to="/admin/dashboard" />;

  // ════════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════════
  return (
    <div className="flex-1 p-6 md:p-10 w-full">
      <AdminPageHeader icon={NotepadText} title="Meeting Logs" />

        {/* ── Header actions ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-end gap-3 mb-10">
          <div className="flex items-center gap-3">
            {/* Sync status indicator */}
            {syncStatus !== 'idle' && (
              <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-3 py-2 rounded-xl border transition-all ${
                syncStatus === 'syncing' ? 'bg-blue-50 dark:bg-blue-500/5 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-500/20' :
                syncStatus === 'ok'      ? 'bg-green-50 dark:bg-green-500/5 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20' :
                                           'bg-red-50 dark:bg-red-500/5 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
              }`}>
                {syncStatus === 'syncing' && <Loader2 size={11} className="animate-spin" />}
                {syncStatus === 'ok'      && <CheckCircle2 size={11} />}
                {syncStatus === 'error'   && <AlertCircle size={11} />}
                {syncMessage || (syncStatus === 'syncing' ? 'Syncing…' : '')}
              </div>
            )}
            {canEdit && (
              <button
                onClick={openCreate}
                className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-colors"
              >
                <Plus size={14} /> New Meeting Log
              </button>
            )}
          </div>
        </div>

        {/* ── Access notice for read-only users ────────────────────────────────────── */}
        {!canEdit && (
          <div className="mb-6 p-4 bg-blue-50/60 dark:bg-blue-500/5 border border-blue-100 dark:border-blue-500/10 rounded-2xl flex items-center gap-3">
            <Eye className="text-blue-400 shrink-0" size={15} />
            <p className="text-xs font-bold text-blue-600 dark:text-blue-400">
              You have read-only access to meeting logs. Contact the Battalion XO to make changes.
            </p>
          </div>
        )}

        {/* ── Meeting logs table ────────────────────────────────────────────────────── */}
        {loadingLogs ? (
          <div className="text-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-yellow-500 mx-auto" />
            <p className="text-slate-400 text-xs font-bold mt-4 uppercase tracking-widest">Loading logs…</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl">
            <NotepadText className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={40} />
            <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No meeting logs yet</p>
            {canEdit && (
              <button
                onClick={openCreate}
                className="mt-4 text-yellow-600 dark:text-yellow-500 text-xs font-black uppercase tracking-widest hover:underline"
              >
                Create the first one →
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-blue-100 dark:border-white/5 bg-blue-50/40 dark:bg-slate-800/30">
                    <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-16">#</th>
                    <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Date</th>
                    <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Meeting Name</th>
                    <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hidden md:table-cell">Agenda</th>
                    <th className="px-4 py-3 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hidden md:table-cell">Notes</th>
                    <th className="px-4 py-3 text-right text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr
                      key={log.id}
                      className="border-b border-blue-50 dark:border-white/5 hover:bg-blue-50/20 dark:hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <span className="text-xs font-black text-slate-400 dark:text-slate-500 tabular-nums">#{log.meetingNumber}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{fmtDate(log.meetingDate)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold text-slate-900 dark:text-white">{log.meetingName || '—'}</p>
                        {log.attendance && (
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate max-w-[180px]">{log.attendance}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {(log.agendaItems || []).length > 0 ? (
                          <div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                              • {log.agendaItems[0]}
                            </p>
                            {log.agendaItems.length > 1 && (
                              <p className="text-[9px] text-slate-400 dark:text-slate-500">+{log.agendaItems.length - 1} more</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {(log.noteItems || []).length > 0 ? (
                          <div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 truncate max-w-[150px]">
                              • {log.noteItems[0]}
                            </p>
                            {log.noteItems.length > 1 && (
                              <p className="text-[9px] text-slate-400 dark:text-slate-500">+{log.noteItems.length - 1} more</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-300 dark:text-slate-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5 justify-end">
                          <button
                            onClick={() => openView(log)}
                            title="View details"
                            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-blue-50/50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-lg transition-all"
                          >
                            <Eye size={10} /> View
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => openEdit(log)}
                              title="Edit"
                              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-yellow-600 dark:hover:text-yellow-500 bg-yellow-50/50 dark:bg-slate-800 hover:bg-yellow-100 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-lg transition-all"
                            >
                              <Pencil size={10} /> Edit
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(log)}
                              disabled={deleting === log.id}
                              title="Delete"
                              className="flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:text-red-600 dark:text-slate-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 px-2 py-1.5 rounded-lg transition-all disabled:opacity-40"
                            >
                              {deleting === log.id
                                ? <Loader2 size={10} className="animate-spin" />
                                : <Trash2 size={10} />
                              }
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {/* ════════════════════════════════════════════════════════════════════════════
          CREATE / EDIT / VIEW MODAL
      ════════════════════════════════════════════════════════════════════════════ */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-10 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-blue-100 dark:border-white/5 my-auto">

            {/* Modal header */}
            <div className="flex items-center justify-between px-8 pt-8 pb-0 mb-6">
              <h2 className="text-lg font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                {modalMode === 'create' ? 'New Meeting Log'
                 : modalMode === 'edit' ? `Edit Meeting #${activeLog?.meetingNumber}`
                 : `Meeting #${activeLog?.meetingNumber} — ${activeLog?.meetingName}`}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="px-8 pb-8 space-y-6">
              {/* ── Meeting Info ───────────────────────────────────────────── */}
              <div className="grid grid-cols-2 gap-4">
                {/* Meeting number */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1.5">
                    Meeting #
                    {modalMode === 'create' && (
                      <span className="ml-1.5 text-slate-300 dark:text-slate-600 normal-case font-medium tracking-normal">
                        (auto-filled, can override)
                      </span>
                    )}
                  </label>
                  {modalMode === 'view' ? (
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">#{activeLog?.meetingNumber}</p>
                  ) : (
                    <input
                      type="number"
                      min={1}
                      value={form.meetingNumber}
                      onChange={e => setForm(f => ({ ...f, meetingNumber: e.target.value }))}
                      className="w-full bg-blue-50/50 dark:bg-slate-800 border border-blue-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-yellow-500/40 transition-colors"
                    />
                  )}
                </div>

                {/* Date */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1.5">Date</label>
                  {modalMode === 'view' ? (
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{fmtDate(activeLog?.meetingDate)}</p>
                  ) : (
                    <input
                      type="date"
                      value={form.meetingDate}
                      onChange={e => setForm(f => ({ ...f, meetingDate: e.target.value }))}
                      className="w-full bg-blue-50/50 dark:bg-slate-800 border border-blue-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-yellow-500/40 transition-colors"
                    />
                  )}
                </div>
              </div>

              {/* Meeting name */}
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1.5">Meeting Name</label>
                {modalMode === 'view' ? (
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{activeLog?.meetingName || '—'}</p>
                ) : (
                  <input
                    value={form.meetingName}
                    onChange={e => setForm(f => ({ ...f, meetingName: e.target.value }))}
                    placeholder="e.g., Weekly Commander's Call, Staff Sync…"
                    className="w-full bg-blue-50/50 dark:bg-slate-800 border border-blue-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-yellow-500/40 transition-colors"
                  />
                )}
              </div>

              {/* Attendance */}
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1.5">Attendance</label>
                {modalMode === 'view' ? (
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{activeLog?.attendance || '—'}</p>
                ) : (
                  <textarea
                    value={form.attendance}
                    onChange={e => setForm(f => ({ ...f, attendance: e.target.value }))}
                    rows={3}
                    placeholder="e.g., All company XOs present. Alpha 1SG absent. 42 cadets total."
                    className="w-full bg-blue-50/50 dark:bg-slate-800 border border-blue-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-yellow-500/40 transition-colors resize-none"
                  />
                )}
              </div>

              {/* Agenda */}
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-2">Agenda</label>
                {modalMode === 'view' ? (
                  <BulletListEditor items={activeLog?.agendaItems || []} onChange={() => {}} readOnly />
                ) : (
                  <BulletListEditor
                    items={form.agendaItems}
                    onChange={items => setForm(f => ({ ...f, agendaItems: items }))}
                    placeholder="Add agenda item… (press Enter)"
                  />
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-2">Notes</label>
                {modalMode === 'view' ? (
                  <BulletListEditor items={activeLog?.noteItems || []} onChange={() => {}} readOnly />
                ) : (
                  <BulletListEditor
                    items={form.noteItems}
                    onChange={items => setForm(f => ({ ...f, noteItems: items }))}
                    placeholder="Add note… (press Enter)"
                  />
                )}
              </div>

              {/* Last saved info */}
              {modalMode === 'view' && activeLog?.updatedAt && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  Last updated {fmtDate(activeLog.updatedAt)} by {activeLog.updatedByName || '—'}
                </p>
              )}

              {/* ── Action buttons ─────────────────────────────────────────────── */}
              {modalMode !== 'view' && (
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-blue-50/50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors border border-blue-100 dark:border-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!form.meetingDate || !form.meetingName.trim() || saving}
                    className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-yellow-500 hover:bg-yellow-400 text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {saving ? 'Saving…' : modalMode === 'create' ? 'Create Log' : 'Save Changes'}
                  </button>
                </div>
              )}

              {modalMode === 'view' && canEdit && (
                <div className="pt-2">
                  <button
                    onClick={() => { closeModal(); openEdit(activeLog); }}
                    className="w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 hover:bg-yellow-500 hover:text-slate-950 transition-all border border-yellow-200/50 dark:border-yellow-500/20"
                  >
                    <span className="flex items-center justify-center gap-2"><Pencil size={12} /> Edit This Log</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMeetingLogs;
