import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, X, PartyPopper } from 'lucide-react';

/**
 * Dismissible "getting started" checklist. State lives in localStorage,
 * not Firestore - this is a soft onboarding nudge, not a tracked/enforced
 * requirement, so per-browser persistence is a reasonable simplification
 * (no new schema, no admin visibility into who's "done" onboarding, which
 * would be a much bigger feature than what was actually asked for).
 *
 * @param {string} storageKey - unique per checklist variant (e.g. 'cadet',
 *   'staff'), so a cadet who gets promoted to staff sees the staff list
 *   fresh instead of inheriting the cadet list's dismissed/checked state.
 * @param {string} title
 * @param {{id, label, description, link, linkText}[]} items
 */
const OnboardingChecklist = ({ storageKey, title, items }) => {
  const dismissedKey = `onboarding-${storageKey}-dismissed`;
  const checkedKey = `onboarding-${storageKey}-checked`;

  const [dismissed, setDismissed] = useState(true); // default true avoids a flash before the effect below reads localStorage
  const [checked, setChecked] = useState([]);

  useEffect(() => {
    setDismissed(localStorage.getItem(dismissedKey) === 'true');
    try {
      setChecked(JSON.parse(localStorage.getItem(checkedKey) || '[]'));
    } catch {
      setChecked([]);
    }
  }, [dismissedKey, checkedKey]);

  if (dismissed) return null;

  const toggleItem = (id) => {
    const next = checked.includes(id) ? checked.filter((c) => c !== id) : [...checked, id];
    setChecked(next);
    localStorage.setItem(checkedKey, JSON.stringify(next));
  };

  const dismiss = () => {
    localStorage.setItem(dismissedKey, 'true');
    setDismissed(true);
  };

  const allDone = items.every((item) => checked.includes(item.id));

  return (
    <div className="mb-8 bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-3xl p-8 shadow-sm relative transition-colors">
      <button
        onClick={dismiss}
        title="Hide this checklist"
        className="absolute top-6 right-6 text-slate-300 dark:text-slate-600 hover:text-slate-500 dark:hover:text-slate-400 transition-colors"
      >
        <X size={18} />
      </button>

      {allDone ? (
        <div className="flex items-center gap-3">
          <PartyPopper className="text-yellow-500 shrink-0" size={24} />
          <div>
            <h3 className="font-black uppercase italic text-lg text-slate-900 dark:text-white">You're all set</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Nice work getting through the checklist. This card won't show again once dismissed.</p>
          </div>
        </div>
      ) : (
        <>
          <h3 className="font-black uppercase italic text-lg text-slate-900 dark:text-white mb-1">{title}</h3>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">
            {checked.length} of {items.length} complete
          </p>
          <div className="space-y-3">
            {items.map((item) => {
              const isChecked = checked.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors ${
                    isChecked
                      ? 'bg-slate-50 dark:bg-white/5 border-transparent'
                      : 'bg-blue-50/40 dark:bg-transparent border-blue-100 dark:border-white/5'
                  }`}
                >
                  <button onClick={() => toggleItem(item.id)} className="shrink-0" title={isChecked ? 'Mark as not done' : 'Mark as done'}>
                    {isChecked ? (
                      <CheckCircle2 className="text-yellow-500" size={22} />
                    ) : (
                      <Circle className="text-slate-300 dark:text-slate-600" size={22} />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${isChecked ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-200'}`}>
                      {item.label}
                    </p>
                    {item.description && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{item.description}</p>
                    )}
                  </div>
                  {item.link && (
                    <Link
                      to={item.link}
                      className="shrink-0 text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-500 hover:underline whitespace-nowrap"
                    >
                      {item.linkText || 'Go'} →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default OnboardingChecklist;
