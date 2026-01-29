import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// --- COMPONENTS ---
import Navbar from './components/Navbar'; 

// --- PAGES ---
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


const AppContent = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isAdminPage = location.pathname.startsWith('/admin');

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-yellow-500"></div>
    </div>
  );

  return (
    <>
      {/* Navbar only shows on public-facing pages */}
      {!isAdminPage && <Navbar />}
      
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Home />} />
        <Route path="/photos" element={<Photos />} />
        <Route path="/cadet-info" element={<CadetInfo />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/promotion-board" element={<PromotionBoard />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/leadership" element={<Leadership />} />

        {/* PROTECTED ROUTES */}
        <Route 
          path="/admin/dashboard" 
          element={user ? <AdminDashboard /> : <Navigate to="/admin" />} 
        />
        <Route 
          path="/admin/assign-tasks" 
          element={user ? <TaskManagement /> : <Navigate to="/admin" />} 
        />

        {/* CATCH ALL */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
};

function App() {
  return (
    <Router>
      <div className="bg-slate-950 min-h-screen font-sans text-white">
        <AppContent />
      </div>
    </Router>
  );
}

export default App;