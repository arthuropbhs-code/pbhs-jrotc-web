// src/pages/AdminCadetChallenge.jsx
//
// Cadet Challenge physical fitness records — cycle-based management.
//
// Three cycles per year (#1, #2, #3). Each cycle tracks per-company status:
//   open → submitted (finalized by company S1 assistant) → locked (verified by Bn S1)
//
// Events:  Push-Ups (int), Sit-Ups (int), Shuttle Run (decimal sec),
//          One Mile (MM:SS string), Sit-N-Reach (decimal cm)
// Medical exemption checkbox per cadet — no reason required.
//
// Role access matrix:
//   INPUT  : company_s1_assistant, company_s3_assistant,
//             company_xo, company_1sg, company_commander  (own company only)
//   FINALIZE: company_s1_assistant  (own company, cycle must be open)
//   VIEW company: all INPUT roles + s1_adjutant (their company) + own records for cadets
//   VIEW all: s1_adjutant, s3_operations, battalion_xo, battalion_commander,
//             battalion_csm, sergeant_major, senior_army_instructor, army_instructor
//   UNLOCK/SEND-BACK: s1_adjutant only

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db, auth } from '../firebase';
import {
  collection, doc, setDoc, getDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, where, serverTimestamp, getDocs,
} from 'firebase/firestore';
import { getIdToken } from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import { useCompanies } from '../hooks/useCompanies';
import { ROLE_HIERARCHY, ROLE_LABELS } from '../constants';
import {
  Activity, Plus, Trash2, Edit3, X, Loader2, CheckCircle2,
  Lock, Unlock, RotateCcw, Send, AlertTriangle, Shield,
  ChevronDown, Filter, User, ClipboardList, LayoutGrid,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Footer from '../components/Footer';
import ScrambleText from '../components/ScrambleText';

// ── Constants ──────────────────────────────────────────────────────────────────

const CYCLES = [1, 2, 3];

// Roles that can input records (all company-level)
const INPUT_ROLES = [
  'company_s1_assistant', 'company_s3_assistant',
  'company_xo', 'company_1sg', 'company_commander',
];

// Only company S1 assistants can finalize
const FINALIZE_ROLE = 'company_s1_assistant';

// Battalion-level roles that can see all companies
const VIEW_ALL_ROLES = [
  's1_adjutant', 's3_operations', 'battalion_xo',
  'battalion_commander', 'battalion_csm', 'sergeant_major',
  'senior_army_instructor', 'army_instructor',
];

// Only Battalion S1 can unlock / send back
const UNLOCK_ROLE = 's1_adjutant';

const STAFF_LEVEL  = 70;
const COMMAND_LEVEL = 45;

// ── Helpers ────────────────────────────────────────────────────────────────────

const ic = 'w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-3 rounded-xl outline-none focus:border-yellow-500 text-sm font-bold text-slate-900 dark:text-white transition-all';
const lc = 'text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 block mb-1 tracking-widest';

const EMPTY_FORM = {
  cadetId: '', cadetName: '',
  pushUps: '', sitUps: '',
  shuttleRun: '', oneMile: '', sitNReach: '',
  medicalExempt: false,
};

function cycleKey(company, cycleNum) { return `${company}_${cycleNum}`; }

function statusColor(status) {
  if (status === 'locked')    return 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20';
  if (status === 'submitted') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
  return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20';
}

function statusLabel(status) {
  if (status === 'locked')    return '✓ Locked';
  if (status === 'submitted') return '⏳ Submitted';
  return '✎ Open';
}

// ── Main component ─────────────────────────────────────────────────────────────

const AdminCadetChallenge = () => {
  const { user, userData, role, loading: authLoading } = useAuth();
  const { companies } = useCompanies();

  const userLevel   = ROLE_HIERARCHY[role] || 0;
  const canViewAll  = VIEW_ALL_ROLES.includes(role) || userLevel >= STAFF_LEVEL;
  const canInput    = INPUT_ROLES.includes(role) || userLevel >= COMMAND_LEVEL;
  const canFinalize = role === FINALIZE_ROLE;
  const canUnlock   = role === UNLOCK_ROLE;
  const myCompany   = userData?.company || '';

  // Which companies to display
  const visibleCompanies = canViewAll ? companies : (myCompany ? [myCompany] : []);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [selectedCycle,   setSelectedCycle]   = useState(1);
  const [viewMode,        setViewMode]         = useState('table');    // 'table' | 'individual'
  const [filterCompany,   setFilterCompany]    = useState('');         // staff filter
  const [showModal,       setShowModal]        = useState(false);
  const [editingRecord,   setEditingRecord]    = useState(null);       // { id, ...record } or null
  const [form,            setForm]             = useState(EMPTY_FORM);
  const [saving,          setSaving]           = useState(false);
  const [deleteConf,      setDeleteConf]       = useState(null);
  const [toast,           setToast]            = useState(null);
  const [finalizeConf,    setFinalizeConf]     = useState(null);       // company name
  const [finalizing,      setFinalizing]       = useState(false);
  const [sendBackConf,    setSendBackConf]     = useState(null);       // { company }
  const [sendBackNote,    setSendBackNote]     = useState('');
  const [sendingBack,     setSendingBack]      = useState(false);

  // ── Data ────────────────────────────────────────────────────────────────────
  const [cycleStatuses, setCycleStatuses]   = useState({});   // { "Alpha_1": { status, ... } }
  const [records,       setRecords]         = useState([]);   // primary-company records for selected cycle
  const [bnRecordsRaw,  setBnRecordsRaw]    = useState([]);   // ALL cycles' records for battalion members who observe myCompany
  const [cadets,        setCadets]          = useState([]);   // primary-company roster members
  const [bnCadets,      setBnCadets]        = useState([]);   // battalion members whose secondaryCompany == target
  const [dataLoading,   setDataLoading]     = useState(true);

  // The active company for queries (staff filter, or the user's own company)
  const targetCompany = filterCompany || myCompany;

  // Merge primary cadets + battalion observers, deduped by uid, sorted by name
  const allCadets = useMemo(() => {
    const seen = new Set(cadets.map(c => c.uid));
    return [...cadets, ...bnCadets.filter(c => !seen.has(c.uid))]
      .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || ''));
  }, [cadets, bnCadets]);

  // Cycle-filtered battalion-member records, merged with primary records, deduped by id
  const allRecords = useMemo(() => {
    const bnFiltered = bnRecordsRaw.filter(r => r.cycleNumber === selectedCycle);
    const seen = new Set(records.map(r => r.id));
    return [...records, ...bnFiltered.filter(r => !seen.has(r.id))];
  }, [records, bnRecordsRaw, selectedCycle]);

  // Subscribe to cycle status docs for the selected cycle
  useEffect(() => {
    if (authLoading || !visibleCompanies.length) { setDataLoading(false); return; }

    const unsubs = visibleCompanies.map(company => {
      const key = cycleKey(company, selectedCycle);
      const docRef = doc(db, 'cadetChallengeCycles', key);
      return onSnapshot(docRef, snap => {
        setCycleStatuses(prev => ({
          ...prev,
          [key]: snap.exists() ? { status: 'open', ...snap.data() } : { status: 'open' },
        }));
      });
    });

    return () => unsubs.forEach(u => u());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, selectedCycle, companies.join(','), canViewAll, myCompany]);

  // Subscribe to records for the selected cycle
  useEffect(() => {
    if (authLoading) return;
    setDataLoading(true);

    let q;
    if (canViewAll) {
      q = query(
        collection(db, 'cadetChallengeRecords'),
        where('cycleNumber', '==', selectedCycle),
        orderBy('cadetName', 'asc'),
      );
    } else if (canInput && myCompany) {
      q = query(
        collection(db, 'cadetChallengeRecords'),
        where('cycleNumber', '==', selectedCycle),
        where('company', '==', myCompany),
        orderBy('cadetName', 'asc'),
      );
    } else {
      setRecords([]);
      setDataLoading(false);
      return;
    }

    const unsub = onSnapshot(q, snap => {
      setRecords(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setDataLoading(false);
    }, () => setDataLoading(false));

    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, selectedCycle, role, myCompany]);

  // Load cadets for company from the Roster (source of truth for all cadets,
  // regardless of whether they have a portal account). Using roster instead
  // of the users collection means every cadet in the company appears in the
  // table — not just those who have signed up to the portal.
  useEffect(() => {
    if (!myCompany && !canViewAll) return;
    if (!targetCompany) { setCadets([]); return; }

    const q = query(
      collection(db, 'roster'),
      where('company', '==', targetCompany),
      orderBy('fullName', 'asc'),
    );
    const unsub = onSnapshot(q, snap => {
      // Use the roster doc ID as `uid` so the rest of the component
      // (record keying, quick-save, medical toggle) works unchanged.
      setCadets(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [myCompany, canViewAll, filterCompany, targetCompany]);

  // Load battalion members who observe the target company (secondaryCompany match).
  // These cadets appear in BOTH their primary company tab AND this secondary tab.
  useEffect(() => {
    if (!targetCompany) { setBnCadets([]); return; }

    const q = query(
      collection(db, 'roster'),
      where('secondaryCompany', '==', targetCompany),
      orderBy('fullName', 'asc'),
    );
    const unsub = onSnapshot(q, snap => {
      setBnCadets(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    }, () => setBnCadets([]));
    return () => unsub();
  }, [targetCompany]);

  // Load ALL-cycles records for battalion members who observe myCompany.
  // This is needed so company S1 assistants can see/edit battalion observers' records
  // even though those records are stored under the battalion member's primary company.
  // Only runs for company-level users (canInput && !canViewAll) because canViewAll
  // users already get all records in the primary records subscription above.
  useEffect(() => {
    if (!myCompany || canViewAll || !canInput) { setBnRecordsRaw([]); return; }

    const q = query(
      collection(db, 'cadetChallengeRecords'),
      where('secondaryCompany', '==', myCompany),
    );
    const unsub = onSnapshot(q, snap => {
      setBnRecordsRaw(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => setBnRecordsRaw([]));
    return () => unsub();
  }, [myCompany, canViewAll, canInput]);

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Modal helpers ─────────────────────────────────────────────────────────────
  const openCreate = (cadetUid = '', cadetName = '') => {
    setForm({
      ...EMPTY_FORM,
      cadetId: cadetUid,
      cadetName,
    });
    setEditingRecord(null);
    setShowModal(true);
  };

  const openEdit = (rec) => {
    setForm({
      cadetId:      rec.cadetId      || '',
      cadetName:    rec.cadetName    || '',
      pushUps:      rec.pushUps      ?? '',
      sitUps:       rec.sitUps       ?? '',
      shuttleRun:   rec.shuttleRun   ?? '',
      oneMile:      rec.oneMile      || '',
      sitNReach:    rec.sitNReach    ?? '',
      medicalExempt: rec.medicalExempt || false,
    });
    setEditingRecord(rec);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingRecord(null); setForm(EMPTY_FORM); };

  // ── Current company for forms ────────────────────────────────────────────────
  const activeCompany = filterCompany || myCompany;
  const activeKey     = cycleKey(activeCompany, selectedCycle);
  const activeCycle   = cycleStatuses[activeKey] || { status: 'open' };
  const isLocked      = activeCycle.status === 'locked';
  const isSubmitted   = activeCycle.status === 'submitted';
  const canEdit       = canInput && !isLocked && !(isSubmitted && !canUnlock);

  // Records for the currently viewed company.
  // Include records where the cadet's PRIMARY company matches (normal case) OR
  // where secondaryCompany matches (battalion members observing this company).
  const companyRecords = useMemo(() => {
    if (canViewAll && !filterCompany) return allRecords;
    return allRecords.filter(r =>
      r.company === activeCompany || r.secondaryCompany === activeCompany
    );
  }, [allRecords, activeCompany, canViewAll, filterCompany]);

  // Map cadetId → record for table view
  const recordMap = useMemo(() => {
    const map = {};
    companyRecords.forEach(r => { if (r.cadetId) map[r.cadetId] = r; });
    return map;
  }, [companyRecords]);

  // ── Save record ───────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.cadetName.trim() && !form.cadetId) { showToast('Select or enter a cadet name.'); return; }
    if (!activeCompany) { showToast('Company not determined.'); return; }
    setSaving(true);
    try {
      // If the selected cadet is a battalion member (has a secondaryCompany in their
      // roster record), the record is stored under their PRIMARY company — not the
      // company currently being viewed. This keeps one canonical record per cadet per
      // cycle while still making it visible from the secondary-company tab.
      const cadetRosterEntry = allCadets.find(c => c.uid === form.cadetId);
      const recordCompany    = cadetRosterEntry?.company || activeCompany;
      const secondaryCompany = cadetRosterEntry?.secondaryCompany || null;

      const payload = {
        company:          recordCompany,
        ...(secondaryCompany ? { secondaryCompany } : {}),
        cycleNumber:      selectedCycle,
        cadetId:          form.cadetId   || 'manual',
        cadetName:        form.cadetName.trim(),
        pushUps:       form.medicalExempt ? null : (form.pushUps   !== '' ? Number(form.pushUps)   : null),
        sitUps:        form.medicalExempt ? null : (form.sitUps    !== '' ? Number(form.sitUps)    : null),
        shuttleRun:    form.medicalExempt ? null : (form.shuttleRun !== '' ? parseFloat(form.shuttleRun) : null),
        oneMile:       form.medicalExempt ? null : (form.oneMile.trim()  || null),
        sitNReach:     form.medicalExempt ? null : (form.sitNReach !== '' ? parseFloat(form.sitNReach) : null),
        medicalExempt: form.medicalExempt,
        enteredByUid:  user.uid,
        enteredByName: userData?.fullName || '',
        updatedAt:     serverTimestamp(),
      };

      if (editingRecord) {
        await updateDoc(doc(db, 'cadetChallengeRecords', editingRecord.id), payload);
        showToast('Record updated');
      } else {
        // Use cadetId as doc ID if available (prevents duplicates per cadet per cycle).
        // Use the cadet's primary company in the docId so battalion members always
        // map to the same doc regardless of which company tab triggered the save.
        const docId = form.cadetId && form.cadetId !== 'manual'
          ? `${recordCompany}_${selectedCycle}_${form.cadetId}`
          : `${recordCompany}_${selectedCycle}_${Date.now()}`;
        await setDoc(doc(db, 'cadetChallengeRecords', docId), {
          ...payload, createdAt: serverTimestamp(),
        }, { merge: true });
        showToast('Record saved');
      }
      closeModal();
    } catch (err) {
      console.error(err);
      showToast('Save failed — try again');
    } finally {
      setSaving(false);
    }
  };

  // Quick-save from table view (inline edit of one field)
  const handleQuickSave = async (cadet, field, value) => {
    const existing = recordMap[cadet.uid];
    // Battalion members have cadet.company = their primary company and
    // cadet.secondaryCompany = the company being viewed. Store records under
    // the primary company so there's one canonical doc per cadet per cycle.
    const recordCompany    = cadet.company || activeCompany;
    const secondaryCompany = cadet.secondaryCompany || null;
    const docId            = `${recordCompany}_${selectedCycle}_${cadet.uid}`;
    try {
      const update = {
        company: recordCompany,
        ...(secondaryCompany ? { secondaryCompany } : {}),
        cycleNumber: selectedCycle,
        cadetId: cadet.uid, cadetName: cadet.fullName,
        enteredByUid: user.uid, enteredByName: userData?.fullName || '',
        updatedAt: serverTimestamp(),
        [field]: value,
      };
      if (!existing) update.createdAt = serverTimestamp();
      await setDoc(doc(db, 'cadetChallengeRecords', docId), update, { merge: true });
    } catch (err) {
      showToast('Save failed');
      console.error(err);
    }
  };

  const handleMedicalToggle = async (cadet) => {
    const recordCompany    = cadet.company || activeCompany;
    const secondaryCompany = cadet.secondaryCompany || null;
    const docId            = `${recordCompany}_${selectedCycle}_${cadet.uid}`;
    const current          = recordMap[cadet.uid]?.medicalExempt || false;
    try {
      await setDoc(doc(db, 'cadetChallengeRecords', docId), {
        company: recordCompany,
        ...(secondaryCompany ? { secondaryCompany } : {}),
        cycleNumber: selectedCycle,
        cadetId: cadet.uid, cadetName: cadet.fullName,
        medicalExempt: !current,
        enteredByUid: user.uid, enteredByName: userData?.fullName || '',
        updatedAt: serverTimestamp(),
      }, { merge: true });
    } catch { showToast('Toggle failed'); }
  };

  const handleDelete = async () => {
    if (!deleteConf) return;
    try {
      await deleteDoc(doc(db, 'cadetChallengeRecords', deleteConf.id));
      setDeleteConf(null);
      showToast('Record deleted');
    } catch { showToast('Delete failed'); }
  };

  // ── Finalize cycle ────────────────────────────────────────────────────────────
  const handleFinalize = async () => {
    if (!finalizeConf) return;
    setFinalizing(true);
    try {
      // Update cycle status
      await setDoc(doc(db, 'cadetChallengeCycles', cycleKey(activeCompany, selectedCycle)), {
        company: activeCompany, cycleNumber: selectedCycle,
        status: 'submitted',
        submittedBy: userData?.fullName || '',
        submittedByUid: user.uid,
        submittedAt: serverTimestamp(),
      }, { merge: true });

      // Email notification
      const idToken = await getIdToken(auth.currentUser);
      const res = await fetch('/api/notify-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'finalize', idToken,
          cycleNumber: selectedCycle,
          company: activeCompany,
          submitterName: userData?.fullName || '',
        }),
      });
      const data = await res.json();
      setFinalizeConf(null);
      showToast(`Cycle #${selectedCycle} submitted — ${data.sent || 0} notifications sent`);
    } catch (err) {
      console.error(err);
      showToast('Finalize failed — try again');
    } finally {
      setFinalizing(false);
    }
  };

  // ── Unlock cycle (Battalion S1) ───────────────────────────────────────────────
  const handleUnlock = async (company) => {
    try {
      await setDoc(doc(db, 'cadetChallengeCycles', cycleKey(company, selectedCycle)), {
        status: 'open',
        unlockedBy: userData?.fullName || '',
        unlockedByUid: user.uid,
        unlockedAt: serverTimestamp(),
      }, { merge: true });
      showToast(`${company} Cycle #${selectedCycle} unlocked`);
    } catch { showToast('Unlock failed'); }
  };

  // ── Lock cycle (Battalion S1) ─────────────────────────────────────────────────
  const handleLock = async (company) => {
    try {
      await setDoc(doc(db, 'cadetChallengeCycles', cycleKey(company, selectedCycle)), {
        status: 'locked',
        lockedBy: userData?.fullName || '',
        lockedByUid: user.uid,
        lockedAt: serverTimestamp(),
      }, { merge: true });
      showToast(`${company} Cycle #${selectedCycle} locked`);
    } catch { showToast('Lock failed'); }
  };

  // ── Send back (Battalion S1) ──────────────────────────────────────────────────
  const handleSendBack = async () => {
    if (!sendBackConf) return;
    setSendingBack(true);
    try {
      await setDoc(doc(db, 'cadetChallengeCycles', cycleKey(sendBackConf.company, selectedCycle)), {
        status: 'open',
        sentBackBy: userData?.fullName || '',
        sentBackByUid: user.uid,
        sentBackAt: serverTimestamp(),
        sentBackNote: sendBackNote.trim() || null,
      }, { merge: true });

      const idToken = await getIdToken(auth.currentUser);
      await fetch('/api/notify-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'send-back', idToken,
          cycleNumber: selectedCycle,
          company: sendBackConf.company,
          note: sendBackNote.trim(),
        }),
      });
      setSendBackConf(null);
      setSendBackNote('');
      showToast(`Sent back to ${sendBackConf.company} S1 Assistant`);
    } catch { showToast('Send back failed'); }
    finally { setSendingBack(false); }
  };

  // ── Loading / access check ────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-yellow-500" size={40} />
      </div>
    );
  }

  const hasAccess = canInput || canViewAll || userLevel >= COMMAND_LEVEL;
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center text-center p-8">
        <div>
          <Activity className="mx-auto text-yellow-500 mb-4" size={40} />
          <p className="font-black uppercase text-sm text-slate-500">Access Restricted</p>
          <p className="text-xs text-slate-400 mt-2">This page is for S1/S3 Assistants and above.</p>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 text-slate-900 dark:text-slate-100">
      <main className="p-6 md:p-10 max-w-7xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
              <ScrambleText text="Cadet " trigger="mount" />
              <span className="text-yellow-500"><ScrambleText text="Challenge" trigger="mount" /></span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 mt-1">
              Physical Fitness Records · {ROLE_LABELS[role] || role}
            </p>
          </div>
        </div>

        {/* Cycle tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {CYCLES.map(n => (
            <button
              key={n}
              onClick={() => setSelectedCycle(n)}
              className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                selectedCycle === n
                  ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20'
                  : 'bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-yellow-500/30'
              }`}
            >
              Cycle #{n}
            </button>
          ))}

          {/* View-mode toggle (company-level users) */}
          {!canViewAll && (
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                  viewMode === 'table'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 text-slate-500 dark:text-slate-400'
                }`}
              >
                <LayoutGrid size={13} /> Table
              </button>
              <button
                onClick={() => setViewMode('individual')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                  viewMode === 'individual'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                    : 'bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 text-slate-500 dark:text-slate-400'
                }`}
              >
                <User size={13} /> Individual
              </button>
            </div>
          )}
        </div>

        {/* Staff company filter */}
        {canViewAll && (
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-xl px-4 py-2 shadow-sm">
              <Filter size={13} className="text-slate-400" />
              <select
                value={filterCompany}
                onChange={e => setFilterCompany(e.target.value)}
                className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-transparent outline-none pr-2"
              >
                <option value="">All Companies</option>
                {companies.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            {/* Cycle status overview (staff) */}
            <div className="flex gap-2 flex-wrap">
              {(filterCompany ? [filterCompany] : companies).map(company => {
                const key  = cycleKey(company, selectedCycle);
                const stat = cycleStatuses[key]?.status || 'open';
                return (
                  <span key={company} className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${statusColor(stat)}`}>
                    {company}: {statusLabel(stat)}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Company-level: Cycle status banner + action buttons ── */}
        {!canViewAll && activeCompany && (
          <div className="flex items-center gap-3 mb-6 flex-wrap">
            <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl ${statusColor(activeCycle.status)}`}>
              Cycle #{selectedCycle} — {statusLabel(activeCycle.status)}
            </span>

            {/* Finalize button — S1 assistant only, cycle must be open */}
            {canFinalize && activeCycle.status === 'open' && (
              <button
                onClick={() => setFinalizeConf(activeCompany)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-500 text-white font-black text-xs uppercase tracking-widest px-4 py-2 rounded-xl transition-all"
              >
                <Send size={14} /> Finalize & Submit
              </button>
            )}

            {activeCycle.status === 'submitted' && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">
                Submitted by {activeCycle.submittedBy || 'S1 Assistant'} · awaiting Battalion S1 review
              </span>
            )}
            {activeCycle.status === 'locked' && (
              <span className="text-xs text-green-600 font-bold flex items-center gap-1.5">
                <Lock size={12} /> Verified & locked by {activeCycle.lockedBy || 'Battalion S1'}
              </span>
            )}
          </div>
        )}

        {/* ── Individual entry button ── */}
        {viewMode === 'individual' && canEdit && (
          <div className="mb-6">
            <button
              onClick={() => openCreate()}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-widest px-5 py-3 rounded-xl transition-all shadow-lg shadow-yellow-500/20"
            >
              <Plus size={16} /> New Record
            </button>
          </div>
        )}

        {/* ── TABLE VIEW ── */}
        {(viewMode === 'table' || canViewAll) && (
          <TableView
            cadets={allCadets}
            recordMap={recordMap}
            canEdit={canEdit}
            isLocked={isLocked}
            onEdit={openEdit}
            onDelete={setDeleteConf}
            onQuickSave={handleQuickSave}
            onMedicalToggle={handleMedicalToggle}
            onAddManual={() => openCreate()}
            loading={dataLoading}
          />
        )}

        {/* ── INDIVIDUAL VIEW: list of records ── */}
        {viewMode === 'individual' && !canViewAll && (
          <div className="space-y-3">
            {dataLoading ? (
              [1,2,3].map(n => <div key={n} className="h-16 bg-slate-100 dark:bg-slate-900/60 rounded-2xl animate-pulse" />)
            ) : companyRecords.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl">
                <Activity className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={36} />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No records yet</p>
                {canEdit && (
                  <button onClick={() => openCreate()} className="mt-4 text-yellow-500 text-xs font-black uppercase hover:text-yellow-400">
                    + Add first record
                  </button>
                )}
              </div>
            ) : (
              companyRecords.map(rec => (
                <RecordCard
                  key={rec.id} rec={rec}
                  canEdit={canEdit}
                  canDelete={canEdit}
                  onEdit={() => openEdit(rec)}
                  onDelete={() => setDeleteConf({ id: rec.id, cadetName: rec.cadetName })}
                />
              ))
            )}
          </div>
        )}

        {/* ── STAFF: all companies' records ── */}
        {canViewAll && !filterCompany && (
          <div className="space-y-6 mt-6">
            {companies.map(company => {
              const key     = cycleKey(company, selectedCycle);
              const stat    = cycleStatuses[key]?.status || 'open';
              // Include battalion members who observe this company (secondaryCompany match)
              const recs    = allRecords.filter(r => r.company === company || r.secondaryCompany === company);
              const recMap  = {};
              recs.forEach(r => { if (r.cadetId) recMap[r.cadetId] = r; });
              return (
                <CompanySection
                  key={company} company={company} cycleStatus={stat}
                  cycleData={cycleStatuses[key] || {}}
                  records={recs} canUnlock={canUnlock}
                  onUnlock={() => handleUnlock(company)}
                  onLock={() => handleLock(company)}
                  onSendBack={() => setSendBackConf({ company })}
                />
              );
            })}
          </div>
        )}

        {/* ── STAFF: single-company filtered view ── */}
        {canViewAll && filterCompany && (
          <div className="mt-4 space-y-3">
            {/* Action bar for filtered company */}
            {canUnlock && (
              <div className="flex gap-3 mb-4 flex-wrap">
                {activeCycle.status !== 'open' && (
                  <button
                    onClick={() => handleUnlock(filterCompany)}
                    className="flex items-center gap-2 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-yellow-500/30 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 transition-all"
                  >
                    <Unlock size={13} /> Unlock Cycle
                  </button>
                )}
                {activeCycle.status === 'submitted' && (
                  <>
                    <button
                      onClick={() => handleLock(filterCompany)}
                      className="flex items-center gap-2 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-green-600 text-white hover:bg-green-500 transition-all"
                    >
                      <Lock size={13} /> Lock & Verify
                    </button>
                    <button
                      onClick={() => setSendBackConf({ company: filterCompany })}
                      className="flex items-center gap-2 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-orange-500 text-white hover:bg-orange-400 transition-all"
                    >
                      <RotateCcw size={13} /> Send Back
                    </button>
                  </>
                )}
              </div>
            )}
            {dataLoading ? (
              [1,2,3].map(n => <div key={n} className="h-16 bg-slate-100 dark:bg-slate-900/60 rounded-2xl animate-pulse" />)
            ) : companyRecords.map(rec => (
              <RecordCard key={rec.id} rec={rec} canEdit={false} canDelete={false} />
            ))}
            {!dataLoading && companyRecords.length === 0 && (
              <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No records for {filterCompany}</p>
              </div>
            )}
          </div>
        )}

        <Footer />
      </main>

      {/* ── Entry/Edit Modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && closeModal()}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/10 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="p-6 border-b border-blue-100 dark:border-white/5 flex items-center justify-between">
                <h2 className="font-black uppercase text-sm tracking-widest flex items-center gap-2">
                  <Activity size={16} className="text-yellow-500" />
                  {editingRecord ? 'Edit Record' : 'New Record'} — Cycle #{selectedCycle}
                </h2>
                <button onClick={closeModal} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-5">
                {/* Cadet name */}
                <div>
                  <label className={lc}>Cadet Name *</label>
                  {allCadets.length > 0 ? (
                    <select
                      required={!editingRecord}
                      value={form.cadetId}
                      onChange={e => {
                        const cadet = allCadets.find(c => c.uid === e.target.value);
                        setForm(f => ({
                          ...f,
                          cadetId: e.target.value,
                          cadetName: cadet?.fullName || '',
                        }));
                      }}
                      className={ic}
                    >
                      <option value="">— Select Cadet —</option>
                      {allCadets.map(c => (
                        <option key={c.uid} value={c.uid}>{c.fullName}</option>
                      ))}
                      <option value="manual">+ Enter manually</option>
                    </select>
                  ) : null}
                  {(form.cadetId === 'manual' || allCadets.length === 0) && (
                    <input
                      required
                      type="text"
                      placeholder="LAST, FIRST"
                      value={form.cadetName}
                      onChange={e => setForm(f => ({ ...f, cadetName: e.target.value }))}
                      className={`${ic} mt-2`}
                    />
                  )}
                </div>

                {/* Medical exemption */}
                <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-xl border border-slate-200 dark:border-white/10 hover:border-yellow-500/30 transition-all">
                  <div
                    onClick={() => setForm(f => ({ ...f, medicalExempt: !f.medicalExempt }))}
                    className={`w-5 h-5 rounded flex items-center justify-center border-2 transition-all cursor-pointer ${
                      form.medicalExempt
                        ? 'bg-yellow-500 border-yellow-500'
                        : 'border-slate-300 dark:border-white/20'
                    }`}
                  >
                    {form.medicalExempt && <CheckCircle2 size={12} className="text-slate-950" />}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Medical Exemption</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Exempt from all events — no reason required</p>
                  </div>
                </label>

                {/* Event scores */}
                {!form.medicalExempt && (
                  <div>
                    <p className="text-[10px] font-black uppercase text-yellow-500 tracking-widest mb-3">Event Scores</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={lc}>Push-Ups (reps)</label>
                        <input type="number" min="0" max="999" placeholder="0"
                          value={form.pushUps}
                          onChange={e => setForm(f => ({ ...f, pushUps: e.target.value }))}
                          className={ic} />
                      </div>
                      <div>
                        <label className={lc}>Sit-Ups (reps)</label>
                        <input type="number" min="0" max="999" placeholder="0"
                          value={form.sitUps}
                          onChange={e => setForm(f => ({ ...f, sitUps: e.target.value }))}
                          className={ic} />
                      </div>
                      <div>
                        <label className={lc}>Shuttle Run (sec, e.g. 7.22)</label>
                        <input type="number" min="0" max="999" step="0.01" placeholder="7.22"
                          value={form.shuttleRun}
                          onChange={e => setForm(f => ({ ...f, shuttleRun: e.target.value }))}
                          className={ic} />
                      </div>
                      <div>
                        <label className={lc}>One Mile (MM:SS, e.g. 7:22)</label>
                        <input type="text" placeholder="7:22"
                          pattern="^\d{1,2}:\d{2}$"
                          title="Format: MM:SS (e.g. 7:22)"
                          value={form.oneMile}
                          onChange={e => setForm(f => ({ ...f, oneMile: e.target.value }))}
                          className={ic} />
                      </div>
                      <div className="col-span-2">
                        <label className={lc}>Sit-N-Reach (cm, e.g. 30.5)</label>
                        <input type="number" min="-30" max="100" step="0.1" placeholder="30.5"
                          value={form.sitNReach}
                          onChange={e => setForm(f => ({ ...f, sitNReach: e.target.value }))}
                          className={ic} />
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit" disabled={saving}
                  className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><CheckCircle2 size={14} /> {editingRecord ? 'Save Changes' : 'Save Record'}</>}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Finalize confirmation ── */}
      <AnimatePresence>
        {finalizeConf && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-green-200 dark:border-green-500/20 rounded-3xl p-8 max-w-sm w-full text-center">
              <Send className="mx-auto text-green-500 mb-4" size={32} />
              <h3 className="font-black uppercase text-sm tracking-widest mb-2">Finalize Cycle #{selectedCycle}?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                This will submit all records for <strong>{activeCompany} Company</strong> and notify
                Battalion S1, S3, and XO. Editing will be locked until unlocked by Battalion S1.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setFinalizeConf(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 font-black text-xs uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                  Cancel
                </button>
                <button onClick={handleFinalize} disabled={finalizing}
                  className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                  {finalizing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {finalizing ? 'Sending…' : 'Confirm'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Send Back modal ── */}
      <AnimatePresence>
        {sendBackConf && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-500/20 rounded-3xl p-8 max-w-sm w-full">
              <RotateCcw className="mx-auto text-orange-500 mb-4" size={32} />
              <h3 className="font-black uppercase text-sm tracking-widest mb-2 text-center">Send Back for Corrections</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4 text-center">
                Returns Cycle #{selectedCycle} for <strong>{sendBackConf.company}</strong> to the S1 Assistant with an optional note.
              </p>
              <div className="mb-4">
                <label className={lc}>Note (optional)</label>
                <textarea rows={3} value={sendBackNote}
                  onChange={e => setSendBackNote(e.target.value)}
                  placeholder="What needs to be corrected..."
                  className={`${ic} resize-none`} />
              </div>
              <div className="flex gap-3">
                <button onClick={() => { setSendBackConf(null); setSendBackNote(''); }}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 font-black text-xs uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                  Cancel
                </button>
                <button onClick={handleSendBack} disabled={sendingBack}
                  className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                  {sendingBack ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                  Send Back
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Delete confirmation ── */}
      <AnimatePresence>
        {deleteConf && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-500/20 rounded-3xl p-8 max-w-sm w-full text-center">
              <Trash2 className="mx-auto text-red-500 mb-4" size={32} />
              <h3 className="font-black uppercase text-sm tracking-widest mb-2">Delete Record?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Permanently removes the record for <strong>{deleteConf.cadetName}</strong>.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConf(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 font-black text-xs uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                  Cancel
                </button>
                <button onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest transition-all">
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest px-5 py-3 rounded-2xl shadow-xl z-50">
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── TableView sub-component ────────────────────────────────────────────────────

const EVENTS = [
  { key: 'pushUps',    label: 'Push-Ups',    type: 'number', step: '1',    placeholder: '0' },
  { key: 'sitUps',     label: 'Sit-Ups',     type: 'number', step: '1',    placeholder: '0' },
  { key: 'shuttleRun', label: 'Shuttle (s)', type: 'number', step: '0.01', placeholder: '7.22' },
  { key: 'oneMile',    label: '1 Mile',      type: 'text',   step: null,   placeholder: '7:22' },
  { key: 'sitNReach',  label: 'Sit-N-Reach (cm)', type: 'number', step: '0.1', placeholder: '30.5' },
];

const TableView = ({ cadets, recordMap, canEdit, isLocked, onEdit, onDelete, onQuickSave, onMedicalToggle, onAddManual, loading }) => {
  const [editingCell, setEditingCell] = useState(null); // { uid, key }
  const [cellValue,   setCellValue]   = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingCell && inputRef.current) inputRef.current.focus();
  }, [editingCell]);

  const startEdit = (uid, key, currentVal) => {
    if (!canEdit || isLocked) return;
    setEditingCell({ uid, key });
    setCellValue(currentVal ?? '');
  };

  const commitEdit = async (cadet) => {
    if (!editingCell) return;
    const { key } = editingCell;
    const parsed = key === 'oneMile' ? cellValue.trim() : (cellValue !== '' ? parseFloat(cellValue) : null);
    await onQuickSave(cadet, key, parsed);
    setEditingCell(null);
  };

  if (loading) return (
    <div className="space-y-2">
      {[1,2,3,4].map(n => <div key={n} className="h-12 bg-slate-100 dark:bg-slate-900/60 rounded-xl animate-pulse" />)}
    </div>
  );

  if (cadets.length === 0) return (
    <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl">
      <ClipboardList className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={36} />
      <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No cadets in roster</p>
      <p className="text-xs text-slate-400 mt-2">Add cadets to the Battalion Roster first, then return here.</p>
      <button onClick={onAddManual} className="mt-4 text-yellow-500 text-xs font-black uppercase hover:text-yellow-400">
        + Add manual record
      </button>
    </div>
  );

  return (
    <div className="overflow-x-auto rounded-2xl border border-blue-100 dark:border-white/5 shadow-sm">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-white/5">
            <th className="text-left p-3 font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 min-w-[180px]">Cadet</th>
            <th className="p-3 text-center font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 w-10">Exempt</th>
            {EVENTS.map(ev => (
              <th key={ev.key} className="p-3 text-center font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 min-w-[90px]">
                {ev.label}
              </th>
            ))}
            {canEdit && <th className="p-3 w-20" />}
          </tr>
        </thead>
        <tbody>
          {cadets.map((cadet, idx) => {
            const rec     = recordMap[cadet.uid];
            const exempt  = rec?.medicalExempt || false;
            return (
              <tr
                key={cadet.uid}
                className={`border-b border-slate-100 dark:border-white/5 transition-colors ${idx % 2 === 0 ? 'bg-white dark:bg-slate-950/30' : 'bg-slate-50/50 dark:bg-slate-900/20'} ${exempt ? 'opacity-60' : ''}`}
              >
                <td className="p-3">
                  <p className="font-black text-slate-900 dark:text-white">{cadet.fullName}</p>
                  {rec?.enteredByName && (
                    <p className="text-[10px] text-slate-400">by {rec.enteredByName}</p>
                  )}
                </td>
                {/* Medical exempt toggle */}
                <td className="p-3 text-center">
                  <button
                    onClick={() => canEdit && !isLocked && onMedicalToggle(cadet)}
                    disabled={!canEdit || isLocked}
                    className={`w-5 h-5 rounded mx-auto flex items-center justify-center border-2 transition-all ${
                      exempt ? 'bg-yellow-500 border-yellow-500' : 'border-slate-300 dark:border-white/20'
                    } ${canEdit && !isLocked ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    {exempt && <CheckCircle2 size={11} className="text-slate-950" />}
                  </button>
                </td>
                {EVENTS.map(ev => {
                  const val      = rec?.[ev.key];
                  const isActive = editingCell?.uid === cadet.uid && editingCell?.key === ev.key;
                  return (
                    <td key={ev.key} className="p-2 text-center">
                      {exempt ? (
                        <span className="text-[10px] text-slate-300 dark:text-slate-600 font-bold">exempt</span>
                      ) : isActive ? (
                        <input
                          ref={inputRef}
                          type={ev.type}
                          step={ev.step || undefined}
                          value={cellValue}
                          onChange={e => setCellValue(e.target.value)}
                          onBlur={() => commitEdit(cadet)}
                          onKeyDown={e => { if (e.key === 'Enter') commitEdit(cadet); if (e.key === 'Escape') setEditingCell(null); }}
                          className="w-full text-center bg-yellow-50 dark:bg-yellow-500/10 border border-yellow-400 rounded-lg py-1 px-2 text-xs font-bold outline-none"
                        />
                      ) : (
                        <span
                          onClick={() => startEdit(cadet.uid, ev.key, val)}
                          className={`inline-block min-w-[50px] py-1 px-2 rounded-lg font-bold transition-all ${
                            canEdit && !isLocked
                              ? 'cursor-pointer hover:bg-yellow-50 dark:hover:bg-yellow-500/10 hover:text-yellow-600'
                              : ''
                          } ${val != null ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-slate-600'}`}
                        >
                          {val != null ? String(val) : '—'}
                        </span>
                      )}
                    </td>
                  );
                })}
                {canEdit && (
                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => rec && onEdit(rec)}
                        disabled={!rec}
                        title="Edit full record"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 transition-all disabled:opacity-30">
                        <Edit3 size={13} />
                      </button>
                      {rec && (
                        <button onClick={() => onDelete({ id: rec.id, cadetName: cadet.fullName })}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
      {canEdit && (
        <div className="p-3 border-t border-slate-100 dark:border-white/5">
          <button onClick={onAddManual}
            className="text-xs font-black uppercase text-slate-400 hover:text-yellow-500 transition-colors flex items-center gap-1.5">
            <Plus size={13} /> Add manual entry
          </button>
        </div>
      )}
    </div>
  );
};

// ── RecordCard sub-component ───────────────────────────────────────────────────

const RecordCard = ({ rec, canEdit, canDelete, onEdit, onDelete }) => (
  <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4 shadow-sm hover:border-yellow-500/20 transition-all">
    <div className="flex items-center gap-3 min-w-0">
      <div className={`w-2 h-2 rounded-full shrink-0 ${rec.medicalExempt ? 'bg-slate-300 dark:bg-slate-600' : 'bg-yellow-400'}`} />
      <div className="min-w-0">
        <p className="font-black text-sm uppercase tracking-tight truncate">{rec.cadetName}</p>
        <p className="text-[10px] font-bold text-slate-400 uppercase">
          {rec.company}
          {rec.medicalExempt && <span className="ml-2 text-orange-500">● Medical Exempt</span>}
        </p>
      </div>
    </div>
    {!rec.medicalExempt && (
      <div className="flex flex-wrap gap-4 sm:mx-auto text-center">
        {rec.pushUps   != null && <ScoreChip label="Push-Ups"   value={rec.pushUps} />}
        {rec.sitUps    != null && <ScoreChip label="Sit-Ups"    value={rec.sitUps} />}
        {rec.shuttleRun != null && <ScoreChip label="Shuttle (s)" value={rec.shuttleRun} />}
        {rec.oneMile             && <ScoreChip label="1 Mile"    value={rec.oneMile} />}
        {rec.sitNReach  != null && <ScoreChip label="Sit-N-Reach" value={`${rec.sitNReach} cm`} />}
      </div>
    )}
    <div className="flex items-center gap-2 shrink-0 ml-auto">
      {canEdit  && <button onClick={onEdit}   className="p-2 rounded-lg text-slate-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 transition-all"><Edit3 size={15} /></button>}
      {canDelete && <button onClick={onDelete} className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"><Trash2 size={15} /></button>}
    </div>
  </div>
);

// ── CompanySection sub-component (staff view) ──────────────────────────────────

const CompanySection = ({ company, cycleStatus, cycleData, records, canUnlock, onUnlock, onLock, onSendBack }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden">
      <div
        className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/3 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <Shield size={16} className="text-yellow-500" />
          <span className="font-black uppercase tracking-widest text-sm">{company} Company</span>
          <span className="text-[10px] text-slate-400 font-bold">({records.length} records)</span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-lg ${
            cycleStatus === 'locked'    ? 'bg-green-500/10 text-green-600 dark:text-green-400' :
            cycleStatus === 'submitted' ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400' :
            'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
          }`}>
            {statusLabel(cycleStatus)}
          </span>
          {canUnlock && cycleStatus === 'submitted' && (
            <>
              <button onClick={e => { e.stopPropagation(); onLock(); }}
                className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-green-600 text-white hover:bg-green-500 transition-all flex items-center gap-1">
                <Lock size={10} /> Lock
              </button>
              <button onClick={e => { e.stopPropagation(); onSendBack(); }}
                className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-orange-500 text-white hover:bg-orange-400 transition-all flex items-center gap-1">
                <RotateCcw size={10} /> Send Back
              </button>
            </>
          )}
          {canUnlock && cycleStatus !== 'open' && (
            <button onClick={e => { e.stopPropagation(); onUnlock(); }}
              className="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg border border-yellow-500/30 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-500/10 transition-all flex items-center gap-1">
              <Unlock size={10} /> Unlock
            </button>
          )}
          <ChevronDown size={16} className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </div>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            className="overflow-hidden border-t border-slate-100 dark:border-white/5">
            {records.length === 0 ? (
              <p className="p-5 text-xs text-slate-400 font-bold uppercase">No records submitted yet.</p>
            ) : (
              <div className="p-3 space-y-2">
                {records.map(rec => <RecordCard key={rec.id} rec={rec} canEdit={false} canDelete={false} />)}
              </div>
            )}
            {cycleData.submittedBy && (
              <p className="px-5 pb-4 text-[10px] text-slate-400 font-bold uppercase">
                Submitted by {cycleData.submittedBy}
                {cycleData.sentBackBy && ` · Sent back by ${cycleData.sentBackBy}`}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── ScoreChip ──────────────────────────────────────────────────────────────────
const ScoreChip = ({ label, value }) => (
  <div className="text-center">
    <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">{label}</p>
    <p className="text-sm font-black text-slate-900 dark:text-white">{value}</p>
  </div>
);

export default AdminCadetChallenge;
