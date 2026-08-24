import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { collection, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock, ArrowLeft, Tag, X } from 'lucide-react';
import { TYPE_COLORS } from './AdminEvents';
import { usePageMeta } from '../hooks/usePageMeta';
import Reveal from '../components/Reveal';

// ── Category → cell background hex (for inline style on grid cells) ──────────
const TYPE_CELL_HEX = {
  Training:            '#3b82f6',
  Competition:         '#eab308',
  Ceremony:            '#a855f7',
  'Field Trip':        '#22c55e',
  Meeting:             '#94a3b8',
  Social:              '#ec4899',
  Fundraiser:          '#10b981',
  'Community Service': '#14b8a6',
  Inspection:          '#f97316',
  'No School':         '#ef4444',
  Other:               '#64748b',
};

// Returns an inline style object for a calendar cell based on its event categories
function cellStyle(cats) {
  if (cats.length === 0) return {};
  const hex = (c) => TYPE_CELL_HEX[c] || '#64748b';
  if (cats.length === 1) return { backgroundColor: `${hex(cats[0])}22` };
  // Two+ categories: diagonal stripe pattern
  const h1 = hex(cats[0]);
  const h2 = hex(cats[1]);
  return {
    background: `repeating-linear-gradient(135deg,${h1}25,${h1}25 5px,${h2}25 5px,${h2}25 10px)`,
  };
}

// Returns true if an event covers a given YYYY-MM-DD string
function eventCoversDay(ev, dayStr) {
  if (!ev.date) return false;
  const end = ev.endDate && ev.endDate > ev.date ? ev.endDate : ev.date;
  return ev.date <= dayStr && end >= dayStr;
}

// ── Blue/Gold computation ────────────────────────────────────────────────────
// Counts Mon-Thu school days from anchorStr to targetStr, skipping noSchoolSet.
// PBHS has no school on Fridays — only Mon-Thu count toward B/G alternation.
// Both strings are YYYY-MM-DD. Returns -1 if target is before anchor.
function countSchoolDays(anchorStr, targetStr, noSchoolSet) {
  const [ay, am, ad] = anchorStr.split('-').map(Number);
  const [ty, tm, td] = targetStr.split('-').map(Number);
  const anchor = new Date(ay, am - 1, ad);
  const target = new Date(ty, tm - 1, td);
  if (target < anchor) return -1;
  if (target.getTime() === anchor.getTime()) return 0;
  let count = 0;
  const curr = new Date(anchor);
  while (curr < target) {
    curr.setDate(curr.getDate() + 1);
    const dow = curr.getDay();
    if (dow === 0 || dow === 5 || dow === 6) continue; // skip weekends + Fridays
    const ds = `${curr.getFullYear()}-${String(curr.getMonth()+1).padStart(2,'0')}-${String(curr.getDate()).padStart(2,'0')}`;
    if (!noSchoolSet.has(ds)) count++;
  }
  return count;
}

const CalendarPage = () => {
  usePageMeta({
    title: 'Events Calendar',
    description: 'Upcoming PBHS JROTC Tornado Battalion events, meetings, and competitions.',
    path: '/events',
  });
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedType, setSelectedType] = useState(null); // null = all
  const [anchorDate, setAnchorDate] = useState('2026-08-03'); // first Blue Day of 2026-2027
  const [blueGoldEndDate, setBlueGoldEndDate] = useState('');  // last day to show B/G (from Firestore)
  const [hoveredDay, setHoveredDay] = useState(null);   // { dayStr, events, rect } | null
  const [selectedDay, setSelectedDay] = useState(null); // { dayStr, events } | null — click modal

  const handleDayEnter = (e, dayStr, dayEvents) => {
    if (!dayEvents.length || selectedDay) return;
    setHoveredDay({ dayStr, events: dayEvents, rect: e.currentTarget.getBoundingClientRect() });
  };
  const handleDayLeave = () => setHoveredDay(null);

  const handleDayClick = (dayStr, dayEvents) => {
    if (!dayEvents.length) return;
    setHoveredDay(null);
    setSelectedDay({ dayStr, events: dayEvents });
  };
  const closeModal = () => setSelectedDay(null);

  // Close modal on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') closeModal(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // --- DATA FETCHING ---
  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("date", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Load anchor date (and optional end date) from admin settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'blueGoldCalendar'), (snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      if (data.anchorDate) setAnchorDate(data.anchorDate);
      if (data.endDate)    setBlueGoldEndDate(data.endDate);
    });
    return () => unsub();
  }, []);

  // --- CALENDAR MATH ---
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  // --- BLUE/GOLD ---
  // Dates marked as "No School" — the alternation skips these days
  const noSchoolDates = useMemo(
    () => new Set(events.filter(e => e.type === 'No School' && e.date).map(e => e.date)),
    [events]
  );

  // Map of day-of-month → 'blue' | 'gold' for the current month view.
  // Stops showing B/G labels after blueGoldEndDate (end of school year).
  const blueGoldMap = useMemo(() => {
    const map = new Map();
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    for (let day = 1; day <= daysInMonth; day++) {
      const dow = new Date(y, m, day).getDay();
      if (dow === 0 || dow === 5 || dow === 6) continue; // skip weekends + Fridays
      const ds = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (blueGoldEndDate && ds > blueGoldEndDate) continue; // after school year ends
      if (noSchoolDates.has(ds)) continue; // day off — no Blue/Gold
      const n = countSchoolDays(anchorDate, ds, noSchoolDates);
      if (n >= 0) map.set(day, n % 2 === 0 ? 'blue' : 'gold');
    }
    return map;
  }, [anchorDate, blueGoldEndDate, currentDate, daysInMonth, noSchoolDates]);

  // Today's Blue/Gold status for the header badge.
  // Returns null after blueGoldEndDate so the badge hides once school is out.
  const todayBlueGold = useMemo(() => {
    const today = new Date();
    const dow = today.getDay();
    if (dow === 0 || dow === 5 || dow === 6) return null; // no school: weekends + Fridays
    const ds = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    if (blueGoldEndDate && ds > blueGoldEndDate) return null;
    if (noSchoolDates.has(ds)) return null;
    const n = countSchoolDays(anchorDate, ds, noSchoolDates);
    return n >= 0 ? (n % 2 === 0 ? 'blue' : 'gold') : null;
  }, [anchorDate, blueGoldEndDate, noSchoolDates]);

  // --- CATEGORY FILTER ---
  // Unique categories present across ALL events (stable as months change)
  const activeTypes = [...new Set(events.map(e => e.type).filter(Boolean))].sort();

  // Events visible in the current month — includes multi-day events that span into it
  const monthEvents = useMemo(() => {
    const y = currentDate.getFullYear();
    const m = String(currentDate.getMonth() + 1).padStart(2, '0');
    const mStart = `${y}-${m}-01`;
    const mEnd   = `${y}-${m}-${String(daysInMonth).padStart(2, '0')}`;
    return events.filter(e => {
      if (!e.date) return false;
      const eventEnd = (e.endDate && e.endDate > e.date) ? e.endDate : e.date;
      return e.date <= mEnd && eventEnd >= mStart;
    });
  }, [events, currentDate, daysInMonth]);

  const visibleEvents = useMemo(
    () => selectedType ? monthEvents.filter(e => e.type === selectedType) : monthEvents,
    [monthEvents, selectedType]
  );

  return (
    /* pt-48 ensures clearance from global nav bar */
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-6 md:p-12 pt-48 font-sans transition-colors duration-300">
      <div className="max-w-6xl mx-auto mt-8">
        
        {/* HEADER SECTION */}
        <Reveal className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <Link to="/" className="text-slate-400 dark:text-slate-500 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-2 hover:text-yellow-600 dark:hover:text-yellow-500 transition-all">
              <ArrowLeft size={14} /> Back to Home
            </Link>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              <CalendarIcon className="text-yellow-600 dark:text-yellow-500" /> Battalion Schedule
            </h1>
          </div>

          <div className="flex flex-col items-end gap-3">
            {todayBlueGold && (
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                todayBlueGold === 'blue'
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
                  : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border-yellow-500/20'
              }`}>
                <div className={`w-2 h-2 rounded-full ${todayBlueGold === 'blue' ? 'bg-blue-500' : 'bg-yellow-500'}`} />
                Today is a {todayBlueGold === 'blue' ? 'Blue' : 'Gold'} Day
              </div>
            )}
            <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none">
              <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <ChevronLeft />
              </button>
              <h2 className="text-lg font-black uppercase italic min-w-[160px] text-center tracking-tight">
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white">
                <ChevronRight />
              </button>
            </div>
          </div>
        </Reveal>

        {/* CATEGORY FILTER BAR */}
        {activeTypes.length > 0 && (
          <Reveal className="mb-8">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setSelectedType(null)}
                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                  selectedType === null
                    ? 'bg-yellow-500 text-slate-950 border-yellow-500 shadow-md shadow-yellow-500/20'
                    : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-yellow-500/40'
                }`}
              >
                All Events
              </button>
              {activeTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setSelectedType(t => t === type ? null : type)}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${
                    selectedType === type
                      ? `${TYPE_COLORS[type] || TYPE_COLORS.Other} shadow-sm`
                      : 'bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </Reveal>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-8 items-start">

          {/* MAIN CALENDAR GRID */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/40 dark:shadow-none">
            <div className="grid grid-cols-7 mb-6">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em]">{d}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-3">
              {[...Array(firstDayOfMonth)].map((_, i) => <div key={`empty-${i}`} />)}
              
              {[...Array(daysInMonth)].map((_, i) => {
                const day = i + 1;
                const today = new Date();
                const y = currentDate.getFullYear();
                const m = currentDate.getMonth() + 1;
                const dayStr = `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

                const isToday =
                  day === today.getDate() &&
                  currentDate.getMonth() === today.getMonth() &&
                  currentDate.getFullYear() === today.getFullYear();

                const dayEvents = visibleEvents.filter(e => eventCoversDay(e, dayStr));
                const hasEvent  = dayEvents.length > 0;
                const dayCats   = [...new Set(dayEvents.map(e => e.type).filter(Boolean))];

                const baseCellStyle = isToday ? {} : cellStyle(dayCats);

                return (
                  <div
                    key={day}
                    style={baseCellStyle}
                    onMouseEnter={(e) => handleDayEnter(e, dayStr, dayEvents)}
                    onMouseLeave={handleDayLeave}
                    onClick={() => handleDayClick(dayStr, dayEvents)}
                    className={`aspect-square rounded-2xl border transition-colors duration-200 flex flex-col items-center justify-center relative group
                      ${hasEvent ? 'cursor-pointer' : ''}
                      ${isToday
                        ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]'
                        : hasEvent
                          ? 'border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20'
                          : 'border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20 hover:border-slate-300 dark:hover:border-white/10'
                      }`}
                  >
                    <span className={`text-sm font-black
                      ${isToday ? 'text-blue-600 dark:text-blue-400' : hasEvent ? 'text-slate-800 dark:text-white' : 'text-slate-300 dark:text-slate-600'}`}
                    >
                      {day}
                    </span>

                    {isToday && (
                      <span className="absolute top-2 text-[7px] font-black uppercase tracking-widest text-blue-500 animate-pulse">
                        Today
                      </span>
                    )}

                    {hasEvent && !isToday && dayCats.length > 0 && (
                      <div className="absolute bottom-1.5 flex gap-0.5">
                        {dayCats.slice(0, 3).map(cat => (
                          <div
                            key={cat}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: TYPE_CELL_HEX[cat] || '#64748b' }}
                          />
                        ))}
                      </div>
                    )}

                    {blueGoldMap.get(day) && (
                      <span className={`absolute top-1 left-1.5 text-[9px] font-black uppercase leading-none ${
                        blueGoldMap.get(day) === 'blue' ? 'text-blue-500' : 'text-yellow-500'
                      }`}>
                        {blueGoldMap.get(day) === 'blue' ? 'B' : 'G'}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SIDEBAR AGENDA */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Monthly Agenda</h3>
              <div className="h-px flex-1 bg-slate-200 dark:bg-white/5 ml-4" />
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {visibleEvents.map((event, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.05, 0.3) }}
                    key={event.id} 
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 p-6 rounded-[2rem] relative overflow-hidden group hover:border-yellow-500/30 transition-all shadow-lg shadow-slate-200/40 dark:shadow-none"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-600 dark:bg-yellow-500" />
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-[10px] font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-tighter">
                        {event.date}{event.endDate && event.endDate !== event.date ? ` – ${event.endDate}` : ''}
                      </p>
                      {event.type && (
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${TYPE_COLORS[event.type] || TYPE_COLORS.Other}`}>
                          <Tag size={8} /> {event.type}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-3 tracking-tight group-hover:text-yellow-600 dark:group-hover:text-yellow-500 transition-colors">
                      {event.title}
                    </h4>
                    <div className="space-y-2">
                      {event.location && (
                        <div className="flex items-center gap-2 text-slate-500">
                          <MapPin size={12} className="text-slate-400 dark:text-slate-600" />
                          <span className="text-[10px] font-bold uppercase truncate">{event.location}</span>
                        </div>
                      )}
                      {event.time && (
                        <div className="flex items-center gap-2 text-slate-500">
                          <Clock size={12} className="text-slate-400 dark:text-slate-600" />
                          <span className="text-[10px] font-bold uppercase">{event.time}</span>
                        </div>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                        {event.description}
                      </p>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {visibleEvents.length === 0 && (
                <div className="text-center py-24 bg-slate-100/50 dark:bg-transparent border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[3rem] text-slate-400 dark:text-slate-800 text-[10px] font-black uppercase tracking-widest">
                  {selectedType ? `No ${selectedType} events this month` : 'No Mission Entries'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── CLICK MODAL — full-screen overlay with full event details ── */}
      {createPortal(
        <>
          {selectedDay && (() => {
            const { dayStr, events: dayEvs } = selectedDay;
            const label = new Date(dayStr + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
            });
            return (
              <>
                {/* Backdrop — instant, no animation cost */}
                <div
                  onClick={closeModal}
                  className="fixed inset-0 bg-black/70 z-[9998]"
                />

                {/* Modal card — CSS keyframe, runs on compositor (no JS/frame) */}
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pointer-events-none">
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="modal-enter pointer-events-auto w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2rem] shadow-xl overflow-hidden"
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between gap-4 px-7 pt-7 pb-5 border-b border-slate-100 dark:border-white/5">
                      <div>
                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">
                          {dayEvs.length} {dayEvs.length === 1 ? 'Event' : 'Events'}
                        </p>
                        <h3 className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
                          {label}
                        </h3>
                      </div>
                      <button
                        onClick={closeModal}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all flex-shrink-0"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Event list */}
                    <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-[60vh] overflow-y-auto">
                      {dayEvs.map((ev) => (
                        <div key={ev.id} className="px-7 py-5 flex gap-4">
                          {/* Color bar */}
                          <div
                            className="w-1 rounded-full flex-shrink-0 self-stretch"
                            style={{ backgroundColor: TYPE_CELL_HEX[ev.type] || '#64748b' }}
                          />
                          <div className="flex-1 min-w-0">
                            {/* Type badge */}
                            {ev.type && (
                              <span
                                className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border mb-2"
                                style={{
                                  color: TYPE_CELL_HEX[ev.type] || '#64748b',
                                  borderColor: `${TYPE_CELL_HEX[ev.type] || '#64748b'}40`,
                                  backgroundColor: `${TYPE_CELL_HEX[ev.type] || '#64748b'}15`,
                                }}
                              >
                                <Tag size={7} /> {ev.type}
                              </span>
                            )}
                            <h4 className="font-black text-slate-900 dark:text-white tracking-tight leading-snug mb-2">
                              {ev.title}
                            </h4>
                            {/* Date range */}
                            <p className="text-[10px] font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-tight mb-2">
                              {ev.date}{ev.endDate && ev.endDate !== ev.date ? ` — ${ev.endDate}` : ''}
                            </p>
                            <div className="space-y-1.5">
                              {ev.time && (
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                  <Clock size={12} className="flex-shrink-0" />
                                  <span className="text-[11px] font-bold uppercase">{ev.time}</span>
                                </div>
                              )}
                              {ev.location && (
                                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                                  <MapPin size={12} className="flex-shrink-0" />
                                  <span className="text-[11px] font-bold uppercase">{ev.location}</span>
                                </div>
                              )}
                            </div>
                            {ev.description && (
                              <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-3 leading-relaxed">
                                {ev.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Footer hint */}
                    <div className="px-7 py-4 border-t border-slate-100 dark:border-white/5 text-center">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-300 dark:text-slate-700">
                        Press Esc or click outside to close
                      </p>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </>,
        document.body
      )}

      {/* ── HOVER TOOLTIP — rendered into document.body via portal so it's never clipped ── */}
      {createPortal(
        <AnimatePresence>
          {hoveredDay && (() => {
            const { dayStr, events, rect } = hoveredDay;
            const W = 230;
            const GAP = 10;
            // Center the tooltip on the cell, clamp to viewport edges
            let left = rect.left + rect.width / 2 - W / 2;
            left = Math.max(8, Math.min(left, window.innerWidth - W - 8));
            // Show above the cell if there's room (> 250px from top), else below
            const showAbove = rect.top > 250;
            const posStyle = showAbove
              ? { bottom: window.innerHeight - rect.top + GAP }
              : { top: rect.bottom + GAP };
            const label = new Date(dayStr + 'T00:00:00').toLocaleDateString('en-US', {
              weekday: 'short', month: 'short', day: 'numeric',
            });
            return (
              <motion.div
                key="cal-day-tooltip"
                initial={{ opacity: 0, scale: 0.95, y: showAbove ? 6 : -6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: showAbove ? 6 : -6 }}
                transition={{ duration: 0.14 }}
                style={{ position: 'fixed', left, width: W, zIndex: 9999, ...posStyle }}
                className="pointer-events-none bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl shadow-slate-300/30 dark:shadow-black/60 p-3"
              >
                {/* Date label */}
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 pb-2 border-b border-slate-100 dark:border-white/5">
                  {label}
                </p>

                {/* Event list */}
                <div className="space-y-2.5">
                  {events.map(ev => (
                    <div key={ev.id} className="flex gap-2 items-start">
                      {/* Color stripe */}
                      <div
                        className="w-[3px] rounded-full flex-shrink-0 self-stretch"
                        style={{ backgroundColor: TYPE_CELL_HEX[ev.type] || '#64748b' }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-black text-slate-900 dark:text-white leading-snug">{ev.title}</p>
                        <p className="text-[8px] font-black uppercase tracking-widest mt-0.5" style={{ color: TYPE_CELL_HEX[ev.type] || '#94a3b8' }}>
                          {ev.type}
                        </p>
                        {(ev.time || ev.location) && (
                          <div className="mt-1 space-y-0.5">
                            {ev.time && (
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                <Clock size={8} />{ev.time}
                              </p>
                            )}
                            {ev.location && (
                              <p className="text-[9px] text-slate-400 dark:text-slate-500 flex items-center gap-1 truncate">
                                <MapPin size={8} />{ev.location}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Arrow indicator */}
                <div
                  className={`absolute left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-white dark:bg-slate-900 border-slate-200 dark:border-white/10 rotate-45 ${
                    showAbove
                      ? 'bottom-[-5px] border-b border-r'
                      : 'top-[-5px] border-t border-l'
                  }`}
                  style={{ left: Math.min(Math.max(rect.left + rect.width / 2 - left, 16), W - 16) }}
                />
              </motion.div>
            );
          })()}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};

export default CalendarPage;