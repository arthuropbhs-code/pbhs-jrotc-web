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
import AdminSidebar from './AdminSidebar';
import SessionLockScreen from './SessionLockScreen';

const AdminLayout = () => {
  // Initialise from sessionStorage so a page refresh while locked stays locked.
  const [locked, setLocked] = useState(
    () => sessionStorage.getItem('sessionLocked') === '1'
  );

  useEffect(() => {
    const handleLock = () => setLocked(true);
    window.addEventListener('idle-session-lock', handleLock);
    return () => window.removeEventListener('idle-session-lock', handleLock);
  }, []);

  return (
    <div className="flex min-h-screen bg-blue-50 dark:bg-slate-950 transition-colors duration-300">
      <AdminSidebar />
      {/* ml-64 clears the fixed 256px sidebar */}
      <div className="flex-1 ml-64 flex flex-col">
        <Outlet />
      </div>

      {/* Session soft-lock overlay — shown on idle, cleared by password re-entry */}
      {locked && <SessionLockScreen onUnlock={() => setLocked(false)} />}
    </div>
  );
};

export default AdminLayout;
