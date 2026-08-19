// src/components/AdminLayout.jsx
//
// Layout route that wraps all authenticated admin pages with the shared
// AdminSidebar so staff see the nav on every page, not just the dashboard.
// Used as a React Router v6 layout route (element with <Outlet />) in App.jsx.
//
// Also owns the session soft-lock: listens for the 'idle-session-lock' event
// dispatched by useIdleLogout and renders SessionLockScreen in response.
// Using a lock overlay (instead of signOut) means re-authentication is
// password-only — no SMS 2FA triggered, preserving Firebase's SMS quota.

import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import SessionLockScreen from './SessionLockScreen';

const AdminLayout = () => {
  // Initialise from sessionStorage so a page refresh while locked stays locked.
  const [locked, setLocked] = useState(
    () => sessionStorage.getItem('sessionLocked') === '1'
  );
  // Mobile sidebar open/closed state (desktop always shows sidebar via CSS)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const handleLock = () => setLocked(true);
    window.addEventListener('idle-session-lock', handleLock);
    return () => window.removeEventListener('idle-session-lock', handleLock);
  }, []);

  // Close sidebar when route changes (user tapped a nav link)
  const handleSidebarClose = () => setSidebarOpen(false);

  return (
    <div className="flex min-h-screen bg-blue-50 dark:bg-slate-950 transition-colors duration-300">
      <AdminSidebar open={sidebarOpen} onClose={handleSidebarClose} />

      {/* Mobile backdrop — tapping outside the sidebar closes it */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={handleSidebarClose}
          aria-hidden="true"
        />
      )}

      {/* Main content — full-width on mobile, offset by 256px sidebar on lg+ */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Mobile top bar with hamburger — hidden on desktop */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white dark:bg-slate-900 border-b border-blue-100 dark:border-white/5 sticky top-0 z-10 shadow-sm">
          <button
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation menu"
            className="p-2 rounded-xl text-slate-500 hover:bg-blue-50 dark:hover:bg-white/5 transition-colors"
          >
            <Menu size={20} />
          </button>
          <span className="text-yellow-500 font-black text-sm uppercase italic tracking-tight select-none">
            Battalion HQ
          </span>
        </div>

        <Outlet />
      </div>

      {/* Session soft-lock overlay — shown on idle, cleared by password re-entry */}
      {locked && <SessionLockScreen onUnlock={() => setLocked(false)} />}
    </div>
  );
};

export default AdminLayout;
