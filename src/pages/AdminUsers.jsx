import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, doc, updateDoc, onSnapshot, query,
  addDoc, serverTimestamp, deleteDoc
} from 'firebase/firestore';
import { sendResetPasswordEmail, sendEmailChangedNewAddress, sendEmailChangedOldAddress } from '../utils/emailjs';
import { useAuth } from '../hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import {
  UserCog, Search, ArrowLeft, CheckCircle2,
  Loader2, UserPlus, UserMinus, User, X, Edit3, KeyRound
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ROLE_HIERARCHY, ROLE_LABELS, ADMIN_LEVEL, STAFF_LEVEL } from '../constants';
import Footer from '../components/Footer';

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
  const [unlinkedAccounts, setUnlinkedAccounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [linkingRecord, setLinkingRecord] = useState(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginEmailStatus, setLoginEmailStatus] = useState(null);
  const [resetPasswordStatus, setResetPasswordStatus] = useState(null);
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

  // Dropdown Constants
  const JROTC_RANKS = ["C/PVT", "C/PFC", "C/CPL", "C/SGT", "C/SSG", "C/SFC", "C/MSG", "C/1SG", "C/SGM", "C/CSM", "C/2LT", "C/1LT", "C/CPT", "C/MAJ", "C/LTC", "C/COL"];
  const LET_LEVELS = ["LET 1", "LET 2", "LET 3", "LET 4"];
  const COMPANIES = ["Zulu", "Alpha", "Bravo", "Charlie", "Delta", "Battalion"];
  const PLATOONS = ["1st Platoon", "2nd Platoon", "3rd Platoon", "HQ Platoon"];
  const SQUADS = ["1st Squad", "2nd Squad", "3rd Squad", "4th Squad", "Staff"];
  const JROTC_POSITIONS = ["Squad Member", "Squad Leader", "Platoon Sergeant", "Platoon Leader", "First Sergeant", "Company XO", "Company Commander", "Battalion Staff (S-1)", "Battalion Staff (S-2)", "Battalion Staff (S-3)", "Battalion Staff (S-4)", "Battalion Staff (S-5)", "Battalion Staff (S-6)", "Battalion XO", "Battalion CSM", "Battalion Commander", "Team Lead"];

  const initialFormState = {
    fullName: '', email: '', company: user?.company || 'Zulu',
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
        allDocs.sort((a, b) => (a.fullName || a.name || '').localeCompare(b.fullName || b.name || ''));

        const roster = isBattalionStaff
          ? allDocs
          : allDocs.filter(p => p.company === user?.company);

        const unlinked = allDocs.filter(doc =>
          doc.uid && doc.id === doc.uid && (!doc.fullName || doc.fullName === '')
        );

        setPersonnel(roster);
        setUnlinkedAccounts(unlinked);
      });
      return () => unsubscribe();
    }
  }, [authLoading, isAuthorized, user?.company, isBattalionStaff]);

  const handleAction = async (e) => {
    e.preventDefault();

    if (!FULL_NAME_PATTERN.test(formData.fullName.trim())) {
      showStatus("Full Name Must Be: LASTNAME, FIRSTNAME");
      return;
    }

    try {
      if (editingRecord) {
        await updateDoc(doc(db, "users", editingRecord.id), {
          ...formData,
          updatedAt: serverTimestamp()
        });
        setEditingRecord(null);
        showStatus("Record Updated");
      } else {
        await addDoc(collection(db, "users"), {
          ...formData,
          createdAt: serverTimestamp(),
          createdBy: user.uid
        });
        setShowAddModal(false);
        showStatus("Cadet Added to Roster");
      }
      setFormData(initialFormState);
    } catch (err) {
      showStatus("Error Saving Record");
    }
  };

  const showStatus = (msg) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 3000);
  };

  // Changes the cadet's actual Firebase Auth login email via a server-side
  // Admin SDK call - the client SDK can only update the signed-in user's own
  // email, not another account's, so this can't be done from the browser alone.
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

      // The email change itself already succeeded above - a notification
      // failing shouldn't make this look like the update itself failed.
      try {
        await sendEmailChangedNewAddress(data.newEmail);
        if (data.oldEmail && data.oldEmail !== data.newEmail) {
          await sendEmailChangedOldAddress(data.oldEmail, data.newEmail);
        }
      } catch (notifyErr) {
        console.error('Email-change notification failed:', notifyErr);
      }
    } catch (err) {
      setLoginEmailStatus(err.message || 'error');
    }
  };

  // Generates the reset link server-side (api/admin-update-account.js,
  // gated the same as Update Login Email) and sends it ourselves via
  // EmailJS with a fully custom HTML template, instead of Firebase's own
  // auto-sent email. The endpoint resolves the target's real current email
  // itself rather than trusting editingRecord.email, so this always lands
  // on the account that's actually signed in.
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
      await sendResetPasswordEmail(data.email, data.resetLink);
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
          {personnel.filter(p => (p.fullName || '').toLowerCase().includes(searchTerm.toLowerCase())).map(p => (
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
                    <button onClick={() => { setEditingRecord(p); setFormData(p); setLoginEmail(p.email || ''); setLoginEmailStatus(null); setResetPasswordStatus(null); }} className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-yellow-500 hover:text-slate-950 transition-all text-slate-500">
                      <Edit3 size={18} />
                    </button>
                    {(p.isManual || isBattalionStaff) && (
                        <button onClick={async () => { if(window.confirm("Delete record?")) await deleteDoc(doc(db, "users", p.id)) }} className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-red-500 hover:text-white transition-all text-slate-500">
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