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

  const BATTALION_SECRET = "PBHS2026"; 
  
  const ranks = ["CDT PVT No Insignia", "CDT PVT", "CDT PFC", "CDT CPL", "CDT SGT", "CDT SSG", "CDT SFC", "CDT MSG", "CDT SG", "CDT SGM", "CDT CSM", "CDT 2LT", "CDT 1LT", "CDT CPT", "CDT MAJ", "CDT LTC", "CDT COL"];
  const positions = ["Squad Member", "Squad Leader", "Platoon Sergeant", "Platoon Leader", "First Sergeant", "Company XO" , "Company Commander", "S1 Assistant", "S2 Assistant", "S3 Assistant", "S4 Assistant", "S5 Assistant", "S6 Assistant", "S7 Assistant", "Battalion S1", "Battalion S2", "Battalion S3", "Battalion S4", "Battalion S5", "Battalion S6"];
  const companies = ["Uniform", "Victor", "Whisky" , "X-Ray", "Yankee", "Battalion"];
  const platoons = ["1st Platoon", "2nd Platoon", "3rd Platoon", "HQ Platoon"];
  const squads = ["1st Squad", "2nd Squad", "3rd Squad", "4th Squad", "Staff"];

  const handleSignUpAttempt = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.secretCode !== BATTALION_SECRET) {
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
        accountLinked: !!shadowRecord
      };

      await setDoc(doc(db, "users", user.uid), finalProfile);

      if (shadowRecord?.id) {
        await deleteDoc(doc(db, "users", shadowRecord.id));
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

            {/* Platoon Selection */}
            <div className="relative">
              <select required value={formData.platoon} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:border-yellow-500 outline-none appearance-none font-bold text-white" onChange={(e) => setFormData({...formData, platoon: e.target.value})}>
                {platoons.map(p => <option key={p} value={p} className="bg-slate-900">{p}</option>)}
              </select>
            </div>

            {/* Squad Selection */}
            <div className="relative">
              <select required value={formData.squad} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:border-yellow-500 outline-none appearance-none font-bold text-white" onChange={(e) => setFormData({...formData, squad: e.target.value})}>
                {squads.map(s => <option key={s} value={s} className="bg-slate-900">{s}</option>)}
              </select>
            </div>

            <div className="relative col-span-full">
              <select required value={formData.company} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:border-yellow-500 outline-none appearance-none text-center font-black text-white" onChange={(e) => setFormData({...formData, company: e.target.value})}>
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