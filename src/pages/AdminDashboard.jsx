import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import MyDuties from '../components/MyDuties';
import { db, auth } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { 
  LayoutDashboard, 
  ClipboardCheck, 
  UserCircle, 
  LogOut, 
  PlusSquare,
  BarChart3,
  Users,
  UserCog, 
  Shirt,
  Calendar,
  ChevronRight,
  Megaphone, 
  ShieldAlert, 
  Lock         
} from 'lucide-react';

const AdminDashboard = () => {
  const { userData, role, loading } = useAuth();
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [requestCount, setRequestCount] = useState(0);

  const calculateDaysUntil = (targetDate) => {
    const diff = new Date(targetDate) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const daysToOrgDay = calculateDaysUntil('2026-04-02');

  useEffect(() => {
    const eventsQuery = query(
      collection(db, "events"), 
      orderBy("date", "asc"), 
      limit(3)
    );
    
    const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Events Sync Error:", error));

    const unsubRequests = onSnapshot(collection(db, "uniform_requests"), (snapshot) => {
      const pending = snapshot.docs.filter(d => d.data().status !== 'Completed').length;
      setRequestCount(pending);
    });

    return () => {
      unsubEvents();
      unsubRequests();
    };
  }, []);

  const handleLogout = () => signOut(auth);

  const isCommander = role === 'battalion_4' || role === 'battalion_staff' || role === 'company_leadership';
  const isTopFour = role === 'battalion_4';
  const isStaffOrS4 = role === 'battalion_4' || role === 'battalion_staff';

  const isActive = (path) => location.pathname === path;

  return (
    // MAIN WRAPPER: Light Blue vs Slate Dark
    <div className="min-h-screen bg-blue-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-300">
      
      {/* --- SIDEBAR NAVIGATION --- */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-blue-100 dark:border-white/5 p-6 flex flex-col fixed h-full z-10 shadow-sm transition-colors">
        <div className="mb-10">
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-[#d4af37]">Command</h2>
          <p className="text-[10px] text-blue-400 dark:text-slate-500 uppercase font-bold tracking-[0.2em]">Personnel Management</p>
        </div>

        <nav className="flex-1 space-y-2">
          <Link 
            to="/admin/dashboard" 
            className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${
              isActive('/admin/dashboard') 
                ? 'bg-[#d4af37] text-white shadow-lg shadow-yellow-500/20' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5 hover:text-[#d4af37]'
            }`}
          >
            <LayoutDashboard size={18} /> Dashboard
          </Link>
          
          {loading ? (
            <div className="space-y-2">
              <div className="h-10 bg-blue-50/50 dark:bg-white/5 animate-pulse rounded-xl mx-1" />
              <div className="h-10 bg-blue-50/50 dark:bg-white/5 animate-pulse rounded-xl mx-1" />
            </div>
          ) : isCommander && (
            <>
              {isStaffOrS4 && (
                <Link 
                  to="/admin/users" 
                  className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${
                    isActive('/admin/users') 
                      ? 'bg-[#d4af37] text-white shadow-lg shadow-yellow-500/20' 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5'
                  }`}
                >
                  <UserCog size={18} /> Manage Personnel
                </Link>
              )}

              <Link 
                to="/admin/orders" 
                className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${
                  isActive('/admin/orders') 
                    ? 'bg-[#d4af37] text-white' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5'
                }`}
              >
                <PlusSquare size={18} /> Issue Orders/Events
              </Link>

              <Link 
                to="/admin/teams" 
                className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${
                  isActive('/admin/teams') 
                    ? 'bg-[#d4af37] text-white shadow-lg shadow-yellow-500/20' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5'
                }`}
              >
                {isTopFour || role === 'company_leadership' ? <Users size={18} /> : <Lock size={16} />}
                <span>Manage Teams</span>
              </Link>

              {isStaffOrS4 && (
                 <Link 
                   to="/admin/announcements" 
                   className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${
                     isActive('/admin/announcements') 
                       ? 'bg-[#d4af37] text-white' 
                       : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5'
                   }`}
                 >
                   <Megaphone size={18} /> Global Broadcast
                 </Link>
              )}
            </>
          )}

          <Link 
            to="/uniform-requests" 
            className={`flex items-center justify-between p-3 rounded-xl font-bold text-sm transition-all ${
              isActive('/uniform-requests') 
                ? 'bg-[#d4af37] text-white' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <Shirt size={18} /> Uniform Items
            </div>
            {requestCount > 0 && (
              <span className="bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black">
                {requestCount}
              </span>
            )}
          </Link>

          <Link 
            to="/photos" 
            className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${
              isActive('/photos') 
                ? 'bg-[#d4af37] text-white' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5'
            }`}
          >
            <BarChart3 size={18} /> Battalion Stats
          </Link>
        </nav>

        <button 
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl font-bold text-sm transition-all border border-transparent hover:border-red-100 dark:hover:border-red-500/20"
        >
          <LogOut size={18} /> Log Out
        </button>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 ml-64 p-10 overflow-y-auto">
        <header className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
              Welcome, <span className="text-[#d4af37]">{userData?.name || 'Cadet'}</span>
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-400 dark:text-slate-500 transition-colors">
                {userData?.rank}
              </span>
              <span className="text-[#d4af37] text-[10px] font-black uppercase tracking-widest">
                {userData?.position} | {userData?.company} Company
              </span>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-blue-100 dark:border-white/5 flex items-center gap-4 shadow-sm transition-colors">
            <UserCircle className="text-blue-200 dark:text-slate-700" size={32} />
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-blue-300 dark:text-slate-600 leading-none mb-1">Access Level</p>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-300 uppercase tracking-tighter">
                {role?.replace('_', ' ')}
              </p>
            </div>
          </div>
        </header>

        {!isTopFour && isCommander && (
          <div className="mb-8 p-4 bg-blue-100/30 dark:bg-yellow-500/5 border border-blue-100 dark:border-yellow-500/20 rounded-2xl flex items-center gap-3">
            <ShieldAlert className="text-[#d4af37]" size={18} />
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Staff Access Active. <span className="text-[#d4af37]">Command features are restricted based on your role.</span>
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-3xl p-8 shadow-sm relative overflow-hidden transition-colors">
              {/* Floating Ambient Blue Glow (Hidden in dark mode for cleaner look) */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-transparent rounded-full blur-3xl -mr-16 -mt-16"></div>
              
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black uppercase italic flex items-center gap-3 text-slate-900 dark:text-white">
                  <ClipboardCheck className="text-[#d4af37]" /> Command Feed
                </h2>
                <span className="flex items-center gap-2 text-[10px] font-bold text-blue-300 dark:text-slate-600 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  Live Updates
                </span>
              </div>
              <MyDuties /> 
            </section>
          </div>

          <div className="space-y-8">
            <div className="bg-gradient-to-br from-[#d4af37] to-[#b8962d] rounded-3xl p-8 text-white shadow-lg shadow-yellow-500/20">
              <h3 className="font-black uppercase italic text-xl mb-1 tracking-tighter">
                Battalion Status
              </h3>
              <p className="text-[10px] font-black opacity-80 mb-6 uppercase tracking-[0.2em]">
                Honor Unit With Distinction
              </p>
              
              <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black uppercase leading-none mb-1">Organizational Day</p>
                    <p className="text-[8px] font-bold uppercase opacity-80">April 2nd, 2026</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black tracking-tighter leading-none">{daysToOrgDay}</p>
                    <p className="text-[8px] font-black uppercase">Days Left</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-3xl p-8 shadow-sm transition-colors">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300 dark:text-slate-600 flex items-center gap-2">
                   <Calendar size={14} /> Upcoming Events
                </h3>
                <Link to="/events" className="text-[#d4af37] p-1 hover:bg-blue-50 dark:hover:bg-white/5 rounded-lg transition-all">
                  <ChevronRight size={16} />
                </Link>
              </div>
              
              <div className="space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-blue-50 dark:before:bg-white/5">
                {events.length > 0 ? events.map((event) => (
                  <div key={event.id} className="relative pl-6 group">
                    <div className="absolute left-0 top-1.5 w-3.5 h-3.5 bg-white dark:bg-slate-900 border-2 border-blue-100 dark:border-white/10 rounded-full group-hover:border-[#d4af37] group-hover:bg-[#d4af37] transition-all"></div>
                    <p className="text-[10px] font-black text-[#d4af37]/70 uppercase mb-1 tracking-tighter">{event.date}</p>
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{event.title}</h4>
                    <p className="text-[10px] text-blue-400 dark:text-slate-500 font-bold uppercase mt-1">{event.location}</p>
                  </div>
                )) : (
                  <div className="py-4 text-center text-xs text-blue-300 dark:text-slate-600 italic">No events scheduled.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;