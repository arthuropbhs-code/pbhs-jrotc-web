import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, doc, updateDoc, onSnapshot, query,
  addDoc, serverTimestamp, deleteDoc
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import {
  UserCog, Search, ArrowLeft, CheckCircle2,
  Loader2, UserPlus, UserMinus, User, X, Edit3, KeyRound, Ban, Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ROLE_HIERARCHY, ROLE_LABELS, ADMIN_LEVEL, STAFF_LEVEL } from '../constants';
import { useCompanies } from '../hooks/useCompanies';
import Footer from '../components/Footer';
import { RosterRowSkeleton } from '../components/Skeleton';

// Requires the military roster convention: "LASTNAME, FIRSTNAME" (each side
// may be multiple words, e.g. "DE ALMEIDA, ARTHURO").
const FULL_NAME_PATTERN = /^[A-Za-z'-]+(?:\s+[A-Za-z'-]+)*,\s*[A-Za-z'-]+(?:\s+[A-Za-z'-]+)*$/;

const formatCooldown = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const AdminUsers = () => {
  const { user, role, loading: authLoading } = useAuth();
  
  const [personnel, setPersonnel] = useState([]);
  const [rosterLoading, setRosterLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginEmailStatus, setLoginEmailStatus] = useState(null);
  const [resetPasswordStatus, setResetPasswordStatus] = useState(null);
  const [suspendStatus, setSuspendStatus] = useState(null);
  const [deleteAccountStatus, setDeleteAccountStatus] = useState(null);
  // Keyed by target uid, not global - resetting one cadet's password
  // shouldn't block resetting a different cadet's right after.
  const [resetCooldowns, setResetCooldowns] = useState({});
  const [now, setNow] = useState(Date.now());

  const resetCooldownSeconds = editingRecord
    ? Math.max(0, Math.ceil(((resetCooldowns[editingRecord.id] || 0) - now) / 1000))
    : 0;

  useEffect(() => {
    if (resetCooldownSeconds <= 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [resetCooldownSeconds > 0]);

  const userLevel = ROLE_HIERARCHY[role] || 0;
  const isAuthorized = userLevel >= STAFF_LEVEL;
  const isBattalionStaff = userLevel >= ADMIN_LEVEL;

  // Mirrors api/admin-update-account.js's EMAIL_MANAGER_ROLES - this is just
  // a UI convenience gate, the endpoint itself is the real enforcement.
  const EMAIL_MANAGER_ROLES = [
    'senior_army_instructor', 'army_instructor',
    'battalion_commander', 'battalion_xo', 'battalion_csm', 'sergeant_major',
    's1_adjutant', 's6_technology'
  ];
  const canManageLoginFor = (targetRole) =>
    EMAIL_MANAGER_ROLES.includes(role) && (ROLE_HIERARCHY[targetRole] || 0) < userLevel;

  const ROLE_OPTIONS = Object.entries(ROLE_LABELS);
  const { companiesWithBattalion: COMPANIES } = useCompanies();

  // Dropdown Constants
  const JROTC_RANKS = ["C/PVT", "C/PFC", "C/CPL", "C/SGT", "C/SSG", "C/SFC", "C/MSG", "C/1SG", "C/SGM", "C/CSM", "C/2LT", "C/1LT", "C/CPT", "C/MAJ", "C/LTC", "C/COL"];
  const LET_LEVELS = ["LET 1", "LET 2", "LET 3", "LET 4"];
  const PLATOONS = ["1st Platoon", "2nd Platoon", "3rd Platoon", "HQ Platoon"];
  const SQUADS = ["1st Squad", "2nd Squad", "3rd Squad", "4th Squad", "Staff"];
  const JROTC_POSITIONS = ["Squad Member", "Squad Leader", "Platoon Sergeant", "Platoon Leader", "First Sergeant", "Company XO", "Company Commander", "Battalion Staff (S-1)", "Battalion Staff (S-2)", "Battalion Staff (S-3)", "Battalion Staff (S-4)", "Battalion Staff (S-5)", "Battalion Staff (S-6)", "Battalion XO", "Battalion CSM", "Battalion Commander", "Team Lead"];

  const initialFormState = {
    fullName: '', email: '', company: user?.company || COMPANIES[0] || 'Zulu',
    platoon: '1st Platoon', squad: '1st Squad', rank: 'C/PVT',
    position: 'Squad Member', letLevel: 'LET 1', status: 'Active',
    gender: 'Male', isManual: true, role: 'cadet'
  };

  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    if (!authLoading && isAuthorized) {
      // No orderBy here on purpose: Firestore silently excludes any document
      // missing the sorted field from the results, so a doc without fullName
      // (e.g. one created via an older path that only set `name`) would
      // vanish from the roster entirely. Sort client-side instead so every
      // account always shows up.
      const q = query(collection(db, "users"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const allDocs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Pending-approval accounts float to the top so they're never
        // missed in a long roster; alphabetical within each group.
        allDocs.sort((a, b) => {
          const pendingDiff = (a.approved === false ? 0 : 1) - (b.approved === false ? 0 : 1);
          if (pendingDiff !== 0) return pendingDiff;
          return (a.fullName || a.name || '').localeCompare(b.fullName || b.name || '');
        });

        const roster = isBattalionStaff
          ? allDocs
          : allDocs.filter(p => p.company === user?.company);

        setPersonnel(roster);
        setRosterLoading(false);
      }, () => setRosterLoading(false));
      return () => unsubscribe();
    }
  }, [authLoading, isAuthorized, user?.company, isBattalionStaff]);

  const handleAction = async (e) => {
    e.preventDefault();

    if (!FULL_NAME_PATTERN.test(formData.fullName.trim())) {
      showStatus("Full Name Must Be: LASTNAME, FIRSTNAME");
      return;
    }

    // A staff member saving an edit is treated as reviewing/approving the
    // account - a self-registered signup starts `approved: false` (see
    // SignUp.jsx) and flips to true the first time staff touches the
    // record here, which is also when the welcome email goes out.
    const wasPendingApproval = !!editingRecord && editingRecord.approved === false;

    try {
      if (editingRecord) {
        await updateDoc(doc(db, "users", editingRecord.id), {
          ...formData,
          approved: true,
          updatedAt: serverTimestamp()
        });
        setEditingRecord(null);
        showStatus("Record Updated");

        if (wasPendingApproval) {
          try {
            const idToken = await user.getIdToken();
            await fetch('/api/admin-update-account', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
              body: JSON.stringify({ type: 'welcome-notification', targetUid: editingRecord.id })
            });
          } catch (notifyErr) {
            console.error('Welcome email failed:', notifyErr);
          }
        }
      } else {
        await addDoc(collection(db, "users"), {
          ...formData,
          approved: true,
          createdAt: serverTimestamp(),
          createdBy: user.uid
        });
        setShowAddModal(false);
        showStatus("Cadet Added to Roster");
      }
      setFormData(initialFormState);
    } catch {
      showStatus("Error Saving Record");
    }
  };

  const showStatus = (msg) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 3000);
  };

  // Changes the cadet's actual Firebase Auth login email via a server-side
  // Admin SDK call - the client SDK can only update the signed-in user's own
  // email, not another account's, so this can't be done from the browser
  // alone. The endpoint also sends both notification emails itself.
  const handleUpdateLoginEmail = async (e) => {
    e.preventDefault();
    if (!editingRecord || !loginEmail.trim()) return;
    setLoginEmailStatus('saving');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/admin-update-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ targetUid: editingRecord.id, newEmail: loginEmail.trim().toLowerCase() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update login email');
      setLoginEmailStatus('success');
      setTimeout(() => setLoginEmailStatus(null), 3000);
    } catch (err) {
      setLoginEmailStatus(err.message || 'error');
    }
  };

  // Generates the reset link AND sends it via a custom HTML template, both
  // server-side (api/admin-update-account.js, gated the same as Update
  // Login Email) - the raw link never reaches this browser, since it's a
  // live account-takeover credential otherwise. The endpoint resolves the
  // target's real current email itself rather than trusting
  // editingRecord.email, so this always lands on the account that's
  // actually signed in.
  const handleResetPassword = async () => {
    if (!editingRecord || resetCooldownSeconds > 0) return;
    setResetPasswordStatus('sending');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/admin-update-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ type: 'reset-password', targetUid: editingRecord.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate reset link');
      setResetPasswordStatus('success');
      setNow(Date.now());
      setResetCooldowns(prev => ({ ...prev, [editingRecord.id]: Date.now() + 60_000 }));
      setTimeout(() => setResetPasswordStatus(null), 3000);
    } catch (err) {
      // Firebase's own server-side rate limit on generating reset links -
      // separate from (and outlasting) our 60s cooldown above. There's no
      // way to know its exact remaining window, so show a longer active
      // countdown instead of a raw error code sitting there indefinitely.
      if ((err.message || '').includes('EXCEED_LIMIT')) {
        setResetPasswordStatus(null);
        setNow(Date.now());
        setResetCooldowns(prev => ({ ...prev, [editingRecord.id]: Date.now() + 5 * 60_000 }));
        return;
      }
      setResetPasswordStatus(err.message || 'error');
    }
  };

  // Disables/re-enables the account's actual Firebase Auth login (blocks
  // sign-in entirely, not just a soft in-app flag) and mirrors the state to
  // Firestore for the roster badge below.
  const handleToggleSuspend = async () => {
    if (!editingRecord) return;
    const suspending = !editingRecord.suspended;
    if (!window.confirm(`${suspending ? 'Suspend' : 'Reactivate'} ${editingRecord.fullName || 'this account'}?`)) return;
    setSuspendStatus('working');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/admin-update-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ type: 'suspend-account', targetUid: editingRecord.id, suspend: suspending })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update suspension status');
      setEditingRecord(prev => prev && ({ ...prev, suspended: suspending }));
      setSuspendStatus('success');
      setTimeout(() => setSuspendStatus(null), 3000);
    } catch (err) {
      setSuspendStatus(err.message || 'error');
    }
  };

  // Permanently deletes the account (Firebase Auth user + Firestore
  // record) - irreversible, hence the typed confirmation instead of a
  // plain window.confirm.
  const handleDeleteAccount = async () => {
    if (!editingRecord) return;
    const typed = window.prompt(`This permanently deletes ${editingRecord.fullName || 'this account'}. Type DELETE to confirm.`);
    if (typed !== 'DELETE') return;
    setDeleteAccountStatus('working');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/admin-update-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ type: 'delete-account', targetUid: editingRecord.id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account');
      setEditingRecord(null);
      showStatus('Account Deleted');
    } catch (err) {
      setDeleteAccountStatus(err.message || 'error');
    }
  };

  if (authLoading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-yellow-600">
      <Loader2 className="animate-spin" />
    </div>
  );
  
  if (!isAuthorized) return <Navigate to="/admin/dashboard" />;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-6 md:p-12 pt-24 font-sans transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <Link to="/admin/dashboard" className="text-slate-400 dark:text-slate-500 hover:text-yellow-600 dark:hover:text-yellow-500 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-4">
              <ArrowLeft size={14} /> Back to Command
            </Link>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              <UserCog className="text-yellow-600 dark:text-yellow-500" /> {isBattalionStaff ? 'Battalion' : user?.company + ' Company'} Personnel
            </h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setFormData(initialFormState); setShowAddModal(true); }}
              className="bg-yellow-500 text-slate-950 px-6 py-3 rounded-2xl font-black uppercase text-xs flex items-center gap-2 hover:bg-yellow-400 shadow-lg shadow-yellow-500/20 transition-all"
            >
              <UserPlus size={18} /> New Entry
            </button>
          </div>
        </div>

        {personnel.some(p => p.approved === false) && (
          <div className="mb-6 bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 flex items-center gap-3">
            <UserPlus size={18} className="text-yellow-600 dark:text-yellow-500 shrink-0" />
            <p className="text-xs font-bold text-yellow-700 dark:text-yellow-500">
              {personnel.filter(p => p.approved === false).length} account{personnel.filter(p => p.approved === false).length === 1 ? '' : 's'} pending approval - review and edit their record below to assign a rank and approve them.
            </p>
          </div>
        )}

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search roster by name..." 
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-4 pl-12 rounded-2xl outline-none focus:ring-2 ring-yellow-500/20 transition-all font-bold text-slate-900 dark:text-white shadow-sm"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Roster List */}
        <div className="grid gap-4">
          {rosterLoading ? (
            <>
              <RosterRowSkeleton />
              <RosterRowSkeleton />
              <RosterRowSkeleton />
              <RosterRowSkeleton />
              <RosterRowSkeleton />
            </>
          ) : personnel.filter(p => (p.fullName || '').toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
             <div key={p.id} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 p-6 rounded-[2rem] flex flex-wrap items-center justify-between gap-6 hover:shadow-md transition-all">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500">
                        <User size={20}/>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="font-black uppercase italic text-lg">{p.fullName || "Unnamed Account"}</h3>
                            {!p.isManual && (
                                <div className="flex items-center gap-1 text-green-600 dark:text-green-500 text-[9px] font-black uppercase">
                                  <CheckCircle2 size={14} /> Verified
                                </div>
                            )}
                            {p.suspended && (
                                <div className="flex items-center gap-1 text-orange-500 text-[9px] font-black uppercase">
                                  <Ban size={14} /> Suspended
                                </div>
                            )}
                            {p.approved === false && (
                                <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500 text-[9px] font-black uppercase animate-pulse">
                                  <UserPlus size={14} /> Pending Approval
                                </div>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-2 mt-1">
                            <span className="text-[9px] font-black text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded uppercase">{p.rank}</span>
                            <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded uppercase">{p.position}</span>
                            <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded uppercase">{p.platoon}</span>
                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded uppercase">{p.squad}</span>
                            <span className="text-[9px] font-black text-green-700 dark:text-green-400 bg-green-500/10 px-2 py-0.5 rounded uppercase">
                              {ROLE_LABELS[p.role] || p.role || 'Cadet (Unassigned)'} · Lvl {ROLE_HIERARCHY[p.role] || 0}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button title="Edit personnel record" onClick={() => { setEditingRecord(p); setFormData(p); setLoginEmail(p.email || ''); setLoginEmailStatus(null); setResetPasswordStatus(null); setSuspendStatus(null); setDeleteAccountStatus(null); }} className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-yellow-500 hover:text-slate-950 transition-all text-slate-500">
                      <Edit3 size={18} />
                    </button>
                    {(p.isManual || isBattalionStaff) && (
                        <button title="Delete this record" onClick={async () => { if(window.confirm("Delete record?")) await deleteDoc(doc(db, "users", p.id)) }} className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-red-500 hover:text-white transition-all text-slate-500">
                            <UserMinus size={18} />
                        </button>
                    )}
                </div>
             </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {(showAddModal || editingRecord) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm" onClick={() => { setShowAddModal(false); setEditingRecord(null); }} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 md:p-10 rounded-[3rem] max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
              <h2 className="text-3xl font-black uppercase italic mb-8 tracking-tighter text-slate-900 dark:text-white">
                {editingRecord ? 'Edit Personnel' : 'New Personnel Record'}
              </h2>
              
              <form onSubmit={handleAction} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Full Legal Name</label>
                  <input required className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none focus:border-yellow-500 text-sm font-bold text-slate-900 dark:text-white" placeholder="LASTNAME, FIRSTNAME" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value.toUpperCase()})} />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Contact Email (matches signups to this record - not their login)</label>
                  <input required className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none focus:border-yellow-500 text-sm font-bold text-slate-900 dark:text-white" placeholder="cadet@email.com" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value.toLowerCase()})} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Company</label>
                  <select disabled={!isBattalionStaff} className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none text-sm font-bold text-slate-900 dark:text-white disabled:opacity-50 appearance-none" value={formData.company} onChange={e => {
                    const nextCompany = e.target.value;
                    setFormData({
                      ...formData,
                      company: nextCompany,
                      ...(nextCompany === 'Battalion'
                        ? { platoon: 'HQ Platoon', squad: 'Staff' }
                        : (formData.company === 'Battalion' ? { platoon: '1st Platoon', squad: '1st Squad' } : {}))
                    });
                  }}>
                    {COMPANIES.map(c => <option key={c} value={c} className="bg-white dark:bg-slate-900">{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">LET Level</label>
                  <select className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none text-sm font-bold text-slate-900 dark:text-white appearance-none" value={formData.letLevel} onChange={e => setFormData({...formData, letLevel: e.target.value})}>
                    {LET_LEVELS.map(l => <option key={l} value={l} className="bg-white dark:bg-slate-900">{l}</option>)}
                  </select>
                </div>

                {formData.company !== 'Battalion' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Platoon</label>
                    <select className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none text-sm font-bold text-slate-900 dark:text-white appearance-none" value={formData.platoon} onChange={e => setFormData({...formData, platoon: e.target.value})}>
                      {PLATOONS.map(p => <option key={p} value={p} className="bg-white dark:bg-slate-900">{p}</option>)}
                    </select>
                  </div>
                )}

                {formData.company !== 'Battalion' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Squad</label>
                    <select className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none text-sm font-bold text-slate-900 dark:text-white appearance-none" value={formData.squad} onChange={e => setFormData({...formData, squad: e.target.value})}>
                      {SQUADS.map(s => <option key={s} value={s} className="bg-white dark:bg-slate-900">{s}</option>)}
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Rank</label>
                  <select className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none text-sm font-bold text-slate-900 dark:text-white appearance-none" value={formData.rank} onChange={e => setFormData({...formData, rank: e.target.value})}>
                    {/* A legacy value that predates this dropdown (e.g. free-typed "CDT MAJ")
                        won't match any option below - show it as-is instead of the <select>
                        silently defaulting to whichever option happens to be first, which
                        would overwrite it with the wrong rank on the next save. */}
                    {formData.rank && !JROTC_RANKS.includes(formData.rank) && (
                      <option value={formData.rank} className="bg-white dark:bg-slate-900">{formData.rank} (legacy - please update)</option>
                    )}
                    {JROTC_RANKS.map(r => <option key={r} value={r} className="bg-white dark:bg-slate-900">{r}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Position</label>
                  <select className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none text-sm font-bold text-slate-900 dark:text-white appearance-none" value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})}>
                    {JROTC_POSITIONS.map(p => <option key={p} value={p} className="bg-white dark:bg-slate-900">{p}</option>)}
                  </select>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Access Role (Determines Permission Level)</label>
                  <select className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none text-sm font-bold text-slate-900 dark:text-white appearance-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                    {ROLE_OPTIONS.map(([slug, label]) => (
                      <option key={slug} value={slug} className="bg-white dark:bg-slate-900">
                        {label} (Level {ROLE_HIERARCHY[slug]})
                      </option>
                    ))}
                  </select>
                </div>

                <button type="submit" className="md:col-span-2 w-full bg-yellow-500 text-slate-950 font-black uppercase py-5 rounded-2xl hover:bg-yellow-400 transition-all mt-4 text-sm shadow-lg shadow-yellow-500/20">
                  {editingRecord ? 'Update Record' : 'Authorize & Add to Roster'}
                </button>
              </form>

              {/* Real Firebase Auth login email - separate from the contact-email field above.
                  Only meaningful for an already-linked account. Changing your OWN login lives
                  in My Profile instead; this is only for changing someone else's. */}
              {editingRecord && editingRecord.id === user?.uid && (
                <p className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5 text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest text-center">
                  Manage your own login email from My Profile.
                </p>
              )}
              {editingRecord && editingRecord.id !== user?.uid && !editingRecord.isManual && canManageLoginFor(editingRecord.role) && (
                <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5">
                  <h3 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-1">Login Credentials</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold mb-4 leading-relaxed">
                    Changes the email this cadet actually signs in with. Use this when someone loses access to their old inbox or is leaving the account to a successor.
                  </p>
                  <form onSubmit={handleUpdateLoginEmail} className="flex gap-3">
                    <input
                      type="email"
                      required
                      className="flex-1 bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none focus:border-yellow-500 text-sm font-bold text-slate-900 dark:text-white"
                      placeholder="new-login@email.com"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                    />
                    <button
                      type="submit"
                      disabled={loginEmailStatus === 'saving'}
                      className={`px-6 rounded-2xl font-black uppercase text-xs whitespace-nowrap transition-all ${loginEmailStatus === 'success' ? 'bg-green-500 text-white' : 'bg-slate-900 dark:bg-white/10 text-white hover:bg-slate-800 dark:hover:bg-white/20 disabled:opacity-50'}`}
                    >
                      {loginEmailStatus === 'saving' ? 'Saving...' : loginEmailStatus === 'success' ? 'Updated' : 'Update Login Email'}
                    </button>
                  </form>
                  {loginEmailStatus && loginEmailStatus !== 'saving' && loginEmailStatus !== 'success' && (
                    <p className="text-[10px] text-red-500 font-bold mt-2">{loginEmailStatus}</p>
                  )}

                  <div className="flex items-center justify-between gap-4 mt-6 pt-6 border-t border-slate-100 dark:border-white/5 flex-wrap">
                    <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest">
                      Sends a password reset link to {editingRecord.email}
                    </p>
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={resetPasswordStatus === 'sending' || resetCooldownSeconds > 0}
                      className={`px-6 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-2 whitespace-nowrap transition-all ${resetPasswordStatus === 'success' ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 disabled:opacity-50'}`}
                    >
                      <KeyRound size={14} />
                      {resetPasswordStatus === 'sending' ? 'Sending...' : resetPasswordStatus === 'success' ? 'Email Sent' : resetCooldownSeconds > 0 ? `Wait ${formatCooldown(resetCooldownSeconds)}` : 'Reset Password'}
                    </button>
                  </div>
                  {resetPasswordStatus && resetPasswordStatus !== 'sending' && resetPasswordStatus !== 'success' && (
                    <p className="text-[10px] text-red-500 font-bold mt-2">{resetPasswordStatus}</p>
                  )}

                  {/* DANGER ZONE */}
                  <div className="mt-8 pt-8 border-t border-red-500/20 space-y-4">
                    <h3 className="text-[10px] font-black uppercase text-red-500 tracking-widest">Danger Zone</h3>

                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest">
                        {editingRecord.suspended ? 'Account is suspended - blocked from signing in.' : 'Blocks this account from signing in until reactivated.'}
                      </p>
                      <button
                        type="button"
                        onClick={handleToggleSuspend}
                        disabled={suspendStatus === 'working'}
                        className="px-6 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-2 whitespace-nowrap transition-all bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 disabled:opacity-50"
                      >
                        <Ban size={14} />
                        {suspendStatus === 'working' ? 'Working...' : editingRecord.suspended ? 'Reactivate Account' : 'Suspend Account'}
                      </button>
                    </div>
                    {suspendStatus && suspendStatus !== 'working' && suspendStatus !== 'success' && (
                      <p className="text-[10px] text-red-500 font-bold">{suspendStatus}</p>
                    )}

                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest">
                        Permanently deletes this account. Cannot be undone.
                      </p>
                      <button
                        type="button"
                        onClick={handleDeleteAccount}
                        disabled={deleteAccountStatus === 'working'}
                        className="px-6 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-2 whitespace-nowrap transition-all bg-red-500/10 text-red-500 hover:bg-red-500/20 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        {deleteAccountStatus === 'working' ? 'Deleting...' : 'Delete Account'}
                      </button>
                    </div>
                    {deleteAccountStatus && deleteAccountStatus !== 'working' && (
                      <p className="text-[10px] text-red-500 font-bold">{deleteAccountStatus}</p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success/Error Status Toast */}
      <AnimatePresence>
        {status && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="fixed bottom-8 right-8 bg-yellow-500 text-slate-950 px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-3 shadow-2xl z-[200]">
            <CheckCircle2 size={18} /> {status}
          </motion.div>
        )}
      </AnimatePresence>
      <Footer />
    </div>
  );
};

export default AdminUsers;