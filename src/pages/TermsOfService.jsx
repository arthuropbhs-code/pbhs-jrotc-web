import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Scale } from 'lucide-react';

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

const TermsOfService = () => {
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
            <Scale className="text-yellow-500" size={40} /> Terms of Service
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.3em] mt-4 text-xs">
            Effective {EFFECTIVE_DATE}
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-16">

        <div className="mb-12 p-5 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          By creating an account or using this site, you agree to these terms. This site is an
          independent project built for the PBHS JROTC Tornado Battalion and is not officially operated
          by Broward County Public Schools, Pompano Beach High School, or U.S. Army Cadet Command.
        </div>

        <Section n="1" title="Who Can Use This Site">
          <p>This site is intended for cadets, instructors, and staff of the PBHS JROTC Tornado Battalion. Registration requires a battalion-issued access code and is subject to review and approval by battalion staff before full access is granted.</p>
        </Section>

        <Section n="2" title="Your Account">
          <p>You're responsible for keeping your password confidential and for all activity under your account. Provide accurate information when registering and keep your profile up to date.</p>
          <p>Don't share your login with anyone else, and don't attempt to access another cadet's account.</p>
        </Section>

        <Section n="3" title="Acceptable Use">
          <p>You agree not to:</p>
          <p>&bull; Impersonate another person or misrepresent your rank, position, or role.</p>
          <p>&bull; Submit false uniform requests or misuse any admin/logistics tool.</p>
          <p>&bull; Attempt to bypass account security features, including the CAPTCHA or approval workflow.</p>
          <p>&bull; Upload content that is inappropriate, harassing, or unrelated to battalion business.</p>
          <p>&bull; Use information available through this site (like the roster or contact information) for anything outside official battalion purposes.</p>
        </Section>

        <Section n="4" title="Content You Submit">
          <p>You're responsible for any photos, documents, or information you submit. Battalion staff may edit or remove content that violates these terms, and may correct roster information for accuracy.</p>
        </Section>

        <Section n="5" title="Suspension & Termination">
          <p>Battalion command and staff may suspend or delete an account at their discretion - for example, for a terms violation, graduation, or leaving the program. You can also delete your own account at any time from My Profile.</p>
        </Section>

        <Section n="6" title="No Warranty">
          <p>This site is provided by an independent, volunteer-built project on an "as is" and "as available" basis. We don't guarantee it will be error-free, uninterrupted, or perfectly accurate, and we're not liable for decisions made based on information found here (like task deadlines or uniform status) - always confirm anything time-sensitive with your chain of command directly.</p>
        </Section>

        <Section n="7" title="Limitation of Liability">
          <p>To the fullest extent permitted by law, the individuals who built and maintain this site aren't liable for any indirect, incidental, or consequential damages arising from your use of it.</p>
        </Section>

        <Section n="8" title="Changes to These Terms">
          <p>These terms may be updated as the site evolves. Continuing to use the site after a change means you accept the updated terms. Material changes will be reflected by updating the effective date above.</p>
        </Section>

        <Section n="9" title="Contact Us">
          <p>Questions about these terms can be sent to <a href="mailto:info@pbhsjrotc.com" className="text-yellow-500 hover:underline">info@pbhsjrotc.com</a>.</p>
        </Section>

      </div>
    </div>
  );
};

export default TermsOfService;
