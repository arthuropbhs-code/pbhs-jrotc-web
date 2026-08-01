import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import MyDuties from '../components/MyDuties';
import Footer from '../components/Footer';
import { getInitials } from '../components/Navbar';
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
  Lock,
  Star,
  Home,
  Clock,
  FileText,
  Tent,
  Camera
} from 'lucide-react';
import { ROLE_HIERARCHY, ROLE_LABELS, ADMIN_LEVEL, STAFF_LEVEL, COMMAND_LEVEL } from '../constants';

const AdminDashboard = () => {
  const { userData, role, loading } = useAuth();
  const location = useLocation();
  const [events, setEvents] = useState([]);
  const [requestCount, setRequestCount] = useState(0);

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

  const userLevel = ROLE_HIERARCHY[role] || 0;
  const isCommander = userLevel >= COMMAND_LEVEL;
  const isTopFour = userLevel >= ADMIN_LEVEL;
  const isStaffOrS4 = userLevel >= STAFF_LEVEL;

  const isActive = (path) => location.pathname === path;

  // Client-side only - a real security boundary for this also needs a
  // matching Firestore rule (restricting what a pending account can read/
  // write), which isn't published yet. This just keeps a newly-registered
  // cadet from landing on a dashboard that looks fully functional before
  // staff has actually reviewed and ranked them.
  if (!loading && userData?.approved === false) {
    return (
      <div className="min-h-screen bg-blue-50 dark:bg-slate-950 flex items-center justify-center p-6 text-center transition-colors duration-300">
        <div className="max-w-md">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-6 text-yellow-500">
            <Clock size={32} />
          </div>
          <h1 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white mb-3">Pending Approval</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-8">
            Your Command Portal account request has been submitted. Battalion staff needs to review it and assign your rank and position before you can access the dashboard.
          </p>
          <button onClick={handleLogout} className="text-red-500 font-black uppercase text-xs tracking-widest hover:text-red-400 transition-colors">
            Log Out
          </button>
        </div>
      </div>
    );
  }

  return (
    // MAIN WRAPPER: Light Blue vs Slate Dark
    <div className="min-h-screen bg-blue-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors duration-300">
      
      {/* --- SIDEBAR NAVIGATION --- */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-blue-100 dark:border-white/5 p-6 flex flex-col fixed h-full z-10 shadow-sm transition-colors">
        <div className="mb-10">
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-yellow-500">Battalion</h2>
          <p className="text-[10px] text-blue-400 dark:text-slate-500 uppercase font-bold tracking-[0.2em]">Admin Dashboard</p>
        </div>

        <nav className="flex-1 space-y-2">
          <Link
            to="/"
            className="flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5 hover:text-yellow-500 transition-all mb-2 border-b border-blue-100 dark:border-white/5 pb-4"
          >
            <Home size={18} /> Back to Website
          </Link>

          <Link
            to="/admin/dashboard"
            className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${
              isActive('/admin/dashboard') 
                ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5 hover:text-yellow-500'
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
                      ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20' 
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
                    ? 'bg-yellow-500 text-slate-950' 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5'
                }`}
              >
                <PlusSquare size={18} /> Issue Orders/Events
              </Link>

              {isStaffOrS4 && (
                <Link
                  to="/admin/teams"
                  className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${
                    isActive('/admin/teams')
                      ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5'
                  }`}
                >
                  {isTopFour ? <Users size={18} /> : <Lock size={16} />}
                  <span>Manage Teams</span>
                </Link>
              )}

              {isStaffOrS4 && (
                 <Link
                   to="/admin/announcements"
                   className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${
                     isActive('/admin/announcements')
                       ? 'bg-yellow-500 text-slate-950'
                       : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5'
                   }`}
                 >
                   <Megaphone size={18} /> Global Broadcast
                 </Link>
              )}

              {isStaffOrS4 && (
                 <Link
                   to="/admin/leadership"
                   className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${
                     isActive('/admin/leadership')
                       ? 'bg-yellow-500 text-slate-950'
                       : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5'
                   }`}
                 >
                   <Star size={18} /> Manage Leadership
                 </Link>
              )}

              {(role === 's5_public_affairs' || role === 's6_technology' || isTopFour) && (
                 <Link
                   to="/admin/content"
                   className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${
                     isActive('/admin/content')
                       ? 'bg-yellow-500 text-slate-950'
                       : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5'
                   }`}
                 >
                   <FileText size={18} /> Manage Content
                 </Link>
              )}

              {(role === 's5_public_affairs' || role === 's6_technology' || isTopFour) && (
                 <Link
                   to="/admin/documents"
                   className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${
                     isActive('/admin/documents')
                       ? 'bg-yellow-500 text-slate-950'
                       : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5'
                   }`}
                 >
                   <FileText size={18} /> Manage Documents
                 </Link>
              )}

              {isStaffOrS4 && (
                 <Link
                   to="/admin/camps"
                   className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${
                     isActive('/admin/camps')
                       ? 'bg-yellow-500 text-slate-950'
                       : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5'
                   }`}
                 >
                   <Tent size={18} /> Camp Attendance
                 </Link>
              )}

              {isStaffOrS4 && (
                 <Link
                   to="/admin/stats"
                   className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${
                     isActive('/admin/stats')
                       ? 'bg-yellow-500 text-slate-950'
                       : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5'
                   }`}
                 >
                   <BarChart3 size={18} /> Battalion Stats
                 </Link>
              )}
            </>
          )}

          <Link 
            to="/uniform-requests" 
            className={`flex items-center justify-between p-3 rounded-xl font-bold text-sm transition-all ${
              isActive('/uniform-requests') 
                ? 'bg-yellow-500 text-slate-950' 
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
                ? 'bg-yellow-500 text-slate-950'
                : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5'
            }`}
          >
            <Camera size={18} /> Photo Gallery
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
              Welcome, <span className="text-yellow-500">{userData?.fullName || userData?.name || 'Cadet'}</span>
            </h1>
            <div className="flex items-center gap-3 mt-2">
              <span className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-blue-400 dark:text-slate-500 transition-colors">
                {userData?.rank}
              </span>
              <span className="text-yellow-500 text-[10px] font-black uppercase tracking-widest">
                {userData?.position} | {userData?.company} Company
              </span>
            </div>
          </div>
          
          <Link
            to="/admin/profile"
            title="My Profile"
            className="bg-white dark:bg-slate-900 pl-4 pr-5 py-3 rounded-2xl border border-blue-100 dark:border-white/5 flex items-center gap-3 shadow-sm transition-colors hover:border-yellow-500/40 group"
          >
            <div className="w-10 h-10 rounded-full bg-yellow-500 text-slate-950 flex items-center justify-center text-xs font-black uppercase shrink-0 group-hover:scale-105 transition-transform">
              {getInitials(userData?.fullName) || <UserCircle size={20} />}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-blue-300 dark:text-slate-600 leading-none mb-1">My Profile</p>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-300 uppercase tracking-tighter">
                {ROLE_LABELS[role] || role?.replace('_', ' ')}
              </p>
            </div>
          </Link>
        </header>

        {!isTopFour && isCommander && (
          <div className="mb-8 p-4 bg-blue-100/30 dark:bg-yellow-500/5 border border-blue-100 dark:border-yellow-500/20 rounded-2xl flex items-center gap-3">
            <ShieldAlert className="text-yellow-500" size={18} />
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
              Staff Access Active. <span className="text-yellow-500">Command features are restricted based on your role.</span>
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
                  <ClipboardCheck className="text-yellow-500" /> Command Feed
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
            <div className="bg-gradient-to-br from-yellow-500 to-yellow-400 rounded-3xl p-8 text-slate-950 shadow-lg shadow-yellow-500/20">
              <h3 className="font-black uppercase italic text-xl mb-1 tracking-tighter">
                Quick Glance
              </h3>
              <p className="text-[10px] font-black opacity-70 mb-6 uppercase tracking-[0.2em]">
                Battalion Snapshot
              </p>

              <div className="space-y-3">
                <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex justify-between items-center">
                  <p className="text-[10px] font-black uppercase leading-none">Pending Uniform Requests</p>
                  <p className="text-2xl font-black tracking-tighter leading-none">{requestCount}</p>
                </div>
                <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex justify-between items-center">
                  <p className="text-[10px] font-black uppercase leading-none">Upcoming Events</p>
                  <p className="text-2xl font-black tracking-tighter leading-none">{events.length}</p>
                </div>
              </div>

              <Link to="/admin/stats" className="mt-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-slate-950/10 hover:bg-slate-950/20 rounded-xl py-3 transition-all">
                View Full Stats <ChevronRight size={14} />
              </Link>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-3xl p-8 shadow-sm transition-colors">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-300 dark:text-slate-600 flex items-center gap-2">
                   <Calendar size={14} /> Upcoming Events
                </h3>
                <Link to="/events" className="text-yellow-500 p-1 hover:bg-blue-50 dark:hover:bg-white/5 rounded-lg transition-all">
                  <ChevronRight size={16} />
                </Link>
              </div>
              
              <div className="space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[2px] before:bg-blue-50 dark:before:bg-white/5">
                {events.length > 0 ? events.map((event) => (
                  <div key={event.id} className="relative pl-6 group">
                    <div className="absolute left-0 top-1.5 w-3.5 h-3.5 bg-white dark:bg-slate-900 border-2 border-blue-100 dark:border-white/10 rounded-full group-hover:border-yellow-500 group-hover:bg-yellow-500 transition-all"></div>
                    <p className="text-[10px] font-black text-yellow-500/70 uppercase mb-1 tracking-tighter">{event.date}</p>
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
        <Footer />
      </main>
    </div>
  );
};

export default AdminDashboard;