import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import MyDuties from '../components/MyDuties';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  UserCircle, 
  LogOut, 
  PlusSquare,
  BarChart3
} from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const AdminDashboard = () => {
  const { userData, role } = useAuth();

  const handleLogout = () => {
    signOut(auth);
  };

  // Determine if user has permission to assign tasks
  const isCommander = role === 'battalion_4' || role === 'battalion_staff';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* --- SIDEBAR NAVIGATION --- */}
      <aside className="w-64 bg-slate-900 border-r border-white/5 p-6 flex flex-col">
        <div className="mb-10">
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-yellow-500">Command</h2>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em]">Personnel Management</p>
        </div>

        <nav className="flex-1 space-y-2">
          <Link to="/admin/dashboard" className="flex items-center gap-3 p-3 bg-yellow-500/10 text-yellow-500 rounded-xl font-bold text-sm">
            <LayoutDashboard size={18} /> Dashboard
          </Link>
          
          {isCommander && (
            <Link to="/admin/assign-tasks" className="flex items-center gap-3 p-3 text-slate-400 hover:bg-white/5 hover:text-white rounded-xl font-bold text-sm transition-all">
              <PlusSquare size={18} /> Assign Duties
            </Link>
          )}

          <Link to="/photos" className="flex items-center gap-3 p-3 text-slate-400 hover:bg-white/5 hover:text-white rounded-xl font-bold text-sm transition-all">
            <BarChart3 size={18} /> Battalion Stats
          </Link>
        </nav>

        <button 
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 p-3 text-red-400 hover:bg-red-400/10 rounded-xl font-bold text-sm transition-all"
        >
          <LogOut size={18} /> Log Out
        </button>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 p-10 overflow-y-auto">
        
        {/* Header Section */}
        <header className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter">
              Welcome, <span className="text-yellow-500">{userData?.name || 'Cadet'}</span>
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="bg-white/5 border border-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400">
                {userData?.rank}
              </span>
              <span className="text-yellow-500/50 text-[10px] font-black uppercase tracking-widest">
                {userData?.position} | {userData?.company} Company
              </span>
            </div>
          </div>
          
          <div className="bg-slate-900 p-4 rounded-2xl border border-white/5 flex items-center gap-4">
            <UserCircle className="text-slate-500" size={32} />
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-500 leading-none">Access Level</p>
              <p className="text-xs font-bold text-white uppercase">{role?.replace('_', ' ')}</p>
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Personal Duties */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-slate-900 border border-white/5 rounded-3xl p-8 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black uppercase italic flex items-center gap-3">
                  <ClipboardCheck className="text-yellow-500" /> Active Orders
                </h2>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Updates</span>
              </div>
              
              {/* This component handles the filtering we built earlier */}
              <MyDuties /> 
            </section>
          </div>

          {/* Right Column: Quick Stats / Info */}
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-3xl p-8 text-slate-950">
              <h3 className="font-black uppercase italic text-xl mb-2">Battalion Status</h3>
              <p className="text-sm font-bold opacity-80 mb-6 uppercase tracking-wider">Honor Unit With Distinction</p>
              <div className="space-y-4">
                <div className="bg-black/10 p-4 rounded-xl">
                  <p className="text-[10px] font-black uppercase">Next Inspection</p>
                  <p className="text-2xl font-black">14 DAYS</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-white/5 rounded-3xl p-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-white mb-6">Quick Links</h3>
              <div className="space-y-3">
                <Link to="/cadet-info" className="block p-4 bg-white/5 rounded-xl text-xs font-bold hover:bg-white/10 transition-all uppercase tracking-widest text-slate-400 hover:text-yellow-500">
                  Cadet Reference Manual
                </Link>
                <Link to="/photos" className="block p-4 bg-white/5 rounded-xl text-xs font-bold hover:bg-white/10 transition-all uppercase tracking-widest text-slate-400 hover:text-yellow-500">
                  Archived Records
                </Link>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;