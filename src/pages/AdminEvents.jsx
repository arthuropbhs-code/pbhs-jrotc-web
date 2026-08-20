// src/pages/AdminEvents.jsx
//
// Calendar events management — open to all authenticated staff.
// Events appear on the public /events calendar page.
// Schema: { title, date (YYYY-MM-DD), type, location, time, description, createdAt, updatedAt }

import React, { useState, useEffect } from 'react';
import {
  collection, onSnapshot, query, orderBy,
  addDoc, updateDoc, deleteDoc, doc, setDoc, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../hooks/useAuth';
import {
  Calendar, Plus, Edit3, Trash2, Save, X, Loader2,
  MapPin, Clock, Info, Tag, Check,
} from 'lucide-react';
import AdminPageHeader from '../components/AdminPageHeader';

const inputClass =
  'w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-3 rounded-xl outline-none focus:border-yellow-500 text-sm font-bold text-slate-900 dark:text-white transition-colors';
const labelClass =
  'text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 block mb-1';

export const EVENT_TYPES = [
  'Training',
  'Competition',
  'Ceremony',
  'Field Trip',
  'Meeting',
  'Social',
  'Fundraiser',
  'Community Service',
  'Inspection',
  'No School',
  'Other',
];

export const TYPE_COLORS = {
  Training:            'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  Competition:         'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20',
  Ceremony:            'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  'Field Trip':        'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  Meeting:             'bg-slate-400/10 text-slate-600 dark:text-slate-400 border-slate-400/20',
  Social:              'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',
  Fundraiser:          'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  'Community Service': 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
  Inspection:          'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20',
  'No School':         'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
  Other:               'bg-slate-500/10 text-slate-500 dark:text-slate-500 border-slate-500/20',
};

const TypeBadge = ({ type }) => {
  if (!type) return null;
  const colors = TYPE_COLORS[type] || TYPE_COLORS.Other;
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${colors}`}>
      <Tag size={8} /> {type}
    </span>
  );
};

const BLANK = { title: '', date: '', endDate: '', type: '', location: '', time: '', description: '' };

// ── EventForm is defined at MODULE level so React never unmounts/remounts it
// on parent re-renders (which would steal focus on every keystroke).
const EventForm = ({ editingEvent, setField, saving, handleSave, setEditingEvent, isNew = false }) => (
  <div className={`bg-white dark:bg-slate-900/40 border rounded-2xl p-5 space-y-3 ${
    isNew ? 'border-yellow-500/30' : 'border-slate-200 dark:border-white/5'
  }`}>
    {isNew && (
      <h3 className="text-xs font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-widest">
        New Event
      </h3>
    )}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className={labelClass}>Title *</label>
        <input
          className={inputClass}
          value={editingEvent.title}
          onChange={e => setField('title', e.target.value)}
          placeholder="e.g. Military Ball 2025–2026"
          autoFocus={isNew}
          onKeyDown={e => e.stopPropagation()}
        />
      </div>
      <div>
        <label className={labelClass}>Start Date *</label>
        <input
          className={inputClass}
          type="date"
          value={editingEvent.date}
          onChange={e => setField('date', e.target.value)}
          onKeyDown={e => e.stopPropagation()}
        />
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <label className={labelClass}>End Date <span className="normal-case font-medium text-slate-300 dark:text-slate-600">(optional — for multi-day events)</span></label>
        <input
          className={inputClass}
          type="date"
          value={editingEvent.endDate || ''}
          min={editingEvent.date || ''}
          onChange={e => setField('endDate', e.target.value)}
          onKeyDown={e => e.stopPropagation()}
        />
      </div>
      <div /> {/* spacer */}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div>
        <label className={labelClass}>Category</label>
        <select
          className={inputClass}
          value={editingEvent.type}
          onChange={e => setField('type', e.target.value)}
          onKeyDown={e => e.stopPropagation()}
        >
          <option value="">— Select —</option>
          {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className={labelClass}>Location</label>
        <input
          className={inputClass}
          value={editingEvent.location}
          onChange={e => setField('location', e.target.value)}
          placeholder="e.g. PBHS Gymnasium"
          onKeyDown={e => e.stopPropagation()}
        />
      </div>
      <div>
        <label className={labelClass}>Time</label>
        <input
          className={inputClass}
          value={editingEvent.time}
          onChange={e => setField('time', e.target.value)}
          placeholder="e.g. 6:00 PM"
          onKeyDown={e => e.stopPropagation()}
        />
      </div>
    </div>
    <div>
      <label className={labelClass}>Description</label>
      <textarea
        className={`${inputClass} resize-none`}
        rows={3}
        value={editingEvent.description}
        onChange={e => setField('description', e.target.value)}
        placeholder="Optional details — dress code, what to bring, special instructions, etc."
      />
    </div>
    <div className="flex gap-2 pt-1">
      <button
        disabled={saving || !editingEvent.title || !editingEvent.date}
        onClick={handleSave}
        className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500 text-slate-950 font-black text-xs uppercase rounded-xl hover:bg-yellow-400 disabled:opacity-50 transition-all shadow-lg shadow-yellow-500/20"
      >
        {saving
          ? <Loader2 size={14} className="animate-spin" />
          : <Save size={14} />}
        {isNew ? 'Add Event' : 'Save'}
      </button>
      <button
        onClick={() => setEditingEvent(null)}
        className="flex items-center gap-2 px-5 py-2.5 bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400 font-black text-xs uppercase rounded-xl hover:opacity-70 transition-all"
      >
        <X size={14} /> Cancel
      </button>
    </div>
  </div>
);

const AdminEvents = () => {
  const { userData } = useAuth();

  const [events, setEvents]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [editingEvent, setEditingEvent] = useState(null); // null=none, BLANK=new, {id,...}=edit
  const [saving, setSaving]           = useState(false);

  // ── Blue/Gold anchor date ─────────────────────────────────────────────────
  const DEFAULT_ANCHOR = '2026-08-03'; // first Blue Day of 2026-2027 (PBHS includes Mon–Fri)
  const [anchorDate, setAnchorDate]     = useState(DEFAULT_ANCHOR);
  const [anchorSaving, setAnchorSaving] = useState(false);
  const [anchorSaved,  setAnchorSaved]  = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'blueGoldCalendar'), (snap) => {
      if (snap.exists() && snap.data().anchorDate) setAnchorDate(snap.data().anchorDate);
    });
    return () => unsub();
  }, []);

  const saveAnchorDate = async () => {
    setAnchorSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'blueGoldCalendar'), { anchorDate }, { merge: true });
      setAnchorSaved(true);
      setTimeout(() => setAnchorSaved(false), 2500);
    } catch (err) {
      console.error('Anchor save failed:', err);
    } finally {
      setAnchorSaving(false);
    }
  };

  // ── Events data ───────────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'events'), orderBy('date', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // ── Save (create or update) ───────────────────────────────────────────────
  const handleSave = async () => {
    if (!editingEvent?.title || !editingEvent?.date) return;
    setSaving(true);
    try {
      const payload = {
        title:       editingEvent.title.trim(),
        date:        editingEvent.date,
        endDate:     editingEvent.endDate && editingEvent.endDate > editingEvent.date
                       ? editingEvent.endDate : '',
        type:        editingEvent.type        || '',
        location:    editingEvent.location.trim(),
        time:        editingEvent.time.trim(),
        description: editingEvent.description.trim(),
        updatedAt:   serverTimestamp(),
      };
      if (editingEvent.id) {
        await updateDoc(doc(db, 'events', editingEvent.id), payload);
      } else {
        await addDoc(collection(db, 'events'), {
          ...payload,
          createdBy: userData?.fullName || 'Staff',
          createdAt: serverTimestamp(),
        });
      }
      setEditingEvent(null);
    } catch (err) {
      console.error('Event save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this event from the public calendar?')) return;
    try {
      await deleteDoc(doc(db, 'events', id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // ── Form helper ───────────────────────────────────────────────────────────
  const setField = (key, val) => setEditingEvent(ev => ({ ...ev, [key]: val }));

  // Shared props bundle passed down to the module-level EventForm
  const formProps = { editingEvent, setField, saving, handleSave, setEditingEvent };

  return (
    <div className="flex-1 p-6 md:p-10 w-full">
      <AdminPageHeader icon={Calendar} title="Calendar Events" />
      {!editingEvent && (
        <div className="flex justify-end mb-6">
          <button
            onClick={() => setEditingEvent({ ...BLANK })}
            className="flex items-center gap-2 px-5 py-2.5 bg-yellow-500 text-slate-950 font-black text-xs uppercase rounded-xl hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20 whitespace-nowrap"
          >
            <Plus size={14} /> New Event
          </button>
        </div>
      )}

      {/* Blue/Gold schedule settings */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
          <span className="w-3 h-3 rounded-full bg-yellow-500 flex-shrink-0" />
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">
            Blue / Gold Day Schedule
          </h2>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-4 ml-8">
          Set the date of the first Blue Day of the school year. The calendar alternates Blue → Gold each school day, automatically skipping weekends and any events marked <strong>No School</strong>.
        </p>
        <div className="flex items-end gap-3 ml-8">
          <div className="flex-1 max-w-xs">
            <label className={labelClass}>First Blue Day</label>
            <input
              className={inputClass}
              type="date"
              value={anchorDate}
              onChange={e => setAnchorDate(e.target.value)}
            />
          </div>
          <button
            onClick={saveAnchorDate}
            disabled={anchorSaving}
            className={`flex items-center gap-2 px-5 py-3 font-black text-xs uppercase rounded-xl transition-all shadow-lg disabled:opacity-50 whitespace-nowrap ${
              anchorSaved
                ? 'bg-green-500 text-white shadow-green-500/20'
                : 'bg-yellow-500 text-slate-950 hover:bg-yellow-400 shadow-yellow-500/20'
            }`}
          >
            {anchorSaving
              ? <Loader2 size={14} className="animate-spin" />
              : anchorSaved
                ? <Check size={14} />
                : <Save size={14} />}
            {anchorSaved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-[11px] text-blue-700 dark:text-blue-300 mb-6">
        <Info size={15} className="flex-shrink-0 mt-0.5" />
        Events appear on the public <strong>/events</strong> calendar page, ordered by date. Location and time are optional but recommended.
      </div>

      {/* New-event form (shown above the list) */}
      {editingEvent && !editingEvent.id && <div className="mb-4"><EventForm {...formProps} isNew /></div>}

      {/* Event list */}
      <div className="space-y-3">
        {loading && (
          <div className="text-center py-16 text-slate-400 dark:text-slate-600 text-xs font-black uppercase tracking-widest animate-pulse">
            Loading events…
          </div>
        )}

        {!loading && events.length === 0 && !editingEvent && (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl text-slate-400 dark:text-slate-700 text-[10px] font-black uppercase tracking-widest">
            No events yet — click "New Event" to add one
          </div>
        )}

        {events.map(ev => (
          <div
            key={ev.id}
            className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden"
          >
            {editingEvent?.id === ev.id ? (
              <div className="p-5"><EventForm {...formProps} /></div>
            ) : (
              <div className="flex items-center gap-4 p-5">
                {/* Date badge */}
                <div className="flex-shrink-0 w-12 h-12 bg-yellow-500/10 border border-yellow-500/20 rounded-xl flex items-center justify-center">
                  <Calendar size={20} className="text-yellow-600 dark:text-yellow-500" />
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-black uppercase italic text-sm text-slate-900 dark:text-white truncate">
                      {ev.title}
                    </p>
                    <TypeBadge type={ev.type} />
                  </div>
                  <div className="flex items-center flex-wrap gap-x-4 gap-y-1">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                      {ev.date}{ev.endDate && ev.endDate !== ev.date ? ` – ${ev.endDate}` : ''}
                    </span>
                    {ev.location && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        <MapPin size={10} /> {ev.location}
                      </span>
                    )}
                    {ev.time && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        <Clock size={10} /> {ev.time}
                      </span>
                    )}
                    {ev.createdBy && (
                      <span className="text-[10px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest">
                        by {ev.createdBy}
                      </span>
                    )}
                  </div>
                  {ev.description && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed line-clamp-2">
                      {ev.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() =>
                      setEditingEvent({
                        id:          ev.id,
                        title:       ev.title,
                        date:        ev.date,
                        endDate:     ev.endDate     || '',
                        type:        ev.type        || '',
                        location:    ev.location    || '',
                        time:        ev.time        || '',
                        description: ev.description || '',
                      })
                    }
                    className="p-2 rounded-lg text-slate-400 hover:text-yellow-500 hover:bg-yellow-500/10 transition-all"
                    title="Edit"
                  >
                    <Edit3 size={15} />
                  </button>
                  <button
                    onClick={() => handleDelete(ev.id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                    title="Delete"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Floating "Add" button at the bottom if list is long */}
      {!editingEvent && events.length >= 4 && (
        <button
          onClick={() => setEditingEvent({ ...BLANK })}
          className="w-full mt-4 py-4 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-2xl text-xs font-black uppercase text-slate-400 hover:border-yellow-500 hover:text-yellow-600 dark:hover:text-yellow-500 transition-colors flex items-center justify-center gap-2"
        >
          <Plus size={14} /> New Event
        </button>
      )}
    </div>
  );
};

export default AdminEvents;
