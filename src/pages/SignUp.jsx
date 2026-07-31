import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDocs, 
  collection, 
  query, 
  where, 
  deleteDoc, 
  serverTimestamp 
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

// Requires the military roster convention: "LASTNAME, FIRSTNAME" (each side
// may be multiple words, e.g. "DE ALMEIDA, ARTHURO").
const FULL_NAME_PATTERN = /^[A-Za-z'-]+(?:\s+[A-Za-z'-]+)*,\s*[A-Za-z'-]+(?:\s+[A-Za-z'-]+)*$/;

const SignUp = () => {
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

  // SHA-256 of the real code - kept as a hash so the plaintext code isn't
  // sitting in the shipped JS bundle. This raises the bar (no longer a
  // trivial devtools/view-source read) but is still a client-side check,
  // not a real security boundary - a determined attacker could still brute
  // force it offline since there's no rate limiting or server-side gate.
  const BATTALION_SECRET_HASH = "3cb114732fd8eb6d2bd5600f808604727ed86f4ba6fc0e6344fadb9b6cebfea5";

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
  const companies = ["Zulu", "Alpha", "Bravo", "Charlie", "Delta", "Battalion"];
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

    if (formData.password !== formData.confirmPassword) {
      setError("PASSWORDS DO NOT MATCH.");
      return;
    }

    setLoading(true);
    const targetEmail = formData.email.trim().toLowerCase();

    try {
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
        await finalizeAccountCreation(null);
      }
    } catch (err) {
      setError(err.message.toUpperCase());
      setLoading(false);
    }
  };

  const finalizeAccountCreation = async (shadowRecord = null) => {
    setLoading(true);
    const targetEmail = formData.email.trim().toLowerCase();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, targetEmail, formData.password);
      const user = userCredential.user;

      const finalProfile = {
        uid: user.uid,
        fullName: shadowRecord?.fullName || formData.name.toUpperCase(),
        email: targetEmail,
        phone: formData.phone,
        rank: shadowRecord?.rank || formData.rank,
        position: shadowRecord?.position || formData.position,
        company: shadowRecord?.company || formData.company,
        platoon: shadowRecord?.platoon || formData.platoon, // Merged Platoon
        squad: shadowRecord?.squad || formData.squad,       // Merged Squad
        letLevel: shadowRecord?.letLevel || "LET 1",
        gender: shadowRecord?.gender || "Male",
        role: shadowRecord?.role || 'cadet',
        isManual: false,
        status: 'Active',
        updatedAt: serverTimestamp(),
        createdAt: shadowRecord?.createdAt || serverTimestamp(),
        accountLinked: !!shadowRecord,
        // If staff already pre-created this roster entry (with a real rank/
        // role) and this signup is just linking a login to it, no separate
        // approval step is needed - they were already vetted then. A blind
        // self-registration with no matching record starts pending.
        approved: !!shadowRecord
      };

      await setDoc(doc(db, "users", user.uid), finalProfile);

      if (shadowRecord?.id) {
        await deleteDoc(doc(db, "users", shadowRecord.id));
      }

      // Best-effort - a failed confirmation email shouldn't block the
      // account from being created or the user from proceeding.
      try {
        const idToken = await user.getIdToken();
        await fetch('/api/admin-update-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ type: 'signup-confirmation', targetUid: user.uid })
        });
      } catch (notifyErr) {
        console.error('Signup confirmation email failed:', notifyErr);
      }

      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.code === 'auth/email-already-in-use' ? "EMAIL ALREADY REGISTERED." : err.message.toUpperCase());
    } finally {
      setLoading(false);
      setLinkData(null);
    }
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
            <h2 className="text-3xl font-black uppercase italic text-yellow-500 tracking-tighter">Enlist</h2>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">New Personnel Registration</p>
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
              <input type="text" placeholder="FULL NAME (LAST, FIRST)" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none transition-all uppercase font-bold text-white" onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-600" size={18} />
              <input type="email" placeholder="EMAIL ADDRESS" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none transition-all font-bold text-white" onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>

            <div className="relative">
              <Phone className="absolute left-3 top-3 text-slate-600" size={18} />
              <input type="tel" placeholder="PHONE NUMBER" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none transition-all font-bold text-white" onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-600" size={18} />
              <input type="password" placeholder="PASSWORD" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none transition-all font-bold text-white" onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>

            <div className="relative">
              <KeyRound className="absolute left-3 top-3 text-slate-600" size={18} />
              <input type="password" placeholder="CONFIRM PASSWORD" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none transition-all font-bold text-white" onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} />
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
              <input type="text" placeholder="BATTALION SECRET CODE" required className="w-full bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none text-yellow-500 font-black" onChange={(e) => setFormData({...formData, secretCode: e.target.value})} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-yellow-500 text-slate-950 font-black uppercase py-4 rounded-xl mt-8 hover:bg-yellow-400 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
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
                  onClick={() => finalizeAccountCreation(linkData)} 
                  disabled={loading}
                  className="w-full bg-yellow-500 text-slate-950 py-4 rounded-2xl font-black uppercase flex items-center justify-center gap-2 hover:bg-yellow-400 transition-all"
                >
                  {loading ? <Loader2 className="animate-spin" size={18} /> : <>Yes, This is me <ChevronRight size={18} /></>}
                </button>
                <button onClick={() => setLinkData(null)} className="text-slate-500 hover:text-white font-black uppercase text-[10px] py-2">
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