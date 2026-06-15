import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

// --- COMPONENTS ---
import Navbar from './components/Navbar'; 
import Footer from './components/Footer'; 

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
import AdminAnnouncements from './pages/AdminAnnouncements';
import UniformRequests from './pages/UniformRequests';
import CommanderInfo from './pages/CommanderInfo';
import AdminTeams from './pages/AdminTeams';
import AdminUsers from './pages/AdminUsers';
import AboutPage from './pages/AboutPage';
import CalendarPage from './pages/CalendarPage';
import WinningColors from './pages/WinningColors'; // <--- ADDED IMPORT FOR THE ASSESSMENT PAGE

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
  
  // Logic to hide Navbar and Footer on Admin pages
  const isAdminPage = location.pathname.startsWith('/admin') || location.pathname === '/uniform-requests';

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-yellow-500"></div>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen">
      {/* SHOW NAVBAR ONLY ON PUBLIC PAGES */}
      {!isAdminPage && <Navbar />}
      
      {/* MAIN CONTENT AREA - flex-grow ensures footer stays at bottom */}
      <main className="flex-grow">
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
          <Route path="/events" element={<CalendarPage />} />
          <Route path="/cadet-info/winning-colors" element={<WinningColors />} />

          {/* --- PROTECTED ADMIN ROUTES --- */}
          <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/assign-tasks" element={<ProtectedRoute><TaskManagement /></ProtectedRoute>} />
          <Route path="/admin/orders" element={<ProtectedRoute><AdminOrders /></ProtectedRoute>} />
          <Route path="/uniform-requests" element={<ProtectedRoute><UniformRequests /></ProtectedRoute>} />

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
      </main>

      {/* SHOW FOOTER ONLY ON PUBLIC PAGES */}
      {!isAdminPage && <Footer />}
    </div>
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