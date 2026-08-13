// src/pages/AdminFundraiser.jsx
//
// Fallen Heroes Fundraiser Tracking
//
// Two tabs:
//   Transactions — every payment entry for the company (cadet, amount, flags,
//                   payment type, who logged it, date/time).
//   Roster       — full company roster aggregated to show each cadet's
//                   total $ raised and flag count.
//
// $2 = 1 flag, rounded down.  e.g. $5 → 2 flags ($4 credited).
//
// Input roles (own company): company_commander, company_xo, company_1sg
// Input roles (any company): s1_adjutant, s3_operations + all admin-level users
// View all companies:         staff level 70+
// Delete entries:             admin level 80+

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { db } from '../firebase';
import {
  collection, addDoc, deleteDoc, doc, onSnapshot,
  query, orderBy, where, serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { useCompanies } from '../hooks/useCompanies';
import { ROLE_HIERARCHY, ROLE_LABELS } from '../constants';
import {
  DollarSign, Flag, Plus, Trash2, X, Loader2, CheckCircle2,
  Filter, Banknote, FileText, Smartphone, ShoppingCart,
  Users, ReceiptText, ChevronDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Footer from '../components/Footer';
import ScrambleText from '../components/ScrambleText';

// ── Constants ──────────────────────────────────────────────────────────────────

// Roles that may input entries for their own company
const COMPANY_INPUT_ROLES = ['company_commander', 'company_xo', 'company_1sg'];
// Battalion roles that may input for any company
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

// $2 = 1 flag, round down
const toFlags = (amount) => Math.floor((amount || 0) / 2);

const ic = 'w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-3 rounded-xl outline-none focus:border-yellow-500 text-sm font-bold text-slate-900 dark:text-white transition-all';
const lc = 'text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 block mb-1 tracking-widest';

const EMPTY_FORM = {
  cadetId: '', cadetName: '', paymentType: 'cash', amount: '', notes: '',
};

// ── Main Component ─────────────────────────────────────────────────────────────

const AdminFundraiser = () => {
  const { user, userData, role, loading: authLoading } = useAuth();
  const { companies } = useCompanies();

  const userLevel      = ROLE_HIERARCHY[role] || 0;
  const myCompany      = userData?.company || '';
  const canInput       = COMPANY_INPUT_ROLES.includes(role) || BN_INPUT_ROLES.includes(role) || userLevel >= ADMIN_LEVEL;
  const canInputOwn    = COMPANY_INPUT_ROLES.includes(role) || BN_INPUT_ROLES.includes(role) || userLevel >= ADMIN_LEVEL;
  const canViewAll     = BN_INPUT_ROLES.includes(role) || userLevel >= STAFF_LEVEL;
  const canDelete      = userLevel >= ADMIN_LEVEL;

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [activeTab,    setActiveTab]    = useState('transactions');
  const [filterCompany,setFilterCompany]= useState('');
  const [showModal,    setShowModal]    = useState(false);
  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [deleteConf,   setDeleteConf]   = useState(null);
  const [toast,        setToast]        = useState(null);
  const [dataLoading,  setDataLoading]  = useState(true);

  // ── Data state ────────────────────────────────────────────────────────────────
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

  // ── Subscribe: entries ────────────────────────────────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    setDataLoading(true);
    let q;
    if (canViewAll && !filterCompany) {
      // View all — no company filter; sorted newest first
      q = query(collection(db, 'fundraiserEntries'), orderBy('submittedAt', 'desc'));
    } else if (activeCompany) {
      q = query(
        collection(db, 'fundraiserEntries'),
        where('company', '==', activeCompany),
        orderBy('submittedAt', 'desc'),
      );
    } else {
      setEntries([]); setDataLoading(false); return;
    }
    const unsub = onSnapshot(q, snap => {
      setEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setDataLoading(false);
    }, () => setDataLoading(false));
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, filterCompany, activeCompany, canViewAll, role]);

  // ── Subscribe: roster (cadets) for active company ─────────────────────────────
  useEffect(() => {
    if (!activeCompany) { setCadets([]); return; }
    const q = query(
      collection(db, 'roster'),
      where('company', '==', activeCompany),
      orderBy('fullName', 'asc'),
    );
    const unsub = onSnapshot(q, snap => {
      setCadets(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [activeCompany]);

  // ── Computed ──────────────────────────────────────────────────────────────────
  const displayEntries = useMemo(() => {
    if (canViewAll && !filterCompany) return entries;
    return entries.filter(e => e.company === activeCompany);
  }, [entries, activeCompany, canViewAll, filterCompany]);

  const totalAmount = useMemo(() => displayEntries.reduce((s, e) => s + (e.amount || 0), 0), [displayEntries]);
  const totalFlags  = useMemo(() => displayEntries.reduce((s, e) => s + (e.flags  || 0), 0), [displayEntries]);

  // Roster aggregated view: each cadet with their totals
  const rosterAggregated = useMemo(() => {
    const byId = {};
    displayEntries.forEach(e => {
      const key = e.cadetId === 'manual' ? `manual_${e.cadetName}` : e.cadetId;
      if (!byId[key]) byId[key] = { cadetId: e.cadetId, cadetName: e.cadetName, total: 0, flags: 0, count: 0, lastAt: null };
      byId[key].total += e.amount || 0;
      byId[key].flags += e.flags  || 0;
      byId[key].count += 1;
      if (!byId[key].lastAt || (e.submittedAt?.seconds > byId[key].lastAt?.seconds)) {
        byId[key].lastAt = e.submittedAt;
      }
    });
    // Merge with full roster so cadets with $0 still appear
    const result = cadets.map(c => ({
      uid: c.uid,
      fullName: c.fullName,
      company: c.company,
      rank: c.rank,
      ...(byId[c.uid] || { total: 0, flags: 0, count: 0, lastAt: null }),
    }));
    // Also include manually-entered names not in the roster
    Object.values(byId).forEach(agg => {
      if (agg.cadetId === 'manual' && !result.find(r => r.uid === agg.cadetId)) {
        result.push({ uid: 'manual', fullName: agg.cadetName, rank: '', ...agg });
      }
    });
    return result.sort((a, b) => b.total - a.total || (a.fullName || '').localeCompare(b.fullName || ''));
  }, [displayEntries, cadets]);

  // ── Toast ─────────────────────────────────────────────────────────────────────
  const showToast = useCallback(msg => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }, []);

  // ── Save payment ──────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    const name = form.cadetId === 'manual' ? form.cadetName.trim() : (cadets.find(c => c.uid === form.cadetId)?.fullName || form.cadetName.trim());
    if (!name) { showToast('Select or enter a cadet name.'); return; }
    if (!form.amount || Number(form.amount) <= 0) { showToast('Enter a valid amount.'); return; }
    if (!activeCompany) { showToast('Company not determined.'); return; }
    setSaving(true);
    try {
      const amt   = parseFloat(form.amount);
      const flags = toFlags(amt);
      await addDoc(collection(db, 'fundraiserEntries'), {
        company:         activeCompany,
        cadetId:         form.cadetId || 'manual',
        cadetName:       name,
        paymentType:     form.paymentType,
        amount:          amt,
        flags,
        notes:           form.notes.trim() || null,
        submittedByUid:  user.uid,
        submittedByName: userData?.fullName || '',
        submittedAt:     serverTimestamp(),
        createdAt:       serverTimestamp(),
      });
      showToast('Payment logged');
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error(err);
      showToast('Save failed — try again');
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteConf) return;
    try {
      await deleteDoc(doc(db, 'fundraiserEntries', deleteConf.id));
      setDeleteConf(null);
      showToast('Entry deleted');
    } catch { showToast('Delete failed'); }
  };

  // ── Access check ──────────────────────────────────────────────────────────────
  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-yellow-500" size={40} />
    </div>
  );

  const hasAccess = canInput || canViewAll;
  if (!hasAccess) return (
    <div className="min-h-screen flex items-center justify-center text-center p-8">
      <div>
        <DollarSign className="mx-auto text-yellow-500 mb-4" size={40} />
        <p className="font-black uppercase text-sm text-slate-500">Access Restricted</p>
        <p className="text-xs text-slate-400 mt-2">This page is for Company Leadership and above.</p>
      </div>
    </div>
  );

  const liveFlags = toFlags(parseFloat(form.amount) || 0);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 text-slate-900 dark:text-slate-100">
      <main className="p-6 md:p-10 max-w-7xl">

        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
              <ScrambleText text="Fallen " trigger="mount" />
              <span className="text-yellow-500"><ScrambleText text="Heroes" trigger="mount" /></span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 mt-1">
              Fundraiser Tracking · {ROLE_LABELS[role] || role}
            </p>
          </div>

          {canInputOwn && activeCompany && (
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

        {/* Summary bar */}
        {activeCompany && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <SummaryCard icon={<DollarSign size={18} className="text-green-500" />} label="Total Raised" value={`$${totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} />
            <SummaryCard icon={<Flag size={18} className="text-yellow-500" />} label="Total Flags" value={totalFlags.toLocaleString()} />
            <SummaryCard icon={<ReceiptText size={18} className="text-blue-500" />} label="Transactions" value={displayEntries.length.toLocaleString()} />
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
              {canInputOwn && <button onClick={() => setShowModal(true)} className="mt-4 text-yellow-500 text-xs font-black uppercase hover:text-yellow-400">+ Log first payment</button>}
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
                  {displayEntries.map((entry, idx) => (
                    <tr key={entry.id} className={`border-b border-slate-100 dark:border-white/5 ${idx % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-white/[0.02]'}`}>
                      <td className="p-3 font-black text-slate-900 dark:text-white whitespace-nowrap">
                        {entry.cadetName}
                        {canViewAll && filterCompany === '' && (
                          <span className="ml-2 text-[9px] font-bold text-slate-400">{entry.company}</span>
                        )}
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
                      <td className="p-3 font-black text-yellow-600 dark:text-yellow-400 whitespace-nowrap">
                        🚩 {entry.flags ?? toFlags(entry.amount)}
                      </td>
                      <td className="p-3 text-slate-500 dark:text-slate-400 max-w-[160px] truncate">{entry.notes || '—'}</td>
                      <td className="p-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">{entry.submittedByName || '—'}</td>
                      <td className="p-3 text-slate-400 whitespace-nowrap">
                        {entry.submittedAt?.toDate
                          ? entry.submittedAt.toDate().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td className="p-3">
                        {canDelete && (
                          <button
                            onClick={() => setDeleteConf({ id: entry.id, cadetName: entry.cadetName, amount: entry.amount })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
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
                          {cadet.flags > 0 ? `🚩 ${cadet.flags}` : '—'}
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

        <Footer />
      </main>

      {/* ── Log Payment Modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
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
                      = 🚩 {liveFlags} flag{liveFlags !== 1 ? 's' : ''}
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

      {/* ── Delete Confirmation ── */}
      <AnimatePresence>
        {deleteConf && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-500/20 rounded-3xl p-8 max-w-sm w-full text-center">
              <Trash2 className="mx-auto text-red-500 mb-4" size={32} />
              <h3 className="font-black uppercase text-sm tracking-widest mb-2">Delete Entry?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Permanently removes <strong>{deleteConf.cadetName}</strong>'s ${(deleteConf.amount||0).toFixed(2)} payment.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConf(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 font-black text-xs uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5">
                  Cancel
                </button>
                <button onClick={handleDelete}
                  className="flex-1 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black text-xs uppercase tracking-widest">
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
