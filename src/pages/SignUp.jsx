import React, { useState, useEffect } from 'react';
import SmoothInput from '../components/SmoothInput';
import { useCompanies } from '../hooks/useCompanies';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth';
import {
  getDocs,
  collection,
  query,
  where
} from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  User, 
  Phone, 
  Briefcase, 
  Medal, 
  KeyRound, 
  ArrowLeft,
  Loader2,
  UserCheck,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageMeta } from '../hooks/usePageMeta';

// Requires the military roster convention: "LASTNAME, FIRSTNAME" (each side
// may be multiple words, e.g. "DE ALMEIDA, ARTHURO").
const FULL_NAME_PATTERN = /^[A-Za-z'-]+(?:\s+[A-Za-z'-]+)*,\s*[A-Za-z'-]+(?:\s+[A-Za-z'-]+)*$/;

// Firebase's own minimum is just 6 characters with no complexity requirement.
const isStrongPassword = (pw) => pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);

// Site key is public by design — it's embedded in the page source.
// The Google Cloud API key that verifies tokens lives server-side only
// in api/verify-captcha.js. Enterprise score-based: no checkbox shown,
// runs invisibly in the background and returns a 0–1 human likelihood score.
const RECAPTCHA_SITE_KEY = '6Ld3tXwtAAAAAP7tu9bJa3fpwpju6LLDe9T2ujWO';

const SignUp = () => {
  usePageMeta({ title: 'Create Cadet Account' });

  // Load the reCAPTCHA Enterprise script lazily so it's only present while the
  // signup page is mounted. Loading it globally in index.html conflicts with
  // Firebase's own RecaptchaVerifier (used for MFA SMS on the login page) because
  // both compete for window.grecaptcha. Lazy-loading here isolates the scopes.
  useEffect(() => {
    const SCRIPT_ID = 'recaptcha-enterprise-script';
    if (document.getElementById(SCRIPT_ID)) return; // already loaded
    const script = document.createElement('script');
    script.id   = SCRIPT_ID;
    script.src  = `https://www.google.com/recaptcha/enterprise.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    // Not cleaned up on unmount intentionally: removing a <script> tag doesn't
    // un-execute it or clear window.grecaptcha — leave it for the session so that
    // if the user navigates back to signup the script is already ready. The id
    // guard above prevents duplicates.
  }, []);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    rank: '',
    position: '',
    company: '',
    platoon: '1st Platoon', // Added default
    squad: '1st Squad',     // Added default
    phone: '',
    secretCode: ''
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkData, setLinkData] = useState(null);
  const navigate = useNavigate();

  // Obtains a reCAPTCHA Enterprise token silently (no checkbox shown).
  // enterprise.ready() ensures the script has fully initialised before
  // execute() is called; the resulting token is verified server-side.
  const getEnterpriseToken = () =>
    new Promise((resolve, reject) => {
      if (!window.grecaptcha?.enterprise) {
        reject(new Error('reCAPTCHA not loaded'));
        return;
      }
      window.grecaptcha.enterprise.ready(async () => {
        try {
          const token = await window.grecaptcha.enterprise.execute(
            RECAPTCHA_SITE_KEY,
            { action: 'SIGNUP' }
          );
          resolve(token);
        } catch (err) {
          reject(err);
        }
      });
    });

  // SHA-256 of the real code - kept as a hash so the plaintext code isn't
  // sitting in the shipped JS bundle. This raises the bar (no longer a
  // trivial devtools/view-source read) but is still a client-side check,
  // not a real security boundary - a determined attacker could still brute
  // force it offline since there's no rate limiting or server-side gate.
  const BATTALION_SECRET_HASH = "587059e56cc6592a6054a0606758a821cc9eb7657635eb13f4b7c88a17e7ad7a";

  const sha256Hex = async (text) => {
    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  };


  // Must match AdminUsers.jsx's JROTC_RANKS/JROTC_POSITIONS exactly - a
  // mismatch here was silently producing rank strings ("CDT MAJ") that the
  // admin roster's dropdown didn't recognize, which is why fixing an
  // existing account's rank there could silently save the wrong value.
  const ranks = ["C/PVT", "C/PFC", "C/CPL", "C/SGT", "C/SSG", "C/SFC", "C/MSG", "C/1SG", "C/SGM", "C/CSM", "C/2LT", "C/1LT", "C/CPT", "C/MAJ", "C/LTC", "C/COL"];
  const positions = ["Squad Member", "Squad Leader", "Platoon Sergeant", "Platoon Leader", "First Sergeant", "Company XO", "Company Commander", "Battalion Staff (S-1)", "Battalion Staff (S-2)", "Battalion Staff (S-3)", "Battalion Staff (S-4)", "Battalion Staff (S-5)", "Battalion Staff (S-6)", "Battalion XO", "Battalion CSM", "Battalion Commander", "Team Lead"];
  const { companiesWithBattalion: companies } = useCompanies();
  const platoons = ["1st Platoon", "2nd Platoon", "3rd Platoon", "HQ Platoon"];
  const squads = ["1st Squad", "2nd Squad", "3rd Squad", "4th Squad", "Staff"];

  const handleSignUpAttempt = async (e) => {
    e.preventDefault();
    setError('');

    if (!FULL_NAME_PATTERN.test(formData.name.trim())) {
      setError("FULL NAME MUST BE FORMATTED AS: LASTNAME, FIRSTNAME");
      return;
    }

    const enteredHash = await sha256Hex(formData.secretCode.trim());
    if (enteredHash !== BATTALION_SECRET_HASH) {
      setError("INVALID SECRET CODE: ACCESS DENIED.");
      return;
    }

    if (!isStrongPassword(formData.password)) {
      setError("PASSWORD MUST BE AT LEAST 8 CHARACTERS AND INCLUDE A LETTER AND A NUMBER.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("PASSWORDS DO NOT MATCH.");
      return;
    }

    setLoading(true);

    let captchaToken;
    try {
      captchaToken = await getEnterpriseToken();
    } catch {
      setError("CAPTCHA CHECK FAILED. PLEASE REFRESH AND TRY AGAIN.");
      setLoading(false);
      return;
    }
    const targetEmail = formData.email.trim().toLowerCase();

    try {
      // Verified server-side, not just checked for presence client-side -
      // a bot can fake calling this function, but it can't fake solving the
      // widget, and Google invalidates a token the moment it's checked once.
      const captchaRes = await fetch('/api/verify-captcha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: captchaToken })
      });
      if (!captchaRes.ok) {
        const captchaErr = await captchaRes.json().catch(() => ({}));
        console.error('CAPTCHA failed — detail:', captchaErr);
        setError("CAPTCHA VERIFICATION FAILED. TRY AGAIN.");
        setLoading(false);
        return;
      }

      // The account has to exist (and be signed in) before Firestore rules
      // will allow even reading the users collection, so this now happens
      // before the shadow-record lookup - not after it, like it used to.
      const userCredential = await createUserWithEmailAndPassword(auth, targetEmail, formData.password);
      const user = userCredential.user;

      const manualQuery = query(
        collection(db, "users"),
        where("email", "==", targetEmail),
        where("isManual", "==", true)
      );

      const manualSnap = await getDocs(manualQuery);

      if (!manualSnap.empty) {
        setLinkData({ id: manualSnap.docs[0].id, ...manualSnap.docs[0].data() });
        setLoading(false);
      } else {
        await finalizeAccountCreation(user);
      }
    } catch (err) {
      setError(err.code === 'auth/email-already-in-use' ? "EMAIL ALREADY REGISTERED." : err.message.toUpperCase());
      setLoading(false);
    }
  };

  // The auth account already exists by the time this runs (see above) - all
  // that's left is the privileged Firestore write, which now goes through
  // the server since a fresh signup isn't trusted to self-report a shadow-
  // record match or set its own role/approved status directly.
  const finalizeAccountCreation = async (user) => {
    setLoading(true);

    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/admin-update-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({
          type: 'complete-signup',
          targetUid: user.uid,
          profile: {
            fullName: formData.name.toUpperCase(),
            phone: formData.phone,
            rank: formData.rank,
            position: formData.position,
            company: formData.company,
            platoon: formData.platoon,
            squad: formData.squad
          }
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to finish creating your account');

      navigate('/admin/dashboard');
    } catch (err) {
      setError((err.message || 'Failed to finish creating your account').toUpperCase());
    } finally {
      setLoading(false);
      setLinkData(null);
    }
  };

  // "No, this is a mistake": the auth account created in handleSignUpAttempt
  // is otherwise left orphaned (no Firestore profile) with its email now
  // stuck in "already in use" for any retry. Deleting your own just-created
  // account is always allowed by Firebase Auth itself, no Firestore rule
  // involved, so this cleanly undoes it.
  const rejectLinkMatch = async () => {
    try {
      if (auth.currentUser) await deleteUser(auth.currentUser);
    } catch (err) {
      console.error('Failed to clean up the unmatched signup attempt:', err);
    }
    setLinkData(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
      <div className="w-full max-w-2xl">
        <Link to="/admin" className="text-slate-500 hover:text-white flex items-center gap-2 mb-6 text-xs font-bold uppercase tracking-widest transition-all">
          <ArrowLeft size={14} /> Back to Login
        </Link>

        <form onSubmit={handleSignUpAttempt} className="bg-slate-900 p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50"></div>

          <div className="mb-8">
            <h2 className="text-3xl font-black uppercase italic text-yellow-500 tracking-tighter">Sign Up</h2>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">Create Your Cadet Account</p>
          </div>
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-[10px] font-black mb-6 flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative col-span-full">
              <User className="absolute left-3 top-3 text-slate-600" size={18} />
              <SmoothInput type="text" placeholder="FULL NAME (LAST, FIRST)" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none transition-all uppercase font-bold text-white" onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-600" size={18} />
              <SmoothInput type="email" placeholder="EMAIL ADDRESS" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none transition-all font-bold text-white" onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>

            <div className="relative">
              <Phone className="absolute left-3 top-3 text-slate-600" size={18} />
              <SmoothInput type="tel" placeholder="PHONE NUMBER" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none transition-all font-bold text-white" onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-600" size={18} />
              <SmoothInput type="password" placeholder="PASSWORD" required minLength={8} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none transition-all font-bold text-white" onChange={(e) => setFormData({...formData, password: e.target.value})} />
              <p className="text-slate-600 text-[9px] font-bold uppercase tracking-widest mt-1.5 ml-1">8+ Characters, 1 Letter, 1 Number</p>
            </div>

            <div className="relative">
              <KeyRound className="absolute left-3 top-3 text-slate-600" size={18} />
              <SmoothInput type="password" placeholder="CONFIRM PASSWORD" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none transition-all font-bold text-white" onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} />
            </div>

            <div className="relative">
              <Medal className="absolute left-3 top-3 text-slate-600" size={18} />
              <select required value={formData.rank} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none appearance-none font-bold text-white" onChange={(e) => setFormData({...formData, rank: e.target.value})}>
                <option value="" disabled>SELECT RANK</option>
                {ranks.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
              </select>
            </div>

            <div className="relative">
              <Briefcase className="absolute left-3 top-3 text-slate-600" size={18} />
              <select required value={formData.position} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none appearance-none font-bold text-white" onChange={(e) => setFormData({...formData, position: e.target.value})}>
                <option value="" disabled>SELECT POSITION</option>
                {positions.map(p => <option key={p} value={p} className="bg-slate-900">{p}</option>)}
              </select>
            </div>

            {/* Platoon Selection - not applicable at Battalion level */}
            {formData.company !== 'Battalion' && (
              <div className="relative">
                <select required value={formData.platoon} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:border-yellow-500 outline-none appearance-none font-bold text-white" onChange={(e) => setFormData({...formData, platoon: e.target.value})}>
                  {platoons.map(p => <option key={p} value={p} className="bg-slate-900">{p}</option>)}
                </select>
              </div>
            )}

            {/* Squad Selection - not applicable at Battalion level */}
            {formData.company !== 'Battalion' && (
              <div className="relative">
                <select required value={formData.squad} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:border-yellow-500 outline-none appearance-none font-bold text-white" onChange={(e) => setFormData({...formData, squad: e.target.value})}>
                  {squads.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
                </select>
              </div>
            )}

            <div className="relative col-span-full">
              <select required value={formData.company} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:border-yellow-500 outline-none appearance-none text-center font-black text-white" onChange={(e) => {
                const nextCompany = e.target.value;
                setFormData({
                  ...formData,
                  company: nextCompany,
                  ...(nextCompany === 'Battalion'
                    ? { platoon: 'HQ Platoon', squad: 'Staff' }
                    : (formData.company === 'Battalion' ? { platoon: '1st Platoon', squad: '1st Squad' } : {}))
                });
              }}>
                <option value="" disabled>— ASSIGN COMPANY —</option>
                {companies.map(c => <option key={c} value={c} className="bg-slate-900">{c} Company</option>)}
              </select>
            </div>

            <div className="relative col-span-full">
              <ShieldCheck className="absolute left-3 top-3 text-yellow-500" size={18} />
              <SmoothInput type="text" placeholder="BATTALION SECRET CODE" required className="w-full bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none text-yellow-500 font-black" onChange={(e) => setFormData({...formData, secretCode: e.target.value})} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-yellow-500 text-slate-950 font-black uppercase py-4 rounded-xl mt-6 hover:bg-yellow-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Request Access"}
          </button>
        </form>
      </div>

      <AnimatePresence>
        {linkData && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-slate-900 border border-yellow-500/20 p-10 rounded-[3rem] max-w-md w-full shadow-2xl text-center">
              <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mx-auto mb-6 text-yellow-500">
                <UserCheck size={40} />
              </div>
              <h2 className="text-3xl font-black uppercase italic tracking-tighter mb-2">Personnel File Found</h2>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-8">An official record exists. Is this you?</p>
              
              <div className="bg-black/40 border border-white/5 p-6 rounded-2xl text-left mb-8">
                <h4 className="text-white font-black uppercase italic text-lg">{linkData.fullName}</h4>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-yellow-500 font-black text-[10px] uppercase">{linkData.rank}</span>
                  <span className="text-slate-400 font-black text-[10px] uppercase">{linkData.company} Co.</span>
                  <span className="text-slate-500 font-black text-[10px] uppercase">{linkData.platoon} / {linkData.squad}</span>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={() => finalizeAccountCreation(auth.currentUser)}
                  disabled={loading}
                  className="w-full bg-yellow-500 text-slate-950 py-4 rounded-2xl font-black uppercase flex items-center justify-center gap-2 hover:bg-yellow-400 transition-all"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <>Yes, This is me <ChevronRight size={18} /></>}
                </button>
                <button onClick={rejectLinkMatch} disabled={loading} className="text-slate-500 hover:text-white font-black uppercase text-[10px] py-2 disabled:opacity-50">
                  No, This is a mistake
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SignUp;