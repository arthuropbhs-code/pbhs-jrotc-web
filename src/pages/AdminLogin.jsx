import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, ArrowLeft, UserPlus, Shield } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/admin/dashboard');
    } catch (err) {
      setError("AUTHENTICATION FAILED: Check credentials.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background Decorative Element */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md z-10">
        {/* Top Navigation */}
        <div className="flex justify-between items-center mb-8">
          <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest">
            <ArrowLeft size={16} /> Back to Menu
          </Link>
          <div className="bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-full flex items-center gap-2">
            <Shield size={12} className="text-yellow-500" />
            <span className="text-[10px] font-black text-yellow-500 uppercase tracking-tighter">Secure Access</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-white/5 p-8 rounded-3xl shadow-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-white">Command <span className="text-yellow-500">Login</span></h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Personnel Authorization Required</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-xs font-bold mb-6 flex items-center gap-3">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
              <input 
                type="email" 
                placeholder="CADET EMAIL" 
                className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm focus:border-yellow-500 outline-none transition-all placeholder:text-slate-700 font-bold"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
              <input 
                type="password" 
                placeholder="PASSWORD" 
                className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm focus:border-yellow-500 outline-none transition-all placeholder:text-slate-700 font-bold"
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button className="w-full bg-yellow-500 text-slate-950 font-black uppercase py-4 rounded-xl hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/10 active:scale-[0.98]">
              Authorize Entry
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 flex flex-col items-center gap-4">
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">First time here?</p>
            <Link 
              to="/admin/signup" 
              className="flex items-center gap-2 text-white hover:text-yellow-500 transition-colors font-black uppercase text-xs"
            >
              <UserPlus size={16} /> Create Cadet Account
            </Link>
          </div>
        </div>
        
        <p className="text-center mt-8 text-[10px] text-slate-600 font-bold uppercase tracking-[0.3em]">
          Property of PBHS JROTC
        </p>
      </div>
    </div>
  );
};

export default AdminLogin;