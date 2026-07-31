import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getInitials } from '../components/Navbar';
import { db, auth } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { ROLE_LABELS } from '../constants';
import Footer from '../components/Footer';
import { ArrowLeft, Mail, Phone, Save, KeyRound, CheckCircle } from 'lucide-react';

const MyProfile = () => {
  const { user, userData, role } = useAuth();
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    setPhone(userData?.phone || '');
  }, [userData?.phone]);

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

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err) {
      console.error("Password reset failed:", err);
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

          <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-bold">Password</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">Reset link sent to {user?.email}</p>
            </div>
            <button onClick={handlePasswordReset} className={`px-6 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-2 transition-all ${resetSent ? 'bg-green-500 text-white' : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10'}`}>
              {resetSent ? <CheckCircle size={16} /> : <KeyRound size={16} />} {resetSent ? 'Email Sent' : 'Reset Password'}
            </button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MyProfile;
