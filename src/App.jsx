import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { multiFactor } from 'firebase/auth';
import { useAuth } from './hooks/useAuth';
import { useIdleLogout } from './hooks/useIdleLogout';
import { ROLE_HIERARCHY, STAFF_LEVEL, COMMAND_LEVEL, ADMIN_LEVEL } from './constants';
import { canAccessRoute } from './lib/authz';
import { ThemeProvider } from './contexts/ThemeContext';

// --- COMPONENTS ---
// Navbar/Footer stay eager: they render on almost every route, so splitting
// them out would just add a network round-trip with no bundle-size upside.
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import CookieConsent from './components/CookieConsent';
import AdminLayout from './components/AdminLayout';

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
// TaskManagement page merged into AdminOrders — kept as a lazy import
// only so the old /admin/assign-tasks route can redirect instead of 404.
// Once all bookmarks are gone this can be removed entirely.
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
const AdminPhotos = lazy(() => import('./pages/AdminPhotos'));
const MyProfile = lazy(() => import('./pages/MyProfile'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const CalendarPage = lazy(() => import('./pages/CalendarPage'));
const WinningColors = lazy(() => import('./pages/WinningColors'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const HowToJoin = lazy(() => import('./pages/HowToJoin'));
const AdminWelcome = lazy(() => import('./pages/AdminWelcome'));
const Newsletters = lazy(() => import('./pages/Newsletters'));
const AdminNewsletters = lazy(() => import('./pages/AdminNewsletters'));
const AdminCadetChallenge = lazy(() => import('./pages/AdminCadetChallenge'));
const AdminRoster         = lazy(() => import('./pages/AdminRoster'));
const AdminS2             = lazy(() => import('./pages/AdminS2'));
const AdminS6             = lazy(() => import('./pages/AdminS6'));
const AdminFundraiser     = lazy(() => import('./pages/AdminFundraiser'));
const AdminUniformSizes   = lazy(() => import('./pages/AdminUniformSizes'));
const AdminS1             = lazy(() => import('./pages/AdminS1'));
const AdminMeetingLogs    = lazy(() => import('./pages/AdminMeetingLogs'));
const AdminEvents         = lazy(() => import('./pages/AdminEvents'));

const RouteFallback = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-yellow-500"></div>
  </div>
);

// Command roles whose operational scope doesn't extend to portal-management
// pages (S2/S6 tools, media, leadership board, customization). Mirrors the
// same constant in AdminSidebar — kept in sync manually.
const RESTRICTED_CMD = ['sergeant_major', 'battalion_commander', 'battalion_csm'];

const ProtectedRoute = ({ children, minLevel, allowedRoles, excludedRoles }) => {
  const { user, role, userData, loading } = useAuth();
  const location = useLocation();

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-yellow-500"></div>
    </div>
  );

  if (!user) return <Navigate to="/admin" />;

  const userLevel = ROLE_HIERARCHY[role] || 0;

  // Onboarding gate: newly approved accounts must complete email verification
  // and 2FA setup before accessing any other route. Only triggers on explicit
  // false (new accounts set this on approval) — absent field = existing account,
  // treated as complete so no disruption to anyone already using the portal.
  if (userData?.onboardingComplete === false && location.pathname !== '/admin/welcome') {
    return <Navigate to="/admin/welcome" replace />;
  }

  // allowedRoles isolates specific roles (e.g. S5/S6) that a level threshold
  // can't express on its own, since they're tied with every other S-role at
  // STAFF_LEVEL. Top command can always override, same as everywhere else.
  // excludedRoles denies specific roles even if they meet the level threshold.
  if (!canAccessRoute({ userLevel, role, minLevel, allowedRoles, adminLevel: ADMIN_LEVEL, excludedRoles })) {
    return <Navigate to="/admin/dashboard" />;
  }

  // Legacy MFA gate: applies to staff-level accounts that existed before the
  // onboarding wizard was introduced (no onboardingComplete field). New accounts
  // handle 2FA through the welcome wizard above and won't hit this.
  if (
    userLevel >= STAFF_LEVEL &&
    userData?.onboardingComplete !== false &&
    location.pathname !== '/admin/profile' &&
    multiFactor(user).enrolledFactors.length === 0
  ) {
    return <Navigate to="/admin/profile?mfa=required" replace />;
  }

  return children;
};

const AppContent = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  // Pass uid so the hook can check the trusted-device token for this user.
  useIdleLogout(!!user, user?.uid);

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
          {/* Welcome/onboarding wizard — no sidebar, accessible to any signed-in user */}
          <Route path="/admin/welcome" element={<ProtectedRoute><AdminWelcome /></ProtectedRoute>} />
          <Route path="/about" element={<AboutPage />} />
          {/* Safety-net redirect: Home.jsx hero used "/About" (capital A) which
              React Router v6 treats as a distinct path — this catches any
              bookmarks or links still using the old casing. */}
          <Route path="/About" element={<Navigate to="/about" replace />} />
          <Route path="/events" element={<CalendarPage />} />
          <Route path="/documents" element={<Documents />} />
          <Route path="/newsletter" element={<Newsletters />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/cadet-info/winning-colors" element={<WinningColors />} />
          <Route path="/how-to-join" element={<HowToJoin />} />

          {/* --- PROTECTED ADMIN ROUTES (wrapped in AdminLayout for persistent sidebar) --- */}
          {/* AdminLayout is a pathless layout route that renders <AdminSidebar /> +
              <Outlet /> so the sidebar appears on every admin page automatically.
              /admin (login) and /admin/signup are outside this wrapper on purpose —
              those pages don't need the authenticated sidebar. */}
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
            {/* /admin/assign-tasks merged into /admin/orders — redirect any old bookmarks */}
            <Route path="/admin/assign-tasks" element={<Navigate to="/admin/orders" replace />} />
            <Route
              path="/admin/orders"
              element={
                <ProtectedRoute minLevel={STAFF_LEVEL}>
                  <AdminOrders />
                </ProtectedRoute>
              }
            />
            {/* Gated: S4 assistants, company command (CC/XO/1SG), S4 logistics,
                and battalion command (adminLevel override). All lower tiers are
                redirected — cadets, squad/platoon leadership don't have access. */}
            {/* Uniform Items: any signed-in user can open this page;
                full request/approve flow gated inside the component by role. */}
            <Route path="/uniform-requests" element={
              <ProtectedRoute>
                <UniformRequests />
              </ProtectedRoute>
            } />

            {/* --- GLOBAL ANNOUNCEMENTS (ADMIN) --- */}
            {/* S5 + battalion XO + instructors. SGM/BC/CSM excluded — they
                issue orders but don't broadcast battalion-wide announcements. */}
            <Route
              path="/admin/announcements"
              element={
                <ProtectedRoute allowedRoles={['s5_public_affairs']} excludedRoles={RESTRICTED_CMD}>
                  <AdminAnnouncements />
                </ProtectedRoute>
              }
            />

            {/* Personnel: S1 + S6 manage accounts; XO/BC/CSM/instructors can view.
                SGM excluded — operational command, not portal admin. */}
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute allowedRoles={['s1_adjutant', 's6_technology']} excludedRoles={['sergeant_major']}>
                  <AdminUsers />
                </ProtectedRoute>
              }
            />

            {/* AdminTeams gates per-team access itself via commanderEmails */}
            <Route path="/admin/teams" element={<ProtectedRoute minLevel={STAFF_LEVEL}><AdminTeams /></ProtectedRoute>} />

            {/* Leadership board: public-site management — S5 + XO + instructors only */}
            <Route
              path="/admin/leadership"
              element={
                <ProtectedRoute allowedRoles={['s5_public_affairs']} excludedRoles={RESTRICTED_CMD}>
                  <AdminLeadership />
                </ProtectedRoute>
              }
            />

            {/* Content, Documents, Photos: S5 + S6 author; XO + instructors can edit */}
            <Route
              path="/admin/content"
              element={
                <ProtectedRoute allowedRoles={['s5_public_affairs', 's6_technology']} excludedRoles={RESTRICTED_CMD}>
                  <AdminContent />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/documents"
              element={
                <ProtectedRoute allowedRoles={['s5_public_affairs', 's6_technology']} excludedRoles={RESTRICTED_CMD}>
                  <AdminDocuments />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin/photos"
              element={
                <ProtectedRoute allowedRoles={['s5_public_affairs', 's6_technology']} excludedRoles={RESTRICTED_CMD}>
                  <AdminPhotos />
                </ProtectedRoute>
              }
            />

            {/* Newsletters: S5 publishes; XO + instructors can manage */}
            <Route
              path="/admin/newsletters"
              element={
                <ProtectedRoute allowedRoles={['s5_public_affairs']} excludedRoles={RESTRICTED_CMD}>
                  <AdminNewsletters />
                </ProtectedRoute>
              }
            />

            {/* Camp Attendance: all staff except S6 (operational, not tech scope) */}
            <Route
              path="/admin/camps"
              element={
                <ProtectedRoute minLevel={STAFF_LEVEL} excludedRoles={['s6_technology']}>
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

            {/* Cadet Challenge: open to S1/S3 assistants (35) and company command (45+);
                no minLevel here — internal access tiers handled inside the component,
                same pattern as /admin/teams. Firestore rules enforce backend boundaries. */}
            <Route path="/admin/cadet-challenge" element={<ProtectedRoute><AdminCadetChallenge /></ProtectedRoute>} />

            {/* Battalion Roster: company command (45+) minimum; company_s1_assistant
                also allowed so they can see their company's roster alongside
                Cadet Challenge work. Both allowedRoles + minLevel means it's an
                OR — canAccessRoute handles this combination. Internal per-company
                scoping and read-only mode handled inside the component. */}
            <Route
              path="/admin/roster"
              element={
                <ProtectedRoute minLevel={COMMAND_LEVEL} allowedRoles={['company_s1_assistant', 'company_s3_assistant']}>
                  <AdminRoster />
                </ProtectedRoute>
              }
            />

            {/* S2 Intelligence: battalion S2 + company S2 assistants + XO + instructors.
                SGM/BC/CSM excluded — S2 is a staff function, not a command review tool. */}
            <Route
              path="/admin/s2"
              element={
                <ProtectedRoute allowedRoles={['s2_intelligence', 'company_s2_assistant']} excludedRoles={RESTRICTED_CMD}>
                  <AdminS2 />
                </ProtectedRoute>
              }
            />

            {/* S6 Technology: S6 + company S6 assistants + S5 (read-only history) + XO + instructors.
                SGM/BC/CSM excluded — technology management is outside their scope. */}
            <Route
              path="/admin/s6"
              element={
                <ProtectedRoute allowedRoles={['s6_technology', 'company_s6_assistant', 's5_public_affairs']} excludedRoles={RESTRICTED_CMD}>
                  <AdminS6 />
                </ProtectedRoute>
              }
            />

            {/* Fundraiser Tracking — Fallen Heroes: every authenticated portal user can
                reach this route; the component itself handles the split between full
                access (transactions + roster) and personal view (own entries only). */}
            <Route
              path="/admin/fundraiser"
              element={
                <ProtectedRoute>
                  <AdminFundraiser />
                </ProtectedRoute>
              }
            />

            {/* Uniform Sizes: any signed-in user can open this page;
                full input/finalize flow gated inside the component by role. */}
            <Route
              path="/admin/uniform-sizes"
              element={
                <ProtectedRoute>
                  <AdminUniformSizes />
                </ProtectedRoute>
              }
            />

            {/* No minLevel here: every signed-in user manages their own profile */}
            <Route path="/admin/profile" element={<ProtectedRoute><MyProfile /></ProtectedRoute>} />

            {/* Customization: S6 configures company names; XO + instructors can also edit.
                SGM/BC/CSM excluded — portal configuration is outside their scope. */}
            <Route
              path="/admin/companies"
              element={
                <ProtectedRoute allowedRoles={['s6_technology']} excludedRoles={RESTRICTED_CMD}>
                  <AdminCompanies />
                </ProtectedRoute>
              }
            />

            {/* S1 Tracker: form turn-in tracking + roster link.
                S1/S3 adjutants, battalion XO, company command (CC/XO/1SG),
                company S1 and S3 assistants. S4/S5/S6/S7 staff excluded —
                this is a personnel accountability tool, not a general-staff page.
                ADMIN_LEVEL (80+) always overrides. */}
            <Route
              path="/admin/s1"
              element={
                <ProtectedRoute allowedRoles={[
                  's1_adjutant', 's3_operations', 'battalion_xo',
                  'company_s1_assistant', 'company_xo', 'company_1sg',
                  'company_commander', 'company_s3_assistant',
                ]}>
                  <AdminS1 />
                </ProtectedRoute>
              }
            />

            {/* Meeting Logs — XO edits; S1 & BC view */}
            <Route
              path="/admin/meeting-logs"
              element={
                <ProtectedRoute allowedRoles={['battalion_xo', 's1_adjutant', 'battalion_commander']}>
                  <AdminMeetingLogs />
                </ProtectedRoute>
              }
            />

            {/* Calendar Events — all authenticated staff can create/edit/delete events */}
            <Route
              path="/admin/events"
              element={<ProtectedRoute><AdminEvents /></ProtectedRoute>}
            />
          </Route>

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
    <ThemeProvider>
      <Router>
        <div className="bg-slate-50 dark:bg-slate-950 min-h-screen font-sans text-slate-900 dark:text-white">
          <AppContent />
        </div>
      </Router>
    </ThemeProvider>
  );
}