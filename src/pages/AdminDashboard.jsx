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
  Shirt,
  Calendar,
  ChevronRight,
  Megaphone, 
  Settings, 
  Trash2
} from 'lucide-react';

const AdminDashboard = () => {
  const { userData, role } = useAuth();
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [requestCount, setRequestCount] = useState(0);

  // --- MOVE COUNTDOWN LOGIC HERE (Outside useEffect) ---
  const calculateDaysUntil = (targetDate) => {
    const diff = new Date(targetDate) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  const daysToOrgDay = calculateDaysUntil('2026-04-02');

  // Unified Data Fetching
  useEffect(() => {
    // 1. Fetch upcoming events
    const eventsQuery = query(
      collection(db, "events"), 
      orderBy("date", "asc"), 
      limit(3)
    );
    
    const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Events Sync Error:", error));

    // 2. Fetch Pending Uniform Requests count
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

  // Commander Permissions: Top 4 and Staff
  const isCommander = role === 'battalion_4' || role === 'battalion_staff' || role === 'company_leadership';

  // Helper to highlight active link
  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      {/* --- SIDEBAR NAVIGATION --- */}
      <aside className="w-64 bg-slate-900 border-r border-white/5 p-6 flex flex-col fixed h-full z-10">
        <div className="mb-10">
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-yellow-500">Command</h2>
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em]">Personnel Management</p>
        </div>

        <nav className="flex-1 space-y-2">
          <Link to="/admin/dashboard" className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${isActive('/admin/dashboard') ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <LayoutDashboard size={18} /> Dashboard
          </Link>
          
          {isCommander && (
            <>
              <Link to="/admin/orders" className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${isActive('/admin/orders') ? 'bg-yellow-500 text-slate-950' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                <PlusSquare size={18} /> Issue Orders/Events
              </Link>
              {(role === 'battalion_4' || role === 'battalion_staff') && (
                 <Link to="/admin/announcements" className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${isActive('/admin/announcements') ? 'bg-yellow-500 text-slate-950' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
                   <Megaphone size={18} /> Global Broadcast
                 </Link>
              )}
            </>
          )}

          <Link to="/uniform-requests" className={`flex items-center justify-between p-3 rounded-xl font-bold text-sm transition-all ${isActive('/uniform-requests') ? 'bg-yellow-500 text-slate-950' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <div className="flex items-center gap-3">
              <Shirt size={18} /> Uniform Items
            </div>
            {requestCount > 0 && (
              <span className="bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black animate-pulse">
                {requestCount}
              </span>
            )}
          </Link>

          <Link to="/photos" className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${isActive('/photos') ? 'bg-yellow-500 text-slate-950' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
            <BarChart3 size={18} /> Battalion Stats
          </Link>
        </nav>

        <button 
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 p-3 text-red-400 hover:bg-red-400/10 rounded-xl font-bold text-sm transition-all border border-transparent hover:border-red-400/20"
        >
          <LogOut size={18} /> Log Out
        </button>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 ml-64 p-10 overflow-y-auto">
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
          
          <div className="bg-slate-900 p-4 rounded-2xl border border-white/5 flex items-center gap-4 shadow-xl">
            <UserCircle className="text-slate-500" size={32} />
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-slate-500 leading-none mb-1">Access Level</p>
              <p className="text-xs font-bold text-white uppercase tracking-tighter">
                {role?.replace('_', ' ')}
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Command Feed */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-slate-900 border border-white/5 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
              
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black uppercase italic flex items-center gap-3">
                  <ClipboardCheck className="text-yellow-500" /> Command Feed
                </h2>
                <span className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  Live Updates
                </span>
              </div>
              
              <MyDuties /> 
            </section>
          </div>

          {/* Right Column: Quick Glance */}
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-3xl p-8 text-slate-950 shadow-lg shadow-yellow-500/10">
              <h3 className="font-black uppercase italic text-xl mb-1 text-slate-900 tracking-tighter">
                Battalion Status
              </h3>
              <p className="text-[10px] font-black opacity-80 mb-6 uppercase tracking-[0.2em] text-slate-800">
                Honor Unit With Distinction
              </p>
              
              <div className="space-y-4">
                <div className="bg-black/10 backdrop-blur-md p-4 rounded-2xl border border-black/5 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black uppercase leading-none mb-1">Organizational Day</p>
                    <p className="text-[8px] font-bold uppercase opacity-60">April 2nd, 2026</p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black tracking-tighter leading-none">{daysToOrgDay}</p>
                    <p className="text-[8px] font-black uppercase">Days Left</p>
                  </div>
                </div>

                <div className="bg-black/10 backdrop-blur-md p-4 rounded-2xl border border-black/5">
                  <p className="text-[10px] font-black uppercase mb-1 text-slate-900">Operational Readiness</p>
                  <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                    <div className="bg-slate-950 h-full w-[85%]"></div> 
                  </div>
                  <p className="text-[9px] font-bold mt-2 text-right text-slate-900">85% ALPHA STRENGTH</p>
                </div>
              </div>
            </div>

            {/* Upcoming Timeline */}
            <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                   <Calendar size={14} /> Upcoming Ops
                </h3>
                <Link to="/events" className="text-yellow-500 p-1 hover:bg-yellow-500/10 rounded-lg transition-all">
                  <ChevronRight size={16} />
                </Link>
              </div>
              
              <div className="space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
                {events.length > 0 ? events.map((event) => (
                  <div key={event.id} className="relative pl-6 group">
                    <div className="absolute left-0 top-1.5 w-3.5 h-3.5 bg-slate-900 border-2 border-slate-700 rounded-full group-hover:border-yellow-500 group-hover:bg-yellow-500 transition-all"></div>
                    <p className="text-[10px] font-black text-yellow-500/70 uppercase mb-1 tracking-tighter">{event.date}</p>
                    <h4 className="text-sm font-bold text-slate-200 leading-tight">{event.title}</h4>
                    <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">{event.location}</p>
                  </div>
                )) : (
                  <div className="py-4 text-center text-xs text-slate-600 italic">No events scheduled.</div>
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