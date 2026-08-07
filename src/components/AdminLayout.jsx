// src/components/AdminLayout.jsx
//
// Layout route that wraps all authenticated admin pages with the shared
// AdminSidebar so staff see the nav on every page, not just the dashboard.
// Used as a React Router v6 layout route (element with <Outlet />) in App.jsx.

import React from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';

const AdminLayout = () => (
  <div className="flex min-h-screen bg-blue-50 dark:bg-slate-950 transition-colors duration-300">
    <AdminSidebar />
    {/* ml-64 clears the fixed 256px sidebar */}
    <div className="flex-1 ml-64 flex flex-col">
      <Outlet />
    </div>
  </div>
);

export default AdminLayout;
