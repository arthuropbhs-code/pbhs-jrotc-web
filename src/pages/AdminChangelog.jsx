// src/pages/AdminChangelog.jsx
//
// Portal version history — read-only, accessible to all authenticated users.
// Versions follow semver: minor = feature milestone, patch = logical commit cluster.
// Update this file whenever a new version ships.

import React, { useState } from 'react';
import { Tag, ChevronDown, ChevronRight } from 'lucide-react';
import AdminPageHeader from '../components/AdminPageHeader';
import { usePageMeta } from '../hooks/usePageMeta';

// ── Tag chips ─────────────────────────────────────────────────────────────────
const CHIP = {
  feat: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400',
  fix:  'bg-blue-100   dark:bg-blue-950/60    text-blue-700   dark:text-blue-400',
  sec:  'bg-rose-100   dark:bg-rose-950/60    text-rose-700   dark:text-rose-400',
  perf: 'bg-orange-100 dark:bg-orange-950/60  text-orange-700 dark:text-orange-400',
  law:  'bg-purple-100 dark:bg-purple-950/60  text-purple-700 dark:text-purple-400',
};
const CHIP_LABEL = { feat: 'Feature', fix: 'Fix', sec: 'Security', perf: 'Perf', law: 'Compliance' };

const Tag_ = ({ type }) => (
  <span className={`inline-flex shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${CHIP[type]}`}>
    {CHIP_LABEL[type]}
  </span>
);

// ── Single change line ─────────────────────────────────────────────────────────
const C = ({ type, children }) => (
  <li className="flex items-baseline gap-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
    <Tag_ type={type} /><span>{children}</span>
  </li>
);

// ── Patch card ─────────────────────────────────────────────────────────────────
const Patch = ({ version, date, title, isCurrent, changes }) => (
  <div className={`flex gap-3 py-3 border-b border-slate-100 dark:border-white/5 last:border-0 ${isCurrent ? 'rounded-xl bg-yellow-50 dark:bg-yellow-500/5 px-3 -mx-3 border-yellow-200 dark:border-yellow-500/20' : ''}`}>
    {/* Version pill */}
    <div className="w-[68px] shrink-0 pt-0.5">
      {isCurrent ? (
        <span className="inline-block bg-yellow-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded leading-none">
          {version}
        </span>
      ) : (
        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500">{version}</span>
      )}
    </div>
    {/* Content */}
    <div className="flex-1 min-w-0">
      <div className="flex items-baseline justify-between gap-2 mb-1.5 flex-wrap">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{title}</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 whitespace-nowrap">{date}</span>
      </div>
      <ul className="space-y-1.5">{changes}</ul>
    </div>
  </div>
);

// ── Minor version section ──────────────────────────────────────────────────────
const Minor = ({ version, title, date, isMajor, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mb-4">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
          isMajor
            ? 'bg-yellow-500/10 dark:bg-yellow-500/10 hover:bg-yellow-500/15 border border-yellow-500/30'
            : 'bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/8 border border-slate-200 dark:border-white/5'
        }`}
      >
        <span className={`text-[11px] font-black px-2 py-0.5 rounded shrink-0 ${isMajor ? 'bg-yellow-500 text-slate-950' : 'bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300'}`}>
          {version}
        </span>
        <span className={`font-black uppercase italic tracking-tight text-sm ${isMajor ? 'text-yellow-700 dark:text-yellow-400' : 'text-slate-700 dark:text-slate-300'}`}>
          {title}
        </span>
        <span className="ml-auto text-[10px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap mr-2">{date}</span>
        {open
          ? <ChevronDown size={14} className="text-slate-400 shrink-0" />
          : <ChevronRight size={14} className="text-slate-400 shrink-0" />
        }
      </button>
      {open && (
        <div className="mt-1 px-4 py-2 rounded-xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40">
          {children}
        </div>
      )}
    </div>
  );
};

// ── Stat tile ──────────────────────────────────────────────────────────────────
const Stat = ({ value, label }) => (
  <div className="flex-1 min-w-[80px] text-center px-3 py-3 border-r border-slate-200 dark:border-white/5 last:border-r-0">
    <p className="text-xl font-black italic text-yellow-500 leading-none">{value}</p>
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-1">{label}</p>
  </div>
);

// ── Page ───────────────────────────────────────────────────────────────────────
const AdminChangelog = () => {
  usePageMeta({
    title: 'Version History',
    description: 'Command Portal release history.',
    path: '/admin/changelog',
  });

  return (
    <div className="p-6 md:p-8">
    <div className="max-w-3xl">
      <AdminPageHeader
        icon={Tag}
        title="Version History"
        meta="All releases for the PBHS JROTC Command Portal — click any version to expand its patches."
      />

      {/* Stats bar */}
      <div className="flex flex-wrap mb-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 overflow-hidden">
        <Stat value="39"      label="Releases"    />
        <Stat value="341"     label="Commits"     />
        <Stat value="22"      label="Role Levels" />
        <Stat value="210d"    label="In Dev"      />
        <Stat value="v1.6.34" label="Current"     />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-1">Key:</span>
        {Object.keys(CHIP).map(t => <Tag_ key={t} type={t} />)}
      </div>

      {/* ── v0.x ERA ─────────────────────────────────────────────────────── */}
      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-600 mb-3 px-1">Pre-release — Public Site Era</p>

      <Minor version="v0.1" title="Foundation" date="Jan 26, 2026">
        <Patch version="v0.1.0" date="Jan 26" title="Project bootstrapped" changes={<>
          <C type="feat">React + Vite SPA scaffold with Firebase (Auth, Firestore, Storage)</C>
          <C type="sec">Firebase config moved to environment variables; .gitignore hardened</C>
        </>} />
      </Minor>

      <Minor version="v0.2" title="Public Site & Portraits" date="Jan 29 – Feb 17, 2026">
        <Patch version="v0.2.0" date="Jan 29" title="Config security" changes={<>
          <C type="sec">Firebase API keys removed from source; .gitignore updated</C>
          <C type="fix">Missing image reference resolved</C>
        </>} />
        <Patch version="v0.2.1" date="Jan 30 – Feb 2" title="Leadership portraits" changes={<>
          <C type="feat">Command team portrait photos added to Leadership page</C>
          <C type="fix">Website crash on initial load resolved</C>
        </>} />
        <Patch version="v0.2.2" date="Feb 3" title="Announcements" changes={<>
          <C type="feat">Announcements and Orders split into separate streams with auto-expiry</C>
          <C type="fix">Active-link nav highlight logic corrected</C>
        </>} />
        <Patch version="v0.2.3" date="Feb 17" title="About page + image optimization" changes={<>
          <C type="feat">About page created</C>
          <C type="feat">Admin portal scaffolded for early dev testing</C>
          <C type="perf">All images converted from JPEG → WebP</C>
        </>} />
      </Minor>

      <Minor version="v0.3" title="Leadership Page & Routing" date="Jun 14 – 25, 2026">
        <Patch version="v0.3.0" date="Jun 14" title="Leadership layout" changes={<>
          <C type="feat">DC position removed; XO and CSM layout realigned</C>
        </>} />
        <Patch version="v0.3.1" date="Jun 21 – 24" title="CMS backend" changes={<>
          <C type="feat">Decap CMS backend for leadership entries (no code changes needed to update)</C>
          <C type="feat">Company leadership rosters fully editable via CMS dropdown</C>
          <C type="fix">Firebase crash guard added; identity widget load order fixed</C>
          <C type="fix">CMS collection config fields corrected; stale files cleared</C>
        </>} />
        <Patch version="v0.3.2" date="Jun 25" title="Routing & live data" changes={<>
          <C type="fix">Vercel SPA routing configured — direct links no longer 404</C>
          <C type="feat">SGM stacks directly under CSM in layout</C>
          <C type="feat">"Meet the Top 3" homepage section binds live to CMS entries</C>
          <C type="feat">Mobile navigation bar added</C>
        </>} />
      </Minor>

      {/* ── v1.x ERA ─────────────────────────────────────────────────────── */}
      <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-600 mb-3 mt-6 px-1">Production — Admin Portal Era</p>

      <Minor version="v1.0" title="Admin Portal Launch" date="Jul 30 – Aug 10, 2026" isMajor defaultOpen={false}>
        <Patch version="v1.0.0" date="Jul 30" title="Core portal rewrite" changes={<>
          <C type="feat">CMS scrapped; full Firestore-backed admin portal rebuilt from scratch</C>
          <C type="feat">22-role access hierarchy (Cadet → Battalion Commander → Instructor)</C>
          <C type="fix">Serverless function rewritten as ESM; <code className="font-mono text-[10px]">firebase-admin</code> replaced with direct REST + JWT</C>
          <C type="perf">Independent serverless network calls parallelized</C>
        </>} />
        <Patch version="v1.0.1" date="Jul 31" title="Account management & EmailJS" changes={<>
          <C type="feat">Manage Personnel: role/company editing, password reset for any cadet</C>
          <C type="feat">Account suspend/delete with credential-exposure gap closed</C>
          <C type="feat">Custom EmailJS password reset email (replaces Firebase's default)</C>
          <C type="feat">60-second reset cooldown; rate-limit shown as live countdown</C>
          <C type="feat">Both old and new address notified on login-email change</C>
          <C type="feat">S4 Assistant emailed on uniform issuance</C>
        </>} />
        <Patch version="v1.0.2" date="Jul 31" title="Signup & session security" changes={<>
          <C type="feat">Signup approval workflow with battalion access-code gate</C>
          <C type="sec">reCAPTCHA v2 checkbox on signup</C>
          <C type="sec">Session-only persistence — tab/browser close logs out</C>
          <C type="fix">Self-registration silently broken under Firestore rules — fixed</C>
        </>} />
        <Patch version="v1.0.3" date="Jul 31 – Aug 1" title="Platform features & legal" changes={<>
          <C type="feat">Firebase Analytics (GA4) wired to existing measurement ID</C>
          <C type="feat">Role-scoped reads for roster, orders, and uniform requests</C>
          <C type="feat">Documents & Regulations library; YouTube link in footer</C>
          <C type="feat">Privacy Policy and Terms of Service pages (initial versions)</C>
          <C type="feat">Scroll-to-top on every navigation</C>
          <C type="fix">Manage Teams blank-page TDZ crash resolved</C>
        </>} />
        <Patch version="v1.0.4" date="Aug 1" title="Privacy Policy & ToS iterations" changes={<>
          <C type="law">Privacy Policy: retention policy corrected, DD-322 note, cookies/analytics disclosure, COPPA, breach notification, safety carve-out</C>
          <C type="law">Terms of Service: minors note, content license, governing law, continuity clause, safety note</C>
          <C type="sec">Analytics init hardened against config/network failures</C>
        </>} />
        <Patch version="v1.0.5" date="Aug 1" title="Security headers & rate limiting" changes={<>
          <C type="sec">Content-Security-Policy and other security headers added to Vercel config</C>
          <C type="sec">Server-side rate limiting via Redis on sensitive endpoints</C>
        </>} />
        <Patch version="v1.0.6" date="Aug 5" title="Performance & caching" changes={<>
          <C type="fix">CSP blocking Google Tag Manager's gtag.js script — fixed</C>
          <C type="perf">HTTP cache headers for all static assets</C>
          <C type="perf">JS bundle code-split — 1 MB single-chunk warning eliminated</C>
          <C type="perf">Cover images recompressed: 91 MB → 2.3 MB</C>
          <C type="feat">Global Broadcast switches to <code className="font-mono text-[10px]">onSnapshot</code> (optimistic UI)</C>
          <C type="feat">Skeleton loaders on highest-traffic pages</C>
          <C type="feat">Tooltips added to all icon-only buttons across admin pages</C>
          <C type="feat">robots.txt added</C>
        </>} />
        <Patch version="v1.0.7" date="Aug 5 – 6" title="SEO & Core Web Vitals" changes={<>
          <C type="feat">Open Graph / Twitter Card meta tags with branded preview image</C>
          <C type="feat">Real 404 page; per-route metadata (title, description, canonical)</C>
          <C type="feat">Favicon, sitemap, and structured data (EducationalOrganization)</C>
          <C type="fix">Canonical domain switched to pbhsjrotc.com</C>
          <C type="fix">CLS fixes: hero h1 entrance animation, async data mount, carousel height</C>
          <C type="fix">Descriptive link text audit resolved; PageSpeed Insights actions completed</C>
          <C type="sec">10 of 12 npm audit vulnerabilities resolved</C>
        </>} />
        <Patch version="v1.0.8" date="Aug 6" title="Polish & animations" changes={<>
          <C type="feat">Custom scrollbar; em-dashes removed from prose copy</C>
          <C type="feat">Scroll-triggered reveal animations on Home and About</C>
          <C type="feat">Onboarding checklists (check off items to dismiss)</C>
          <C type="feat">CI workflow added: real lint + test + build pipeline</C>
        </>} />
        <Patch version="v1.0.9" date="Aug 7" title="Cookie consent & uploads" changes={<>
          <C type="feat">Cookie consent banner; Firebase Analytics gated behind acceptance</C>
          <C type="feat">Upload system: WebP-only storage, size validation, profile photos (Cloudinary)</C>
          <C type="feat">Error boundary + retry-with-backoff on all upload flows</C>
          <C type="sec">Accessibility pass: contrast failures fixed, keyboard focus indicator added</C>
        </>} />
        <Patch version="v1.0.10" date="Aug 7" title="Admin features & navigation" changes={<>
          <C type="feat">SAI/AI instructor accounts sync from roster</C>
          <C type="feat">Company names configurable by S6 via Customization page</C>
          <C type="feat">Persistent admin sidebar on all admin pages (AdminLayout wrapper)</C>
          <C type="feat">Scroll-reveal animations on remaining public pages</C>
          <C type="feat">Army Values inline accordion (replaces popup)</C>
          <C type="feat">Homepage content management; nav visibility control</C>
          <C type="feat">Photo Gallery and Calendar links added to Battalion nav dropdown</C>
        </>} />
        <Patch version="v1.0.11" date="Aug 8" title="2FA enforcement & onboarding wizard" changes={<>
          <C type="sec">2FA (SMS MFA) enforced for staff-level accounts</C>
          <C type="feat">Account onboarding wizard: email verification + 2FA setup flow</C>
          <C type="feat">2FA enrollment confirmation email via EmailJS</C>
          <C type="feat">Email verification routed through EmailJS instead of Firebase mailer</C>
          <C type="feat">Phone number input auto-formats during 2FA enrollment</C>
          <C type="feat">Uniform Items restricted to S4 assistants, company command, battalion command</C>
          <C type="fix">Auth ghost on sign-in; MFA SMS deferred until after React commits DOM</C>
        </>} />
        <Patch version="v1.0.12" date="Aug 9" title="reCAPTCHA Enterprise upgrade" changes={<>
          <C type="sec">reCAPTCHA v2 checkbox → Enterprise score-based (invisible, no checkbox)</C>
          <C type="fix">Score check no longer blocks incognito/private-browsing users</C>
          <C type="fix">reCAPTCHA script lazy-loaded in SignUp only (not on every page)</C>
          <C type="feat">60-second resend cooldown on email verification</C>
          <C type="feat">Force-verify-email bypass for Firebase rate-limit edge case</C>
        </>} />
        <Patch version="v1.0.13" date="Aug 9" title="Animations & email migration" changes={<>
          <C type="feat">ScrambleText + Typewriter animation components (replaces Framer Motion effects)</C>
          <C type="feat">SmoothInput spring-animated caret; animated number counters</C>
          <C type="feat">Animations applied to all public and admin pages</C>
          <C type="feat">Email delivery migrated from EmailJS → Resend; domain verified on noreply@pbhsjrotc.com</C>
        </>} />
        <Patch version="v1.0.14" date="Aug 9" title="Access control & routing" changes={<>
          <C type="sec">Two-stage approval for uniform requests; role-scoped targeting for Orders/Tasks</C>
          <C type="feat">Positions dropdown: all 22 roles added to constants.js</C>
          <C type="feat">Cadet Dossier moved from AdminTeams to My Profile</C>
          <C type="fix"><code className="font-mono text-[10px]">auth/requires-recent-login</code> no longer blocks MFA enrollment in onboarding</C>
        </>} />
        <Patch version="v1.0.15" date="Aug 9" title="Newsletters" changes={<>
          <C type="feat">Newsletter feature: public listing page + admin management panel</C>
          <C type="feat">Firestore rules and firebase.json wired; admin redirect auth-aware</C>
          <C type="feat">Battalion crest OG image</C>
        </>} />
        <Patch version="v1.0.16" date="Aug 10" title="Battalion Roster" changes={<>
          <C type="feat">Battalion Roster page with per-company tabs</C>
          <C type="feat">Zulu Company = Battalion HQ with secondary company (class period)</C>
          <C type="feat">Roster ↔ portal account two-way sync</C>
          <C type="fix">Roster sync bugs (three issues); Cadet Challenge Firestore index added</C>
        </>} />
        <Patch version="v1.0.17" date="Aug 10" title="Newsletter PDF uploads" changes={<>
          <C type="fix">PDF uploads routed to Firebase Storage (Cloudinary <code className="font-mono text-[10px]">raw/upload</code> didn't support PDFs)</C>
          <C type="fix">CSP updated: <code className="font-mono text-[10px]">firebasestorage.googleapis.com</code> added to connect-src</C>
          <C type="fix">PDF upload limit raised to 25 MB for large newsletters</C>
        </>} />
      </Minor>

      <Minor version="v1.1" title="Security & 2FA" date="Aug 11, 2026">
        <Patch version="v1.1.0" date="Aug 11" title="Cadet Challenge, S2 Inspections, S6 Checklist" changes={<>
          <C type="feat">Cadet Challenge score tracking (per cadet, per cycle, per exercise)</C>
          <C type="feat">S2 Inspections page</C>
          <C type="feat">S6 Technology Checklist</C>
        </>} />
        <Patch version="v1.1.1" date="Aug 11" title="Session soft-lock" changes={<>
          <C type="sec">Session soft-lock: portal locks after inactivity, prompts re-auth</C>
          <C type="sec">"Remember This Device" token — skips SMS MFA on trusted devices for 30 days</C>
        </>} />
        <Patch version="v1.1.2" date="Aug 11" title="Login & session fixes" changes={<>
          <C type="fix">Login loop caused by stale <code className="font-mono text-[10px]">sessionLocked</code> flag on sign-in — resolved</C>
          <C type="fix">Lock screen firing immediately on trusted devices (32-bit setTimeout overflow) — fixed</C>
          <C type="fix">Session lock screen now correctly unlocks for MFA-enrolled accounts</C>
        </>} />
        <Patch version="v1.1.3" date="Aug 11" title="Roster improvements" changes={<>
          <C type="feat">S1 Assistants get full CRUD on company roster (except name/company fields)</C>
          <C type="feat">Approved accounts auto-added to battalion roster on approval</C>
          <C type="feat">Battalion cross-company Cadet Challenge support</C>
          <C type="fix">Battalion S1 correctly sees all of Zulu Company by default</C>
        </>} />
      </Minor>

      <Minor version="v1.2" title="Programs & Logistics" date="Aug 12 – 13, 2026">
        <Patch version="v1.2.0" date="Aug 12 – 13" title="Fundraiser Tracking" changes={<>
          <C type="feat">Fundraiser Tracking — Fallen Heroes flag program: weekly progress per cadet, running totals, payment logging</C>
          <C type="fix">Flag emojis removed; payment logging corrected; empty Analytics label hidden</C>
          <C type="feat">Soft-delete (void) instead of hard-delete for fundraiser entries</C>
          <C type="fix">Void permission fixed — company command can void their own company's entries</C>
        </>} />
        <Patch version="v1.2.1" date="Aug 13" title="Uniform Sizes & scoped access" changes={<>
          <C type="feat">Uniform Sizes admin page (S4 logistics: shirt, pants, boot, beret per cadet)</C>
          <C type="feat">S7 Special Projects scoped access control</C>
          <C type="feat">S6 Technology scoped access + Customization render crash fixed</C>
        </>} />
        <Patch version="v1.2.2" date="Aug 13" title="Personal views & Orders merge" changes={<>
          <C type="feat">Personal views for Cadet Challenge, Fundraiser, Uniform Sizes, Uniform Items (cadet self-service)</C>
          <C type="feat">Orders + Tasks combined into a single page</C>
          <C type="feat">Personal view pages widened to <code className="font-mono text-[10px]">max-w-7xl</code> to match full-access layout</C>
        </>} />
        <Patch version="v1.2.3" date="Aug 13" title="Permission overhaul" changes={<>
          <C type="sec">Sidebar links fully role-gated; roster search scoped per role</C>
          <C type="sec">Email notifications fire for role-relevant events only</C>
          <C type="sec">Route protection enforced on all admin pages (redirect on unauthorized access)</C>
          <C type="sec">SGM, BC, CSM restricted from portal admin tools; SGM order targets scoped</C>
          <C type="feat">Auto-dismiss checklist on route navigation; role-scoped onboarding items</C>
        </>} />
      </Minor>

      <Minor version="v1.3" title="Command Intelligence" date="Aug 14 – 17, 2026">
        <Patch version="v1.3.0" date="Aug 14" title="S1 Tracker" changes={<>
          <C type="feat">S1 Tracker page — form turn-in status tracked per cadet across all required documents</C>
        </>} />
        <Patch version="v1.3.1" date="Aug 17" title="Promotion Board & Meeting Logs" changes={<>
          <C type="feat">Promotion Board — score submission by Company XOs, reviewed by S1 staff</C>
          <C type="feat">Meeting Logs — structured log per meeting, synced to Google Sheets for archival</C>
        </>} />
      </Minor>

      <Minor version="v1.4" title="Calendar & Public Features" date="Aug 19, 2026">
        <Patch version="v1.4.0" date="Aug 19" title="Mobile sidebar" changes={<>
          <C type="fix">Admin sidebar now responsive on mobile/iPhone (hamburger toggle)</C>
        </>} />
        <Patch version="v1.4.1" date="Aug 19" title="Calendar Events" changes={<>
          <C type="feat">Admin Calendar Events: create/edit/delete events with date ranges, colors, and categories</C>
          <C type="feat">Public Events Calendar page with category filter bar</C>
          <C type="fix">Calendar route made truly public (no auth required)</C>
          <C type="sec">Calendar Events admin gated to staff (level 70+) only</C>
        </>} />
        <Patch version="v1.4.2" date="Aug 19" title="Blue/Gold Day overlay" changes={<>
          <C type="feat">Blue/Gold school day overlay on public calendar (alternating schedule)</C>
          <C type="fix">Fridays correctly excluded from the school day count</C>
          <C type="fix">2026–2027 anchor date updated to Aug 3; final Friday fix applied</C>
        </>} />
        <Patch version="v1.4.3" date="Aug 19" title="Honor Company, Feedback Hub, Fundraiser graph" changes={<>
          <C type="feat">Honor Company leaderboard — live company rankings, scoped per role</C>
          <C type="feat">Feedback Hub for staff to submit and review portal feedback</C>
          <C type="feat">Fundraiser progress chart (visual graph view)</C>
          <C type="feat"><code className="font-mono text-[10px]">company_master_sergeant</code> role added to the hierarchy</C>
          <C type="feat">Honor Company and Fundraiser use live company names from <code className="font-mono text-[10px]">useCompanies</code> hook; Org Day reset added</C>
        </>} />
        <Patch version="v1.4.4" date="Aug 19" title="Sidebar reorganization" changes={<>
          <C type="feat">Admin sidebar grouped into Command / Personnel / Programs / Publishing sections</C>
          <C type="feat">Calendar Events moved into Command group</C>
          <C type="fix">Admin page headers standardized across all pages; Global Broadcast simplified</C>
        </>} />
        <Patch version="v1.4.5" date="Aug 19" title="Calendar UI interactions" changes={<>
          <C type="feat">Hover tooltip on day cells showing event title and type</C>
          <C type="feat">Click-to-expand modal for detailed day event view</C>
          <C type="fix">AdminEvents focus-stealing bug fixed by lifting EventForm to module level</C>
        </>} />
      </Minor>

      <Minor version="v1.5" title="Logistics & Performance" date="Aug 20, 2026">
        <Patch version="v1.5.0" date="Aug 20" title="Supply Requests & Cadet History" changes={<>
          <C type="feat">Supply Requests page (S4 logistics module — submit, approve, fulfill)</C>
          <C type="feat">Cadet History archive (company leadership+ can view; admin can archive/delete)</C>
          <C type="fix"><code className="font-mono text-[10px]">AdminSupplyRequests</code> and <code className="font-mono text-[10px]">AdminCadetHistory</code> switched to <code className="font-mono text-[10px]">useAuth()</code></C>
        </>} />
        <Patch version="v1.5.1" date="Aug 20" title="Performance pass" changes={<>
          <C type="perf"><code className="font-mono text-[10px]">backdrop-blur</code> removed from all modal overlays — significant GPU savings on mobile</C>
          <C type="perf">Framer Motion replaced with pure CSS keyframes — smaller JS bundle, faster modal open</C>
        </>} />
        <Patch version="v1.5.2" date="Aug 20" title="Feature additions" changes={<>
          <C type="feat">S1 board unlock controls (S1 can open/close board without admin)</C>
          <C type="feat">Fundraiser roster-level goals per cadet</C>
          <C type="feat">Supply Requests "Other" category added</C>
          <C type="fix">Past calendar events now display correctly on the public calendar</C>
          <C type="feat">Accounts page renamed; accessibility fixes applied</C>
        </>} />
        <Patch version="v1.5.3" date="Aug 20" title="Firestore security rules" changes={<>
          <C type="sec">Firestore security rules enforced at the database level for 7 collections (roster, uniformSizes, cadetChallengeRecords, fundraiserEntries, supplyRequests, s1Tracker, meetingLogs) — not just via the UI</C>
          <C type="sec">Composite indexes added for new collections</C>
        </>} />
      </Minor>

      <Minor version="v1.6" title="Privacy & Compliance" date="Aug 22, 2026" isMajor defaultOpen>
        <Patch version="v1.6.0" date="Aug 22" title="Privacy Policy rewrite" changes={<>
          <C type="law">Privacy Policy fully rewritten — cites Florida Student Data Privacy Act (§ 1002.222, F.S.), FERPA, and COPPA</C>
          <C type="law">Every data type now explicitly listed: physical measurements, fitness scores, fundraiser data, promotion board scores</C>
          <C type="law">Effective date updated to Aug 22, 2026</C>
          <C type="sec">GA <code className="font-mono text-[10px]">send_page_view</code> disabled in <code className="font-mono text-[10px]">index.html</code> — no tracking data sent before cookie consent is accepted</C>
        </>} />
        <Patch version="v1.6.1" date="Aug 22" title="Terms of Service update" changes={<>
          <C type="law">ToS: BCPS Student Code of Conduct (Policy 5.8) and JROTC SOP compliance requirement added</C>
          <C type="law">Cadet data non-disclosure rule: sharing any cadet's personal info outside official battalion use prohibited</C>
          <C type="law">Scope-access violation bullet: attempting to access data outside your role's scope explicitly prohibited</C>
          <C type="law">2FA requirement for staff accounts formalized in Section 2</C>
        </>} />
        <Patch version="v1.6.2" date="Aug 22" title="ToS: restore misuse catch-all" changes={<>
          <C type="law">False-data bullet restored to include "or otherwise misuse any portal tool or feature" catch-all clause</C>
        </>} />
        <Patch version="v1.6.3" date="Aug 22" title="Code compliance" changes={<>
          <C type="sec">Account deletion now triggers cascade cleanup: roster entry unlinked (<code className="font-mono text-[10px]">linkedUid</code> field removed), uniform size records purged</C>
          <C type="sec">Google Analytics disabled on all <code className="font-mono text-[10px]">/admin/*</code> routes via <code className="font-mono text-[10px]">setAnalyticsCollectionEnabled</code></C>
          <C type="feat">My Records section added to My Profile — self-service view of fundraiser total, Cadet Challenge scores by cycle, and uniform sizes</C>
        </>} />
        <Patch version="v1.6.4" date="Aug 22" title="Build fix" changes={<>
          <C type="fix">Build error resolved: <code className="font-mono text-[10px]">await import()</code> removed from non-async <code className="font-mono text-[10px]">.then()</code> callback in <code className="font-mono text-[10px]">firebase.js</code> — <code className="font-mono text-[10px]">setAnalyticsCollectionEnabled</code> now destructured from the outer import instead</C>
        </>} />
        <Patch version="v1.6.5" date="Aug 22" title="Version History page" changes={<>
          <C type="feat">This page — <code className="font-mono text-[10px]">/admin/changelog</code> — added to the portal with full patch-level history</C>
          <C type="feat">"Version History" link added to admin sidebar in a dedicated "Portal" group at the bottom, visible to all authenticated users</C>
          <C type="fix">Changelog page content was rendering too far left — wrapped in correct padding layer since AdminLayout's <code className="font-mono text-[10px]">&lt;Outlet /&gt;</code> provides none</C>
          <C type="fix">Sidebar link was appearing ungrouped at the top between Dashboard and Command; moved to a labeled "Portal" section above the logout button</C>
        </>} />
        <Patch version="v1.6.6" date="Aug 24" title="5 bug fixes" changes={<>
          <C type="fix">Company Executive Officers no longer appear in "Meet the Top 3" on the homepage — XO/Battalion XO roles now require an empty company field to match</C>
          <C type="fix">Zulu Company removed from the public Company Leadership tab — it is the battalion HQ placeholder, not a line company</C>
          <C type="fix">Blue/Gold day system now supports an <code className="font-mono text-[10px]">endDate</code> field in <code className="font-mono text-[10px]">settings/blueGoldCalendar</code>; B/G labels and the header badge disappear automatically after school year ends</C>
          <C type="fix">Calendar agenda no longer stretches the calendar grid row when it has more events than the calendar is tall — grid columns now size independently with <code className="font-mono text-[10px]">items-start</code></C>
          <C type="fix">Agenda event cards are never clipped mid-card — removed the fixed-height scroll container so all cards are always fully visible and the page scrolls naturally</C>
          <C type="perf">Home page animation lag reduced: hero transition cut from 1.5 s to 0.7 s, ScrambleText render load halved, hero image loads at high priority</C>
        </>} />
        <Patch version="v1.6.7" date="Aug 24" title="Performance pass" changes={<>
          <C type="perf">Leadership portraits now lazy-load — all four image slots (BC, XO/CSM, SGM, staff officers) deferred until near the viewport; previously all pulled from Firebase Storage on page load regardless of scroll position</C>
          <C type="perf">Photo Gallery album covers now lazy-load; hover image transition scoped from <code className="font-mono text-[10px]">transition-all duration-700</code> (watched 60+ CSS properties for 700 ms) to <code className="font-mono text-[10px]">transition-[transform,opacity] duration-300</code></C>
          <C type="perf">Removed <code className="font-mono text-[10px]">backdrop-blur-md</code> from the calendar grid card (sat on a solid background — sampled nothing, just burned a GPU compositing layer) and from Photos album buttons (9 layers on one page)</C>
          <C type="perf">Calendar day-cell hover narrowed from <code className="font-mono text-[10px]">transition-all</code> to <code className="font-mono text-[10px]">transition-colors</code> — 31 cells × all CSS properties was the main hover jank source on the events page</C>
          <C type="perf">Agenda animation delay capped at 300 ms — was <code className="font-mono text-[10px]">idx × 0.05 s</code> with no ceiling; 40-event months made the last card appear 2 s after load</C>
          <C type="perf">Hero CTA buttons scoped from <code className="font-mono text-[10px]">transition-all</code> to <code className="font-mono text-[10px]">transition-colors</code>; glass button blur reduced from <code className="font-mono text-[10px]">backdrop-blur-md</code> to <code className="font-mono text-[10px]">backdrop-blur-sm</code></C>
        </>} />
        <Patch version="v1.6.8" date="Aug 24" title="Security audit — 7 fixes" changes={<>
          <C type="sec">Firestore wildcard fallback changed from <code className="font-mono text-[10px]">if isSignedIn()</code> to <code className="font-mono text-[10px]">if false</code> — any collection without an explicit rule is now deny-all rather than fully open to all signed-in users</C>
          <C type="sec"><code className="font-mono text-[10px]">settings/{'{'}settingId{'}'}</code> write now requires staff tier (70+) — cadets and company leadership could previously overwrite company names, the Blue/Gold anchor date, and page visibility settings</C>
          <C type="sec"><code className="font-mono text-[10px]">events/{'{'}id{'}'}</code> write now requires staff tier (70+) — any signed-in cadet could previously create, modify, or delete public calendar events</C>
          <C type="sec"><code className="font-mono text-[10px]">cadetChallengeRecords</code>, <code className="font-mono text-[10px]">uniformSizes</code>, and <code className="font-mono text-[10px]">fundraiserEntries</code> reads tightened from open-to-all-signed-in to company-scoped; cadets can still read their own records via <code className="font-mono text-[10px]">linkedUid</code> (now written at create time)</C>
          <C type="sec">Role assignment dropdown in User Management now only shows roles strictly below the editor's own level — prevents privilege-cloning attacks; matching ceiling check added to the Firestore <code className="font-mono text-[10px]">users</code> update rule</C>
          <C type="sec">Promotion board scores read narrowed from all-command-tier to company-scoped — company commanders can no longer query scores for other companies via the Firestore client</C>
          <C type="sec"><code className="font-mono text-[10px]">company_master_sergeant</code> role added to Firestore <code className="font-mono text-[10px]">roleLevel()</code> map at level 45 — was missing, causing that role to resolve to level 0 at the database layer despite being level 45 in the app</C>
        </>} />
        <Patch version="v1.6.9" date="Aug 24" title="S1 form-submission file upload" changes={<>
          <C type="feat">Storage rule added for <code className="font-mono text-[10px]">form-submissions/{'{'}eventId{'}'}/*</code> — S1 assistants and company command can now attach a photo or scan of the physical form directly to each submission row in the S1 Tracker</C>
          <C type="perf">PNG uploads in the S1 Tracker are silently recompressed to JPEG at 88% quality before hitting the network — ~3–5× smaller than raw PNG with no visible quality loss on document scans</C>
          <C type="sec">S1 file uploads now validate by magic-number byte signature (not extension) before upload — rejects disguised non-image/PDF files</C>
          <C type="fix">S1 Tracker file uploads were broken after the wildcard Firestore Storage fallback was locked to <code className="font-mono text-[10px]">if false</code> — explicit <code className="font-mono text-[10px]">form-submissions</code> rule added</C>
          <C type="feat"><code className="font-mono text-[10px]">uploadFileToPath</code>, <code className="font-mono text-[10px]">validateCadetDocument</code>, and <code className="font-mono text-[10px]">convertPngToJpeg</code> added as reusable utilities for future upload UIs</C>
        </>} />
        <Patch version="v1.6.10" date="Aug 24" title="S1 company scoping + meeting log sharing" changes={<>
          <C type="fix">S1 Tracker: Company XO / CC / 1SG now see only their own company's submissions — query scoped at the database level (<code className="font-mono text-[10px]">where('company', '==', myCompany)</code>) rather than client-side filtering alone</C>
          <C type="sec">Firestore <code className="font-mono text-[10px]">formSubmissions</code> read rule updated to allow company-level (35+) access to own-company documents; battalion staff (70+) retain full read access</C>
          <C type="sec">Firestore <code className="font-mono text-[10px]">formEvents</code> rules opened to company-level users (35+ read, 45+ write) — previously blocked non-staff from seeing and creating events in the S1 Tracker once the wildcard fallback was locked</C>
          <C type="feat">Meeting Logs: Battalion XO can now mark any log as "Share with Company Leadership" — Company Commanders, XOs, and 1SGs gain read-only access to those specific logs via the <code className="font-mono text-[10px">/admin/meeting-logs</code> page</C>
          <C type="sec">Firestore <code className="font-mono text-[10px]">meetingLogs</code> rule extended: company leadership (45–69) may only read documents where <code className="font-mono text-[10px]">companyAccess == true</code></C>
          <C type="feat">Composite Firestore index added for <code className="font-mono text-[10px]">formSubmissions [eventId, company]</code> to support the company-scoped submissions query</C>
          <C type="feat"><code className="font-mono text-[10px]">company_commander</code>, <code className="font-mono text-[10px]">company_xo</code>, and <code className="font-mono text-[10px]">company_1sg</code> added to the Meeting Logs route guard so they can access the page</C>
        </>} />
        <Patch version="v1.6.11" date="Aug 24" title="Dashboard fixes" changes={<>
          <C type="fix">Clicking X on the Getting Started checklist no longer crashes the page — <code className="font-mono text-[10px]">AnimatePresence</code>/<code className="font-mono text-[10px]">motion.div</code> (framer-motion) replaced with native CSS <code className="font-mono text-[10px]">transition-opacity</code>; framer-motion's abrupt-unmount behaviour was the crash root cause</C>
          <C type="feat">Quick Glance stat tile on the dashboard is now role-aware: staff (70+) see Pending Uniform Requests as before; Company Commanders, XOs, and 1SGs see Cadets Pending Turn-In (live count of their own company's pending S1 submissions); cadets and lower roles see Upcoming Events only</C>
        </>} />
        <Patch version="v1.6.12" date="Aug 24" title="Gating, data reset & meeting log UX" changes={<>
          <C type="feat">Fundraiser now has an Open/Close gate controlled by S1, S3, or any staff (70+) — Company Commanders, XOs, and 1SGs see a locked notice and cannot log payments until the fundraiser is opened; S1/S3 see a green toggle button in the header</C>
          <C type="feat">Cadet Challenge cycles now start CLOSED by default — no company can enter data until S1, S3, or Battalion XO opens the cycle for that company; the Open Cycle button appears in both the single-company banner and the all-companies staff grid</C>
          <C type="fix">Meeting Logs empty state for company leadership now reads "Nothing to see here yet" instead of the generic "No meeting logs yet" (which implied they could create one)</C>
          <C type="fix">Data reset: all documents cleared from <code className="font-mono text-[10px]">fundraiserEntries</code>, <code className="font-mono text-[10px]">promotionBoards</code>, <code className="font-mono text-[10px]">promotionScores</code>, <code className="font-mono text-[10px]">cadetChallengeRecords</code>, <code className="font-mono text-[10px]">cadetChallengeCycles</code>, <code className="font-mono text-[10px]">formSubmissions</code>, <code className="font-mono text-[10px]">formEvents</code>, and <code className="font-mono text-[10px]">uniformSizes</code> for year-start</C>
        </>} />
        <Patch version="v1.6.13" date="Aug 24" title="Footer layout overhaul" changes={<>
          <C type="fix">Footer no longer constrained to <code className="font-mono text-[10px]">max-w-7xl</code> — replaced with full-width <code className="font-mono text-[10px]">w-full</code> container with responsive horizontal padding so the footer uses the entire page width on all screen sizes</C>
          <C type="fix">Grid column distribution updated to <code className="font-mono text-[10px]">2fr 1fr 1fr 1.6fr</code> (branding : resources : battalion : contact) — link columns no longer appear cramped against the right edge</C>
          <C type="fix">Bottom bar redesigned: copyright and portal version sit on the left, legal and external links grouped on the right with consistent spacing — previously all content was bunched to the right side</C>
          <C type="feat">Portal version displayed in the footer bottom bar (e.g. "Portal v1.6.13") for quick reference without opening the Version History page</C>
          <C type="feat">Phone number added to the Contact column in the footer</C>
        </>} />
        <Patch version="v1.6.14" date="Aug 24" title="Role & permission pass" changes={<>
          <C type="fix">Meeting Logs link now appears in the sidebar for Company Commander, XO, 1SG, and MSgt — previously the link was missing even though those roles had route access</C>
          <C type="feat">Company Master Sergeant gains the same sidebar visibility as company leadership (S1 Tracker, Meeting Logs, Cadet Challenge full view, Fundraiser, Roster) — previously was being shown a limited "My Records" view</C>
          <C type="feat">Company Master Sergeant now has data-entry access in Cadet Challenge (added to <code className="font-mono text-[10px]">INPUT_ROLES</code>); all other pages (Roster, S1 Tracker, Fundraiser, Meeting Logs) remain view-only for that role</C>
          <C type="fix">Company Commander and First Sergeant are now view-only in the S1 Tracker — removed from <code className="font-mono text-[10px]">CAN_CREATE_ROLES</code> and <code className="font-mono text-[10px]">CAN_MARK_ROLES</code>; only S1 Adjutant and Company XO (plus S1/S3 assistants) can mark submissions or create events</C>
          <C type="fix">Roster "Add Cadet" now shows a clear "company not configured" error if the user's company field is missing in their profile, and a "Permission denied" message if Firestore rejects the write — replaces the generic "Save failed" toast</C>
          <C type="fix">Company Master Sergeant is now view-only in the Battalion Roster (canEdit blocked explicitly); previously had unintended write access via the COMMAND_LEVEL (45) threshold</C>
          <C type="fix">Cadet Challenge status labels no longer include emojis (✓ / ⏳ / ⏸ / ✎) — replaced with plain text (Locked / Submitted / Closed / Open)</C>
          <C type="fix">Meeting Logs route guard now includes <code className="font-mono text-[10px]">company_master_sergeant</code>; app route and sidebar are consistent</C>
        </>} />

        <Patch version="v1.6.15" date="Aug 25" title="Sidebar & account-management fixes" changes={<>
          <C type="fix">S1 and S3 assistant sidebar rebuilt with proper group labels (Personnel, Programs, My Records) matching company-leadership layout — replaces the previous flat divider-section structure</C>
          <C type="fix">Removed duplicate "Company Roster" link that appeared twice for S1/S3 assistants; now appears once under Personnel</C>
          <C type="fix">Meeting Logs removed from S1/S3 assistant sidebar — only Company Top 3 (CC, XO, 1SG) and MSgt see that link; S1/S3 assistants' Personnel group shows Company Roster and S1 Tracker only</C>
          <C type="fix">S1 and S3 assistants no longer see full Fundraiser or Uniform management pages — sidebar routes them to "My Records" personal links (Fundraiser, Uniform Items, Uniform Sizes) while preserving full Cadet Challenge and S1 Tracker access</C>
          <C type="fix">Battalion S1 (s1_adjutant) and S6 Technology can now save user accounts and approve registrations — Firestore <code className="font-mono text-[10px]">/users</code> update/create/delete rules were only allowing <code className="font-mono text-[10px]">isAdmin()</code> (battalion command + instructors), which excluded both roles despite the UI correctly showing them the management interface</C>
          <C type="sec">Added <code className="font-mono text-[10px]">isUserManager()</code> helper to Firestore rules: S1 adjutant and S6 technology share the same privilege-cloning constraint as admins — cannot elevate a role to their own level (70) or above</C>
        </>} />

        <Patch version="v1.6.16" date="Aug 25" title="Account approval UI" changes={<>
          <C type="feat">Pending-account review now shows a green "Approve Account" button and a red "Deny Account" button side by side — replaces the generic yellow "Update Record" bar so the approval intent is unmistakable</C>
          <C type="feat">Denying an account registration removes the Firebase Auth entry and Firestore document in one action, matching the existing Delete Account flow but scoped to the pending-approval context with its own confirmation and "Registration Denied" toast</C>
        </>} />

        <Patch version="v1.6.17" date="Aug 25" title="S3 assistant roster rights & S4 empty-state fix" changes={<>
          <C type="feat">Company S3 assistant now has the same roster edit rights as S1 assistant — can create, edit, and delete cadets in their own company but cannot change a cadet's name or company assignment; Firestore roster create/update/delete rules updated to match</C>
          <C type="fix">Uniform Sizes page now shows "Company not configured — ask an admin to update your profile" instead of the generic "Select a company to begin" empty state when an S4 assistant's user document is missing a company field</C>
        </>} />

        <Patch version="v1.6.18" date="Aug 25" title="Roster → account sync always-on" changes={<>
          <C type="fix">Saving a roster entry now always pushes shared fields (rank, position, company, platoon, squad, gender, LET level) to the linked portal account — previously only fired when the entry's sync mode was set to "Roster is master", so accounts auto-created during approval (which default to portal-as-master) were never updated from the roster</C>
          <C type="fix">Sync Settings labels updated in the roster modal: "Roster is master" → "One-way sync (Roster → Portal only)", "Portal is master" → "Two-way sync (Roster ↔ Portal)", with updated description text clarifying roster saves always push to the account</C>
        </>} />

        <Patch version="v1.6.19" date="Aug 25" title="Public uniform item request page (reverted)" changes={<>
          <C type="feat">Created public <code className="font-mono text-[10px]">/uniform-request</code> page embedding the S4 Google Form — reverted in v1.6.20 to prevent unsolicited submissions from parents and non-cadets</C>
        </>} />

        <Patch version="v1.6.20" date="Aug 25" title="Google Form webhook — backend-only uniform requests" changes={<>
          <C type="fix">Removed the public <code className="font-mono text-[10px]">/uniform-request</code> page, its Navbar links, and the <code className="font-mono text-[10px]">uniform-request</code> visibility flag — the Google Form remains as a QR code posted in the JROTC room only</C>
          <C type="feat">New serverless endpoint <code className="font-mono text-[10px]">/api/uniform-form-webhook</code> receives Google Form submissions via Google Apps Script on every form submit; authenticated with a shared secret stored in the <code className="font-mono text-[10px]">FORM_WEBHOOK_SECRET</code> Vercel environment variable</C>
          <C type="feat">Submissions are written to a new <code className="font-mono text-[10px]">uniformFormRequests</code> Firestore collection using the service account; Firestore security rules allow S4 logistics and battalion command (level 70+) to read, and command to mark reviewed — client apps cannot write or delete</C>
          <C type="feat">Uniform Items admin page gains a "Form Requests" tab (visible to S4 logistics and battalion command) showing every Google Form submission with all question/answer pairs, submission date, and a "Mark Reviewed" action; new submissions are highlighted with a blue left border and a badge count on the tab</C>
        </>} />

        <Patch version="v1.6.21" date="Aug 26" title="Form request approve/decline + roster linkage" changes={<>
          <C type="feat">Form Requests tab now shows Approve (green) and Decline buttons instead of "Mark Reviewed" — Approve confirms the request will be fulfilled; Decline rejects it; status badge updates accordingly</C>
          <C type="feat">Webhook now queries the roster on every form submission: the cadet's name ("Last, First") is converted to "First Last" and matched against roster <code className="font-mono text-[10px]">fullName</code>; if found, <code className="font-mono text-[10px]">rosterDocId</code>, <code className="font-mono text-[10px]">linkedUid</code>, rank, and company are stored on the submission document</C>
          <C type="feat">Each form request card shows a linked cadet chip (name · rank · company, plus "has account" if a portal account is linked) or a "No roster match" indicator when the name wasn't found</C>
        </>} />

        <Patch version="v1.6.22" date="Aug 26" title="Activity Log + HC categories + enhanced roster matching" changes={<>
          <C type="feat">New Activity Log page (<code className="font-mono text-[10px]">/admin/log</code>) with a real-time feed of all system events and manual duty-log entries; visible to all battalion staff (70+); linked from the admin sidebar</C>
          <C type="feat">Manual duty-log entries can be added from the log page — pick a category (Duty Note, Incident, Supply, Training, Admin, Other) and write a description and optional notes</C>
          <C type="feat">Auto-logging wired into: sign-in, roster create/update/delete, uniform request approve/issue, Google Form request approve/decline</C>
          <C type="feat">New <code className="font-mono text-[10px]">adminLog</code> Firestore collection with rules: staff (70+) can read and create their own entries; entries are immutable once written</C>
          <C type="fix">Honor Company category creation restricted to BC, XO, and CSM (level 85+) — previously available to all ADMIN_LEVEL (80+) including SGM; SGM and all S-staff retain the ability to log points</C>
          <C type="feat">Honor Company categories now store a <code className="font-mono text-[10px]">maxScore</code> field (default 100) set at creation time; max score is shown on each category chip and in the Log Points modal for reference</C>
          <C type="feat">Webhook roster matching now also filters by company (from the form's "Company" question) for a high-confidence match, and checks LET level as a secondary confirmation; <code className="font-mono text-[10px]">matchConfidence</code> ("high" / "medium") is stored on each submission and shown as a "confirmed" badge on the form request card</C>
        </>} />

        <Patch version="v1.6.23" date="Aug 26" title="AAR Logs, meeting-log rights, platoon/squad fix, sidebar cleanup" changes={<>
          <C type="feat">New AAR Logs page (<code className="font-mono text-[10px]">/admin/aar-logs</code>) — file After Action Reports for battalion/company events; fields: event name, date, company, attendee count, facilitators (multi-tag), "What Went Well" bullet list, "Needs Improvement" bullet list; company command (45+) can create and see their own company's AARs; staff (70+) see all; XO/CSM/BC/S1 can edit anyone's and delete; <code className="font-mono text-[10px]">aarLogs</code> Firestore collection with matching security rules; rules deployed</C>
          <C type="feat">Meeting Logs expanded — all battalion staff (70+) can now create logs and edit their own; XO/CSM/BC/S1 retain elevated rights to edit anyone's log and delete; company command (45+) continues to see logs flagged for company sharing; meeting-log Firestore rules updated</C>
          <C type="fix">Platoon/Squad options standardised across AdminUsers and AdminRoster: platoons are now 1st Platoon, 2nd Platoon, 3rd Platoon, Company HQ (removed "HQ Platoon", "4th Platoon", "N/A", "Staff"); squads are 1st–4th Squad; selecting "Company HQ" platoon automatically hides the squad selector (no squad for HQ)</C>
          <C type="fix">Battalion/Zulu conflict — "Battalion" no longer appears as a selectable company in account creation; Zulu is the canonical battalion-level company; existing records with <code className="font-mono text-[10px]">company:"Battalion"</code> continue to work without a migration</C>
          <C type="fix">Sidebar "My Records" personal-view links (Cadet Challenge, Fundraiser, Uniform Items, Uniform Sizes) no longer show for platoon/squad leadership (levels 12–25) or squad members/cadets (level 5); those tiers access their own data via My Profile instead; company assistants (35+) are unaffected</C>
          <C type="feat">AAR Logs sidebar link added under Meeting Logs for all company command (45+) and staff (70+); Meeting Logs sidebar link expanded to include all staff (70+)</C>
        </>} />
        <Patch version="v1.6.24" date="Aug 26" title="Account change logging" changes={<>
          <C type="feat">Admin action log now records every account lifecycle event — account creation, approval, role change, profile update, suspend, reactivate, permanent delete, and registration denial; entries written to <code className="font-mono text-[10px]">adminLog</code> with type <code className="font-mono text-[10px]">"account"</code> and the specific action label; logging is non-blocking and non-throwing</C>
        </>} />
        <Patch version="v1.6.25" date="Aug 26" title="Portal-wide activity logging" changes={<>
          <C type="feat">Activity Log now captures every meaningful write across the entire admin portal — announcements (broadcast/delete), camps, content-page saves, documents (publish/delete), calendar events, newsletters, leadership records and instructors, special teams, feedback status changes and deletes, orders and tasks, site settings (company list, document categories, page visibility), fundraiser entries and toggle, Honor Company logs and Org Day scores, meeting logs, AAR logs, S1 form events and status toggles, S2 items and inspection approve/reject, S6 carts and tasks, supply requests and approvals, Cadet Challenge records and cycle finalization, uniform sizes and finalization, and cadet yearly history (archive/edit/delete); every action records actor, role, target, and a human-readable description</C>
        </>} />
        <Patch version="v1.6.26" date="Aug 26" title="Activity Log — full type coverage" isCurrent changes={<>
          <C type="feat">Activity Log filter tabs now include all 30 log types from v1.6.25 (announcements, camps, events, documents, newsletters, photos, content, feedback, fundraiser, Honor Company, leadership, teams, meeting logs, AAR logs, S1, S2, S6, supply, orders, Cadet Challenge, uniform sizes, cadet history, settings) — each with a distinct icon and accent color</C>
          <C type="feat">Search bar added above the filter tabs — filters live across description, author name, target name, action, notes, and category fields; clears with the × button or "Clear filters" link in the empty state</C>
          <C type="feat">Entry subtitle row now shows <code className="font-mono text-[10px]">targetName</code> alongside actor name and role when present — makes it easy to see which cadet, event, or record was affected without opening the source page</C>
          <C type="feat">Entry count in the page header switches to "X of Y entries" when a filter or search is active; "Clear filters" resets both simultaneously</C>
          <C type="feat">Filter tab row scrolls horizontally on smaller screens (scrollbar hidden) instead of wrapping to multiple rows</C>
        </>} />
        <Patch version="v1.6.27" date="Aug 26" title="AAR Logs — battalion-wide scope" isCurrent changes={<>
          <C type="feat">Battalion staff (70+) logging an AAR no longer select a company — the report is filed battalion-wide; the company field is shown locked as "Battalion-wide" and stored as <code className="font-mono text-[10px]">null</code> in Firestore</C>
          <C type="feat">Company command (45–69) continue to see their own company locked in the company field — behavior unchanged for that tier</C>
          <C type="feat">Battalion-wide AARs (<code className="font-mono text-[10px]">company: null</code>) are visible to staff (70+) only — company command's existing company-scoped Firestore query already excludes them</C>
          <C type="feat">Company column in the AAR table and "Filed by" line in the view modal now display "Battalion-wide" instead of a dash when company is null</C>
        </>} />
        <Patch version="v1.6.28" date="Aug 26" title="Sub-bullet points in Meeting Logs & AAR Logs" isCurrent changes={<>
          <C type="feat">Agenda, Notes (Meeting Logs) and What Went Well, Needs Improvement (AAR Logs) now support two-level bullet points — hover any top-level item and click the indent arrow (↩) to open a sub-item input; Enter adds the sub-item, Esc closes the input</C>
          <C type="feat">Sub-items render indented under their parent with a hollow bullet (◦) in both edit and read-only view; a vertical guide line groups sub-items visually</C>
          <C type="feat">New shared <code className="font-mono text-[10px]">BulletListEditor</code> component (<code className="font-mono text-[10px]">src/components/BulletListEditor.jsx</code>) replaces the duplicate inline implementations; exports <code className="font-mono text-[10px]">normalizeBullets</code> and <code className="font-mono text-[10px]">flattenBullets</code> utilities</C>
          <C type="feat">Data model updated from <code className="font-mono text-[10px]">string[]</code> to <code className="font-mono text-[10px]">{'{ text, children }[]'}</code> — existing documents are backward-compatible and silently upgraded to the new format on next save</C>
          <C type="feat">Meeting Logs Google Sheets sync flattens sub-items as two-space-indented strings so indentation is preserved in the spreadsheet</C>
        </>} />
        <Patch version="v1.6.29" date="Aug 26" title="Activity Log — action-color card theming" changes={<>
          <C type="feat">Activity Log entry cards are now color-coded by action: green background for creates, approvals, finalize, mark-complete, archive, and other positive actions; red for deletes, denials, rejects, suspensions, and resets; yellow/amber for updates and modifications; blue for sign-ins; neutral (no tint) for manual duty-log entries</C>
          <C type="feat">Action label text (e.g. "create", "delete", "update") is now colored to match the card theme — green/red/yellow/blue — while the type badge and icon on the left keep their per-module color (announcements pink, events rose, S2 red, etc.)</C>
          <C type="feat">Action labels now display with spaces instead of underscores (e.g. "mark complete" instead of "mark_complete")</C>
          <C type="feat">Hover border intensifies within the same hue rather than switching to a neutral white — green cards stay green on hover, red cards stay red, etc.</C>
        </>} />
        <Patch version="v1.6.30" date="Aug 26" title="Honor Company — fixed 5-4-3-2-1 Org Day point scale" changes={<>
          <C type="feat">Org Day event placements now award points on a fixed scale: 1st = 5 pts, 2nd = 4, 3rd = 3, 4th = 2, 5th = 1, 6th+ = 0 — regardless of how many companies are competing; previously the scale was dynamic (n−i), so the top award varied with company count</C>
        </>} />
        <Patch version="v1.6.31" date="Aug 26" title="Honor Company — exclude Zulu from competition" changes={<>
          <C type="feat">Zulu Company (battalion HQ) is no longer included in the Honor Company scoreboard, Org Day rankings, or the Log Points company selector — only Alpha, Bravo, Charlie, and Delta compete; Zulu remains available on all other pages</C>
        </>} />
        <Patch version="v1.6.32" date="Aug 26" title="Zulu removed — Battalion replaces it site-wide" changes={<>
          <C type="feat">Zulu Company is completely removed from the website; battalion staff and leadership now fall under the "Battalion" designation — a fixed HQ category that is separate from the lettered companies and cannot be added as one</C>
          <C type="feat">Default company list is now Alpha, Bravo, Charlie, Delta; Battalion is injected as a non-company option at the top of every account and signup form</C>
          <C type="feat">Battalion Roster defaults to the Battalion tab for staff; the tab list shows Battalion first, then lettered companies; legacy records with <code className="font-mono text-[10px]">company:"Zulu"</code> appear under the Battalion tab automatically</C>
          <C type="feat">My Profile shows "Battalion" for both new and legacy records — visitors never see "Zulu" anywhere on the site</C>
          <C type="feat">Admin Companies page now blocks adding "Battalion" as a company name with a clear error message</C>
          <C type="fix">Signup and Manage Personnel company selectors show Battalion (HQ) as a distinct option above the lettered company list, not mixed in with them</C>
        </>} />
        <Patch version="v1.6.33" date="Aug 26" title="Fix: Global Broadcast accessible to SGM" changes={<>
          <C type="fix">Sergeant Major could see the Global Broadcast link in the sidebar (correct — level 80+) but was blocked by an <code className="font-mono text-[10px]">excludedRoles</code> guard on the route; the exclusion is removed so all admin-level roles (BC, XO, CSM, SGM, instructors) can access the page as intended</C>
        </>} />
        <Patch version="v1.6.34" date="Aug 26" title="SGM access parity with Battalion CSM" isCurrent changes={<>
          <C type="feat">Sergeant Major now has identical portal access to Battalion CSM across all pages — Accounts (Manage Personnel), Teams, Feedback Hub, AAR Logs elevated edit, Meeting Logs elevated edit, Uniform Request approvals, and full Order targets</C>
          <C type="fix">Accounts route: removed <code className="font-mono text-[10px]">excludedRoles</code> guard that specifically blocked SGM; sidebar Accounts and Teams links updated to show for SGM the same as CSM</C>
          <C type="fix">Feedback Hub sidebar link now shows for SGM; AAR and Meeting Logs elevated-edit (delete, edit any entry) extended to SGM; Uniform Request approve action extended to SGM; Orders page: SGM now gets the same broad STAFF_TARGETS as CSM instead of the narrower company-command-only list</C>
        </>} />
      </Minor>

      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300 dark:text-slate-600 text-center mt-4 pb-8">
        Repository: pompano-jrotc/pbhs-jrotc-web · Deployed via Vercel
      </p>
    </div>
    </div>
  );
};

export default AdminChangelog;
