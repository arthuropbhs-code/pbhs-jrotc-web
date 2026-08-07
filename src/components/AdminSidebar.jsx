// src/components/AdminSidebar.jsx
//
// Persistent sidebar used by every authenticated admin page.
// Extracted from AdminDashboard so the nav is always visible regardless
// of which admin sub-page you're on, not just when you're on the dashboard.

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db, auth } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
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
  Megaphone,
  Lock,
  Star,
  Home,
  FileText,
  Tent,
  Building2,
} from 'lucide-react';
import { ROLE_HIERARCHY, ADMIN_LEVEL, STAFF_LEVEL, COMMAND_LEVEL } from '../constants';
import { getInitials } from '../utils/getInitials';

const AdminSidebar = () => {
  const { userData, role, loading } = useAuth();
  const location = useLocation();
  const [requestCount, setRequestCount] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'uniform_requests'), (snapshot) => {
      const pending = snapshot.docs.filter(d => d.data().status === 'Pending').length;
      setRequestCount(pending);
    });
    return () => unsub();
  }, []);

  const handleLogout = () => signOut(auth);

  const userLevel = ROLE_HIERARCHY[role] || 0;
  const isCommander  = userLevel >= COMMAND_LEVEL;
  const isTopFour    = userLevel >= ADMIN_LEVEL;
  const isStaffOrS4  = userLevel >= STAFF_LEVEL;

  const isActive = (path) => location.pathname === path;

  const navLink = (to, icon, label, extra = '') => (
    <Link
      to={to}
      className={`flex items-center gap-3 p-3 rounded-xl font-bold text-sm transition-all ${
        isActive(to)
          ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20'
          : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5'
      } ${extra}`}
    >
      {icon}
      {label}
    </Link>
  );

  const groupLabel = (text) => (
    <p className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-300 dark:text-slate-600 px-3 pt-5 pb-1">
      {text}
    </p>
  );

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-blue-100 dark:border-white/5 p-6 flex flex-col fixed h-full z-10 shadow-sm transition-colors duration-300">
      {/* Branding */}
      <div className="mb-8">
        <h2 className="text-xl font-black uppercase italic tracking-tighter text-yellow-500">Battalion</h2>
        <p className="text-[10px] text-blue-400 dark:text-slate-500 uppercase font-bold tracking-[0.2em]">Admin Dashboard</p>
      </div>

      {/* Avatar quick link */}
      <Link
        to="/admin/profile"
        className="flex items-center gap-3 mb-6 p-3 rounded-2xl border border-blue-100 dark:border-white/5 hover:border-yellow-500/30 transition-colors group"
      >
        <div className="w-9 h-9 rounded-full bg-yellow-500 text-slate-950 flex items-center justify-center text-xs font-black uppercase shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
          {userData?.portrait ? (
            <img src={userData.portrait} alt="" className="w-full h-full object-cover" />
          ) : (
            getInitials(userData?.fullName) || <UserCircle size={18} />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase text-blue-400 dark:text-slate-500 leading-none mb-0.5">My Profile</p>
          <p className="text-xs font-bold text-slate-900 dark:text-white truncate uppercase tracking-tight">
            {userData?.fullName || 'Cadet'}
          </p>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto space-y-0.5">
        {/* Always-visible top links */}
        <Link
          to="/"
          className="flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5 hover:text-yellow-500 transition-all mb-2 border-b border-blue-100 dark:border-white/5 pb-4"
        >
          <Home size={18} /> Back to Website
        </Link>

        {navLink('/admin/dashboard', <LayoutDashboard size={18} />, 'Dashboard')}

        {loading ? (
          <div className="space-y-2 mt-2">
            <div className="h-10 bg-blue-50/50 dark:bg-white/5 animate-pulse rounded-xl mx-1" />
            <div className="h-10 bg-blue-50/50 dark:bg-white/5 animate-pulse rounded-xl mx-1" />
          </div>
        ) : isCommander && (
          <>
            {/* ── GROUP 1: OPERATIONS ─────────────── */}
            {groupLabel('Operations')}
            {navLink('/admin/orders',       <PlusSquare size={18} />,     'Issue Orders/Events')}
            {navLink('/admin/assign-tasks', <ClipboardCheck size={18} />, 'Assign Tasks')}
            {isStaffOrS4 && navLink('/admin/announcements', <Megaphone size={18} />, 'Global Broadcast')}

            {/* ── GROUP 2: MANAGE ─────────────────── */}
            {groupLabel('Manage')}
            {isStaffOrS4 && navLink('/admin/users',     <UserCog size={18} />, 'Personnel')}
            {isStaffOrS4 && navLink('/admin/teams',
              isTopFour ? <Users size={18} /> : <Lock size={16} />, 'Teams')}
            {isStaffOrS4 && navLink('/admin/leadership', <Star size={18} />,     'Leadership')}
            {(role === 's5_public_affairs' || role === 's6_technology' || isTopFour) && navLink('/admin/content',   <FileText size={18} />, 'Content')}
            {(role === 's5_public_affairs' || role === 's6_technology' || isTopFour) && navLink('/admin/documents', <FileText size={18} />, 'Documents')}

            {/* ── GROUP 3: ANALYTICS ──────────────── */}
            {groupLabel('Analytics')}
            {isStaffOrS4 && navLink('/admin/camps', <Tent size={18} />,     'Camp Attendance')}
            {isStaffOrS4 && navLink('/admin/stats', <BarChart3 size={18} />, 'Battalion Stats')}
            {isTopFour   && navLink('/admin/companies', <Building2 size={18} />, 'Company Names')}
          </>
        )}

        {/* ── ALWAYS-VISIBLE BOTTOM LINKS ─────── */}
        <div className="mt-4 pt-4 border-t border-blue-100 dark:border-white/5">
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
        </div>
      </nav>

      <button
        onClick={handleLogout}
        className="mt-auto flex items-center gap-3 p-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl font-bold text-sm transition-all border border-transparent hover:border-red-100 dark:hover:border-red-500/20"
      >
        <LogOut size={18} /> Log Out
      </button>
    </aside>
  );
};

export default AdminSidebar;
