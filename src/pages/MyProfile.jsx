import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getInitials } from '../utils/getInitials';
import { db, auth } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import {
  signOut,
  multiFactor,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
} from 'firebase/auth';
import { ROLE_LABELS, ROLE_HIERARCHY, STAFF_LEVEL } from '../constants';
import Footer from '../components/Footer';
import { ArrowLeft, Mail, Phone, Save, KeyRound, CheckCircle, Trash2, Camera, Loader2, Sun, Moon, Monitor, Smartphone, ShieldCheck, ShieldOff, BookOpen, Calendar } from 'lucide-react';
import { uploadToCloudinary } from '../utils/cloudinaryUpload';
import { useThemeContext } from '../contexts/ThemeContext';
import ScrambleText from '../components/ScrambleText';

const formatCooldown = (seconds) => {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

const MyProfile = () => {
  const { user, userData, role } = useAuth();
  const { theme, setTheme } = useThemeContext();
  const navigate = useNavigate();
  const location = useLocation();

  // mfaRequired: redirected here because 2FA enrollment is mandatory for this role
  const mfaRequired = new URLSearchParams(location.search).get('mfa') === 'required';
  // mfaMandatory: this user's level requires 2FA regardless of how they got here
  const mfaMandatory = (ROLE_HIERARCHY[role] || 0) >= STAFF_LEVEL;
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [resetStatus, setResetStatus] = useState(null); // null | 'sending' | 'success' | error string
  const [loginEmail, setLoginEmail] = useState('');
  const [loginEmailStatus, setLoginEmailStatus] = useState(null);
  const [resetCooldownUntil, setResetCooldownUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const [deleteAccountStatus, setDeleteAccountStatus] = useState(null);
  const [uploadingPortrait, setUploadingPortrait] = useState(false);
  const [portraitError, setPortraitError] = useState(null);

  // Dossier — bio and availability synced from Firestore userData
  const [dossier, setDossier] = useState({ bio: '', practiceDays: '' });
  const [dossierSaving, setDossierSaving] = useState(false);
  const [dossierSaved, setDossierSaved] = useState(false);

  // Persisted across retries so we can .clear() before creating a new instance.
  const enrollRecaptchaRef = useRef(null);

  // MFA / 2FA enrollment state
  const [mfaEnrolled, setMfaEnrolled] = useState(false);
  const [mfaFactor, setMfaFactor] = useState(null);
  // 'idle' | 'entering-phone' | 'entering-code'
  const [mfaStep, setMfaStep] = useState('idle');
  const [mfaPhone, setMfaPhone] = useState('');    // Firebase format: +1XXXXXXXXXX
  const [phoneDisplay, setPhoneDisplay] = useState(''); // formatted display: (XXX) XXX-XXXX
  const [mfaCode, setMfaCode] = useState('');
  const [mfaVerificationId, setMfaVerificationId] = useState('');
  const [mfaStatus, setMfaStatus] = useState(null); // null | 'sending' | 'verifying' | 'success' | error string

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
    if (userData) {
      setDossier({ bio: userData.bio || '', practiceDays: userData.practiceDays || '' });
    }
  }, [userData?.bio, userData?.practiceDays]);

  useEffect(() => {
    setLoginEmail(user?.email || '');
  }, [user?.email]);

  // Reflect current MFA enrollment whenever the auth user object updates.
  useEffect(() => {
    if (!user) return;
    const factors = multiFactor(user).enrolledFactors;
    if (factors.length > 0) {
      setMfaEnrolled(true);
      setMfaFactor(factors[0]);
    } else {
      setMfaEnrolled(false);
      setMfaFactor(null);
    }
  }, [user]);

  const handleUpdateDossier = async (e) => {
    e.preventDefault();
    if (!user) return;
    setDossierSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), { ...dossier, updatedAt: new Date() });
      setDossierSaved(true);
      setTimeout(() => setDossierSaved(false), 3000);
    } catch (err) {
      console.error('Dossier update failed:', err);
    } finally {
      setDossierSaving(false);
    }
  };

  const handlePortraitUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !user) return;
    setUploadingPortrait(true);
    setPortraitError(null);
    try {
      const data = await uploadToCloudinary(file, 'image');
      await updateDoc(doc(db, "users", user.uid), { portrait: data.secure_url });
    } catch (err) {
      console.error("Portrait upload failed:", err);
      setPortraitError(err.message || 'Upload failed. Try a JPEG, PNG, WebP, or HEIC image.');
    } finally {
      setUploadingPortrait(false);
    }
  };

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

  // ── MFA enrollment ───────────────────────────────────────────────────────

  // Step 1 — send SMS to the supplied phone number.
  // Formats a raw phone input into (XXX) XXX-XXXX and derives the Firebase
  // +1XXXXXXXXXX format in parallel. Strips the leading country code if the
  // user pastes in a +1 or 1-prefixed number (11 digits).
  const handlePhoneInput = (e) => {
    let digits = e.target.value.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) digits = digits.slice(1);
    digits = digits.slice(0, 10);

    let display = '';
    if (digits.length > 0) display = '(' + digits.slice(0, 3);
    if (digits.length > 3) display += ') ' + digits.slice(3, 6);
    if (digits.length > 6) display += '-' + digits.slice(6, 10);

    setPhoneDisplay(display);
    setMfaPhone(digits.length === 10 ? `+1${digits}` : '');
  };

  const handleSendEnrollCode = async (e) => {
    e.preventDefault();
    if (!user) return;
    setMfaStatus('sending');
    try {
      const session = await multiFactor(user).getSession();
      // Clear any stale verifier before creating a new one.
      if (enrollRecaptchaRef.current) {
        enrollRecaptchaRef.current.clear();
        enrollRecaptchaRef.current = null;
      }
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'enroll-recaptcha-container', { size: 'invisible' });
      enrollRecaptchaRef.current = recaptchaVerifier;
      const phoneAuthProvider = new PhoneAuthProvider(auth);
      const verificationId = await phoneAuthProvider.verifyPhoneNumber(
        { phoneNumber: mfaPhone, session },
        recaptchaVerifier
      );
      setMfaVerificationId(verificationId);
      setMfaStep('entering-code');
      setMfaStatus(null);
    } catch (err) {
      if (err.code === 'auth/unverified-email') {
        // Firebase requires a verified email before enrolling phone MFA.
        // Generate the OOB link server-side and send via our branded EmailJS
        // template — bypasses Firebase's own plain verification email.
        try {
          const idToken = await user.getIdToken();
          await fetch('/api/admin-update-account', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ type: 'send-verify-email', targetUid: user.uid }),
          });
          setMfaStatus('verify-email');
        } catch {
          setMfaStatus('Your email must be verified before enabling 2FA. Check your inbox for a verification email.');
        }
      } else if (err.code === 'auth/requires-recent-login') {
        setMfaStatus('Please sign out and sign back in, then try enrolling again.');
      } else {
        setMfaStatus(err.message || 'Failed to send code. Check the number and try again.');
      }
    }
  };

  // Step 2 — verify the SMS code and finalize enrollment.
  const handleConfirmEnroll = async (e) => {
    e.preventDefault();
    setMfaStatus('verifying');
    try {
      const cred = PhoneAuthProvider.credential(mfaVerificationId, mfaCode);
      const assertion = PhoneMultiFactorGenerator.assertion(cred);
      await multiFactor(user).enroll(assertion, 'Phone');
      const enrolled = multiFactor(user).enrolledFactors;
      setMfaEnrolled(true);
      setMfaFactor(enrolled[0] ?? null);
      setMfaStep('idle');
      setMfaCode('');
      setMfaPhone('');
      setPhoneDisplay('');
      setMfaStatus('success');

      // Fire-and-forget confirmation email — don't block the UI on it.
      user.getIdToken().then((idToken) =>
        fetch('/api/admin-update-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({
            type: 'mfa-enrolled',
            targetUid: user.uid,
            maskedPhone: enrolled[0]?.phoneNumber ?? '',
          }),
        }).catch((err) => console.error('MFA enrollment email failed:', err))
      );

      setTimeout(() => {
        setMfaStatus(null);
        // If they were redirected here because 2FA is required, send them
        // back to the dashboard now that enrollment is complete.
        if (mfaRequired) navigate('/admin/dashboard');
      }, 1500);
    } catch (err) {
      setMfaStatus(
        err.code === 'auth/invalid-verification-code'
          ? 'Incorrect code — check your SMS and try again.'
          : err.message || 'Enrollment failed. Please try again.'
      );
    }
  };

  // Unenroll — removes the enrolled phone factor.
  const handleUnenroll = async () => {
    if (!user || !mfaFactor) return;
    const confirmed = window.confirm('Remove two-factor authentication? You can re-enroll at any time.');
    if (!confirmed) return;
    setMfaStatus('working');
    try {
      await multiFactor(user).unenroll(mfaFactor);
      setMfaEnrolled(false);
      setMfaFactor(null);
      setMfaStep('idle');
      setMfaStatus(null);
    } catch (err) {
      setMfaStatus(err.message || 'Failed to remove 2FA. Try again.');
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pt-24 px-6 pb-20 transition-colors duration-300">
      <div className="max-w-2xl mx-auto">
        <Link to="/admin/dashboard" className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-yellow-600 dark:hover:text-yellow-500 mb-8 text-[10px] font-black uppercase tracking-widest transition-colors">
          <ArrowLeft size={14} /> Back to Command
        </Link>

        <div className="flex items-center gap-5 mb-8">
          <label className="relative w-16 h-16 shrink-0 rounded-full cursor-pointer group" title="Change portrait">
            {userData?.portrait ? (
              <img src={userData.portrait} alt="" className="w-16 h-16 rounded-full object-cover" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-yellow-500 text-slate-950 flex items-center justify-center text-xl font-black uppercase">
                {getInitials(userData?.fullName) || '?'}
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
              {uploadingPortrait ? <Loader2 className="animate-spin" size={18} /> : <Camera size={18} />}
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={handlePortraitUpload} disabled={uploadingPortrait} />
          </label>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter"><ScrambleText text="My Profile" trigger="mount" /></h1>
            {portraitError && (
              <p className="text-red-500 text-[10px] font-bold mt-1 max-w-xs">{portraitError}</p>
            )}
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
              <p className="text-sm font-bold">
                {userData?.company || '—'}
                {userData?.company === 'Zulu' && (
                  <span className="ml-2 text-[9px] font-black uppercase text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">Battalion</span>
                )}
              </p>
            </div>
            {userData?.company && !['Battalion', 'Zulu'].includes(userData.company) && (
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-1">Platoon / Squad</p>
                <p className="text-sm font-bold">{userData?.platoon || '—'} &middot; {userData?.squad || '—'}</p>
              </div>
            )}
            {userData?.company === 'Zulu' && userData?.secondaryCompany && (
              <div>
                <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-1">Class Period Company</p>
                <p className="text-sm font-bold">{userData.secondaryCompany} Company
                  <span className="ml-2 text-[9px] font-black uppercase text-slate-400 dark:text-slate-500">(Observer)</span>
                </p>
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

        {/* PERSONNEL DOSSIER */}
        <form onSubmit={handleUpdateDossier} className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/10 rounded-3xl p-8 shadow-sm dark:shadow-none mb-6 space-y-6">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Personnel Dossier</h2>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 flex items-center gap-2 tracking-widest">
              <BookOpen size={12} /> Command Biography
            </label>
            <textarea
              value={dossier.bio}
              onChange={(e) => setDossier({ ...dossier, bio: e.target.value })}
              rows={5}
              placeholder="Document your leadership history, achievements, and goals..."
              className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl py-3 px-4 text-sm font-medium resize-none focus:border-yellow-500 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 flex items-center gap-2 tracking-widest">
              <Calendar size={12} /> Availability Window
            </label>
            <input
              type="text"
              value={dossier.practiceDays}
              onChange={(e) => setDossier({ ...dossier, practiceDays: e.target.value })}
              placeholder="e.g. Mon–Fri 1500–1630"
              className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-bold focus:border-yellow-500 outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={dossierSaving}
            className={`w-full py-3 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 ${
              dossierSaved ? 'bg-green-500 text-white' : 'bg-yellow-500 text-slate-950 hover:bg-yellow-400'
            }`}
          >
            {dossierSaving ? <Loader2 className="animate-spin" size={14} /> : dossierSaved ? <CheckCircle size={14} /> : <Save size={14} />}
            {dossierSaving ? 'Saving…' : dossierSaved ? 'Saved' : 'Save Dossier'}
          </button>
        </form>

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

        {/* TWO-FACTOR AUTHENTICATION */}
        <div className={`bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-sm dark:shadow-none mt-6 border ${mfaRequired && !mfaEnrolled ? 'border-red-400 dark:border-red-500/40' : 'border-blue-100 dark:border-white/10'}`}>

          {/* Required banner — shown when redirected here by the MFA gate */}
          {mfaRequired && !mfaEnrolled && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6">
              <ShieldOff size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-red-500">Action Required</p>
                <p className="text-[10px] text-red-400 font-bold mt-0.5">
                  Two-factor authentication is required for your role. Enroll below to access the command dashboard.
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Two-Factor Authentication</h2>
              {mfaMandatory && (
                <span className="text-[9px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                  Required for your role
                </span>
              )}
            </div>
            {mfaEnrolled && (
              <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-green-500 bg-green-500/10 px-3 py-1 rounded-full">
                <ShieldCheck size={12} /> Active
              </span>
            )}
          </div>

          {/* ── Enrolled: show phone hint + optional unenroll ── */}
          {mfaEnrolled && mfaStep === 'idle' && (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-bold">SMS Verification</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                  {mfaFactor?.phoneInfo
                    ? `Enrolled: ${mfaFactor.phoneInfo.replace(/\d(?=\d{4})/g, '•')}`
                    : 'Phone number enrolled'}
                </p>
              </div>
              {/* Mandatory-role accounts can't unenroll themselves */}
              {mfaMandatory ? (
                <span className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest">
                  Contact SAI to remove
                </span>
              ) : (
                <button
                  onClick={handleUnenroll}
                  disabled={mfaStatus === 'working'}
                  className="px-5 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-2 transition-all disabled:opacity-50 bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-red-500/10 hover:text-red-500"
                >
                  <ShieldOff size={14} />
                  {mfaStatus === 'working' ? 'Removing…' : 'Remove 2FA'}
                </button>
              )}
            </div>
          )}

          {/* ── Not enrolled + idle: prompt to enable ── */}
          {!mfaEnrolled && mfaStep === 'idle' && (
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-bold">SMS Verification</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                  {mfaMandatory ? 'Required — enroll your phone number below' : 'Require a one-time code at login'}
                </p>
              </div>
              <button
                onClick={() => setMfaStep('entering-phone')}
                className={`px-5 py-3 rounded-xl font-black uppercase text-xs flex items-center gap-2 transition-all ${mfaMandatory ? 'bg-yellow-500 text-slate-950 hover:bg-yellow-400 shadow-lg shadow-yellow-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-yellow-500/10 hover:text-yellow-600 dark:hover:text-yellow-500'}`}
              >
                <Smartphone size={14} /> {mfaMandatory ? 'Enroll Now' : 'Enable 2FA'}
              </button>
            </div>
          )}

          {/* ── Step 1: Enter phone number ── */}
          {mfaStep === 'entering-phone' && (
            <form onSubmit={handleSendEnrollCode} className="space-y-4">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                Enter the phone number that will receive verification codes.
              </p>
              <div className="relative">
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" size={16} />
                <input
                  type="tel"
                  required
                  placeholder="(555) 000-0000"
                  value={phoneDisplay}
                  onChange={handlePhoneInput}
                  className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm font-bold focus:border-yellow-500 outline-none transition-all"
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold -mt-2">
                US number — +1 country code added automatically
              </p>
              <div className="flex gap-3">
                {/* Only show cancel if not in required-enrollment flow */}
                {!mfaRequired && (
                  <button
                    type="button"
                    onClick={() => { setMfaStep('idle'); setMfaStatus(null); setMfaPhone(''); setPhoneDisplay(''); }}
                    className="flex-1 py-3 rounded-xl font-black uppercase text-xs bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={mfaStatus === 'sending'}
                  className="flex-1 py-3 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 bg-yellow-500 text-slate-950 hover:bg-yellow-400 disabled:opacity-50 transition-all"
                >
                  {mfaStatus === 'sending' ? <Loader2 className="animate-spin" size={14} /> : <Smartphone size={14} />}
                  {mfaStatus === 'sending' ? 'Sending…' : 'Send Code'}
                </button>
              </div>
              {/* Invisible reCAPTCHA anchor for enrollment */}
              <div id="enroll-recaptcha-container" />
            </form>
          )}

          {/* ── Step 2: Enter SMS code ── */}
          {mfaStep === 'entering-code' && (
            <form onSubmit={handleConfirmEnroll} className="space-y-4">
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
                Enter the 6-digit code sent to {mfaPhone}.
              </p>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="6-DIGIT CODE"
                maxLength={6}
                required
                autoFocus
                value={mfaCode}
                onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-xl py-3 px-4 text-sm font-black tracking-[0.4em] text-center focus:border-yellow-500 outline-none transition-all"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setMfaStep('entering-phone'); setMfaStatus(null); setMfaCode(''); }}
                  className="flex-1 py-3 rounded-xl font-black uppercase text-xs bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={mfaStatus === 'verifying' || mfaCode.length < 6}
                  className="flex-1 py-3 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 bg-yellow-500 text-slate-950 hover:bg-yellow-400 disabled:opacity-50 transition-all"
                >
                  {mfaStatus === 'verifying' ? <Loader2 className="animate-spin" size={14} /> : <ShieldCheck size={14} />}
                  {mfaStatus === 'verifying' ? 'Verifying…' : 'Enable 2FA'}
                </button>
              </div>
            </form>
          )}

          {/* Email verification required banner */}
          {mfaStatus === 'verify-email' && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 mt-3 space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-500">Verify your email first</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                A verification link was sent to <span className="text-slate-900 dark:text-white">{user?.email}</span>. Click it, then come back and try enrolling again.
              </p>
              <button
                onClick={async () => {
                  const idToken = await user.getIdToken();
                  await fetch('/api/admin-update-account', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
                    body: JSON.stringify({ type: 'send-verify-email', targetUid: user.uid }),
                  });
                }}
                className="text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-500 hover:underline"
              >
                Resend email
              </button>
            </div>
          )}

          {/* Status messages */}
          {mfaStatus && mfaStatus !== 'sending' && mfaStatus !== 'verifying' && mfaStatus !== 'working' && mfaStatus !== 'verify-email' && (
            <p className={`text-[10px] font-bold mt-3 ${mfaStatus === 'success' ? 'text-green-500' : 'text-red-500'}`}>
              {mfaStatus === 'success' ? '✓ Two-factor authentication enabled.' : mfaStatus}
            </p>
          )}

          {mfaStep === 'idle' && (
            <p className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest mt-5 pt-5 border-t border-slate-100 dark:border-white/5">
              {mfaMandatory
                ? 'Required for battalion staff (S1–S7) and all command ranks. Contact SAI to remove an enrolled factor.'
                : "When enabled, you'll be asked for a code from your phone each time you log in."}
            </p>
          )}
        </div>

        {/* APPEARANCE */}
        <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/10 rounded-3xl p-8 shadow-sm dark:shadow-none mt-6">
          <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4">Appearance</h2>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-4">Color Theme</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: 'light', label: 'Light', Icon: Sun },
              { value: 'system', label: 'System', Icon: Monitor },
              { value: 'dark', label: 'Dark', Icon: Moon },
            ].map(({ value, label, Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex flex-col items-center gap-2 py-4 rounded-2xl border text-xs font-black uppercase tracking-widest transition-all ${
                  theme === value
                    ? 'bg-yellow-500 border-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20'
                    : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10 text-slate-500 hover:border-yellow-500/40'
                }`}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
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
