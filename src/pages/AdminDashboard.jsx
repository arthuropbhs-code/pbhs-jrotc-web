import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import MyDuties from '../components/MyDuties';
import Footer from '../components/Footer';
import OnboardingChecklist from '../components/OnboardingChecklist';
import { getInitials } from '../utils/getInitials';
import { db, auth } from '../firebase';
import { collection, query, orderBy, limit, where, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import {
  ClipboardCheck,
  UserCircle,
  Calendar,
  ChevronRight,
  ShieldAlert,
  Clock,
} from 'lucide-react';
import AnimatedNumber from '../components/AnimatedNumber';
import { ROLE_HIERARCHY, ROLE_LABELS, ADMIN_LEVEL, STAFF_LEVEL, COMMAND_LEVEL } from '../constants';

const AdminDashboard = () => {
  const { userData, role, loading } = useAuth();
  const [events,       setEvents]       = useState([]);
  const [requestCount, setRequestCount] = useState(0);  // pending uniform requests (staff+)
  const [s1PendingCount, setS1PendingCount] = useState(0); // pending S1 turn-ins (company cmd)

  useEffect(() => {
    if (loading || !userData) return;

    // Filter to today-or-future events so the dashboard never shows stale past events.
    const todayStr = new Date().toISOString().split('T')[0]; // "YYYY-MM-DD"
    const eventsQuery = query(
      collection(db, "events"),
      where("date", ">=", todayStr),
      orderBy("date", "asc"),
      limit(3)
    );

    const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Events Sync Error:", error));

    const userLvl = ROLE_HIERARCHY[userData.role] || 0;
    const unsubs = [unsubEvents];

    if (userLvl >= STAFF_LEVEL) {
      // Staff and above: show pending uniform requests they can action.
      const unsubRequests = onSnapshot(collection(db, "uniform_requests"), (snapshot) => {
        const pending = snapshot.docs.filter(d => d.data().status === 'Pending').length;
        setRequestCount(pending);
      });
      unsubs.push(unsubRequests);
    } else if (userLvl >= COMMAND_LEVEL && userData.company) {
      // Company leadership (45–69): show cadets still pending turn-in in their company.
      const s1Query = query(
        collection(db, 'formSubmissions'),
        where('company', '==', userData.company),
        where('status',  '==', 'pending'),
      );
      const unsubS1 = onSnapshot(s1Query, snap => setS1PendingCount(snap.size),
        () => setS1PendingCount(0));
      unsubs.push(unsubS1);
    }

    return () => unsubs.forEach(u => u());
  }, [loading, userData]);

  const handleLogout = () => signOut(auth);

  const userLevel = ROLE_HIERARCHY[role] || 0;
  const isCommander = userLevel >= COMMAND_LEVEL;
  const isTopFour = userLevel >= ADMIN_LEVEL;
  const isStaffOrS4 = userLevel >= STAFF_LEVEL;

  // Mirrors the isRestrictedCmd constant in AdminSidebar / RESTRICTED_CMD in App.jsx.
  const isRestrictedCmd = role === 'sergeant_major' || role === 'battalion_commander' || role === 'battalion_csm';

  const cadetOnboardingItems = [
    { id: 'profile', label: 'Complete your profile', description: 'Add your rank, position, and company so staff can find you.', link: '/admin/profile', linkText: 'My Profile' },
    { id: 'cadet-info', label: 'Review Cadet Info', description: 'Rank structure, LET levels, and what to expect this year.', link: '/cadet-info', linkText: 'View' },
    { id: 'documents', label: 'Read documents & regulations', description: 'Battalion policies, forms, and required reading.', link: '/documents', linkText: 'View' },
  ];

  // Each item is only included when the user can actually reach that page,
  // matching the sidebar and route protection rules so the checklist never
  // links somewhere the user would get immediately redirected away from.
  const canSeePersonnel = role === 's1_adjutant' || role === 's6_technology'
    || isTopFour;
  const canSeeBroadcast = role === 's5_public_affairs' || (isTopFour && !isRestrictedCmd);
  const canSeeNewsletter = role === 's5_public_affairs' || (isTopFour && !isRestrictedCmd);
  const canSeeLeadership = role === 's5_public_affairs' || (isTopFour && !isRestrictedCmd);
  const canSeeStats      = isStaffOrS4; // all staff can see stats

  const staffOnboardingItems = [
    ...(canSeePersonnel ? [{ id: 'personnel',  label: 'Manage Accounts',           description: 'Review the roster, ranks, and pending account approvals.', link: '/admin/users',          linkText: 'Open' }] : []),
    ...(canSeeBroadcast ? [{ id: 'broadcast',  label: 'Send a Global Broadcast',    description: 'See how battalion-wide announcements work.',              link: '/admin/announcements', linkText: 'Open' }] : []),
    ...(canSeeNewsletter? [{ id: 'newsletter', label: 'Manage Newsletters',         description: 'Publish battalion newsletter issues for cadets to read.', link: '/admin/newsletters',   linkText: 'Open' }] : []),
    ...(canSeeLeadership? [{ id: 'leadership', label: 'Review Manage Leadership',   description: 'Command staff listing shown on the public site.',          link: '/admin/leadership',    linkText: 'Open' }] : []),
    ...(canSeeStats      ? [{ id: 'stats',     label: 'Check Battalion Stats',      description: 'Roster breakdown, uniform logistics, and camp attendance.', link: '/admin/stats',        linkText: 'Open' }] : []),
  ];

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
    // AdminLayout (in App.jsx) provides the sidebar + outer bg wrapper.
    // This component renders only the main content area.
    <div className="flex-1 text-slate-900 dark:text-slate-100">
      {/* AdminLayout (in App.jsx) provides the sidebar. This renders the main content only. */}
      <main className="p-10">
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
            <div className="w-10 h-10 rounded-full bg-yellow-500 text-slate-950 flex items-center justify-center text-xs font-black uppercase shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
              {userData?.portrait ? (
                <img src={userData.portrait} alt="" className="w-full h-full object-cover" />
              ) : (
                getInitials(userData?.fullName) || <UserCircle size={20} />
              )}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase text-blue-600 dark:text-slate-400 leading-none mb-1">My Profile</p>
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

        {isStaffOrS4 ? (
          <OnboardingChecklist key="staff" storageKey="staff" title="Getting Started as Staff" items={staffOnboardingItems} />
        ) : (
          <OnboardingChecklist key="cadet" storageKey="cadet" title="Getting Started" items={cadetOnboardingItems} />
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
                <span className="flex items-center gap-2 text-[10px] font-bold text-blue-600 dark:text-slate-400 uppercase tracking-widest">
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
                {/* Top stat tile — context-aware by role */}
                {isStaffOrS4 ? (
                  <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase leading-none">Pending Uniform Requests</p>
                    <AnimatedNumber value={requestCount} className="text-2xl font-black tracking-tighter leading-none" />
                  </div>
                ) : isCommander ? (
                  <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex justify-between items-center">
                    <p className="text-[10px] font-black uppercase leading-none">Cadets Pending Turn-In</p>
                    <AnimatedNumber value={s1PendingCount} className="text-2xl font-black tracking-tighter leading-none" />
                  </div>
                ) : null}
                <div className="bg-white/20 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex justify-between items-center">
                  <p className="text-[10px] font-black uppercase leading-none">Upcoming Events</p>
                  <AnimatedNumber value={events.length} className="text-2xl font-black tracking-tighter leading-none" />
                </div>
              </div>

              <Link to="/admin/stats" className="mt-4 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest bg-slate-950/10 hover:bg-slate-950/20 rounded-xl py-3 transition-all">
                View Full Stats <ChevronRight size={14} />
              </Link>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-3xl p-8 shadow-sm transition-colors">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-slate-400 flex items-center gap-2">
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
                  <div className="py-4 text-center text-xs text-blue-600 dark:text-slate-400 italic">No events scheduled.</div>
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