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
        <Stat value="12"     label="Releases"    />
        <Stat value="274"    label="Commits"     />
        <Stat value="22"     label="Role Levels" />
        <Stat value="210d"   label="In Dev"      />
        <Stat value="v1.6.7" label="Current"     />
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
        <Patch version="v1.6.7" date="Aug 24" title="Performance pass" isCurrent changes={<>
          <C type="perf">Leadership portraits now lazy-load — all four image slots (BC, XO/CSM, SGM, staff officers) deferred until near the viewport; previously all pulled from Firebase Storage on page load regardless of scroll position</C>
          <C type="perf">Photo Gallery album covers now lazy-load; hover image transition scoped from <code className="font-mono text-[10px]">transition-all duration-700</code> (watched 60+ CSS properties for 700 ms) to <code className="font-mono text-[10px]">transition-[transform,opacity] duration-300</code></C>
          <C type="perf">Removed <code className="font-mono text-[10px]">backdrop-blur-md</code> from the calendar grid card (sat on a solid background — sampled nothing, just burned a GPU compositing layer) and from Photos album buttons (9 layers on one page)</C>
          <C type="perf">Calendar day-cell hover narrowed from <code className="font-mono text-[10px]">transition-all</code> to <code className="font-mono text-[10px]">transition-colors</code> — 31 cells × all CSS properties was the main hover jank source on the events page</C>
          <C type="perf">Agenda animation delay capped at 300 ms — was <code className="font-mono text-[10px]">idx × 0.05 s</code> with no ceiling; 40-event months made the last card appear 2 s after load</C>
          <C type="perf">Hero CTA buttons scoped from <code className="font-mono text-[10px]">transition-all</code> to <code className="font-mono text-[10px]">transition-colors</code>; glass button blur reduced from <code className="font-mono text-[10px]">backdrop-blur-md</code> to <code className="font-mono text-[10px]">backdrop-blur-sm</code></C>
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
