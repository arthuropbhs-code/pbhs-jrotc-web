// src/pages/AdminHonorCompany.jsx
//
// Private — Staff (70+) only.
// Quarterly Points tab: per-quarter points accumulator with audit trail.
// Org Day tab:          April 1st structured event scoring.

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc, setDoc, Timestamp,
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { ROLE_HIERARCHY, STAFF_LEVEL, ADMIN_LEVEL } from '../constants';
import {
  Trophy, Plus, X, Trash2, ChevronDown, ChevronUp, Loader2,
  ArrowLeft, Save, Medal, ClipboardList, Star, Settings,
  Timer, Users, Flag,
} from 'lucide-react';
import Footer from '../components/Footer';
import ScrambleText from '../components/ScrambleText';

// ─── Constants ────────────────────────────────────────────────────────────────

const COMPANIES = ['Uniform', 'Victor', 'Whiskey', 'X-Ray', 'Yankee'];
const QUARTERS  = ['Q1', 'Q2', 'Q3'];

const DEFAULT_CATEGORIES = {
  q1Categories: ['Late Info', 'Attendance', 'Cadets in Band', 'S4 Survey', 'Harvest Drive'],
  q2Categories: ['Late Info', 'Attendance', 'Flags', 'Medal of Honor 5k', 'Toy Drive'],
  q3Categories: ['Late Info', 'Attendance', 'Military Ball'],
};

const ORG_DAY_EVENTS = [
  {
    key: 'pt', label: 'PT', icon: Users,
    desc: 'Pushups + Situps — Male & Female',
    higherBetter: true,
    fields: [
      { key: 'malePushups',   label: 'Male PU',   type: 'number', min: 0 },
      { key: 'femalePushups', label: 'Female PU', type: 'number', min: 0 },
      { key: 'maleSitups',    label: 'Male SU',   type: 'number', min: 0 },
      { key: 'femaleSitups',  label: 'Female SU', type: 'number', min: 0 },
    ],
    getScore:    d => (Number(d?.malePushups)||0)+(Number(d?.femalePushups)||0)+(Number(d?.maleSitups)||0)+(Number(d?.femaleSitups)||0),
    formatScore: d => !d ? '–' : `${(Number(d.malePushups)||0)+(Number(d.femalePushups)||0)} PU / ${(Number(d.maleSitups)||0)+(Number(d.femaleSitups)||0)} SU`,
  },
  {
    key: 'squadDrill', label: 'Squad Drill', icon: Flag,
    desc: '25 commands — total score (max 250)',
    higherBetter: true,
    fields: [{ key: 'total', label: 'Total', type: 'number', min: 0, max: 250 }],
    getScore:    d => Number(d?.total) || 0,
    formatScore: d => d?.total ? `${d.total} / 250` : '–',
  },
  {
    key: 'colorGuard', label: 'Color Guard', icon: Flag,
    desc: '14 commands — total score (max 140)',
    higherBetter: true,
    fields: [{ key: 'total', label: 'Total', type: 'number', min: 0, max: 140 }],
    getScore:    d => Number(d?.total) || 0,
    formatScore: d => d?.total ? `${d.total} / 140` : '–',
  },
  {
    key: 'raiders', label: 'Raiders', icon: Timer,
    desc: '4 knots — Male & Female time (mm:ss, lower = better)',
    higherBetter: false,
    fields: [
      { key: 'maleTime',   label: 'Male',   type: 'text', placeholder: 'mm:ss' },
      { key: 'femaleTime', label: 'Female', type: 'text', placeholder: 'mm:ss' },
    ],
    getScore: d => {
      const m = parseTime(d?.maleTime), f = parseTime(d?.femaleTime);
      return (isFinite(m) && isFinite(f)) ? m + f : null;
    },
    formatScore: d => (d?.maleTime || d?.femaleTime) ? `M:${d?.maleTime||'–'} F:${d?.femaleTime||'–'}` : '–',
  },
  {
    key: 'obstacleCourse', label: 'Obstacle Course', icon: Timer,
    desc: 'Team time (mm:ss, lower = better)',
    higherBetter: false,
    fields: [{ key: 'time', label: 'Time', type: 'text', placeholder: 'mm:ss' }],
    getScore:    d => { const t = parseTime(d?.time); return isFinite(t) ? t : null; },
    formatScore: d => d?.time || '–',
  },
  {
    key: 'relayRace', label: 'Relay Race', icon: Timer,
    desc: 'Team time (mm:ss, lower = better)',
    higherBetter: false,
    fields: [{ key: 'time', label: 'Time', type: 'text', placeholder: 'mm:ss' }],
    getScore:    d => { const t = parseTime(d?.time); return isFinite(t) ? t : null; },
    formatScore: d => d?.time || '–',
  },
  {
    key: 'balloonSit', label: 'Balloon Sit', icon: Timer,
    desc: 'Duration (mm:ss, longer = better)',
    higherBetter: true,
    fields: [{ key: 'time', label: 'Duration', type: 'text', placeholder: 'mm:ss' }],
    getScore:    d => { const t = parseTime(d?.time); return isFinite(t) ? t : null; },
    formatScore: d => d?.time || '–',
  },
  {
    key: 'tugOfWar', label: 'Tug of War', icon: Trophy,
    desc: 'Bracket placement (1 = champion)',
    higherBetter: false,
    fields: [{ key: 'placement', label: 'Place (1–5)', type: 'number', min: 1, max: 5 }],
    getScore:    d => d?.placement ? Number(d.placement) : null,
    formatScore: d => d?.placement ? ordinal(Number(d.placement)) : '–',
  },
  {
    key: 'potatoSack', label: 'Potato Sack Race', icon: Timer,
    desc: 'Team time (mm:ss, lower = better)',
    higherBetter: false,
    fields: [{ key: 'time', label: 'Time', type: 'text', placeholder: 'mm:ss' }],
    getScore:    d => { const t = parseTime(d?.time); return isFinite(t) ? t : null; },
    formatScore: d => d?.time || '–',
  },
  {
    key: 'knockout', label: 'Knockout', icon: Star,
    desc: 'Points from individual placements',
    higherBetter: true,
    fields: [{ key: 'points', label: 'Points', type: 'number', min: 0 }],
    getScore:    d => Number(d?.points) || 0,
    formatScore: d => d?.points != null ? `${d.points} pts` : '–',
  },
  {
    key: 'aystal1', label: 'AYSTAL1', icon: Star,
    desc: 'Trivia competition points',
    higherBetter: true,
    fields: [{ key: 'points', label: 'Points', type: 'number', min: 0 }],
    getScore:    d => Number(d?.points) || 0,
    formatScore: d => d?.points != null ? `${d.points} pts` : '–',
  },
  {
    key: 'spirit', label: 'Spirit', icon: Star,
    desc: '4 sub-scores (1–10 each, max 40)',
    higherBetter: true,
    fields: [
      { key: 's1', label: 'Cheer',        type: 'number', min: 1, max: 10 },
      { key: 's2', label: 'Banner',        type: 'number', min: 1, max: 10 },
      { key: 's3', label: 'Uniform',       type: 'number', min: 1, max: 10 },
      { key: 's4', label: 'Participation', type: 'number', min: 1, max: 10 },
    ],
    getScore:    d => (Number(d?.s1)||0)+(Number(d?.s2)||0)+(Number(d?.s3)||0)+(Number(d?.s4)||0),
    formatScore: d => {
      if (!d) return '–';
      const t = (Number(d.s1)||0)+(Number(d.s2)||0)+(Number(d.s3)||0)+(Number(d.s4)||0);
      return t > 0 ? `${t} / 40` : '–';
    },
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const parseTime = str => {
  if (!str) return Infinity;
  const parts = String(str).split(':');
  if (parts.length === 2) return parseInt(parts[0], 10) * 60 + parseFloat(parts[1]);
  return parseFloat(str) || Infinity;
};

const ordinal = n => ['1st','2nd','3rd','4th','5th'][n-1] || `${n}th`;

function rankCompanies(companies, getScore, higherBetter) {
  const pairs = companies.map(co => ({ co, score: getScore(co) }));
  const valid   = pairs.filter(p => p.score !== null && isFinite(p.score));
  const missing = pairs.filter(p => !valid.includes(p));
  valid.sort((a, b) => higherBetter ? b.score - a.score : a.score - b.score);
  const n = companies.length;
  let i = 0;
  while (i < valid.length) {
    let j = i;
    while (j + 1 < valid.length && valid[j+1].score === valid[i].score) j++;
    const pts = n - i;
    for (let k = i; k <= j; k++) { valid[k].rank = i + 1; valid[k].points = pts; }
    i = j + 1;
  }
  missing.forEach(p => { p.rank = null; p.points = 0; });
  return [...valid, ...missing];
}

const MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };
const MEDAL_CLS = {
  1: 'text-yellow-500', 2: 'text-slate-400', 3: 'text-amber-600',
};

// ─── Component ────────────────────────────────────────────────────────────────

const AdminHonorCompany = () => {
  const { role, userData, loading: authLoading } = useAuth();
  const myLevel   = () => ROLE_HIERARCHY[role] || 0;
  const isAuth    = myLevel() >= STAFF_LEVEL;
  const canLog    = myLevel() >= STAFF_LEVEL;
  const canAdmin  = myLevel() >= ADMIN_LEVEL;

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab,     setActiveTab]     = useState('quarterly');
  const [quarter,       setQuarter]       = useState('Q1');
  const [orgYear,       setOrgYear]       = useState(new Date().getFullYear());

  // ── Firestore data ────────────────────────────────────────────────────────
  const [settings,    setSettings]    = useState(DEFAULT_CATEGORIES);
  const [entries,     setEntries]     = useState([]);
  const [orgDayData,  setOrgDayData]  = useState({});
  const [dataLoading, setDataLoading] = useState(true);

  // ── Log modal ─────────────────────────────────────────────────────────────
  const BLANK_LOG = { quarter: 'Q1', category: '', company: COMPANIES[0], points: '', notes: '' };
  const [logOpen,   setLogOpen]   = useState(false);
  const [logForm,   setLogForm]   = useState(BLANK_LOG);
  const [savingLog, setSavingLog] = useState(false);
  const [savedLog,  setSavedLog]  = useState(false);

  // ── Category management ───────────────────────────────────────────────────
  const [catInput,  setCatInput]  = useState('');
  const [savingCat, setSavingCat] = useState(false);
  const [catOpen,   setCatOpen]   = useState(false);

  // ── Org Day editing ───────────────────────────────────────────────────────
  const [expandedEvent, setExpandedEvent] = useState(null);
  const [eventDraft,    setEventDraft]    = useState({});
  const [savingEvent,   setSavingEvent]   = useState(false);
  const [savedEvent,    setSavedEvent]    = useState(false);

  // ── Audit trail ───────────────────────────────────────────────────────────
  const [auditOpen, setAuditOpen] = useState(false);

  // ── Subscriptions ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuth) return;
    const unsubs = [
      onSnapshot(doc(db, 'settings', 'honorCompany'), snap => {
        if (snap.exists()) {
          setSettings({ ...DEFAULT_CATEGORIES, ...snap.data() });
        } else {
          setDoc(doc(db, 'settings', 'honorCompany'), DEFAULT_CATEGORIES);
        }
        setDataLoading(false);
      }),
      onSnapshot(collection(db, 'honorCompanyEntries'), snap =>
        setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      ),
    ];
    return () => unsubs.forEach(u => u());
  }, [isAuth]);

  useEffect(() => {
    if (!isAuth) return;
    return onSnapshot(doc(db, 'settings', `orgDay_${orgYear}`), snap =>
      setOrgDayData(snap.exists() ? snap.data() : {})
    );
  }, [isAuth, orgYear]);

  // ── Derived — Quarterly ───────────────────────────────────────────────────
  const currentCategories = useMemo(() =>
    settings[`${quarter.toLowerCase()}Categories`] || [],
    [settings, quarter]
  );

  const quarterEntries = useMemo(() =>
    entries.filter(e => e.quarter === quarter),
    [entries, quarter]
  );

  const companyTotals = useMemo(() => {
    const t = Object.fromEntries(COMPANIES.map(co => [co, 0]));
    quarterEntries.forEach(e => { if (t[e.company] !== undefined) t[e.company] += Number(e.points) || 0; });
    return t;
  }, [quarterEntries]);

  const rankedCompanies = useMemo(() =>
    [...COMPANIES].sort((a, b) => companyTotals[b] - companyTotals[a]),
    [companyTotals]
  );

  // ── Derived — Org Day ─────────────────────────────────────────────────────
  const orgDayRankings = useMemo(() => {
    const byEvent = {};
    ORG_DAY_EVENTS.forEach(ev => {
      const eventData = orgDayData?.[ev.key] || {};
      byEvent[ev.key] = rankCompanies(COMPANIES, co => ev.getScore(eventData[co]), ev.higherBetter);
    });
    const totalPts = Object.fromEntries(COMPANIES.map(co => [co, 0]));
    Object.values(byEvent).forEach(ranked => ranked.forEach(({ co, points }) => { totalPts[co] += points || 0; }));
    const sortedFinal = [...COMPANIES].sort((a, b) => totalPts[b] - totalPts[a]);
    return { byEvent, totalPts, sortedFinal };
  }, [orgDayData]);

  // ── Handlers — Quarterly ──────────────────────────────────────────────────
  const submitLog = async () => {
    if (!logForm.category || !logForm.company || !logForm.points) return;
    setSavingLog(true);
    try {
      await addDoc(collection(db, 'honorCompanyEntries'), {
        quarter:      logForm.quarter,
        category:     logForm.category,
        company:      logForm.company,
        points:       Number(logForm.points),
        notes:        logForm.notes.trim(),
        loggedBy:     userData?.uid      || '',
        loggedByName: userData?.fullName || 'Unknown',
        loggedAt:     Timestamp.now(),
      });
      setSavedLog(true);
      setTimeout(() => { setLogOpen(false); setLogForm(BLANK_LOG); setSavedLog(false); }, 1600);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingLog(false);
    }
  };

  const deleteEntry = async id => {
    if (!canAdmin || !window.confirm('Delete this entry?')) return;
    await deleteDoc(doc(db, 'honorCompanyEntries', id));
  };

  const addCategory = async () => {
    const val = catInput.trim();
    if (!val || currentCategories.includes(val)) return;
    const key = `${quarter.toLowerCase()}Categories`;
    setSavingCat(true);
    await setDoc(doc(db, 'settings', 'honorCompany'), { [key]: [...currentCategories, val] }, { merge: true });
    setCatInput('');
    setSavingCat(false);
  };

  const removeCategory = async cat => {
    if (!canAdmin) return;
    const key = `${quarter.toLowerCase()}Categories`;
    await setDoc(doc(db, 'settings', 'honorCompany'), { [key]: currentCategories.filter(c => c !== cat) }, { merge: true });
  };

  // ── Handlers — Org Day ────────────────────────────────────────────────────
  const openEvent = evKey => {
    if (expandedEvent === evKey) { setExpandedEvent(null); return; }
    setExpandedEvent(evKey);
    const saved = orgDayData?.[evKey] || {};
    const draft = {};
    COMPANIES.forEach(co => { draft[co] = { ...(saved[co] || {}) }; });
    setEventDraft(draft);
    setSavedEvent(false);
  };

  const saveEvent = async () => {
    if (!expandedEvent) return;
    setSavingEvent(true);
    try {
      await setDoc(
        doc(db, 'settings', `orgDay_${orgYear}`),
        { year: orgYear, [expandedEvent]: eventDraft },
        { merge: true }
      );
      setSavedEvent(true);
      setTimeout(() => setSavedEvent(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setSavingEvent(false);
    }
  };

  const setDraftField = (co, field, val) =>
    setEventDraft(d => ({ ...d, [co]: { ...(d[co] || {}), [field]: val } }));

  // ── Guards ────────────────────────────────────────────────────────────────
  if (authLoading || (dataLoading && isAuth)) {
    return <div className="min-h-screen flex items-center justify-center text-yellow-600"><Loader2 className="animate-spin" size={32} /></div>;
  }
  if (!isAuth) return <Navigate to="/admin/dashboard" />;

  // ─────────────────────────────────────────────────────────────────────────
  const maxTotal = Math.max(1, ...Object.values(companyTotals));
  const maxOrgTotal = Math.max(1, ...Object.values(orgDayRankings.totalPts));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-6 md:p-10 pt-24 font-sans transition-colors duration-300">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <Link to="/admin/dashboard" className="text-slate-400 hover:text-yellow-600 dark:text-slate-500 dark:hover:text-yellow-500 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-4">
            <ArrowLeft size={14} /> Back to Command
          </Link>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
            <Trophy className="text-yellow-600 dark:text-yellow-500" />
            <ScrambleText text="Honor Company" trigger="mount" />
          </h1>
          <p className="text-[10px] font-black uppercase tracking-widest text-red-500/70 mt-2">🔒 Private — Staff only</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'quarterly', label: 'Quarterly Points', icon: ClipboardList },
            { key: 'orgday',    label: 'Org Day',          icon: Medal },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                activeTab === key
                  ? 'bg-yellow-500 text-slate-950 shadow-md shadow-yellow-500/20'
                  : 'bg-white dark:bg-slate-900/40 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-white/5 hover:text-yellow-600 dark:hover:text-yellow-500'
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* ═══ QUARTERLY TAB ══════════════════════════════════════════════ */}
        {activeTab === 'quarterly' && (
          <div className="space-y-5">

            {/* Controls */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex gap-2">
                {QUARTERS.map(q => (
                  <button key={q} onClick={() => setQuarter(q)}
                    className={`px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                      quarter === q
                        ? 'bg-yellow-500 text-slate-950'
                        : 'bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 text-slate-400 hover:border-yellow-500/30'
                    }`}
                  >{q}</button>
                ))}
              </div>
              {canLog && (
                <button
                  onClick={() => { setLogForm({ ...BLANK_LOG, quarter }); setLogOpen(true); setSavedLog(false); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-[10px] font-black uppercase tracking-widest transition-colors shadow-md shadow-yellow-500/20"
                >
                  <Plus size={13} /> Log Points
                </button>
              )}
            </div>

            {/* Scoreboard */}
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl p-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-500 flex items-center gap-2 mb-5">
                <Trophy size={13} /> {quarter} Scoreboard
              </h3>
              <div className="space-y-3">
                {rankedCompanies.map((co, idx) => {
                  const rank = idx + 1;
                  return (
                    <div key={co} className="flex items-center gap-3">
                      <span className={`w-6 text-center text-sm font-black ${MEDAL_CLS[rank] || 'text-slate-400'}`}>
                        {MEDAL[rank] || rank}
                      </span>
                      <span className="w-20 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">{co}</span>
                      <div className="flex-1 h-5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                          style={{ width: `${(companyTotals[co] / maxTotal) * 100}%` }} />
                      </div>
                      <span className="w-8 text-right text-sm font-black text-slate-900 dark:text-white">{companyTotals[co]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Category management (admin) */}
            {canAdmin && (
              <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl">
                <button onClick={() => setCatOpen(o => !o)}
                  className="w-full flex items-center justify-between px-6 py-4 text-left">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                    <Settings size={13} /> {quarter} Categories
                  </span>
                  {catOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
                </button>
                {catOpen && (
                  <div className="px-6 pb-5">
                    <div className="flex flex-wrap gap-2 mb-3">
                      {currentCategories.length === 0 && (
                        <p className="text-xs italic text-slate-400">No categories — add one below.</p>
                      )}
                      {currentCategories.map(cat => (
                        <span key={cat} className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 rounded-lg px-3 py-1.5 text-[10px] font-black uppercase">
                          {cat}
                          <button onClick={() => removeCategory(cat)} className="text-slate-400 hover:text-red-500 transition-colors">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={catInput}
                        onChange={e => setCatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && addCategory()}
                        placeholder="New category…"
                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-yellow-500/40 transition-colors"
                      />
                      <button onClick={addCategory} disabled={savingCat || !catInput.trim()}
                        className="px-3 py-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded-xl text-[10px] font-black uppercase disabled:opacity-50 transition-colors">
                        {savingCat ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Audit trail */}
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl">
              <button onClick={() => setAuditOpen(o => !o)}
                className="w-full flex items-center justify-between px-6 py-4 text-left">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                  <ClipboardList size={13} /> {quarter} Entries ({quarterEntries.length})
                </span>
                {auditOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
              </button>
              {auditOpen && (
                <div className="pb-2 overflow-x-auto">
                  {quarterEntries.length === 0 ? (
                    <p className="text-center text-xs italic text-slate-400 py-6">No entries for {quarter} yet.</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 dark:border-white/5">
                          {['Company','Category','Pts','Logged By','Date','Notes',''].map(h => (
                            <th key={h} className="text-left px-4 py-2 text-[9px] font-black uppercase text-slate-400 dark:text-slate-600">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...quarterEntries].sort((a,b) => (b.loggedAt?.seconds||0)-(a.loggedAt?.seconds||0)).map(e => (
                          <tr key={e.id} className="border-b border-slate-50 dark:border-white/[0.03] hover:bg-slate-50 dark:hover:bg-white/[0.02]">
                            <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-white">{e.company}</td>
                            <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{e.category}</td>
                            <td className="px-4 py-2.5 font-black text-yellow-600 dark:text-yellow-500">{e.points}</td>
                            <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">{e.loggedByName}</td>
                            <td className="px-4 py-2.5 text-slate-400 dark:text-slate-600 whitespace-nowrap">
                              {e.loggedAt?.toDate ? e.loggedAt.toDate().toLocaleDateString() : '–'}
                            </td>
                            <td className="px-4 py-2.5 text-slate-400 italic max-w-[10rem] truncate">{e.notes || '–'}</td>
                            <td className="px-4 py-2.5">
                              {canAdmin && (
                                <button onClick={() => deleteEntry(e.id)}
                                  className="text-slate-300 dark:text-slate-700 hover:text-red-500 dark:hover:text-red-400 transition-colors">
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══ ORG DAY TAB ════════════════════════════════════════════════ */}
        {activeTab === 'orgday' && (
          <div className="space-y-5">

            {/* Year + meta */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Year</span>
                <select value={orgYear} onChange={e => setOrgYear(Number(e.target.value))}
                  className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-yellow-500/40 transition-colors">
                  {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <p className="text-[10px] font-black uppercase text-slate-400">
                April 1 · {COMPANIES.length} Companies · {ORG_DAY_EVENTS.length} Events
              </p>
            </div>

            {/* Final standings */}
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl p-6">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-500 flex items-center gap-2 mb-5">
                <Medal size={13} /> {orgYear} Org Day Standings
              </h3>
              <div className="space-y-3">
                {orgDayRankings.sortedFinal.map((co, idx) => {
                  const rank = idx + 1;
                  const total = orgDayRankings.totalPts[co];
                  return (
                    <div key={co} className="flex items-center gap-3">
                      <span className={`w-6 text-center text-sm font-black ${MEDAL_CLS[rank] || 'text-slate-400'}`}>
                        {MEDAL[rank] || rank}
                      </span>
                      <span className="w-20 text-[10px] font-black uppercase text-slate-600 dark:text-slate-400">{co}</span>
                      <div className="flex-1 h-5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                          style={{ width: `${(total / maxOrgTotal) * 100}%` }} />
                      </div>
                      <span className="w-14 text-right text-sm font-black text-slate-900 dark:text-white">{total} pts</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Event cards grid */}
            <div className="grid md:grid-cols-2 gap-4">
              {ORG_DAY_EVENTS.map(ev => {
                const isOpen = expandedEvent === ev.key;
                const Icon   = ev.icon;
                const eventRankings = orgDayRankings.byEvent[ev.key] || [];
                const hasData = COMPANIES.some(co => {
                  const d = orgDayData?.[ev.key]?.[co];
                  return d && Object.values(d).some(v => v !== '' && v !== undefined && v !== 0 && v != null);
                });

                return (
                  <div key={ev.key} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden">

                    {/* Card header */}
                    <button onClick={() => canLog && openEvent(ev.key)}
                      className={`w-full flex items-center justify-between px-5 py-4 text-left transition-colors ${canLog ? 'hover:bg-slate-50 dark:hover:bg-white/[0.02]' : ''}`}>
                      <div className="flex items-center gap-3">
                        <Icon size={16} className={hasData ? 'text-yellow-500' : 'text-slate-300 dark:text-slate-700'} />
                        <div>
                          <p className="text-xs font-black uppercase text-slate-900 dark:text-white">{ev.label}</p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">{ev.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {hasData && <span className="text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-lg">Scored</span>}
                        {canLog && (isOpen ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />)}
                      </div>
                    </button>

                    {/* Collapsed summary */}
                    {!isOpen && hasData && (
                      <div className="px-5 pb-4 grid grid-cols-5 gap-1">
                        {eventRankings.map(({ co, points, rank }) => (
                          <div key={co} className="text-center">
                            <div className="text-xs">{MEDAL[rank] || rank}</div>
                            <div className="text-[8px] uppercase font-bold text-slate-400">{co.slice(0,3)}</div>
                            <div className="text-[9px] font-black text-yellow-600 dark:text-yellow-500">{points}p</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Expanded input form */}
                    {isOpen && canLog && (
                      <div className="border-t border-slate-100 dark:border-white/5 px-5 py-4 space-y-4">
                        {COMPANIES.map(co => (
                          <div key={co}>
                            <p className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 mb-2">{co}</p>
                            <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${ev.fields.length}, 1fr)` }}>
                              {ev.fields.map(field => (
                                <div key={field.key}>
                                  <label className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-600 block mb-1">{field.label}</label>
                                  <input
                                    type={field.type === 'text' ? 'text' : 'number'}
                                    placeholder={field.placeholder || '0'}
                                    min={field.min}
                                    max={field.max}
                                    value={eventDraft[co]?.[field.key] ?? ''}
                                    onChange={e => setDraftField(co, field.key, e.target.value)}
                                    onKeyDown={e => e.stopPropagation()}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus:border-yellow-500/40 transition-colors"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        <div className="flex gap-2 pt-1">
                          <button onClick={saveEvent} disabled={savingEvent}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50 ${
                              savedEvent ? 'bg-emerald-500 text-white' : 'bg-yellow-500 hover:bg-yellow-400 text-slate-950'
                            }`}>
                            {savingEvent ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                            {savedEvent ? 'Saved ✓' : 'Save Event'}
                          </button>
                          <button onClick={() => setExpandedEvent(null)}
                            className="px-4 py-2 rounded-xl text-[10px] font-black uppercase bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors">
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ═══ LOG MODAL ══════════════════════════════════════════════════════ */}
      {logOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-white/5">
            <div className="flex items-center justify-between px-6 pt-6 pb-0 mb-5">
              <h2 className="text-sm font-black uppercase italic text-slate-900 dark:text-white flex items-center gap-2">
                <Plus size={15} className="text-yellow-500" /> Log Points
              </h2>
              <button onClick={() => setLogOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X size={16} />
              </button>
            </div>

            {savedLog ? (
              <div className="px-6 pb-6 text-center py-8">
                <div className="text-4xl mb-3">🏆</div>
                <p className="font-black uppercase text-slate-900 dark:text-white">Points Logged!</p>
              </div>
            ) : (
              <div className="px-6 pb-6 space-y-4">
                {/* Quarter */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Quarter *</label>
                  <div className="flex gap-2">
                    {QUARTERS.map(q => (
                      <button key={q} onClick={() => setLogForm(f => ({ ...f, quarter: q, category: '' }))}
                        className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase border transition-all ${
                          logForm.quarter === q
                            ? 'bg-yellow-500 text-slate-950 border-yellow-500'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-white/5 hover:border-yellow-500/30'
                        }`}>{q}</button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Category *</label>
                  <select value={logForm.category} onChange={e => setLogForm(f => ({ ...f, category: e.target.value }))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-yellow-500/40 transition-colors">
                    <option value="">Select category…</option>
                    {(settings[`${logForm.quarter.toLowerCase()}Categories`] || []).map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Company */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Company *</label>
                  <div className="flex flex-wrap gap-1.5">
                    {COMPANIES.map(co => (
                      <button key={co} onClick={() => setLogForm(f => ({ ...f, company: co }))}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${
                          logForm.company === co
                            ? 'bg-yellow-500 text-slate-950 border-yellow-500'
                            : 'bg-slate-50 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-white/5 hover:border-yellow-500/30'
                        }`}>{co.slice(0,3)}</button>
                    ))}
                  </div>
                </div>

                {/* Points */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Points *</label>
                  <input type="number" min="0" value={logForm.points}
                    onChange={e => setLogForm(f => ({ ...f, points: e.target.value }))}
                    onKeyDown={e => e.stopPropagation()}
                    placeholder="0"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-yellow-500/40 transition-colors"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1.5">Notes (optional)</label>
                  <input type="text" value={logForm.notes}
                    onChange={e => setLogForm(f => ({ ...f, notes: e.target.value }))}
                    onKeyDown={e => e.stopPropagation()}
                    placeholder="e.g. Won by 2 votes"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl px-3 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-yellow-500/40 transition-colors"
                  />
                </div>

                <button onClick={submitLog}
                  disabled={savingLog || !logForm.category || !logForm.company || !logForm.points}
                  className="w-full py-3 rounded-xl text-sm font-black uppercase bg-yellow-500 hover:bg-yellow-400 text-slate-950 disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                  {savingLog ? <Loader2 size={14} className="animate-spin" /> : <Trophy size={14} />}
                  {savingLog ? 'Saving…' : 'Submit'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AdminHonorCompany;
