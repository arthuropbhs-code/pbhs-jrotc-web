import React, { useState, useEffect, useRef } from 'react';
import { auth, db } from '../firebase';
import {
  signInWithEmailAndPassword,
  getMultiFactorResolver,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  RecaptchaVerifier,
} from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowLeft, UserPlus, Shield, Loader2, Smartphone } from 'lucide-react';
import SmoothInput from '../components/SmoothInput';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { usePageMeta } from '../hooks/usePageMeta';

const AdminLogin = () => {
  usePageMeta({ title: 'Command Login' });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // MFA challenge state — populated only when the signed-in account has 2FA enrolled.
  const [mfaResolver, setMfaResolver] = useState(null);
  const [mfaVerificationId, setMfaVerificationId] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSending, setMfaSending] = useState(false);
  // Persisted across retries so we can call .clear() before creating a new
  // verifier — Firebase throws if a second instance targets the same DOM node.
  const recaptchaVerifierRef = useRef(null);

  // useAuth force-signs-out a suspended account and leaves this flag behind
  // so the login page can explain why, instead of silently landing here.
  useEffect(() => {
    if (sessionStorage.getItem('accountSuspended')) {
      sessionStorage.removeItem('accountSuspended');
      setError('This account has been suspended. Contact battalion staff for details.');
    }
  }, []);

  const handleProfileMerge = async (authUser) => {
    try {
      const userRef = doc(db, "users", authUser.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists() || !userSnap.data().fullName) {
        const manualQuery = query(
          collection(db, "users"),
          where("email", "==", authUser.email),
          where("isManual", "==", true)
        );
        
        const manualSnap = await getDocs(manualQuery);
        
        if (!manualSnap.empty) {
          const manualDoc = manualSnap.docs[0];
          const manualData = manualDoc.data();

          await setDoc(userRef, {
            ...manualData,
            uid: authUser.uid,
            email: authUser.email,
            isManual: false,
            linkedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });

          await deleteDoc(doc(db, "users", manualDoc.id));
        }
      }
    } catch (err) {
      console.error("Merge error:", err);
    }
  };

  // Send the SMS challenge only after mfaResolver is set AND React has committed
  // the new DOM — that's when #login-recaptcha-container actually exists.
  useEffect(() => {
    if (!mfaResolver) return;
    let cancelled = false;

    const sendChallenge = async () => {
      setMfaSending(true);
      try {
        if (recaptchaVerifierRef.current) {
          recaptchaVerifierRef.current.clear();
          recaptchaVerifierRef.current = null;
        }
        const recaptchaVerifier = new RecaptchaVerifier(auth, 'login-recaptcha-container', { size: 'invisible' });
        recaptchaVerifierRef.current = recaptchaVerifier;
        const phoneAuthProvider = new PhoneAuthProvider(auth);
        const verificationId = await phoneAuthProvider.verifyPhoneNumber(
          { multiFactorHint: mfaResolver.hints[0], session: mfaResolver.session },
          recaptchaVerifier
        );
        if (!cancelled) setMfaVerificationId(verificationId);
      } catch (mfaErr) {
        console.error('MFA send error:', mfaErr);
        if (!cancelled) {
          setError('Failed to send verification code. Try again.');
          setMfaResolver(null);
        }
      } finally {
        if (!cancelled) setMfaSending(false);
      }
    };

    sendChallenge();
    return () => { cancelled = true; };
  }, [mfaResolver]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const cleanEmail = email.trim();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
      await handleProfileMerge(userCredential.user);
      navigate('/admin/dashboard');
    } catch (err) {
      if (err.code === 'auth/multi-factor-auth-required') {
        // Account has 2FA enrolled. Store the resolver and let the useEffect
        // below send the SMS challenge — that guarantees #login-recaptcha-container
        // is in the DOM before RecaptchaVerifier tries to mount on it.
        const resolver = getMultiFactorResolver(auth, err);
        setMfaResolver(resolver);
        setLoading(false);
        return;
      }
      if (err.code === 'auth/invalid-credential') {
        setError("Invalid email or password.");
      } else if (err.code === 'auth/too-many-requests') {
        setError("Account temporarily locked. Try again later.");
      } else if (err.code === 'auth/user-disabled') {
        setError("This account has been suspended. Contact battalion staff for details.");
      } else {
        setError("Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Second step: complete sign-in using the SMS code.
  const handleMfaVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const cred = PhoneAuthProvider.credential(mfaVerificationId, mfaCode);
      const assertion = PhoneMultiFactorGenerator.assertion(cred);
      const userCredential = await mfaResolver.resolveSignIn(assertion);
      await handleProfileMerge(userCredential.user);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(
        err.code === 'auth/invalid-verification-code'
          ? 'Incorrect code — check your SMS and try again.'
          : 'Verification failed. Please try again.'
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden transition-colors duration-300">
      {/* Ambient Glow - Now using Gold/Blue tones */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        <div className="flex justify-between items-center mb-8">
          <Link to="/" className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-yellow-500 transition-colors text-xs font-black uppercase tracking-widest">
            <ArrowLeft size={16} /> Back to Menu
          </Link>
          <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 px-3 py-1 rounded-full flex items-center gap-2 shadow-sm">
            <Shield size={12} className="text-yellow-500" />
            <span className="text-[10px] font-black text-yellow-500 uppercase tracking-tighter">Secure Access</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 p-10 rounded-[2.5rem] shadow-xl transition-all">
          <div className="mb-10 text-center">
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
              Command <span className="text-yellow-500">Login</span>
            </h1>
            <p className="text-[10px] text-blue-600 dark:text-slate-500 font-bold uppercase tracking-[0.2em] mt-2">
              Personnel Authorization Required
            </p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-2xl text-[10px] font-black uppercase mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
              {error}
            </div>
          )}

          {/* ── STEP 1: Email + password ─────────────────────────── */}
          {!mfaResolver && (
            <>
              <form onSubmit={handleLogin} className="space-y-5">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-200 group-focus-within:text-yellow-500 transition-colors" size={18} />
                  <SmoothInput
                    type="email"
                    placeholder="CADET EMAIL"
                    className="w-full bg-blue-50/50 dark:bg-black/40 border border-blue-100 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-yellow-500 dark:focus:border-yellow-500 outline-none transition-all placeholder:text-blue-200 dark:placeholder:text-slate-700 font-bold text-slate-900 dark:text-white"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-200 group-focus-within:text-yellow-500 transition-colors" size={18} />
                  <SmoothInput
                    type="password"
                    placeholder="PASSWORD"
                    className="w-full bg-blue-50/50 dark:bg-black/40 border border-blue-100 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm focus:border-yellow-500 dark:focus:border-yellow-500 outline-none transition-all placeholder:text-blue-200 dark:placeholder:text-slate-700 font-bold text-slate-900 dark:text-white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-yellow-500 text-slate-950 font-black uppercase py-4 rounded-2xl hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20 active:scale-[0.98] flex items-center justify-center gap-2 group"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      Log In
                      <Shield size={16} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-10 pt-8 border-t border-blue-50 dark:border-white/5 flex flex-col items-center gap-4 text-center">
                <p className="text-blue-600 dark:text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">Deployment Access</p>
                <Link to="/admin/signup" className="flex items-center gap-2 text-slate-900 dark:text-white hover:text-yellow-500 dark:hover:text-yellow-500 transition-colors font-black uppercase text-xs">
                  <UserPlus size={16} className="text-yellow-500" /> Create Cadet Account
                </Link>
              </div>
            </>
          )}

          {/* ── STEP 2: SMS verification (2FA enrolled accounts only) ── */}
          {mfaResolver && (
            <form onSubmit={handleMfaVerify} className="space-y-5">
              <div className="flex flex-col items-center gap-3 mb-6">
                <div className="p-4 rounded-2xl bg-yellow-500/10">
                  <Smartphone size={28} className="text-yellow-500" />
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center">
                  {mfaSending ? 'Sending verification code…' : 'Code sent to your enrolled phone.'}
                </p>
              </div>

              <div className="relative">
                <SmoothInput
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-DIGIT CODE"
                  maxLength={6}
                  className="w-full bg-blue-50/50 dark:bg-black/40 border border-blue-100 dark:border-white/10 rounded-2xl py-4 px-5 text-sm focus:border-yellow-500 outline-none transition-all font-black tracking-[0.4em] text-center text-slate-900 dark:text-white placeholder:text-blue-200 dark:placeholder:text-slate-700 placeholder:tracking-widest"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || mfaSending || mfaCode.length < 6}
                className="w-full bg-yellow-500 text-slate-950 font-black uppercase py-4 rounded-2xl hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Verify Identity'}
              </button>

              <button
                type="button"
                onClick={() => { setMfaResolver(null); setMfaCode(''); setError(''); }}
                className="w-full py-3 text-slate-400 dark:text-slate-600 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
              >
                ← Back to Login
              </button>

              {/* Invisible reCAPTCHA anchor — Firebase needs a DOM node */}
              <div id="login-recaptcha-container" />
            </form>
          )}
        </div>
        
        <p className="mt-8 text-center text-[9px] font-bold text-blue-200 dark:text-slate-600 uppercase tracking-widest">
          Authorized Cadets Only
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;