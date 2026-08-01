import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useIdleLogout } from './hooks/useIdleLogout';
import { ROLE_HIERARCHY, STAFF_LEVEL, COMMAND_LEVEL, ADMIN_LEVEL } from './constants';

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
import AdminLeadership from './pages/AdminLeadership';
import AdminContent from './pages/AdminContent';
import Documents from './pages/Documents';
import AdminDocuments from './pages/AdminDocuments';
import AdminCamps from './pages/AdminCamps';
import AdminStats from './pages/AdminStats';
import MyProfile from './pages/MyProfile';
import AboutPage from './pages/AboutPage';
import CalendarPage from './pages/CalendarPage';
import WinningColors from './pages/WinningColors'; // <--- ADDED IMPORT FOR THE ASSESSMENT PAGE
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';

const ProtectedRoute = ({ children, minLevel, allowedRoles }) => {
  const { user, role, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-yellow-500"></div>
    </div>
  );

  if (!user) return <Navigate to="/admin" />;

  const userLevel = ROLE_HIERARCHY[role] || 0;

  // allowedRoles isolates specific roles (e.g. S5/S6) that a level threshold
  // can't express on its own, since they're tied with every other S-role at
  // STAFF_LEVEL. Top command can always override, same as everywhere else.
  if (allowedRoles) {
    const hasAccess = allowedRoles.includes(role) || userLevel >= ADMIN_LEVEL;
    if (!hasAccess) return <Navigate to="/admin/dashboard" />;
  } else if (minLevel && userLevel < minLevel) {
    return <Navigate to="/admin/dashboard" />;
  }

  return children;
};

const AppContent = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  useIdleLogout(!!user);

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
          <Route path="/documents" element={<Documents />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/cadet-info/winning-colors" element={<WinningColors />} />

          {/* --- PROTECTED ADMIN ROUTES --- */}
          <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route
            path="/admin/assign-tasks"
            element={
              <ProtectedRoute minLevel={COMMAND_LEVEL}>
                <TaskManagement />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute minLevel={COMMAND_LEVEL}>
                <AdminOrders />
              </ProtectedRoute>
            }
          />
          {/* No minLevel here: any signed-in cadet needs to see their own uniform request status */}
          <Route path="/uniform-requests" element={<ProtectedRoute><UniformRequests /></ProtectedRoute>} />

          {/* --- GLOBAL ANNOUNCEMENTS (ADMIN) --- */}
          <Route
            path="/admin/announcements"
            element={
              <ProtectedRoute minLevel={STAFF_LEVEL}>
                <AdminAnnouncements />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <ProtectedRoute minLevel={STAFF_LEVEL}>
                <AdminUsers />
              </ProtectedRoute>
            }
          />

          {/* No minLevel here: AdminTeams.jsx gates per-team access itself via commanderEmails, independent of rank */}
          <Route path="/admin/teams" element={<ProtectedRoute><AdminTeams /></ProtectedRoute>} />

          <Route
            path="/admin/leadership"
            element={
              <ProtectedRoute minLevel={STAFF_LEVEL}>
                <AdminLeadership />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/content"
            element={
              <ProtectedRoute allowedRoles={['s5_public_affairs', 's6_technology']}>
                <AdminContent />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/documents"
            element={
              <ProtectedRoute allowedRoles={['s5_public_affairs', 's6_technology']}>
                <AdminDocuments />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/camps"
            element={
              <ProtectedRoute minLevel={STAFF_LEVEL}>
                <AdminCamps />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/stats"
            element={
              <ProtectedRoute minLevel={STAFF_LEVEL}>
                <AdminStats />
              </ProtectedRoute>
            }
          />

          {/* No minLevel here: every signed-in user manages their own profile */}
          <Route path="/admin/profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />

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