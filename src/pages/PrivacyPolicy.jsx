import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

const EFFECTIVE_DATE = "August 1, 2026";

const Section = ({ n, title, children }) => (
  <section className="mb-12">
    <h2 className="text-xl font-black uppercase italic tracking-tighter mb-4 flex items-baseline gap-3">
      <span className="text-yellow-500">{n}.</span> {title}
    </h2>
    <div className="space-y-4 text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
      {children}
    </div>
  </section>
);

const PrivacyPolicy = () => {
  usePageMeta({
    title: 'Privacy Policy',
    description: 'Privacy policy for the PBHS JROTC Tornado Battalion website.',
    path: '/privacy',
  });
  return (
    <div className="min-h-screen transition-colors duration-300 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans">

      {/* Hero */}
      <div className="relative py-20 flex items-center justify-center overflow-hidden border-b border-slate-200 dark:border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-yellow-500/10 via-transparent to-transparent opacity-50" />
        <div className="z-10 text-center px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 text-xs font-black uppercase tracking-widest transition-all">
            <ArrowLeft size={14} /> Back to Command
          </Link>
          <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter flex items-center justify-center gap-4">
            <ShieldCheck className="text-yellow-500" size={40} /> Privacy Policy
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.3em] mt-4 text-xs">
            Effective {EFFECTIVE_DATE}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-16">

        <div className="mb-12 p-5 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          This site is an independent project built for the PBHS JROTC Tornado Battalion and is not
          officially operated by Broward County Public Schools, Pompano Beach High School, or U.S. Army
          Cadet Command. This policy explains what information the site collects, how it's used, and
          how to request that your information be corrected or removed.
        </div>

        <Section n="1" title="Information We Collect">
          <p><strong className="text-slate-900 dark:text-white">Account information</strong> you provide when you register: full name, email address, phone number, and password (your password is hashed by our authentication provider and is never stored or visible in plain text).</p>
          <p><strong className="text-slate-900 dark:text-white">Battalion information:</strong> rank, position, company, platoon, squad, and LET level - used to route you to the correct roster, tasks, and orders.</p>
          <p><strong className="text-slate-900 dark:text-white">Uniform and supply requests</strong> you or battalion staff submit, including items, sizes, and notes.</p>
          <p><strong className="text-slate-900 dark:text-white">Photos and documents</strong> battalion staff upload for leadership profiles, the photo gallery, or the documents library.</p>
          <p><strong className="text-slate-900 dark:text-white">Usage data</strong> collected automatically, such as general device/browser information and pages visited, through Google Analytics.</p>
        </Section>

        <Section n="2" title="How We Use Your Information">
          <p>To create and manage your account, show you the duties, orders, and announcements relevant to your role, and process uniform requests.</p>
          <p>To send account-related emails: signup confirmation, welcome notification, password reset, login-email change notices, and uniform-issuance notifications.</p>
          <p>To keep the site secure - for example, verifying you're not a bot during signup, and detecting suspicious account activity.</p>
          <p>We do not sell your information, and we do not use it for advertising.</p>
        </Section>

        <Section n="3" title="Who Can See Your Information">
          <p>Access is scoped by rank and role. In general: battalion command and staff can see the full roster; company leadership can see their own company; and cadets can see their own information and what's directly relevant to their duties (like tasks assigned to their position). Some information - like the public leadership page or photo gallery - is intentionally visible to anyone visiting the site.</p>
          <p>These role-based limits don't restrict battalion instructors and staff from accessing, using, or sharing information when necessary for a cadet's safety or welfare, or to meet legal or mandatory-reporting obligations to school officials or other authorities. See our Terms of Service for more.</p>
        </Section>

        <Section n="4" title="Third-Party Services We Use">
          <p>This site relies on a small number of outside services to operate. Each has its own privacy policy governing how they handle data on our behalf:</p>
          <p>&bull; <strong className="text-slate-900 dark:text-white">Google Firebase</strong> - account login, database storage, hosting, and analytics.</p>
          <p>&bull; <strong className="text-slate-900 dark:text-white">Vercel</strong> - website hosting.</p>
          <p>&bull; <strong className="text-slate-900 dark:text-white">Cloudinary</strong> - image and document file hosting.</p>
          <p>&bull; <strong className="text-slate-900 dark:text-white">EmailJS</strong> - sending account-related emails.</p>
          <p>&bull; <strong className="text-slate-900 dark:text-white">Google reCAPTCHA</strong> - verifying signups aren't automated/bots.</p>
        </Section>

        <Section n="5" title="Cookies & Analytics">
          <p>This site uses a small number of cookies/local storage entries required to keep you signed in for your session. It also uses Google Analytics to understand how the site is used (pages visited, general device/browser information), which sets its own cookies to do that.</p>
          <p>You can control or delete cookies through your browser's settings, and you can opt out of Google Analytics specifically using Google's <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-yellow-500 hover:underline">Analytics Opt-out Browser Add-on</a>. Blocking cookies entirely may prevent you from staying signed in.</p>
        </Section>

        <Section n="6" title="Your Choices & Account Deletion">
          <p>You can review and update most of your own information from My Profile at any time. You can also permanently delete your own account from that same page - this permanently removes your login credentials and personal profile record.</p>
          <p>Battalion records that reference your name but aren't part of your account - like past orders, uniform issuance history, or camp attendance rosters - are retained as part of the battalion's operational records and aren't automatically removed when you delete your account, since they document activity involving other cadets as well, not just you.</p>
          <p>Battalion command and staff can also suspend or delete accounts, consistent with our Terms of Service.</p>
        </Section>

        <Section n="7" title="Minors & Parental Access">
          <p>This site is used by JROTC cadets, who are generally minors. Consent for a cadet's photo, name, and personal information to be used in program materials - including this site's public leadership page and photo gallery - is obtained separately during program enrollment (DD-322), not through this website.</p>
          <p>This site is not intended for children under 13, and we do not knowingly collect personal information from anyone under 13 without verifiable parental consent. If we learn that an account was created by a child under 13 without that consent, we will remove it.</p>
          <p>If you are a parent or guardian and want to review, correct, or request deletion of your child's information on this site, contact us using the information below and we'll take care of it directly.</p>
        </Section>

        <Section n="8" title="Data Security">
          <p>We use industry-standard practices where reasonably possible - passwords are never stored in plain text, sensitive account actions require verification, and access to internal data is restricted by role. That said, no online system can be guaranteed 100% secure.</p>
          <p>If a data breach affecting your personal information occurs, we will notify affected cadets - or a parent/guardian, for cadets under 18 - as soon as reasonably possible, describing what happened and what steps are being taken.</p>
        </Section>

        <Section n="9" title="Changes to This Policy">
          <p>We may update this policy as the site changes. Material changes will be reflected by updating the effective date above.</p>
        </Section>

        <Section n="10" title="Contact Us">
          <p>Questions about this policy, or requests to review/correct/delete information, can be sent to <a href="mailto:info@pbhsjrotc.com" className="text-yellow-500 hover:underline">info@pbhsjrotc.com</a>.</p>
        </Section>

      </div>
    </div>
  );
};

export default PrivacyPolicy;
