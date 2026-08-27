// src/pages/AdminFundraiser.jsx
//
// Fallen Heroes Fundraiser Tracking
//
// ── Access model ──────────────────────────────────────────────────────────────
// Any signed-in portal user can reach this page.
//
// FULL VIEW (Transactions + Roster tabs) — FULL_ACCESS_ROLES or admin 80+:
//   s1_adjutant, s3_operations, battalion_xo, battalion_csm,
//   battalion_commander, company_commander, company_xo, company_1sg
//
// PERSONAL VIEW (own entries only) — everyone else:
//   Looks up the user's roster doc via linkedUid; falls back to cadetName
//   matching userData.fullName. Shows $0 / 0 flags if no entries yet.
//
// $2 = 1 flag, rounded down.  e.g. $5 → 2 flags ($4 credited).

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, updateDoc, setDoc, doc, onSnapshot,
  query, where, serverTimestamp, getDocs, orderBy,
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { writeLog } from '../lib/writeLog';
import { useCompanies } from '../hooks/useCompanies';
import { ROLE_HIERARCHY, ROLE_LABELS } from '../constants';
import {
  DollarSign, Flag, Plus, X, Loader2, CheckCircle2,
  Filter, Banknote, FileText, Smartphone, ShoppingCart,
  Users, ReceiptText, Ban, Heart, BarChart3, Lock, Unlock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ScrambleText from '../components/ScrambleText';
import AdminPageHeader from '../components/AdminPageHeader';

// ── Constants ──────────────────────────────────────────────────────────────────

// Roles that get the full Transactions + Roster view
const FULL_ACCESS_ROLES = [
  's1_adjutant', 's3_operations',
  'battalion_xo', 'battalion_csm', 'battalion_commander',
  'company_commander', 'company_xo', 'company_1sg', 'company_master_sergeant',
];

// company_master_sergeant can VIEW the fundraiser page but cannot log payments —
// edit rights for MSgt are limited to Cadet Challenge only.
const COMPANY_INPUT_ROLES = ['company_commander', 'company_xo', 'company_1sg'];
const BN_INPUT_ROLES      = ['s1_adjutant', 's3_operations'];

const PAYMENT_TYPES = [
  { key: 'cash',   label: 'Cash',    icon: <Banknote     size={14} /> },
  { key: 'check',  label: 'Check',   icon: <FileText     size={14} /> },
  { key: 'zelle',  label: 'Zelle',   icon: <Smartphone   size={14} /> },
  { key: 'estore', label: 'E-Store', icon: <ShoppingCart size={14} /> },
];

const PAYMENT_COLORS = {
  cash:   'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',
  check:  'bg-blue-500/10  text-blue-600  dark:text-blue-400  border-blue-500/20',
  zelle:  'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  estore: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
};

const ADMIN_LEVEL = 80;
const STAFF_LEVEL = 70;
// Roster entries belonging to Battalion HQ (not a lettered company).
const BATTALION_COMPANIES = ['Battalion', 'Zulu'];

// $2 = 1 flag, round down
const toFlags = (amount) => Math.floor((amount || 0) / 2);

// ── Flag requirements by roster position ───────────────────────────────────────
// Squad Member: 30 | Squad Leader: 35 | Staff Assistants: 40
// Platoon Sergeant: 45 | Platoon Leader: 50 | Company Leadership + MSG: 60 | Battalion: 80
const FLAG_REQUIREMENTS_BY_POSITION = {
  'Squad Member':             30,
  'Squad Leader Assistant':   35,
  'Squad Leader':             35,
  'Company S1 Assistant':     40,
  'Company S2 Assistant':     40,
  'Company S3 Assistant':     40,
  'Company S4 Assistant':     40,
  'Company S5 Assistant':     40,
  'Company S6 Assistant':     40,
  'Company S7 Assistant':     40,
  'Team Lead':                40,
  'Platoon Sergeant':         45,
  'Platoon Leader':           50,
  'First Sergeant':           60,
  'Master Sergeant':          60,
  'Company XO':               60,
  'Company Commander':        60,
  'Battalion Staff (S-1)':    80,
  'Battalion Staff (S-2)':    80,
  'Battalion Staff (S-3)':    80,
  'Battalion Staff (S-4)':    80,
  'Battalion Staff (S-5)':    80,
  'Battalion Staff (S-6)':    80,
  'Battalion Staff (S-7)':    80,
  'Sergeant Major':           80,
  'Battalion XO':             80,
  'Battalion CSM':            80,
  'Battalion Commander':      80,
};
const DEFAULT_FLAG_REQUIREMENT = 30; // fallback for unknown positions
const OCTOBER_WEEKS = 4; // October has 4 fundraising weeks

const ic = 'w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-3 rounded-xl outline-none focus:border-yellow-500 text-sm font-bold text-slate-900 dark:text-white transition-all';
const lc = 'text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 block mb-1 tracking-widest';

const EMPTY_FORM = {
  cadetId: '', cadetName: '', paymentType: 'cash', amount: '', notes: '',
};

// ── Main Component ─────────────────────────────────────────────────────────────

const AdminFundraiser = () => {
  const { user, userData, role, loading: authLoading } = useAuth();
  const { companies } = useCompanies();

  const userLevel   = ROLE_HIERARCHY[role] || 0;
  const myCompany   = userData?.company || '';
  const canViewFull = FULL_ACCESS_ROLES.includes(role) || userLevel >= ADMIN_LEVEL;
  const canInput    = COMPANY_INPUT_ROLES.includes(role) || BN_INPUT_ROLES.includes(role) || userLevel >= ADMIN_LEVEL;
  const canViewAll  = BN_INPUT_ROLES.includes(role) || userLevel >= STAFF_LEVEL;
  // Void permission mirrors input permission: company command can void their own
  // company's entries; S1/S3 adjutants and admin 80+ can void any company's entries.
  const canDelete   = COMPANY_INPUT_ROLES.includes(role) || BN_INPUT_ROLES.includes(role) || userLevel >= ADMIN_LEVEL;
  // S1, S3, and anyone at staff level (70+) can open/close the fundraiser period.
  const canOpenFundraiser = BN_INPUT_ROLES.includes(role) || userLevel >= STAFF_LEVEL;
  // Company leadership cannot log payments until the fundraiser is opened by S1/S3.
  const isCompanyInput    = COMPANY_INPUT_ROLES.includes(role) && !BN_INPUT_ROLES.includes(role) && userLevel < ADMIN_LEVEL;

  // ── Fundraiser open/close setting ────────────────────────────────────────────
  // Stored in settings/fundraiser  { isOpen: boolean }
  // Company leadership can only log payments when isOpen === true.
  // S1, S3, and staff (70+) can always log; they also control the toggle.
  const [fundraiserIsOpen, setFundraiserIsOpen] = useState(false);
  const [togglingOpen,     setTogglingOpen]     = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'fundraiser'), snap => {
      setFundraiserIsOpen(snap.exists() ? (snap.data().isOpen === true) : false);
    }, () => setFundraiserIsOpen(false));
    return () => unsub();
  }, []);

  const handleToggleFundraiser = async () => {
    const opening = !fundraiserIsOpen;
    setTogglingOpen(true);
    try {
      await setDoc(doc(db, 'settings', 'fundraiser'), { isOpen: opening }, { merge: true });
      writeLog({
        type: 'fundraiser', action: 'settings',
        description: `Fundraiser ${opening ? 'opened' : 'closed'} for submissions`,
        userId: user?.uid || '', userFullName: userData?.fullName || '',
        userRole: role || '',
      });
    } catch (err) {
      console.error('Toggle fundraiser error:', err);
    } finally {
      setTogglingOpen(false);
    }
  };

  // Company input is gated: staff/S1/S3 can always log; company leadership only when open.
  const canLogPayment = canInput && (canOpenFundraiser || fundraiserIsOpen);

  // ── Full-view UI state ────────────────────────────────────────────────────────
  const [activeTab,    setActiveTab]    = useState('transactions');
  const [filterCompany,setFilterCompany]= useState('');
  const [showModal,    setShowModal]    = useState(false);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [deleteConf,   setDeleteConf]   = useState(null);
  const [toast,        setToast]        = useState(null);
  const [dataLoading,  setDataLoading]  = useState(true);

  // ── Full-view data ────────────────────────────────────────────────────────────
  const [entries, setEntries] = useState([]);
  const [cadets,  setCadets]  = useState([]);

  const activeCompany = filterCompany || myCompany;

  // Default canViewAll users to their company on mount
  const initRef = useRef(false);
  useEffect(() => {
    if (!initRef.current && canViewAll && myCompany) {
      setFilterCompany(myCompany);
      initRef.current = true;
    }
  }, [canViewAll, myCompany]);

  // ── Personal-view state ───────────────────────────────────────────────────────
  const [myRosterDocId,     setMyRosterDocId]     = useState(null);
  const [myRosterDocLoaded, setMyRosterDocLoaded] = useState(false);
  const [myEntries,         setMyEntries]         = useState([]);
  const [myDataLoading,     setMyDataLoading]     = useState(true);

  // Step 1 (personal view only): find my roster doc by linkedUid
  useEffect(() => {
    if (canViewFull || !user || authLoading) return;
    getDocs(query(collection(db, 'roster'), where('linkedUid', '==', user.uid)))
      .then(snap => {
        setMyRosterDocId(snap.empty ? null : snap.docs[0].id);
        setMyRosterDocLoaded(true);
      })
      .catch(() => setMyRosterDocLoaded(true));
  }, [canViewFull, user, authLoading]);

  // Step 2 (personal view only): subscribe to my entries once roster doc is known
  useEffect(() => {
    if (canViewFull || !myRosterDocLoaded) return;
    setMyDataLoading(true);

    let q;
    if (myRosterDocId) {
      q = query(collection(db, 'fundraiserEntries'), where('cadetId', '==', myRosterDocId));
    } else if (userData?.fullName) {
      // Fallback: match by cadet name (for users without a linkedUid on their roster doc)
      q = query(collection(db, 'fundraiserEntries'), where('cadetName', '==', userData.fullName));
    } else {
      setMyEntries([]);
      setMyDataLoading(false);
      return;
    }

    const unsub = onSnapshot(q, snap => {
      const all = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(e => !e.voided) // personal view never shows voided entries
        .sort((a, b) => (b.submittedAt?.seconds ?? 0) - (a.submittedAt?.seconds ?? 0));
      setMyEntries(all);
      setMyDataLoading(false);
    }, err => {
      console.error('personal fundraiser snapshot error:', err);
      setMyDataLoading(false);
    });

    return () => unsub();
  }, [canViewFull, myRosterDocId, myRosterDocLoaded, userData?.fullName]);

  // ── Full-view subscriptions ───────────────────────────────────────────────────
  useEffect(() => {
    if (!canViewFull || authLoading) return;
    setDataLoading(true);
    let q;
    if (canViewAll && !filterCompany) {
      q = query(collection(db, 'fundraiserEntries'));
    } else if (activeCompany) {
      q = query(collection(db, 'fundraiserEntries'), where('company', '==', activeCompany));
    } else {
      setEntries([]); setDataLoading(false); return;
    }
    const unsub = onSnapshot(q, snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setDataLoading(false);
    }, err => { console.error('fundraiserEntries snapshot error:', err); setDataLoading(false); });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewFull, authLoading, filterCompany, activeCompany, canViewAll, role]);

  // ── Fundraiser goal + cross-company totals (full-access only) ────────────────
  const [allEntries,  setAllEntries]  = useState([]);
  const [allRoster,   setAllRoster]   = useState([]); // full battalion roster for goal calc

  useEffect(() => {
    if (!canViewFull) return;
    // Load all entries for cross-company graph
    const unsubAll = onSnapshot(collection(db, 'fundraiserEntries'), snap => {
      setAllEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    // Load full roster so per-company goals can be computed from member positions
    const unsubRoster = onSnapshot(
      query(collection(db, 'roster')),
      snap => setAllRoster(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    );
    return () => { unsubAll(); unsubRoster(); };
  }, [canViewFull]);

  // Per-company goals: sum each active member's flag requirement, divide by October weeks
  const companyGoals = useMemo(() => {
    const goals = {};
    allRoster.filter(c => !c.graduated).forEach(cadet => {
      const company = cadet.company;
      if (!company) return;
      const req = FLAG_REQUIREMENTS_BY_POSITION[cadet.position] ?? DEFAULT_FLAG_REQUIREMENT;
      goals[company] = (goals[company] || 0) + req;
    });
    // Total flags needed → weekly flag goal
    const weekly = {};
    Object.keys(goals).forEach(co => {
      weekly[co] = Math.ceil(goals[co] / OCTOBER_WEEKS);
    });
    return weekly; // flags per week per company
  }, [allRoster]);

  // Per-company totals (non-voided) for the graph — in dollars raised
  const companyNames = companies;
  const companyTotals = useMemo(() => {
    const totals = {};
    allEntries.filter(e => !e.voided).forEach(e => {
      if (e.company) totals[e.company] = (totals[e.company] || 0) + (e.amount || 0);
    });
    return totals;
  }, [allEntries]);

  // ── Full-view: roster subscription ───────────────────────────────────────────
  useEffect(() => {
    if (!canViewFull || !activeCompany) { setCadets([]); return; }
    const q = query(
      collection(db, 'roster'),
      where('company', '==', activeCompany),
      orderBy('fullName', 'asc'),
    );
    const unsub = onSnapshot(q, snap => {
      setCadets(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [canViewFull, activeCompany]);

  // ── Full-view computed ────────────────────────────────────────────────────────
  const displayEntries = useMemo(() => {
    const filtered = (canViewAll && !filterCompany)
      ? entries
      : entries.filter(e => e.company === activeCompany);
    return [...filtered].sort((a, b) => {
      const ta = a.submittedAt?.seconds ?? 0;
      const tb = b.submittedAt?.seconds ?? 0;
      return tb - ta;
    });
  }, [entries, activeCompany, canViewAll, filterCompany]);

  const activeEntries = useMemo(() => displayEntries.filter(e => !e.voided), [displayEntries]);
  const totalAmount   = useMemo(() => activeEntries.reduce((s, e) => s + (e.amount || 0), 0), [activeEntries]);
  const totalFlags    = useMemo(() => activeEntries.reduce((s, e) => s + (e.flags  || 0), 0), [activeEntries]);

  const rosterAggregated = useMemo(() => {
    const byId = {};
    activeEntries.forEach(e => {
      const key = e.cadetId === 'manual' ? `manual_${e.cadetName}` : e.cadetId;
      if (!byId[key]) byId[key] = { cadetId: e.cadetId, cadetName: e.cadetName, total: 0, flags: 0, count: 0, lastAt: null };
      byId[key].total += e.amount || 0;
      byId[key].flags += e.flags  || 0;
      byId[key].count += 1;
      if (!byId[key].lastAt || (e.submittedAt?.seconds > byId[key].lastAt?.seconds)) {
        byId[key].lastAt = e.submittedAt;
      }
    });
    const result = cadets.map(c => ({
      uid: c.uid, fullName: c.fullName, company: c.company, rank: c.rank,
      ...(byId[c.uid] || { total: 0, flags: 0, count: 0, lastAt: null }),
    }));
    Object.values(byId).forEach(agg => {
      if (agg.cadetId === 'manual' && !result.find(r => r.uid === agg.cadetId)) {
        result.push({ uid: 'manual', fullName: agg.cadetName, rank: '', ...agg });
      }
    });
    return result.sort((a, b) => b.total - a.total || (a.fullName || '').localeCompare(b.fullName || ''));
  }, [activeEntries, cadets]);

  // ── Personal-view computed ────────────────────────────────────────────────────
  const myTotal = useMemo(() => myEntries.reduce((s, e) => s + (e.amount || 0), 0), [myEntries]);
  const myFlags = useMemo(() => myEntries.reduce((s, e) => s + (e.flags  || 0), 0), [myEntries]);

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const showToast = useCallback(msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Save payment ──────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    const name = form.cadetId === 'manual'
      ? form.cadetName.trim()
      : (cadets.find(c => c.uid === form.cadetId)?.fullName || form.cadetName.trim());
    if (!name) { showToast('Select or enter a cadet name.'); return; }
    if (!form.amount || Number(form.amount) <= 0) { showToast('Enter a valid amount.'); return; }
    if (!activeCompany) { showToast('Company not determined.'); return; }
    setSaving(true);
    try {
      const amt   = parseFloat(form.amount);
      const flags = toFlags(amt);
      // Carry the cadet's linkedUid so Firestore rules can allow them to read their own entry
      const linkedUid = form.cadetId !== 'manual'
        ? (cadets.find(c => c.uid === form.cadetId)?.linkedUid || null)
        : null;
      await addDoc(collection(db, 'fundraiserEntries'), {
        company:         activeCompany,
        cadetId:         form.cadetId || 'manual',
        cadetName:       name,
        paymentType:     form.paymentType,
        amount:          amt,
        flags,
        notes:           form.notes.trim() || null,
        linkedUid,
        submittedByUid:  user.uid,
        submittedByName: userData?.fullName || '',
        submittedAt:     serverTimestamp(),
        createdAt:       serverTimestamp(),
      });
      showToast('Payment logged');
      setShowModal(false);
      setForm(EMPTY_FORM);
      writeLog({
        type: 'fundraiser', action: 'create',
        description: `Logged payment for ${name}: $${amt} (${form.paymentType})`,
        userId: user?.uid || '', userFullName: userData?.fullName || '',
        userRole: role || '', targetName: name,
        notes: `company:${activeCompany}`,
      });
    } catch (err) {
      console.error(err);
      showToast('Save failed — try again');
    } finally {
      setSaving(false);
    }
  };

  // ── Void (soft-delete) ────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteConf) return;
    try {
      await updateDoc(doc(db, 'fundraiserEntries', deleteConf.id), {
        voided:        true,
        voidedAt:      serverTimestamp(),
        voidedByUid:   user.uid,
        voidedByName:  userData?.fullName || '',
      });
      setDeleteConf(null);
      showToast('Entry voided');
      writeLog({
        type: 'fundraiser', action: 'void',
        description: `Voided payment entry for ${deleteConf.cadetName}`,
        userId: user?.uid || '', userFullName: userData?.fullName || '',
        userRole: role || '', targetId: deleteConf.id, targetName: deleteConf.cadetName,
      });
    } catch (err) {
      console.error(err);
      showToast('Void failed — try again');
    }
  };

  // ── Loading gate ──────────────────────────────────────────────────────────────
  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-yellow-500" size={40} />
    </div>
  );

  const liveFlags = toFlags(parseFloat(form.amount) || 0);

  // ── PERSONAL VIEW ─────────────────────────────────────────────────────────────
  if (!canViewFull) {
    const displayName = userData?.fullName || userData?.name || 'Cadet';

    return (
      <div className="flex-1 p-6 md:p-10 w-full">
        <AdminPageHeader icon={DollarSign} title="Fundraiser" />

          {myDataLoading ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="animate-spin text-yellow-500" size={32} />
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                <SummaryCard
                  icon={<DollarSign size={18} className="text-green-500" />}
                  label="Total Raised"
                  value={`$${myTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                />
                <SummaryCard
                  icon={<Flag size={18} className="text-yellow-500" />}
                  label="Total Flags"
                  value={myFlags.toLocaleString()}
                />
              </div>

              {/* My entries list */}
              {myEntries.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl">
                  <Heart className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={36} />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No payments recorded yet</p>
                  <p className="text-slate-400 text-xs mt-2 max-w-xs mx-auto">
                    Once your company leadership logs a donation for you, it will appear here.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 mb-3 px-1">
                    Payment History
                  </p>
                  <div className="overflow-x-auto rounded-2xl border border-blue-100 dark:border-white/5 shadow-sm">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-white/5">
                          {['Date', 'Payment', 'Amount', 'Flags', 'Notes'].map(h => (
                            <th key={h} className="text-left p-3 font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {myEntries.map((entry, idx) => (
                          <tr key={entry.id} className={`border-b border-slate-100 dark:border-white/5 ${idx % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-white/[0.02]'}`}>
                            <td className="p-3 text-slate-400 whitespace-nowrap">
                              {entry.submittedAt?.toDate
                                ? entry.submittedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                : '—'}
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${PAYMENT_COLORS[entry.paymentType] || 'bg-slate-100'}`}>
                                {PAYMENT_TYPES.find(t => t.key === entry.paymentType)?.icon}
                                {PAYMENT_TYPES.find(t => t.key === entry.paymentType)?.label || entry.paymentType}
                              </span>
                            </td>
                            <td className="p-3 font-black text-green-600 dark:text-green-400 whitespace-nowrap">
                              ${(entry.amount || 0).toFixed(2)}
                            </td>
                            <td className="p-3 font-black text-yellow-600 dark:text-yellow-400">
                              {entry.flags ?? toFlags(entry.amount)}
                            </td>
                            <td className="p-3 text-slate-500 dark:text-slate-400 max-w-[180px] truncate">
                              {entry.notes || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}

      </div>
    );
  }

  // ── FULL VIEW (Transactions + Roster tabs) ────────────────────────────────────
  return (
    <div className="flex-1 p-6 md:p-10 w-full">
      <AdminPageHeader icon={DollarSign} title="Fundraiser" />

        <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
          {/* Fundraiser open/close toggle — S1/S3/staff only */}
          {canOpenFundraiser ? (
            <button
              onClick={handleToggleFundraiser}
              disabled={togglingOpen}
              className={`flex items-center gap-2 font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all border ${
                fundraiserIsOpen
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {togglingOpen ? <Loader2 size={13} className="animate-spin" /> : fundraiserIsOpen ? <Unlock size={13} /> : <Lock size={13} />}
              {fundraiserIsOpen ? 'Fundraiser Open' : 'Fundraiser Closed'}
            </button>
          ) : isCompanyInput && !fundraiserIsOpen ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5">
              <Lock size={13} className="text-slate-400" />
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Fundraiser not yet open — S1/S3 will open it when ready
              </p>
            </div>
          ) : <span />}

          {/* Log Payment button — company input only when open; S1/S3 always */}
          {canLogPayment && activeCompany && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-widest px-5 py-3 rounded-xl transition-all shadow-lg shadow-yellow-500/20"
            >
              <Plus size={16} /> Log Payment
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'transactions', label: 'Transactions', icon: <ReceiptText size={15} /> },
            { key: 'roster',       label: 'Roster',       icon: <Users       size={15} /> },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${
                activeTab === tab.key
                  ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20'
                  : 'bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:border-yellow-500/30'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Company filter (staff) */}
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
                {myCompany && !companies.includes(myCompany) && <option key={myCompany}>{myCompany}</option>}
                {companies.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        )}

        {/* ── Company Performance Graph (full-access only) ─────────────────── */}
        {canViewFull && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl p-6 mb-6 shadow-sm">
            <div className="flex items-start justify-between gap-4 mb-5 flex-wrap">
              <div>
                <h3 className="text-xs font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-widest flex items-center gap-2">
                  <BarChart3 size={14} /> Company Performance
                </h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  Fallen Heroes Fundraiser — goals auto-calculated from roster (÷ {OCTOBER_WEEKS} weeks of October)
                </p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-4 flex-wrap">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500">
                <div className="w-3 h-3 rounded-sm bg-emerald-500" /> Companies Raised ($)
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500">
                <div className="w-3 h-3 rounded-sm bg-yellow-500" /> Battalion Raised ($)
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-500">
                <div className="w-3 h-3 rounded-sm bg-yellow-500/40 border-2 border-yellow-500" /> Weekly Goal
              </div>
            </div>

            {/* Bars — lettered companies first, then Battalion HQ as a separate group */}
            {(() => {
              // Battalion total: sum all entries with company in BATTALION_COMPANIES
              const bnTotal = allEntries.filter(e => !e.voided && BATTALION_COMPANIES.includes(e.company))
                .reduce((s, e) => s + (e.amount || 0), 0);
              const bnGoalFlags = BATTALION_COMPANIES.reduce((s, co) => s + (companyGoals[co] || 0), 0);
              const bnGoalDollars = bnGoalFlags * 2;

              const allBars = [
                ...companyNames.map(co => ({ co, label: co, actual: companyTotals[co] || 0, goalFlags: companyGoals[co] || 0, isBn: false })),
                ...(bnTotal > 0 || bnGoalDollars > 0 ? [{ co: '_battalion', label: 'Battalion', actual: bnTotal, goalFlags: bnGoalFlags, isBn: true }] : []),
              ];
              const maxVal = Math.max(1, ...allBars.map(b => Math.max(b.actual, b.goalFlags * 2)));

              return (
                <div className="space-y-4">
                  {allBars.map(({ co, label, actual, goalFlags, isBn }) => {
                    const goalDollars = goalFlags * 2;
                    const pct  = (actual      / maxVal) * 100;
                    const gPct = (goalDollars / maxVal) * 100;
                    const ahead = actual >= goalDollars && goalDollars > 0;
                    return (
                      <div key={co}>
                        {isBn && <div className="border-t border-dashed border-slate-200 dark:border-white/5 mt-3 mb-4" />}
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase ${isBn ? 'text-yellow-600 dark:text-yellow-500' : 'text-slate-600 dark:text-slate-400'}`}>
                              {label}{isBn && ' · HQ'}
                            </span>
                            {goalFlags > 0 && (
                              <span className="text-[9px] text-slate-400 dark:text-slate-500">
                                Goal: {goalFlags.toLocaleString()} flags/wk (${goalDollars.toLocaleString()})
                              </span>
                            )}
                          </div>
                          <span className={`text-[10px] font-black ${ahead ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                            ${actual.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {ahead && ' ✓'}
                          </span>
                        </div>
                        <div className="relative h-4 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`absolute inset-y-0 left-0 rounded-full transition-all duration-500 ${isBn ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                          {goalDollars > 0 && (
                            <div
                              className="absolute inset-y-0 border-r-2 border-yellow-500"
                              style={{ left: `${Math.min(gPct, 100)}%` }}
                            />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Summary bar */}
        {activeCompany && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <SummaryCard icon={<DollarSign size={18} className="text-green-500" />} label="Total Raised" value={`$${totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} />
            <SummaryCard icon={<Flag size={18} className="text-yellow-500" />} label="Total Flags" value={totalFlags.toLocaleString()} />
            <SummaryCard icon={<ReceiptText size={18} className="text-blue-500" />} label="Active Payments" value={activeEntries.length.toLocaleString()} />
          </div>
        )}

        {/* ── TRANSACTIONS TAB ── */}
        {activeTab === 'transactions' && (
          dataLoading ? (
            <div className="space-y-2">
              {[1,2,3,4].map(n => <div key={n} className="h-14 bg-slate-100 dark:bg-slate-900/60 rounded-xl animate-pulse" />)}
            </div>
          ) : displayEntries.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl">
              <DollarSign className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={36} />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No payments logged yet</p>
              {canLogPayment && activeCompany && <button onClick={() => setShowModal(true)} className="mt-4 text-yellow-500 text-xs font-black uppercase hover:text-yellow-400">+ Log first payment</button>}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-blue-100 dark:border-white/5 shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-white/5">
                    {['Cadet', 'Payment', 'Amount', 'Flags', 'Notes', 'Logged By', 'Date/Time', ''].map(h => (
                      <th key={h} className="text-left p-3 font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayEntries.map((entry, idx) => {
                    const isVoided = !!entry.voided;
                    return (
                      <tr
                        key={entry.id}
                        className={`border-b border-slate-100 dark:border-white/5 transition-colors ${
                          isVoided
                            ? 'opacity-50 bg-red-50/40 dark:bg-red-900/10'
                            : idx % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-white/[0.02]'
                        }`}
                      >
                        <td className="p-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            {isVoided && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-[9px] font-black uppercase tracking-widest shrink-0">
                                <Ban size={8} /> Void
                              </span>
                            )}
                            <span className={`font-black ${isVoided ? 'line-through text-slate-400 dark:text-slate-600' : 'text-slate-900 dark:text-white'}`}>
                              {entry.cadetName}
                            </span>
                            {canViewAll && filterCompany === '' && (
                              <span className="text-[9px] font-bold text-slate-400">{entry.company}</span>
                            )}
                          </div>
                          {isVoided && entry.voidedByName && (
                            <p className="text-[9px] text-red-500/70 dark:text-red-400/60 mt-0.5">
                              Voided by {entry.voidedByName}
                              {entry.voidedAt?.toDate ? ` · ${entry.voidedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
                            </p>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${isVoided ? 'opacity-40 grayscale' : ''} ${PAYMENT_COLORS[entry.paymentType] || 'bg-slate-100'}`}>
                            {PAYMENT_TYPES.find(t => t.key === entry.paymentType)?.icon}
                            {PAYMENT_TYPES.find(t => t.key === entry.paymentType)?.label || entry.paymentType}
                          </span>
                        </td>
                        <td className={`p-3 font-black whitespace-nowrap ${isVoided ? 'line-through text-slate-400 dark:text-slate-600' : 'text-green-600 dark:text-green-400'}`}>
                          ${(entry.amount || 0).toFixed(2)}
                        </td>
                        <td className={`p-3 font-black whitespace-nowrap ${isVoided ? 'line-through text-slate-400 dark:text-slate-600' : 'text-yellow-600 dark:text-yellow-400'}`}>
                          {entry.flags ?? toFlags(entry.amount)}
                        </td>
                        <td className="p-3 text-slate-500 dark:text-slate-400 max-w-[160px] truncate">{entry.notes || '—'}</td>
                        <td className="p-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{entry.submittedByName || '—'}</td>
                        <td className="p-3 text-slate-400 whitespace-nowrap">
                          {entry.submittedAt?.toDate
                            ? entry.submittedAt.toDate().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </td>
                        <td className="p-3">
                          {canDelete && !isVoided && (
                            <button
                              onClick={() => setDeleteConf({ id: entry.id, cadetName: entry.cadetName, amount: entry.amount })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                              title="Void entry"
                            >
                              <Ban size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {/* ── ROSTER TAB ── */}
        {activeTab === 'roster' && (
          dataLoading ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map(n => <div key={n} className="h-14 bg-slate-100 dark:bg-slate-900/60 rounded-xl animate-pulse" />)}
            </div>
          ) : rosterAggregated.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl">
              <Users className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={36} />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">
                {activeCompany ? 'No cadets in roster' : 'Select a company to view roster'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-blue-100 dark:border-white/5 shadow-sm">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-white/5">
                    {['Rank', 'Cadet', 'Total Raised', 'Total Flags', 'Payments', 'Last Payment'].map(h => (
                      <th key={h} className="text-left p-3 font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rosterAggregated.map((cadet, idx) => (
                    <tr key={`${cadet.uid}_${cadet.fullName}`} className={`border-b border-slate-100 dark:border-white/5 ${idx % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-white/[0.02]'}`}>
                      <td className="p-3 text-slate-400">{cadet.rank || '—'}</td>
                      <td className="p-3 font-black text-slate-900 dark:text-white">{cadet.fullName}</td>
                      <td className="p-3">
                        <span className={`font-black ${cadet.total > 0 ? 'text-green-600 dark:text-green-400' : 'text-slate-400'}`}>
                          ${cadet.total.toFixed(2)}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`font-black ${cadet.flags > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-slate-400'}`}>
                          {cadet.flags > 0 ? cadet.flags : '—'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 dark:text-slate-400">{cadet.count || 0}</td>
                      <td className="p-3 text-slate-400">
                        {cadet.lastAt?.toDate
                          ? cadet.lastAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}


      {/* ── Log Payment Modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && (setShowModal(false), setForm(EMPTY_FORM))}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/10 rounded-3xl w-full max-w-md shadow-2xl"
            >
              <div className="p-6 border-b border-blue-100 dark:border-white/5 flex items-center justify-between">
                <h2 className="font-black uppercase text-sm tracking-widest flex items-center gap-2">
                  <DollarSign size={16} className="text-yellow-500" />
                  Log Payment — {activeCompany} Company
                </h2>
                <button onClick={() => (setShowModal(false), setForm(EMPTY_FORM))} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-5">
                {/* Cadet */}
                <div>
                  <label className={lc}>Cadet *</label>
                  {cadets.length > 0 ? (
                    <select
                      required={form.cadetId !== 'manual'}
                      value={form.cadetId}
                      onChange={e => setForm(f => ({ ...f, cadetId: e.target.value, cadetName: cadets.find(c => c.uid === e.target.value)?.fullName || '' }))}
                      className={ic}
                    >
                      <option value="">— Select Cadet —</option>
                      {cadets.map(c => <option key={c.uid} value={c.uid}>{c.fullName}</option>)}
                      <option value="manual">+ Enter manually</option>
                    </select>
                  ) : null}
                  {(form.cadetId === 'manual' || cadets.length === 0) && (
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

                {/* Payment type */}
                <div>
                  <label className={lc}>Payment Type *</label>
                  <div className="grid grid-cols-4 gap-2">
                    {PAYMENT_TYPES.map(pt => (
                      <button
                        key={pt.key}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, paymentType: pt.key }))}
                        className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all ${
                          form.paymentType === pt.key
                            ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                            : 'border-slate-200 dark:border-white/10 text-slate-500 hover:border-yellow-500/30'
                        }`}
                      >
                        {pt.icon} {pt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className={lc}>Dollar Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-black">$</span>
                    <input
                      required
                      type="number"
                      min="0.01"
                      step="0.01"
                      placeholder="0.00"
                      value={form.amount}
                      onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                      className={`${ic} pl-7`}
                    />
                  </div>
                  {form.amount && parseFloat(form.amount) > 0 && (
                    <p className="mt-2 text-xs font-black text-yellow-600 dark:text-yellow-400 ml-1">
                      = {liveFlags} flag{liveFlags !== 1 ? 's' : ''}
                      {parseFloat(form.amount) % 2 !== 0 && (
                        <span className="text-slate-400 font-normal ml-2">(${parseFloat(form.amount).toFixed(2)} → rounded down)</span>
                      )}
                    </p>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <label className={lc}>Notes (optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Check #1234, payment for week 3…"
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    className={`${ic} resize-none`}
                  />
                </div>

                <button
                  type="submit" disabled={saving}
                  className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : <><CheckCircle2 size={14} /> Save Payment</>}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Void Confirmation ── */}
      <AnimatePresence>
        {deleteConf && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-500/20 rounded-3xl p-8 max-w-sm w-full text-center">
              <Ban className="mx-auto text-red-500 mb-4" size={32} />
              <h3 className="font-black uppercase text-sm tracking-widest mb-2">Void Entry?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                Marks <strong>{deleteConf.cadetName}</strong>'s <strong>${(deleteConf.amount||0).toFixed(2)}</strong> payment as voided.
              </p>
              <p className="text-xs text-slate-400 mb-6">
                The entry stays in the transaction log with a VOID label for audit purposes and is excluded from all totals.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConf(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 font-black text-xs uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5">
                  Cancel
                </button>
                <button onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                  <Ban size={13} /> Void
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

// ── Summary Card ───────────────────────────────────────────────────────────────

const SummaryCard = ({ icon, label, value }) => (
  <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-2xl p-4 flex items-center gap-3 shadow-sm">
    <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-black/30 flex items-center justify-center shrink-0">{icon}</div>
    <div>
      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">{label}</p>
      <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">{value}</p>
    </div>
  </div>
);

export default AdminFundraiser;
