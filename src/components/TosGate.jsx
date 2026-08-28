// src/components/TosGate.jsx
//
// Full-screen Terms of Service + Privacy Policy acceptance wall.
// Rendered by ProtectedRoute over any page when userData.tosAccepted !== true.
// Cannot be dismissed — user must agree before gaining any portal access.
//
// On agree: writes { tosAccepted: true, tosAcceptedAt, tosVersion } to
//   Firestore /users/{uid}. The ProtectedRoute re-reads userData via the
//   live onSnapshot in useAuth, so the wall disappears automatically.

import React, { useState, useRef, useEffect } from 'react';
import { db, auth } from '../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Shield, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';

// Increment this string whenever the TOS materially changes to force re-acceptance.
export const CURRENT_TOS_VERSION = '1.0';

const TosGate = ({ userData }) => {
  const [checkedTos,     setCheckedTos]     = useState(false);
  const [checkedPrivacy, setCheckedPrivacy] = useState(false);
  const [saving,         setSaving]         = useState(false);
  const [scrolledFar,    setScrolledFar]    = useState(false);
  const scrollRef = useRef(null);

  // Detect when the user has scrolled far enough into the TOS body
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const pct = el.scrollTop / (el.scrollHeight - el.clientHeight);
    if (pct >= 0.85) setScrolledFar(true);
  };

  // Block Escape key — gate cannot be dismissed
  useEffect(() => {
    const block = (e) => { if (e.key === 'Escape') e.preventDefault(); };
    window.addEventListener('keydown', block, true);
    return () => window.removeEventListener('keydown', block, true);
  }, []);

  const canAgree = checkedTos && checkedPrivacy && scrolledFar;

  const handleAgree = async () => {
    if (!canAgree) return;
    setSaving(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('Not authenticated');
      await updateDoc(doc(db, 'users', uid), {
        tosAccepted:    true,
        tosAcceptedAt:  serverTimestamp(),
        tosVersion:     CURRENT_TOS_VERSION,
      });
      // useAuth's onSnapshot will update userData and the gate will unmount.
    } catch (err) {
      console.error('TOS accept error:', err);
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/95 backdrop-blur-sm p-4"
      // Prevent click-outside dismissal — intentionally no onClick handler
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* ── Header ── */}
        <div className="px-8 pt-8 pb-5 border-b border-white/5 shrink-0">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-yellow-500/10 rounded-xl">
              <Shield size={20} className="text-yellow-500" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-yellow-500">
                PBHS JROTC Command Portal
              </p>
              <h2 className="text-lg font-black uppercase italic tracking-tight text-white leading-none mt-0.5">
                Terms of Use & Privacy Policy
              </h2>
            </div>
          </div>
          <div className="flex items-start gap-2.5 bg-yellow-500/8 border border-yellow-500/20 rounded-xl px-4 py-3">
            <AlertTriangle size={13} className="text-yellow-500 shrink-0 mt-0.5" />
            <p className="text-[11px] font-bold text-yellow-200/80 leading-relaxed">
              You must read and agree to these terms before accessing the portal.
              This is a restricted system — scroll to the bottom, then check both boxes.
            </p>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-8 py-6 space-y-6 text-sm text-slate-300 leading-relaxed"
        >
          {/* Section 1 */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-yellow-500 mb-3">
              1 — Restricted Access
            </h3>
            <p className="mb-3">
              The PBHS JROTC Command Portal (<strong className="text-white">"the Portal"</strong>) is a
              restricted system maintained exclusively for authorized PBHS JROTC personnel — cadets,
              company leadership, staff, and instructors. Access is granted on an individual basis and
              may be revoked at any time.
            </p>
            <p>
              By logging in, you confirm that you are the authorized account holder and that you have
              been approved by an instructor or unit administrator to use this system. <strong className="text-white">
              Unauthorized access attempts are a violation of school policy and may be referred for
              disciplinary action.</strong>
            </p>
          </section>

          {/* Section 2 */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-yellow-500 mb-3">
              2 — Credential Security
            </h3>
            <p className="mb-3">
              Your login credentials (Google account email, password, and two-factor authentication)
              are <strong className="text-white">yours alone.</strong> You are responsible for all
              activity that occurs under your account.
            </p>
            <ul className="space-y-2 pl-4">
              {[
                'Never share your password or allow anyone else to use your account.',
                'Do not log in on public or shared computers without signing out fully when finished.',
                'If you believe your account has been compromised, notify an instructor immediately.',
                'Treat this system the same way you treat Canvas or Focus Student Portal — your credentials are personal and non-transferable.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-yellow-500 font-black mt-0.5 shrink-0">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 3 */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-yellow-500 mb-3">
              3 — Confidentiality of Cadet Information
            </h3>
            <p className="mb-3">
              The Portal contains personally identifiable information (PII) including but not limited
              to: cadet names, ranks, contact details, academic and grade-related records, uniform
              sizes, fundraiser participation, and disciplinary or performance data.
            </p>
            <p className="mb-3">
              <strong className="text-white">You must not share this information outside the Portal</strong>,
              in any form, with anyone who is not an authorized user. This includes:
            </p>
            <ul className="space-y-2 pl-4">
              {[
                'Forwarding, copying, or discussing cadet records in group chats, social media, or other platforms.',
                'Taking and sharing screenshots or screen recordings of any Portal page that contains cadet names, scores, ranks, or other personal data.',
                'Discussing Promotion Board results, fundraiser figures, or honor company standings in public forums.',
                'Sharing uniform sizes, physical fitness scores, or any other health-adjacent data.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-yellow-500 font-black mt-0.5 shrink-0">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3">
              Violations of cadet data confidentiality may constitute a breach of FERPA (Family
              Educational Rights and Privacy Act) and will be treated accordingly by school
              administration.
            </p>
          </section>

          {/* Section 4 */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-yellow-500 mb-3">
              4 — Acceptable Use
            </h3>
            <p className="mb-3">You agree to use the Portal only for its intended purposes:</p>
            <ul className="space-y-2 pl-4">
              {[
                'Managing battalion operations, rosters, and logistics relevant to your assigned role.',
                'Communicating official orders and tasks within the chain of command.',
                'Tracking fundraiser progress, cadet challenge records, uniform sizes, and related data in your area of responsibility.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-yellow-500 font-black mt-0.5 shrink-0">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 mb-2">
              <strong className="text-white">The following are strictly prohibited:</strong>
            </p>
            <ul className="space-y-2 pl-4">
              {[
                'Attempting to access pages, data, or accounts beyond your authorized role.',
                'Submitting false or misleading information (roster entries, scores, logs, orders).',
                'Attempting to circumvent access controls, authentication, or security features.',
                'Using the Portal to harass, defame, or embarrass any cadet or staff member.',
                'Any activity that could disrupt portal availability or compromise data integrity.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-red-400 font-black mt-0.5 shrink-0">✕</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 5 */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-yellow-500 mb-3">
              5 — Privacy Policy Summary
            </h3>
            <p className="mb-3">
              The Portal collects and stores information you enter or generate through your use of
              the system, including: your name, email address, role, login timestamps, actions taken
              within the Portal (audit logs), and any cadet data you input.
            </p>
            <ul className="space-y-2 pl-4">
              {[
                'Data is stored in Firebase (Google Cloud) and is not sold or shared with third parties.',
                'Audit logs record significant actions (create, edit, delete) for accountability and may be reviewed by instructors.',
                'You may request a copy of your data or its deletion by contacting a unit instructor.',
                'The Portal uses Google Sign-In and Firebase Authentication. Your Google account\'s own privacy policy applies to that authentication step.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-yellow-500 font-black mt-0.5 shrink-0">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 6 */}
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-yellow-500 mb-3">
              6 — Consequences of Violation
            </h3>
            <p className="mb-2">
              Violations of these terms may result in any or all of the following:
            </p>
            <ul className="space-y-2 pl-4">
              {[
                'Immediate suspension or permanent revocation of portal access.',
                'Referral to school administration for disciplinary action under the student code of conduct.',
                'Referral to the battalion chain of command for JROTC-related disciplinary proceedings.',
                'For violations involving protected student data (FERPA), referral to the district or relevant authorities.',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="text-yellow-500 font-black mt-0.5 shrink-0">·</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Section 7 */}
          <section className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-yellow-500 mb-2">
              7 — Acknowledgment
            </h3>
            <p>
              By clicking <strong className="text-white">"I Agree"</strong> below, you acknowledge
              that you have read and understood these terms, that you are an authorized user of this
              system, and that you agree to comply with all policies stated above. Your agreement is
              recorded with a timestamp and associated with your account.
            </p>
            <p className="mt-3 text-[11px] text-slate-500">
              Last updated: August 2026 · Version {CURRENT_TOS_VERSION} ·{' '}
              Logged-in as: <span className="text-slate-400">{userData?.fullName || auth.currentUser?.email}</span>
            </p>
          </section>
        </div>

        {/* ── Footer: checkboxes + button ── */}
        <div className="px-8 py-6 border-t border-white/5 shrink-0 space-y-4">

          {!scrolledFar && (
            <p className="text-[11px] text-slate-500 font-bold text-center">
              ↓ Scroll to the bottom to enable agreement
            </p>
          )}

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={checkedTos}
                onChange={e => setCheckedTos(e.target.checked)}
                disabled={!scrolledFar}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                checkedTos
                  ? 'bg-yellow-500 border-yellow-500'
                  : scrolledFar
                    ? 'border-slate-500 group-hover:border-yellow-500/60'
                    : 'border-slate-700 opacity-40 cursor-not-allowed'
              }`}>
                {checkedTos && <CheckCircle2 size={10} className="text-slate-950" />}
              </div>
            </div>
            <span className={`text-xs leading-relaxed ${scrolledFar ? 'text-slate-300' : 'text-slate-600'}`}>
              I have read and agree to the <strong className="text-white">Terms of Use</strong> — I understand
              this is a restricted system, I will not share cadet information or screenshots, and I will not
              share my login credentials with anyone.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer group">
            <div className="mt-0.5 shrink-0">
              <input
                type="checkbox"
                checked={checkedPrivacy}
                onChange={e => setCheckedPrivacy(e.target.checked)}
                disabled={!scrolledFar}
                className="sr-only"
              />
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                checkedPrivacy
                  ? 'bg-yellow-500 border-yellow-500'
                  : scrolledFar
                    ? 'border-slate-500 group-hover:border-yellow-500/60'
                    : 'border-slate-700 opacity-40 cursor-not-allowed'
              }`}>
                {checkedPrivacy && <CheckCircle2 size={10} className="text-slate-950" />}
              </div>
            </div>
            <span className={`text-xs leading-relaxed ${scrolledFar ? 'text-slate-300' : 'text-slate-600'}`}>
              I acknowledge the <strong className="text-white">Privacy Policy</strong> — I understand
              how my data is stored, that my actions are logged, and that I am responsible for data
              I enter into this system.
            </span>
          </label>

          <button
            onClick={handleAgree}
            disabled={!canAgree || saving}
            className="w-full py-3.5 rounded-2xl text-sm font-black uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-yellow-500 hover:bg-yellow-400 text-slate-950 shadow-lg shadow-yellow-500/20 flex items-center justify-center gap-2"
          >
            {saving
              ? <><Loader2 size={14} className="animate-spin" /> Recording agreement…</>
              : <><Shield size={14} /> I Agree — Enter the Portal</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default TosGate;
