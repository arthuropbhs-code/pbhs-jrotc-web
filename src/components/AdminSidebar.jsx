// src/components/AdminSidebar.jsx
//
// Persistent sidebar used by every authenticated admin page.
// Extracted from AdminDashboard so the nav is always visible regardless
// of which admin sub-page you're on, not just when you're on the dashboard.

import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import {
  LayoutDashboard,
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
  ArrowLeft,
  FileText,
  Tent,
  Building2,
  Image,
  Newspaper,
  Activity,
  BookUser,
  Shield,
  Laptop,
  Heart,
  Ruler,
  ClipboardList,
  NotepadText,
  CalendarDays,
  MessageSquare,
  Trophy,
  X,
  ShoppingCart,
  History,
  Tag,
  ScrollText,
} from 'lucide-react';
import { ROLE_HIERARCHY, ADMIN_LEVEL, STAFF_LEVEL, COMMAND_LEVEL } from '../constants';
import { clearDeviceTrust } from '../hooks/useIdleLogout';
import { getInitials } from '../utils/getInitials';
import ScrambleText from './ScrambleText';

const AdminSidebar = ({ open = false, onClose = () => {} }) => {
  const { userData, role, loading } = useAuth();
  const location = useLocation();
  const [requestCount, setRequestCount] = useState(0);
  const [supplyCount,  setSupplyCount]  = useState(0);
  // Whether the Sergeant Major is listed on at least one special team (gates Teams link)
  const [isOnTeam, setIsOnTeam] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'uniform_requests'), (snapshot) => {
      const pending = snapshot.docs.filter(d => d.data().status === 'Pending').length;
      setRequestCount(pending);
    });
    return () => unsub();
  }, []);

  // Pending supply requests count — shown to admins (ADMIN_LEVEL 80+) only
  useEffect(() => {
    const currentRole  = role;
    const currentLevel = ROLE_HIERARCHY[currentRole] || 0;
    if (currentLevel < ADMIN_LEVEL) return;
    const q    = query(collection(db, 'supplyRequests'), where('status', '==', 'Pending'));
    const unsub = onSnapshot(q, snap => setSupplyCount(snap.size), () => {});
    return () => unsub();
  }, [role]);

  // Check team membership for Sergeant Major (Teams link shown only if they're on one)
  useEffect(() => {
    const email = userData?.email || auth.currentUser?.email;
    if (role !== 'sergeant_major' || !email) { setIsOnTeam(false); return; }
    const q = query(
      collection(db, 'specialTeams'),
      where('commanderEmails', 'array-contains', email)
    );
    const unsub = onSnapshot(q, snap => setIsOnTeam(!snap.empty));
    return () => unsub();
  }, [role, userData?.email]);

  const handleLogout = () => {
    clearDeviceTrust(); // Clear the trusted-device token on explicit sign-out
    signOut(auth);
  };

  const userLevel = ROLE_HIERARCHY[role] || 0;
  const isCommander    = userLevel >= COMMAND_LEVEL;
  const isTopFour      = userLevel >= ADMIN_LEVEL;
  const isStaffOrS4    = userLevel >= STAFF_LEVEL;
  const isS1S3Assistant = role === 'company_s1_assistant' || role === 'company_s3_assistant';

  // Command roles whose scope is operations — they do not administer the portal
  // (S2/S6 pages, media tools, customization). Battalion XO + instructors are unaffected.
  const isRestrictedCmd = role === 'sergeant_major' || role === 'battalion_commander' || role === 'battalion_csm';

  // Roles allowed to access Uniform Items (mirrors App.jsx allowedRoles + adminLevel override)
  const UNIFORM_ROLES = ['company_s4_assistant', 'company_commander', 'company_xo', 'company_1sg', 'company_master_sergeant', 's4_logistics'];
  const canSeeUniforms = UNIFORM_ROLES.includes(role) || userLevel >= ADMIN_LEVEL;

  // Roles allowed to access Cadet Challenge (S1/S3 assistants + command and above)
  const CHALLENGE_ROLES = ['company_s1_assistant', 'company_s3_assistant'];
  const canSeeChallenge = CHALLENGE_ROLES.includes(role) || userLevel >= COMMAND_LEVEL;

  // Fundraiser — company command + S1/S3 adjutants + staff view all
  const FUNDRAISER_ROLES = ['company_commander', 'company_xo', 'company_1sg', 'company_master_sergeant', 's1_adjutant', 's3_operations'];
  const canSeeFundraiser = FUNDRAISER_ROLES.includes(role) || userLevel >= STAFF_LEVEL;

  // Uniform Sizes — S4 assistants + company command + S4 logistics
  const UNIFORM_SIZES_ROLES = ['company_s4_assistant', 'company_commander', 'company_xo', 'company_1sg', 'company_master_sergeant', 's4_logistics'];
  const canSeeUniformSizes = UNIFORM_SIZES_ROLES.includes(role) || userLevel >= ADMIN_LEVEL;

  // Full Cadet Challenge management access (input roles + view-all roles)
  const CHALLENGE_FULL_ROLES = [
    'company_s1_assistant', 'company_s3_assistant',
    'company_xo', 'company_1sg', 'company_commander', 'company_master_sergeant',
    's1_adjutant', 's3_operations',
    'battalion_xo', 'battalion_commander', 'battalion_csm',
    'sergeant_major', 'senior_army_instructor', 'army_instructor',
  ];
  const hasFullChallengeAccess = CHALLENGE_FULL_ROLES.includes(role) || userLevel >= ADMIN_LEVEL;

  // Full Fundraiser management access (company/battalion command + S1/S3)
  const FUNDRAISER_FULL_ROLES = [
    's1_adjutant', 's3_operations',
    'battalion_xo', 'battalion_csm', 'battalion_commander',
    'company_commander', 'company_xo', 'company_1sg', 'company_master_sergeant',
  ];
  const hasFullFundraiserAccess = FUNDRAISER_FULL_ROLES.includes(role) || userLevel >= ADMIN_LEVEL;

  // S2 — battalion S2 and company S2 assistants
  const canSeeS2 = role === 's2_intelligence' || role === 'company_s2_assistant' || userLevel >= ADMIN_LEVEL;
  // S6 — battalion S6, S5 (read-only review), and company S6 assistants
  const canSeeS6 = role === 's6_technology' || role === 'company_s6_assistant' || role === 's5_public_affairs' || userLevel >= ADMIN_LEVEL;
  // S1 Tracker — S1/S3 adjutants, battalion XO, company command + assistants.
  // CC, 1SG, and MSgt are view-only inside the component; XO + S1/S3 assistants can mark.
  // Excludes S2/S4/S5/S6/S7 staff (not a general-staff tool). Matches /admin/s1 route.
  const S1_TRACKER_ROLES = [
    's1_adjutant', 's3_operations', 'battalion_xo',
    'company_s1_assistant', 'company_xo', 'company_1sg', 'company_commander',
    'company_master_sergeant', 'company_s3_assistant',
  ];
  const canSeeS1 = S1_TRACKER_ROLES.includes(role) || userLevel >= ADMIN_LEVEL;

  // Meeting Logs — Battalion XO (edit), S1 & BC (view); Company Top 3 + MSgt (shared-only view)
  // S1/S3 assistants do NOT see meeting logs — company top 3 only.
  const MEETING_LOG_ROLES = [
    'battalion_xo', 's1_adjutant', 'battalion_commander',
    'company_commander', 'company_xo', 'company_1sg', 'company_master_sergeant',
  ];
  const canSeeMeetingLogs = MEETING_LOG_ROLES.includes(role) || userLevel >= ADMIN_LEVEL;

  // Feedback Hub — S5, S6, battalion top 3 (XO/CSM/BC), instructors
  const FEEDBACK_VIEW_ROLES = ['s5_public_affairs', 's6_technology', 'battalion_xo', 'battalion_csm', 'battalion_commander'];
  const canSeeFeedback = FEEDBACK_VIEW_ROLES.includes(role) || userLevel >= 95;

  const isActive = (path) => location.pathname === path;

  const navLink = (to, icon, label, extra = '') => (
    <Link
      to={to}
      onClick={onClose}
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
    <aside className={`
      w-64 bg-white dark:bg-slate-900 border-r border-blue-100 dark:border-white/5
      p-6 flex flex-col fixed h-full z-30 shadow-sm
      transition-transform duration-300 ease-in-out
      ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    `}>
      {/* Branding + mobile close button */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-yellow-500">
            <ScrambleText text="Battalion" trigger="hover" speed={25} />
          </h2>
          <p className="text-[10px] text-blue-400 dark:text-slate-500 uppercase font-bold tracking-[0.2em]">Admin Dashboard</p>
        </div>
        {/* Close button visible only on mobile */}
        <button
          onClick={onClose}
          aria-label="Close navigation menu"
          className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-300 transition-colors -mr-1 -mt-1"
        >
          <X size={18} />
        </button>
      </div>

      {/* Avatar quick link */}
      <Link
        to="/admin/profile"
        onClick={onClose}
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
          onClick={onClose}
          className="flex items-center gap-3 p-3 rounded-xl font-bold text-sm text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5 hover:text-yellow-500 transition-all mb-2 border-b border-blue-100 dark:border-white/5 pb-4"
        >
          <ArrowLeft size={18} /> Back to Home
        </Link>

        {navLink('/admin/dashboard', <LayoutDashboard size={18} />, 'Dashboard')}

        {loading ? (
          <div className="space-y-2 mt-2">
            <div className="h-10 bg-blue-50/50 dark:bg-white/5 animate-pulse rounded-xl mx-1" />
            <div className="h-10 bg-blue-50/50 dark:bg-white/5 animate-pulse rounded-xl mx-1" />
          </div>
        ) : isCommander && (
          <>
            {/* ── COMMAND ─────────────────────────── */}
            {groupLabel('Command')}
            {isStaffOrS4 && navLink('/admin/events', <CalendarDays size={18} />, 'Calendar Events')}
            {isStaffOrS4 && navLink('/admin/orders', <PlusSquare size={18} />, 'Orders & Tasks')}
            {(role === 's5_public_affairs' || isTopFour) && navLink('/admin/announcements', <Megaphone size={18} />, 'Global Broadcast')}
            {canSeeMeetingLogs && navLink('/admin/meeting-logs', <NotepadText size={18} />, 'Meeting Logs')}

            {/* ── PERSONNEL ───────────────────────── */}
            {groupLabel('Personnel')}
            {navLink('/admin/roster', <BookUser size={18} />, 'Battalion Roster')}
            {(role === 's1_adjutant' || role === 's6_technology' || (isTopFour && role !== 'sergeant_major')) && navLink('/admin/users', <UserCog size={18} />, 'Accounts')}
            {isStaffOrS4 && role !== 's1_adjutant' && (role !== 'sergeant_major' || isOnTeam) && navLink('/admin/teams', <Users size={18} />, 'Teams')}
            {canSeeS1 && navLink('/admin/s1', <ClipboardList size={18} />, 'S1 Tracker')}
            {userLevel >= STAFF_LEVEL && navLink('/admin/honor-company', <Trophy size={18} />, 'Honor Company')}
            {navLink('/admin/cadet-history', <History size={18} />, 'Cadet History')}
            {userLevel >= STAFF_LEVEL && navLink('/admin/log', <ScrollText size={18} />, 'Activity Log')}

            {/* ── PROGRAMS ────────────────────────── */}
            {groupLabel('Programs')}
            {hasFullChallengeAccess && navLink('/admin/cadet-challenge', <Activity size={18} />, 'Cadet Challenge')}
            {hasFullFundraiserAccess && navLink('/admin/fundraiser', <Heart size={18} />, 'Fundraiser')}
            {isStaffOrS4 && role !== 's6_technology' && navLink('/admin/camps', <Tent size={18} />, 'Camp Attendance')}
            {(role === 's2_intelligence' || (isTopFour && !isRestrictedCmd)) && navLink('/admin/s2', <Shield size={18} />, 'S2 Inspections')}
            {(role === 's6_technology' || role === 's5_public_affairs' || (isTopFour && !isRestrictedCmd)) && navLink('/admin/s6', <Laptop size={18} />, 'S6 Checklist')}
            {canSeeUniforms && (
              <Link
                to="/uniform-requests"
                onClick={onClose}
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
            )}
            {canSeeUniformSizes && navLink('/admin/uniform-sizes', <Ruler size={18} />, 'Uniform Sizes')}
            {/* Supply Requests — Company Leadership+ submit; admin badge shows pending count */}
            <Link
              to="/admin/supply-requests"
              onClick={onClose}
              className={`flex items-center justify-between p-3 rounded-xl font-bold text-sm transition-all ${
                isActive('/admin/supply-requests')
                  ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-white/5'
              }`}
            >
              <div className="flex items-center gap-3">
                <ShoppingCart size={18} /> Supply Requests
              </div>
              {isTopFour && supplyCount > 0 && (
                <span className="bg-red-500 text-white text-[9px] px-2 py-0.5 rounded-full font-black">
                  {supplyCount}
                </span>
              )}
            </Link>

            {/* ── PUBLISHING ──────────────────────── */}
            {(role === 's5_public_affairs' || role === 's6_technology' || (isTopFour && !isRestrictedCmd) || isStaffOrS4) && groupLabel('Publishing')}
            {(role === 's5_public_affairs' || (isTopFour && !isRestrictedCmd)) && navLink('/admin/leadership',  <Star size={18} />,     'Leadership')}
            {(role === 's5_public_affairs' || role === 's6_technology' || (isTopFour && !isRestrictedCmd)) && navLink('/admin/content',   <FileText size={18} />, 'Content')}
            {(role === 's5_public_affairs' || role === 's6_technology' || (isTopFour && !isRestrictedCmd)) && navLink('/admin/documents', <FileText size={18} />, 'Documents')}
            {(role === 's5_public_affairs' || (isTopFour && !isRestrictedCmd)) && navLink('/admin/newsletters', <Newspaper size={18} />, 'Newsletters')}
            {(role === 's5_public_affairs' || role === 's6_technology' || (isTopFour && !isRestrictedCmd)) && navLink('/admin/photos',    <Image size={18} />,    'Photo Gallery')}
            {isStaffOrS4 && navLink('/admin/stats', <BarChart3 size={18} />, 'Battalion Stats')}
            {canSeeFeedback && navLink('/admin/feedback', <MessageSquare size={18} />, 'Feedback Hub')}
            {((isTopFour && !isRestrictedCmd) || role === 's6_technology') && navLink('/admin/companies', <Building2 size={18} />, 'Customization')}
          </>
        )}

        {/* ── S1 / S3 ASSISTANT: structured sidebar matching company-leadership layout ── */}
        {isS1S3Assistant && (
          <>
            {groupLabel('Personnel')}
            {navLink('/admin/roster', <BookUser size={18} />, 'Company Roster')}
            {navLink('/admin/s1', <ClipboardList size={18} />, 'S1 Tracker')}

            {groupLabel('Programs')}
            {navLink('/admin/cadet-challenge', <Activity size={18} />, 'Cadet Challenge')}

            {/* Personal-only access — no full management for Fundraiser or Uniforms */}
            <div className="mt-4 pt-4 border-t border-blue-100 dark:border-white/5 space-y-0.5">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-300 dark:text-slate-600 px-3 pt-2 pb-1">My Records</p>
              {navLink('/admin/fundraiser', <Heart size={18} />, 'Fundraiser')}
              {navLink('/uniform-requests', <Shirt size={18} />, 'Uniform Items')}
              {navLink('/admin/uniform-sizes', <Ruler size={18} />, 'Uniform Sizes')}
            </div>
          </>
        )}

        {/* ── NON-COMMANDER: Cadet Challenge ── */}
        {canSeeChallenge && !isCommander && !isS1S3Assistant && (
          <div className="mt-4 pt-4 border-t border-blue-100 dark:border-white/5 space-y-0.5">
            {navLink('/admin/cadet-challenge', <Activity size={18} />, 'Cadet Challenge')}
          </div>
        )}

        {/* ── NON-COMMANDER: S2 Inspections ── */}
        {canSeeS2 && !isCommander && (
          <div className="mt-4 pt-4 border-t border-blue-100 dark:border-white/5">
            {navLink('/admin/s2', <Shield size={18} />, 'S2 Inspections')}
          </div>
        )}

        {/* ── NON-COMMANDER: S6 Checklist ── */}
        {canSeeS6 && !isCommander && (
          <div className="mt-4 pt-4 border-t border-blue-100 dark:border-white/5">
            {navLink('/admin/s6', <Laptop size={18} />, 'S6 Checklist')}
          </div>
        )}

        {/* ── NON-COMMANDER: S1 Tracker (non-S1/S3 roles) ── */}
        {canSeeS1 && !isCommander && !isS1S3Assistant && (
          <div className="mt-4 pt-4 border-t border-blue-100 dark:border-white/5 space-y-0.5">
            {navLink('/admin/s1', <ClipboardList size={18} />, 'S1 Tracker')}
            {canSeeMeetingLogs && navLink('/admin/meeting-logs', <NotepadText size={18} />, 'Meeting Logs')}
          </div>
        )}

        {/* ── NON-COMMANDER: Uniform Items ── */}
        {canSeeUniforms && !isCommander && !isS1S3Assistant && (
          <div className="mt-4 pt-4 border-t border-blue-100 dark:border-white/5 space-y-0.5">
            <Link
              to="/uniform-requests"
              onClick={onClose}
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
            {canSeeUniformSizes && navLink('/admin/uniform-sizes', <Ruler size={18} />, 'Uniform Sizes')}
          </div>
        )}

        {/* ── Personal-view links for non-assistant staff who lack full management access ── */}
        {!isS1S3Assistant && (!hasFullChallengeAccess || !hasFullFundraiserAccess || !canSeeUniforms || !canSeeUniformSizes) && (
          <div className="mt-4 pt-4 border-t border-blue-100 dark:border-white/5 space-y-0.5">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-300 dark:text-slate-600 px-3 pt-2 pb-1">My Records</p>
            {!hasFullChallengeAccess && navLink('/admin/cadet-challenge', <Activity size={18} />, 'Cadet Challenge')}
            {!hasFullFundraiserAccess && navLink('/admin/fundraiser', <Heart size={18} />, 'Fundraiser')}
            {!canSeeUniforms && navLink('/uniform-requests', <Shirt size={18} />, 'Uniform Items')}
            {!canSeeUniformSizes && navLink('/admin/uniform-sizes', <Ruler size={18} />, 'Uniform Sizes')}
          </div>
        )}
        {/* ── PORTAL ──────────────────────────────── */}
        <div className="mt-4 pt-4 border-t border-blue-100 dark:border-white/5 space-y-0.5">
          {groupLabel('Portal')}
          {navLink('/admin/changelog', <Tag size={18} />, 'Version History')}
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
