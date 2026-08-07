import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getInitials } from '../utils/getInitials';
import { db, auth } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { ROLE_LABELS } from '../constants';
import Footer from '../components/Footer';
import { ArrowLeft, Mail, Phone, Save, KeyRound, CheckCircle, Trash2 } from 'lucide-react';

const formatCooldown = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const MyProfile = () => {
  const { user, userData, role } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetStatus, setResetStatus] = useState(null); // null | 'sending' | 'success' | error string
  const [loginEmail, setLoginEmail] = useState('');
  const [loginEmailStatus, setLoginEmailStatus] = useState(null);
  const [resetCooldownUntil, setResetCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [deleteAccountStatus, setDeleteAccountStatus] = useState(null);

  const resetCooldownSeconds = Math.max(0, Math.ceil((resetCooldownUntil - now) / 1000));

  // Only ticks while an actual cooldown is running - not on every render.
  useEffect(() => {
    if (resetCooldownSeconds <= 0) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [resetCooldownSeconds > 0]);

  useEffect(() => {
    setPhone(userData?.phone || '');
  }, [userData?.phone]);

  useEffect(() => {
    setLoginEmail(user?.email || '');
  }, [user?.email]);

  const handleSavePhone = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Profile update failed:", err);
    } finally {
      setSaving(false);
    }
  };

  // Changes the actual Firebase Auth email you sign in with, via a
  // server-side endpoint (the client SDK can't change a user's own email
  // without a very recent re-login, and this avoids that friction). The
  // endpoint also sends both notification emails itself.
  const handleUpdateLoginEmail = async (e) => {
    e.preventDefault();
    if (!user || !loginEmail.trim()) return;
    setLoginEmailStatus('saving');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/admin-update-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ targetUid: user.uid, newEmail: loginEmail.trim().toLowerCase() })
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
  // server-side (api/admin-update-account.js) - the raw link never reaches
  // this browser, since it's a live account-takeover credential otherwise.
  const handlePasswordReset = async () => {
    if (!user || resetStatus === 'sending' || resetCooldownSeconds > 0) return;
    // Set immediately, before any network call - otherwise the button looks
    // unresponsive during the request and invites exactly the repeated
    // clicking that caused a burst of duplicate emails last time.
    setResetStatus('sending');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/admin-update-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ type: 'reset-password', targetUid: user.uid })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate reset link');
      setResetStatus('success');
      setNow(Date.now());
      setResetCooldownUntil(Date.now() + 60_000);
      setTimeout(() => setResetStatus(null), 5000);
    } catch (err) {
      // Firebase's own server-side rate limit on generating reset links -
      // separate from (and outlasting) our 60s cooldown above. There's no
      // way to know its exact remaining window, so show a longer active
      // countdown instead of a raw error code sitting there indefinitely.
      if ((err.message || '').includes('EXCEED_LIMIT')) {
        setResetStatus(null);
        setNow(Date.now());
        setResetCooldownUntil(Date.now() + 5 * 60_000);
        return;
      }
      setResetStatus(err.message || 'error');
    }
  };

  // Permanently deletes your own account (Firebase Auth user + Firestore
  // record) via the same server endpoint used for admin actions - typed
  // confirmation since this is irreversible, then sign out and leave.
  const handleDeleteAccount = async () => {
    if (!user) return;
    const typed = window.prompt('This permanently deletes your account and cannot be undone. Type DELETE to confirm.');
    if (typed !== 'DELETE') return;
    setDeleteAccountStatus('working');
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/admin-update-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ type: 'delete-account', targetUid: user.uid })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account');
      await signOut(auth);
      navigate('/');
    } catch (err) {
      setDeleteAccountStatus(err.message || 'error');
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pt-24 px-6 pb-20 transition-colors duration-300">
      <div className="max-w-2xl mx-auto">
        <Link to="/admin/dashboard" className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-yellow-600 dark:hover:text-yellow-500 mb-8 text-[10px] font-black uppercase tracking-widest transition-colors">
          <ArrowLeft size={14} /> Back to Command
        </Link>

        <div className="flex items-center gap-5 mb-8">
          <div className="w-16 h-16 rounded-full bg-yellow-500 text-slate-950 flex items-center justify-center text-xl font-black uppercase shrink-0">
            {getInitials(userData?.fullName) || '?'}
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter">My Profile</h1>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              {userData?.rank} &middot; {ROLE_LABELS[role] || role?.replace('_', ' ')}
            </p>
          </div>
        </div>

        {/* PERSONNEL RECORD */}
        <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/10 rounded-3xl p-8 shadow-sm dark:shadow-none mb-6">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-6">Personnel Record</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-1">Full Name</p>
              <p className="text-sm font-bold">{userData?.fullName || '—'}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-1">Rank</p>
              <p className="text-sm font-bold">{userData?.rank || '—'}</p>
            </div>
            <div>
              <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-1">Company</p>
              <p className="text-sm font-bold">{userData?.company || '—'}</p>
            </div>
            {userData?.company && userData.company !== 'Battalion' && (
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-1">Platoon / Squad</p>
                <p className="text-sm font-bold">{userData?.platoon || '—'} &middot; {userData?.squad || '—'}</p>
              </div>
            )}
            <div className="sm:col-span-2 flex items-center gap-2">
              <Mail size={14} className="text-slate-400 dark:text-slate-500" />
              <p className="text-sm font-bold">{user?.email}</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest mt-6 pt-6 border-t border-slate-100 dark:border-white/5">
            Rank, role, and unit assignment are managed by battalion staff. Contact S1 to request a change.
          </p>
        </div>

        {/* SETTINGS */}
        <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/10 rounded-3xl p-8 shadow-sm dark:shadow-none space-y-8">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Settings</h2>

          <form onSubmit={handleSavePhone} className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Phone Number</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={16} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone number"
                  className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm font-bold focus:border-yellow-500 outline-none transition-all"
                />
              </div>
              <button type="submit" disabled={saving} className={`px-6 rounded-xl font-black uppercase text-xs flex items-center gap-2 transition-all ${saved ? 'bg-green-500 text-white' : 'bg-yellow-500 text-slate-950 hover:bg-yellow-400 disabled:opacity-50'}`}>
                {saved ? <CheckCircle size={16} /> : <Save size={16} />} {saved ? 'Saved' : 'Save'}
              </button>
            </div>
          </form>

          <form onSubmit={handleUpdateLoginEmail} className="space-y-3 pt-6 border-t border-slate-100 dark:border-white/5">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Login Email</label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={16} />
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="you@email.com"
                  className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm font-bold focus:border-yellow-500 outline-none transition-all"
                />
              </div>
              <button type="submit" disabled={loginEmailStatus === 'saving'} className={`px-6 rounded-xl font-black uppercase text-xs flex items-center gap-2 whitespace-nowrap transition-all ${loginEmailStatus === 'success' ? 'bg-green-500 text-white' : 'bg-yellow-500 text-slate-950 hover:bg-yellow-400 disabled:opacity-50'}`}>
                {loginEmailStatus === 'saving' ? 'Saving...' : loginEmailStatus === 'success' ? <><CheckCircle size={16} /> Updated</> : 'Update'}
              </button>
            </div>
            {loginEmailStatus && loginEmailStatus !== 'saving' && loginEmailStatus !== 'success' && (
              <p className="text-[10px] text-red-500 font-bold">{loginEmailStatus}</p>
            )}
          </form>

          <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-bold">Password</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Reset link sent to {user?.email}</p>
            </div>
            <button onClick={handlePasswordReset} disabled={resetStatus === 'sending' || resetCooldownSeconds > 0} className={`px-6 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-2 transition-all disabled:opacity-50 ${resetStatus === 'success' ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10'}`}>
              {resetStatus === 'success' ? <CheckCircle size={16} /> : <KeyRound size={16} />}
              {resetStatus === 'sending' ? 'Sending...' : resetStatus === 'success' ? 'Email Sent' : resetCooldownSeconds > 0 ? `Wait ${formatCooldown(resetCooldownSeconds)}` : 'Reset Password'}
            </button>
          </div>
          {resetStatus && resetStatus !== 'sending' && resetStatus !== 'success' && (
            <p className="text-[10px] text-red-500 font-bold -mt-4">{resetStatus}</p>
          )}
        </div>

        {/* DANGER ZONE */}
        <div className="bg-white dark:bg-slate-900 border border-red-200 dark:border-red-500/20 rounded-3xl p-8 shadow-sm dark:shadow-none mt-6">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-6">Danger Zone</h2>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-bold">Delete Account</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Permanently removes your login and personnel record. Cannot be undone.</p>
            </div>
            <button
              onClick={handleDeleteAccount}
              disabled={deleteAccountStatus === 'working'}
              className="px-6 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-2 transition-all disabled:opacity-50 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"
            >
              <Trash2 size={16} /> {deleteAccountStatus === 'working' ? 'Deleting...' : 'Delete My Account'}
            </button>
          </div>
          {deleteAccountStatus && deleteAccountStatus !== 'working' && (
            <p className="text-[10px] text-red-500 font-bold mt-4">{deleteAccountStatus}</p>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MyProfile;
