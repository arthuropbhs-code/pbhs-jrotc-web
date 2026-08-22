// src/pages/AdminChangelog.jsx
//
// Portal version history — read-only, accessible to all authenticated users.
// Hardcoded data derived from git log; update this file when new versions ship.

import React from 'react';
import { Tag } from 'lucide-react';
import AdminPageHeader from '../components/AdminPageHeader';
import { usePageMeta } from '../hooks/usePageMeta';

// ── Tag chips ─────────────────────────────────────────────────────────────────
const CHIP_STYLES = {
  feat:  'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400',
  fix:   'bg-blue-100   dark:bg-blue-950/60    text-blue-700   dark:text-blue-400',
  sec:   'bg-rose-100   dark:bg-rose-950/60    text-rose-700   dark:text-rose-400',
  perf:  'bg-orange-100 dark:bg-orange-950/60  text-orange-700 dark:text-orange-400',
  law:   'bg-purple-100 dark:bg-purple-950/60  text-purple-700 dark:text-purple-400',
};

const CHIP_LABELS = {
  feat: 'Feature',
  fix:  'Fix',
  sec:  'Security',
  perf: 'Perf',
  law:  'Compliance',
};

const Chip = ({ type }) => (
  <span className={`inline-flex items-center shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${CHIP_STYLES[type]}`}>
    {CHIP_LABELS[type]}
  </span>
);

const Change = ({ type, children }) => (
  <li className="flex items-baseline gap-2.5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
    <Chip type={type} />
    <span>{children}</span>
  </li>
);

// ── Version card ──────────────────────────────────────────────────────────────
const VersionCard = ({ version, title, date, subtitle, isCurrent, isMajor, changes }) => (
  <div className="grid grid-cols-[72px_20px_1fr] gap-x-4 relative">
    {/* Connector line */}
    <div
      className="absolute top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-white/5"
      style={{ left: 'calc(72px + 16px + 10px)', transform: 'translateX(-50%)' }}
    />

    {/* Version label */}
    <div className="pt-5 text-right">
      {isCurrent ? (
        <span className="inline-block bg-yellow-500 text-slate-950 text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
          {version}
        </span>
      ) : (
        <span className="text-[12px] font-black text-slate-400 dark:text-slate-500">{version}</span>
      )}
    </div>

    {/* Dot */}
    <div className="flex flex-col items-center relative z-10">
      <div className={`mt-[22px] rounded-full flex-shrink-0 ${
        isCurrent
          ? 'w-5 h-5 bg-yellow-500 ring-4 ring-yellow-500/20'
          : isMajor
          ? 'w-5 h-5 bg-yellow-500'
          : 'w-4 h-4 bg-white dark:bg-slate-900 border-2 border-yellow-500'
      }`} />
    </div>

    {/* Card */}
    <div className={`mb-5 mt-3 rounded-2xl border p-5 ${
      isMajor || isCurrent
        ? 'bg-white dark:bg-slate-900/60 border-yellow-500/30'
        : 'bg-white dark:bg-slate-900/40 border-slate-200 dark:border-white/5'
    }`}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
        <h3 className="text-base font-black uppercase italic tracking-tight text-slate-900 dark:text-white">
          {title}
        </h3>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 pt-0.5 whitespace-nowrap">
          {date}
        </span>
      </div>

      {subtitle && (
        isMajor ? (
          <span className="inline-block mb-3 text-[10px] font-black uppercase tracking-wider text-yellow-600 dark:text-yellow-500 bg-yellow-50 dark:bg-yellow-500/10 px-2.5 py-1 rounded-lg">
            ⚡ {subtitle}
          </span>
        ) : (
          <p className="text-xs italic text-slate-400 dark:text-slate-500 mb-3">{subtitle}</p>
        )
      )}

      <ul className="space-y-2 mt-2">
        {changes}
      </ul>
    </div>
  </div>
);

// ── Stat tile ─────────────────────────────────────────────────────────────────
const Stat = ({ value, label }) => (
  <div className="flex-1 min-w-[90px] text-center px-4 py-3 border-r border-slate-200 dark:border-white/5 last:border-r-0">
    <p className="text-2xl font-black italic text-yellow-500">{value}</p>
    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mt-0.5">{label}</p>
  </div>
);

// ── Legend ────────────────────────────────────────────────────────────────────
const Legend = () => (
  <div className="flex items-center gap-2 flex-wrap text-[10px]">
    <span className="font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-1">Key:</span>
    {Object.keys(CHIP_STYLES).map(t => <Chip key={t} type={t} />)}
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────
const AdminChangelog = () => {
  usePageMeta({
    title: 'Version History',
    description: 'Command Portal release history.',
    path: '/admin/changelog',
  });

  return (
    <div className="max-w-3xl">
      <AdminPageHeader
        icon={Tag}
        title="Version History"
        meta="All releases for the PBHS JROTC Command Portal, from first commit to now."
      />

      {/* Stats bar */}
      <div className="flex flex-wrap mb-8 rounded-2xl border border-slate-200 dark:border-white/5 bg-white dark:bg-slate-900/40 overflow-hidden">
        <Stat value="10"     label="Releases"    />
        <Stat value="140+"   label="Commits"     />
        <Stat value="22"     label="Role Levels" />
        <Stat value="208d"   label="In Dev"      />
        <Stat value="v1.6"   label="Current"     />
      </div>

      {/* Legend */}
      <div className="mb-8">
        <Legend />
      </div>

      {/* Timeline */}
      <div className="relative">

        <VersionCard
          version="v0.1" title="Foundation" date="Jan 26, 2026"
          subtitle="Project bootstrapped. Firebase wired in."
          changes={<>
            <Change type="feat">React + Vite SPA scaffold</Change>
            <Change type="feat">Firebase project initialized — Auth, Firestore, Storage</Change>
            <Change type="sec">Firebase config moved to environment variables, .gitignore updated</Change>
          </>}
        />

        <VersionCard
          version="v0.2" title="Public Site & Portraits" date="Jan 29 – Feb 17, 2026"
          subtitle="First public-facing pages. Command portraits go live."
          changes={<>
            <Change type="feat">Leadership portrait photos added to command page</Change>
            <Change type="feat">About page created</Change>
            <Change type="feat">Admin portal scaffolded for dev testing</Change>
            <Change type="fix">Announcements/Orders split with auto-expiry; active-link nav logic corrected</Change>
            <Change type="perf">Images converted from JPEG → WebP</Change>
          </>}
        />

        <VersionCard
          version="v0.3" title="Leadership Page & Routing" date="Jun 14 – 25, 2026"
          subtitle="Leadership page rebuilt with live CMS. Mobile nav lands."
          changes={<>
            <Change type="feat">Leadership page rebuilt — DC position removed, XO/CSM layout realigned</Change>
            <Change type="feat">Decap CMS backend for managing leadership entries without code changes</Change>
            <Change type="feat">Company leadership rosters fully editable via CMS dropdown</Change>
            <Change type="feat">Mobile navigation bar added</Change>
            <Change type="feat">"Meet the Top 3" homepage section binds live to CMS data</Change>
            <Change type="fix">Vercel SPA routing configured — direct links no longer 404</Change>
            <Change type="fix">Firebase initialization crash guard added</Change>
          </>}
        />

        <VersionCard
          version="v1.0" title="Admin Portal Launch" date="Jul 30 – Aug 1, 2026"
          subtitle="Full Rebuild — CMS replaced with Firestore-backed admin portal"
          isMajor
          changes={<>
            <Change type="feat"><strong>22-role access hierarchy</strong> (Cadet → Battalion Commander → Instructor)</Change>
            <Change type="feat">Manage Personnel: role/company editing, password reset, account suspend/delete</Change>
            <Change type="feat">Custom EmailJS transactional emails — password reset, email-change notification, uniform issuance</Change>
            <Change type="feat">Password reset cooldown timer; rate-limit error shown as active countdown</Change>
            <Change type="feat">Signup approval workflow with battalion access-code gate</Change>
            <Change type="feat">Firebase Analytics (GA4) with consent-gated loading</Change>
            <Change type="feat">Role-scoped access for rosters, orders, and uniform requests</Change>
            <Change type="feat">Documents & Regulations library; YouTube footer link</Change>
            <Change type="feat">Privacy Policy and Terms of Service pages</Change>
            <Change type="sec">reCAPTCHA v2 on signup</Change>
            <Change type="sec">Session-only persistence — browser/tab close logs user out</Change>
            <Change type="sec">Login-email changes notify both old and new address</Change>
            <Change type="fix">Self-registration flow corrected (was silently broken under Firestore rules)</Change>
            <Change type="fix">Serverless function rewritten as ESM; firebase-admin replaced with REST + JWT</Change>
          </>}
        />

        <VersionCard
          version="v1.1" title="Security & 2FA" date="Aug 11, 2026"
          subtitle="Staff accounts hardened. Cadet Challenge and inspections go live."
          changes={<>
            <Change type="sec">Two-factor authentication (SMS) for staff-level accounts</Change>
            <Change type="sec">Session soft-lock with "Remember this device" to reduce SMS prompts</Change>
            <Change type="feat">Cadet Challenge score tracking (per cadet, per cycle)</Change>
            <Change type="feat">S2 Inspections page</Change>
            <Change type="feat">S6 Technology Checklist</Change>
            <Change type="feat">PDF document uploads via Firebase Storage (up to 25 MB)</Change>
            <Change type="feat">S1 Assistants get full CRUD on company roster</Change>
            <Change type="feat">Approved accounts auto-added to battalion roster</Change>
            <Change type="feat">Battalion cross-company Cadet Challenge support</Change>
            <Change type="fix">Login loop on stale session state resolved</Change>
            <Change type="fix">Session lock 32-bit setTimeout overflow fix</Change>
          </>}
        />

        <VersionCard
          version="v1.2" title="Programs & Logistics" date="Aug 12 – 13, 2026"
          subtitle="Fallen Heroes Fundraiser, Uniform Sizes, and a permissions overhaul."
          changes={<>
            <Change type="feat"><strong>Fundraiser Tracking</strong> — Fallen Heroes flag program with weekly progress and soft-delete/void</Change>
            <Change type="feat">Uniform Sizes admin page (S4 logistics)</Change>
            <Change type="feat">S7 Special Projects and S6 Technology scoped access controls</Change>
            <Change type="feat">Personal views for Fundraiser, Cadet Challenge, and Uniform Sizes (cadet self-service)</Change>
            <Change type="feat">Orders + Tasks combined into a single page</Change>
            <Change type="sec">Permission overhaul — sidebar links, roster search, and email notifications fully role-gated</Change>
            <Change type="sec">Route protection enforced on all admin pages</Change>
            <Change type="fix">S4 email notification sent on uniform issuance</Change>
            <Change type="fix">Fundraiser void permission fixed for company command</Change>
            <Change type="fix">Battalion S1 sees all of Zulu Company by default</Change>
          </>}
        />

        <VersionCard
          version="v1.3" title="Command Intelligence" date="Aug 14 – 17, 2026"
          subtitle="S1 tools mature: turn-in tracking, promotion boards, and meeting logs."
          changes={<>
            <Change type="feat">S1 Tracker — form turn-in status tracked per cadet</Change>
            <Change type="feat">Promotion Board — score submission by XOs, reviewed by S1 staff</Change>
            <Change type="feat">Meeting Logs with Google Sheets sync for external archival</Change>
            <Change type="feat">Route-level auto-dismiss for checklists; role-scoped onboarding items</Change>
            <Change type="sec">SGM, BC, and CSM restricted from admin configuration tools</Change>
          </>}
        />

        <VersionCard
          version="v1.4" title="Calendar & Public Features" date="Aug 19, 2026"
          subtitle="A public-facing calendar, Honor Company leaderboard, and Feedback Hub."
          changes={<>
            <Change type="feat"><strong>Admin calendar events</strong> — date ranges, colors, and categories</Change>
            <Change type="feat"><strong>Public Events Calendar</strong> with Blue/Gold school-day overlay and category filter bar</Change>
            <Change type="feat">Day-cell hover tooltip and click-to-expand event modal</Change>
            <Change type="feat"><strong>Honor Company</strong> leaderboard — live, company-scoped rankings</Change>
            <Change type="feat">Feedback Hub for staff</Change>
            <Change type="feat">Fundraiser progress chart (visual graph view)</Change>
            <Change type="feat"><code className="font-mono text-[11px] bg-slate-100 dark:bg-white/10 px-1 rounded">company_master_sergeant</code> role added to hierarchy</Change>
            <Change type="feat">Admin sidebar reorganized: Command / Personnel / Programs / Publishing</Change>
            <Change type="fix">Mobile-responsive admin sidebar for iPhone</Change>
            <Change type="fix">Calendar event form focus-stealing bug resolved</Change>
            <Change type="fix">Blue/Gold day count: Fridays correctly excluded as non-school days</Change>
          </>}
        />

        <VersionCard
          version="v1.5" title="Logistics & Performance" date="Aug 20, 2026"
          subtitle="Supply Requests, Cadet History, Firestore rule enforcement, and a performance pass."
          changes={<>
            <Change type="feat">Supply Requests page (S4 logistics module)</Change>
            <Change type="feat">Cadet History archive</Change>
            <Change type="feat">S1 board unlock controls; fundraiser roster-level goals</Change>
            <Change type="feat">Supply "Other" category</Change>
            <Change type="sec"><strong>Firestore security rules</strong> enforced at database level for 7 collections</Change>
            <Change type="perf">Framer Motion replaced with CSS keyframes — smaller JS bundle</Change>
            <Change type="perf"><code className="font-mono text-[11px] bg-slate-100 dark:bg-white/10 px-1 rounded">backdrop-blur</code> removed from all modals — significant GPU savings on mobile</Change>
            <Change type="fix">Past calendar events now display correctly</Change>
          </>}
        />

        <VersionCard
          version="v1.6" title="Privacy & Compliance" date="Aug 22, 2026"
          subtitle="Legal compliance update across policy, code, and data handling."
          isCurrent
          changes={<>
            <Change type="law">Privacy Policy rewritten — Florida Student Data Privacy Act (§ 1002.222, F.S.), FERPA, and COPPA; all collected data types listed</Change>
            <Change type="law">Terms of Service updated — BCPS Code of Conduct, JROTC SOP compliance, cadet data non-disclosure, scope-access bullet, 2FA requirement formalized</Change>
            <Change type="feat"><strong>My Records</strong> — self-service view of fundraiser total, Cadet Challenge scores, and uniform sizes in My Profile</Change>
            <Change type="sec">Account deletion triggers cascade cleanup — roster entry unlinked, uniform size records purged</Change>
            <Change type="sec">Google Analytics excluded from all <code className="font-mono text-[11px] bg-slate-100 dark:bg-white/10 px-1 rounded">/admin/*</code> routes</Change>
            <Change type="sec">GA <code className="font-mono text-[11px] bg-slate-100 dark:bg-white/10 px-1 rounded">send_page_view</code> disabled — no tracking data sent before cookie consent</Change>
            <Change type="fix">Build error: <code className="font-mono text-[11px] bg-slate-100 dark:bg-white/10 px-1 rounded">await</code> removed from non-async analytics callback in <code className="font-mono text-[11px] bg-slate-100 dark:bg-white/10 px-1 rounded">firebase.js</code></Change>
          </>}
        />

      </div>

      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-300 dark:text-slate-600 text-center mt-2 pb-8">
        Repository: pompano-jrotc/pbhs-jrotc-web · Deployed via Vercel
      </p>
    </div>
  );
};

export default AdminChangelog;
