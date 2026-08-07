import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useIdleLogout } from './hooks/useIdleLogout';
import { ROLE_HIERARCHY, STAFF_LEVEL, COMMAND_LEVEL, ADMIN_LEVEL } from './constants';
import { canAccessRoute } from './lib/authz';

// --- COMPONENTS ---
// Navbar/Footer stay eager: they render on almost every route, so splitting
// them out would just add a network round-trip with no bundle-size upside.
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';

// --- PAGES ---
// Lazy-loaded so each route gets its own chunk instead of all ~30 pages
// (Firestore admin dashboards, uniform logistics, stats, etc.) shipping in
// one ~1MB bundle to every visitor regardless of which page they actually
// open. Home stays eager since it's the page nearly everyone lands on first
// and there's no benefit to a loading flash on the very first paint.
import Home from './pages/Home';
const NotFound = lazy(() => import('./pages/NotFound'));
const SignUp = lazy(() => import('./pages/SignUp'));
const Photos = lazy(() => import('./pages/Photos'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const TaskManagement = lazy(() => import('./pages/TaskManagement'));
const CadetInfo = lazy(() => import('./pages/CadetInfo'));
const Teams = lazy(() => import('./pages/Teams'));
const Announcements = lazy(() => import('./pages/Announcements'));
const PromotionBoard = lazy(() => import('./pages/PromotionBoard'));
const Leadership = lazy(() => import('./pages/Leadership'));
const AdminOrders = lazy(() => import('./pages/AdminOrders'));
const AdminAnnouncements = lazy(() => import('./pages/AdminAnnouncements'));
const UniformRequests = lazy(() => import('./pages/UniformRequests'));
const CommanderInfo = lazy(() => import('./pages/CommanderInfo'));
const AdminTeams = lazy(() => import('./pages/AdminTeams'));
const AdminUsers = lazy(() => import('./pages/AdminUsers'));
const AdminLeadership = lazy(() => import('./pages/AdminLeadership'));
const AdminContent = lazy(() => import('./pages/AdminContent'));
const Documents = lazy(() => import('./pages/Documents'));
const AdminDocuments = lazy(() => import('./pages/AdminDocuments'));
const AdminCamps = lazy(() => import('./pages/AdminCamps'));
const AdminStats = lazy(() => import('./pages/AdminStats'));
const AdminCompanies = lazy(() => import('./pages/AdminCompanies'));
const MyProfile = lazy(() => import('./pages/MyProfile'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const WinningColors = lazy(() => import('./pages/WinningColors'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));

const RouteFallback = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-yellow-500"></div>
  </div>
);

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
  if (!canAccessRoute({ userLevel, role, minLevel, allowedRoles, adminLevel: ADMIN_LEVEL })) {
    return <Navigate to="/admin/dashboard" />;
  }

  return children;
};

const AppContent = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  useIdleLogout(!!user);

  // React Router doesn't reset scroll position on navigation like a full
  // page load would - without this, clicking a link (e.g. in the footer,
  // far down the page) lands on the new page still scrolled to wherever
  // you were, instead of at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

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
        <Suspense fallback={<RouteFallback />}>
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

          {/* SAI/AI only: configure battalion company names */}
          <Route
            path="/admin/companies"
            element={
              <ProtectedRoute minLevel={ADMIN_LEVEL}>
                <AdminCompanies />
              </ProtectedRoute>
            }
          />

          {/* CATCH ALL - was a silent redirect to Home; now a real 404 page.
              Note: since this is a client-side SPA with a Vercel rewrite
              serving index.html for every unmatched path, the HTTP response
              itself is still a 200, not a true 404 status code - that's an
              inherent limitation of this hosting architecture without a
              server-side/edge function, not something this route can fix. */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </main>

      {/* SHOW FOOTER ONLY ON PUBLIC PAGES */}
      {!isAdminPage && <Footer />}

      <CookieConsent />
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