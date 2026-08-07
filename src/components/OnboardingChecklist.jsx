import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Circle, X, PartyPopper } from 'lucide-react';

/**
 * Dismissible "getting started" checklist. State lives in localStorage,
 * not Firestore - this is a soft onboarding nudge, not a tracked/enforced
 * requirement, so per-browser persistence is a reasonable simplification
 * (no new schema, no admin visibility into who's "done" onboarding, which
 * would be a much bigger feature than what was actually asked for).
 *
 * Checking an item off removes it from the list with an exit animation
 * (rather than leaving a struck-through row behind) - the remaining items
 * use `layout` + AnimatePresence's `popLayout` mode so they slide up to
 * fill the gap instead of just snapping into place.
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

  // Lazy initializers read localStorage synchronously on first render - no
  // effect needed, and no pop-in flash where the card briefly shows (or
  // hides) before flipping to the real persisted state a render later.
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(dismissedKey) === 'true');
  const [checked, setChecked] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(checkedKey) || '[]');
    } catch {
      return [];
    }
  });

  if (dismissed) return null;

  const completeItem = (id) => {
    if (checked.includes(id)) return;
    const next = [...checked, id];
    setChecked(next);
    localStorage.setItem(checkedKey, JSON.stringify(next));
  };

  const dismiss = () => {
    localStorage.setItem(dismissedKey, 'true');
    setDismissed(true);
  };

  const remaining = items.filter((item) => !checked.includes(item.id));
  const allDone = remaining.length === 0;

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
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
          <PartyPopper className="text-yellow-500 shrink-0" size={24} />
          <div>
            <h3 className="font-black uppercase italic text-lg text-slate-900 dark:text-white">You're all set</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Nice work getting through the checklist. This card won't show again once dismissed.</p>
          </div>
        </motion.div>
      ) : (
        <>
          <h3 className="font-black uppercase italic text-lg text-slate-900 dark:text-white mb-1">{title}</h3>
          <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-6">
            {checked.length} of {items.length} complete
          </p>
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {remaining.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: 40, scale: 0.96 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="flex items-center gap-4 p-4 rounded-2xl border bg-blue-50/40 dark:bg-transparent border-blue-100 dark:border-white/5"
                >
                  <button onClick={() => completeItem(item.id)} className="shrink-0" title="Mark as done">
                    <Circle className="text-slate-300 dark:text-slate-600 hover:text-yellow-500 transition-colors" size={22} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{item.label}</p>
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
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      )}
    </div>
  );
};

export default OnboardingChecklist;
