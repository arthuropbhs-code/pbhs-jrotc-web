import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Cookie } from 'lucide-react';
import { CONSENT_KEY, enableAnalytics } from '../firebase';

// Analytics (see firebase.js) only ever loads after Accept is clicked here,
// or on a later visit once localStorage already has CONSENT_KEY='accepted'
// from a prior visit - Decline (or just closing the tab without choosing)
// means analytics never loads at all.
const CookieConsent = () => {
  // Lazy init reads localStorage synchronously on first render, same
  // reasoning as OnboardingChecklist.jsx - no effect, no pop-in flash.
  const [dismissed, setDismissed] = useState(() => {
    try {
      return !!localStorage.getItem(CONSENT_KEY);
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  const decline = () => {
    try {
      localStorage.setItem(CONSENT_KEY, 'declined');
    } catch {
      // Ignore - see enableAnalytics()'s comment in firebase.js
    }
    setDismissed(true);
  };

  const accept = () => {
    enableAnalytics();
    setDismissed(true);
  };

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-4 sm:p-6">
      <div className="max-w-3xl mx-auto bg-slate-950 border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <Cookie className="text-yellow-500 shrink-0" size={28} />
        <p className="flex-1 text-xs text-slate-300 leading-relaxed">
          This site uses cookies for basic usage analytics. No personal data is sold or shared with advertisers.
          See our{' '}
          <Link to="/privacy" className="text-yellow-500 hover:underline font-bold">
            Privacy Policy
          </Link>{' '}
          for details.
        </p>
        <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
          <button
            onClick={decline}
            className="flex-1 sm:flex-none px-5 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-white transition-colors"
          >
            Decline
          </button>
          <button
            onClick={accept}
            className="flex-1 sm:flex-none px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest bg-yellow-500 text-slate-950 hover:bg-yellow-400 transition-all"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;
