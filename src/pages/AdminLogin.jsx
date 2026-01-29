import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { ShieldCheck, Lock, Mail, AlertTriangle, Loader2 } from 'lucide-react';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Firebase authentication call
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Store the token for the ProtectedRoute check
      localStorage.setItem('admin_token', userCredential.user.accessToken);
      
      // Redirect to the dashboard we just built
      navigate('/admin/dashboard');
    } catch (err) {
      console.error(err);
      setError("Invalid Email or Access Key. Access Denied.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
        
        {/* Visual Header */}
        <div className="p-8 bg-white/5 border-b border-white/5 text-center">
          <ShieldCheck className="mx-auto text-yellow-500 mb-4" size={40} />
          <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Command Access</h2>
          <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] mt-1 font-bold">Authorized Personnel Only</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Staff Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="email" 
                required
                placeholder="commander@pbhs.com"
                className="w-full bg-slate-950 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:border-yellow-500 outline-none transition-all"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Access Key</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input 
                type="password" 
                required
                placeholder="••••••••"
                className={`w-full bg-slate-950 border ${error ? 'border-red-500' : 'border-white/10'} rounded-xl py-4 pl-12 pr-4 text-white focus:border-yellow-500 outline-none transition-all`}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-3 rounded-lg border border-red-500/20 animate-shake">
              <AlertTriangle size={16} />
              <span className="text-[10px] font-bold uppercase tracking-wider">{error}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black uppercase tracking-widest py-4 rounded-xl shadow-lg shadow-yellow-500/10 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : "Authenticate"}
          </button>
        </form>

        <div className="p-6 bg-black/20 text-center">
          <p className="text-[9px] text-slate-600 uppercase font-bold tracking-widest leading-loose">
            System Monitoring Active <br /> Ensure proper Protocol usage
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;