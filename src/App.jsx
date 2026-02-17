import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// --- COMPONENTS ---
import Navbar from './components/Navbar'; 

// --- PAGES ---
import SignUp from './pages/SignUp';
import Home from './pages/Home';
import Photos from './pages/Photos';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import TaskManagement from './pages/TaskManagement';
import CadetInfo from './pages/CadetInfo';
import Teams from './pages/Teams';
import Announcements from './pages/Announcements';
import PromotionBoard from './pages/PromotionBoard';
import Leadership from './pages/Leadership';
import AdminOrders from './pages/AdminOrders'; 
import AdminAnnouncements from './pages/AdminAnnouncements'; // <--- ADD THIS IMPORT
import UniformRequests from './pages/UniformRequests';
import CommanderInfo from './pages/CommanderInfo';
import AdminTeams from './pages/AdminTeams';
import AdminUsers from './pages/AdminUsers';
import AboutPage from './pages/AboutPage';
import CalendarPage from './pages/CalendarPage';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();
  
  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-yellow-500"></div>
    </div>
  );

  if (!user) return <Navigate to="/admin" />;

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/admin/dashboard" />;
  }

  return children;
};

const AppContent = () => {
  const { loading } = useAuth();
  const location = useLocation();
  
  const isAdminPage = location.pathname.startsWith('/admin') || location.pathname === '/uniform-requests';

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-yellow-500"></div>
    </div>
  );

  return (
    <>
      {!isAdminPage && <Navbar />}
      
      <Routes>
        {/* --- PUBLIC ROUTES --- */}
        <Route path="/" element={<Home />} />
        <Route path="/photos" element={<Photos />} />
        <Route path="/cadet-info" element={<CadetInfo />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/promotion-board" element={<PromotionBoard />} />
        <Route path="/leadership" element={<Leadership />} />
        <Route path="/commander/:id" element={<CommanderInfo />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/signup" element={<SignUp />} />
        <Route path="/about" element={<AboutPage />} />

        {/* --- PROTECTED ADMIN ROUTES --- */}
        <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/assign-tasks" element={<ProtectedRoute><TaskManagement /></ProtectedRoute>} />
        <Route path="/admin/orders" element={<ProtectedRoute><AdminOrders /></ProtectedRoute>} />
        <Route path="/uniform-requests" element={<ProtectedRoute><UniformRequests /></ProtectedRoute>} />
        <Route path="/events" element={<CalendarPage />} />

        {/* --- GLOBAL ANNOUNCEMENTS (ADMIN) --- */}
        <Route 
          path="/admin/announcements" 
          element={
            <ProtectedRoute allowedRoles={['battalion_4', 'battalion_staff']}>
              <AdminAnnouncements />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/admin/users" 
          element={
            <ProtectedRoute allowedRoles={['battalion_4', 'battalion_staff']}>
              <AdminUsers />
            </ProtectedRoute>
          } 
        />

        <Route path="/admin/teams" element={<ProtectedRoute><AdminTeams /></ProtectedRoute>} />

        {/* CATCH ALL */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
};

export default function App() {
  return (
    <Router>
      <div className="bg-slate-950 min-h-screen font-sans text-white">
        <AppContent />
      </div>
    </Router>
  );
}