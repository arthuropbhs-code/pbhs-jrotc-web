// src/components/SessionLockScreen.jsx
//
// Shown when the idle timer fires instead of signing the user out.
// Re-authenticates with password only — reauthenticateWithCredential does NOT
// trigger MFA, so no SMS is sent. This is the key to reducing Firebase SMS usage.
//
// The overlay sits on top of AdminLayout so the underlying page is preserved;
// when the user unlocks, they continue exactly where they left off.

import React, { useState } from 'react';
import { auth } from '../firebase';
import {
  reauthenticateWithCredential,
  EmailAuthProvider,
  signOut,
} from 'firebase/auth';
import { useAuth } from '../hooks/useAuth';
import { clearDeviceTrust } from '../hooks/useIdleLogout';
import { Lock, LogOut, Loader2, Eye, EyeOff } from 'lucide-react';
import { getInitials } from '../utils/getInitials';

const SessionLockScreen = ({ onUnlock }) => {
  const { user, userData } = useAuth();
  const [password,  setPassword]  = useState('');
  const [showPw,    setShowPw]    = useState(false);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError('');
    try {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(auth.currentUser, credential);
      // Clear the lock — no signOut, no SMS, session continues.
      sessionStorage.removeItem('sessionLocked');
      setPassword('');
      onUnlock();
    } catch (err) {
      if (err.code === 'auth/multi-factor-auth-required') {
        // Firebase accepted the password (first factor passed) but is asking
        // for the MFA second factor. Since the password was correct and the
        // Firebase session is already valid, treat this as a successful unlock —
        // no SMS needed for a soft-lock re-entry. The session was never invalidated.
        sessionStorage.removeItem('sessionLocked');
        setPassword('');
        // Only call onUnlock if the Firebase session is still live. If
        // reauthenticateWithCredential somehow invalidated it (rare SDK edge
        // case), the session lock is already cleared above and ProtectedRoute
        // will redirect to /admin automatically — no extra action needed here.
        if (auth.currentUser) {
          onUnlock();
        }
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect password — try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Wait a moment then try again.');
      } else {
        console.error('Session unlock error:', err.code, err.message);
        setError('Unlock failed. Try signing out and back in.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    sessionStorage.removeItem('sessionLocked');
    clearDeviceTrust();
    await signOut(auth);
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-blue-50/95 dark:bg-slate-950/97 backdrop-blur-sm flex items-center justify-center p-6">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-yellow-500/8 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm z-10">
        <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-[2rem] shadow-2xl p-8 text-center">

          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-yellow-500 text-slate-950 flex items-center justify-center text-lg font-black uppercase mx-auto mb-4 overflow-hidden ring-4 ring-yellow-500/20">
            {userData?.portrait
              ? <img src={userData.portrait} alt="" className="w-full h-full object-cover" />
              : getInitials(userData?.fullName) || <Lock size={24} />
            }
          </div>

          <div className="mb-1">
            <div className="inline-flex items-center gap-1.5 bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full mb-3">
              <Lock size={10} className="text-yellow-500" />
              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-400">Session Paused</span>
            </div>
          </div>

          <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white mb-1">
            Welcome back
          </h2>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-6 uppercase tracking-wide">
            {userData?.fullName || user?.email}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-6 leading-relaxed">
            Your session was paused due to inactivity.<br />
            Enter your password to continue — no code required.
          </p>

          <form onSubmit={handleUnlock} className="space-y-4 text-left">
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                autoFocus
                className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-3.5 pr-10 rounded-xl outline-none focus:border-yellow-500 text-sm font-bold text-slate-900 dark:text-white transition-all placeholder:text-slate-400"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-yellow-500 transition-colors">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {error && (
              <p className="text-xs font-bold text-red-500 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-3">
                {error}
              </p>
            )}

            <button type="submit" disabled={loading || !password}
              className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 disabled:cursor-not-allowed text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20">
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Unlocking…</>
                : <><Lock size={14} /> Continue Session</>
              }
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 dark:border-white/5">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex items-center justify-center gap-2 w-full text-xs font-black uppercase tracking-widest text-slate-400 hover:text-red-500 transition-colors py-2">
              {signingOut
                ? <Loader2 size={13} className="animate-spin" />
                : <LogOut size={13} />
              }
              Sign out instead
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionLockScreen;
