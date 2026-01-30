import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
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
  ArrowLeft 
} from 'lucide-react';

const SignUp = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    rank: '',
    position: '',
    company: '',
    phone: '',
    secretCode: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const BATTALION_SECRET = "PBHS2026"; 
  
  const ranks = ["CDT PVT No Insignia", "CDT PVT", "CDT PFC", "CDT CPL", "CDT SGT", "CDT SSG", "CDT SFC", "CDT MSG", "CDT SG", "CDT SGM", "CDT CSM", "CDT 2LT", "CDT 1LT", "CDT CPT", "CDT MAJ", "CDT LTC", "CDT COL"];
  const positions = ["Squad Member", "Squad Leader", "Platoon Sergeant", "Platoon Leader", "First Sergeant", "Company Commander", "S1 Assistant", "S2 Assistant", "S3 Assistant", "S4 Assistant", "S5 Assistant", "S6 Assistant", "S7 Assistant", "Battalion S1", "Battalion S2", "Battalion S3", "Battalion S4", "Battalion S5", "Battalion S6", "Battalion S7"];
  const companies = ["Uniform", "Victor", "Whisky", "X-Ray", "Yankee", "Battalion"];

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.secretCode !== BATTALION_SECRET) {
      setError("INVALID SECRET CODE: Access Denied.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("PASSWORDS DO NOT MATCH.");
      return;
    }

    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        name: formData.name,
        email: formData.email,
        rank: formData.rank,
        position: formData.position,
        company: formData.company,
        phone: formData.phone,
        role: 'cadet', // Default role
        status: 'pending',
        createdAt: serverTimestamp()
      });

      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <Link to="/admin" className="text-slate-500 hover:text-white flex items-center gap-2 mb-6 text-xs font-bold uppercase tracking-widest transition-all">
          <ArrowLeft size={14} /> Back to Login
        </Link>

        <form onSubmit={handleSignUp} className="bg-slate-900 p-8 rounded-3xl border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50"></div>

          <div className="mb-8">
            <h2 className="text-3xl font-black uppercase italic text-yellow-500">Enlist</h2>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em] mt-1">New Personnel Registration</p>
          </div>
          
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-xs font-bold mb-6 italic">{error}</div>}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative col-span-full">
              <User className="absolute left-3 top-3 text-slate-600" size={18} />
              <input type="text" placeholder="FULL NAME" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none transition-all" 
                onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>

            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-600" size={18} />
              <input type="email" placeholder="EMAIL ADDRESS" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none transition-all" 
                onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>

            <div className="relative">
              <Phone className="absolute left-3 top-3 text-slate-600" size={18} />
              <input type="tel" placeholder="PHONE NUMBER" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none transition-all" 
                onChange={(e) => setFormData({...formData, phone: e.target.value})} />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-600" size={18} />
              <input type="password" placeholder="PASSWORD" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none transition-all" 
                onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>

            <div className="relative">
              <KeyRound className="absolute left-3 top-3 text-slate-600" size={18} />
              <input type="password" placeholder="CONFIRM PASSWORD" required className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none transition-all" 
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})} />
            </div>

            <div className="relative">
              <Medal className="absolute left-3 top-3 text-slate-600" size={18} />
              <select required value={formData.rank} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none appearance-none"
                onChange={(e) => setFormData({...formData, rank: e.target.value})}>
                <option value="" disabled>SELECT RANK</option>
                {ranks.map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}
              </select>
            </div>

            <div className="relative">
              <Briefcase className="absolute left-3 top-3 text-slate-600" size={18} />
              <select required value={formData.position} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none appearance-none"
                onChange={(e) => setFormData({...formData, position: e.target.value})}>
                <option value="" disabled>SELECT POSITION</option>
                {positions.map(p => <option key={p} value={p} className="bg-slate-900">{p}</option>)}
              </select>
            </div>

            <div className="relative col-span-full">
              <select required value={formData.company} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:border-yellow-500 outline-none appearance-none text-center font-bold"
                onChange={(e) => setFormData({...formData, company: e.target.value})}>
                <option value="" disabled>— ASSIGN COMPANY —</option>
                {companies.map(c => <option key={c} value={c} className="bg-slate-900">{c} Company</option>)}
              </select>
            </div>

            <div className="relative col-span-full">
              <ShieldCheck className="absolute left-3 top-3 text-yellow-500" size={18} />
              <input type="text" placeholder="BATTALION SECRET CODE" required className="w-full bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 pl-10 text-sm focus:border-yellow-500 outline-none text-yellow-500 font-black" 
                onChange={(e) => setFormData({...formData, secretCode: e.target.value})} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="w-full bg-yellow-500 text-slate-950 font-black uppercase py-4 rounded-xl mt-8 hover:bg-yellow-400 transition-all disabled:opacity-50">
            {loading ? "Processing..." : "Request Access"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignUp;