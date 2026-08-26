// src/components/BulletListEditor.jsx
//
// Two-level interactive bullet list used in Meeting Logs and AAR Logs.
//
// DATA MODEL
//   BulletItem = { text: string, children: string[] }
//   The component receives and emits BulletItem[].
//
// BACKWARD COMPATIBILITY
//   Old Firestore documents store plain string[].  Pass them in as-is —
//   normalizeBullets() converts each string to { text, children: [] } on
//   the way in.  On the first save the document is silently upgraded to
//   the new format.
//
// EXPORTS
//   default          BulletListEditor component
//   normalizeBullets (string | BulletItem)[] → BulletItem[]
//   flattenBullets   BulletItem[]            → string[]   (for external sinks)

import React, { useState } from 'react';
import { ChevronUp, ChevronDown, X, CornerDownRight } from 'lucide-react';

// ── Utilities ─────────────────────────────────────────────────────────────────

export function normalizeBullets(items) {
  if (!items?.length) return [];
  return items.map(item =>
    typeof item === 'string'
      ? { text: item, children: [] }
      : { text: item.text || '', children: item.children || [] }
  );
}

// Flatten for external sinks (e.g. Google Sheets).
// Sub-items are prefixed with two spaces to preserve visual indentation.
export function flattenBullets(items) {
  const out = [];
  for (const item of normalizeBullets(items)) {
    out.push(item.text);
    for (const child of item.children) {
      out.push('  ' + child);
    }
  }
  return out;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BulletListEditor({ items, onChange, placeholder, readOnly, color = 'yellow' }) {
  const [draft,       setDraft]       = useState('');
  const [subDraftIdx, setSubDraftIdx] = useState(null); // index of top-level item whose sub-input is open
  const [subDraft,    setSubDraft]    = useState('');

  const normalized = normalizeBullets(items);

  const dotColor    = color === 'green' ? 'text-emerald-500'    : 'text-yellow-500';
  const subDotColor = color === 'green' ? 'text-emerald-400/60' : 'text-yellow-400/50';

  // ── Top-level item operations ──────────────────────────────────────────────
  const addItem = () => {
    const t = draft.trim();
    if (!t) return;
    onChange([...normalized, { text: t, children: [] }]);
    setDraft('');
  };

  const removeItem = (i) => {
    onChange(normalized.filter((_, idx) => idx !== i));
    if (subDraftIdx === i) { setSubDraftIdx(null); setSubDraft(''); }
  };

  const moveUp = (i) => {
    if (i === 0) return;
    const next = [...normalized];
    [next[i - 1], next[i]] = [next[i], next[i - 1]];
    onChange(next);
  };

  const moveDown = (i) => {
    if (i === normalized.length - 1) return;
    const next = [...normalized];
    [next[i], next[i + 1]] = [next[i + 1], next[i]];
    onChange(next);
  };

  // ── Sub-item operations ────────────────────────────────────────────────────
  const addSub = (i) => {
    const t = subDraft.trim();
    if (!t) return;
    const next = normalized.map((item, idx) =>
      idx === i ? { ...item, children: [...item.children, t] } : item
    );
    onChange(next);
    setSubDraft(''); // keep sub-input open for consecutive entries
  };

  const removeSub = (i, j) => {
    const next = normalized.map((item, idx) =>
      idx === i
        ? { ...item, children: item.children.filter((_, cidx) => cidx !== j) }
        : item
    );
    onChange(next);
  };

  // ── Read-only view ─────────────────────────────────────────────────────────
  if (readOnly) {
    if (!normalized.length) {
      return <span className="text-slate-300 dark:text-slate-600 text-sm">—</span>;
    }
    return (
      <ul className="space-y-2">
        {normalized.map((item, i) => (
          <li key={i}>
            <div className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <span className={`${dotColor} shrink-0 mt-0.5 font-bold`}>•</span>
              <span className="leading-snug">{item.text}</span>
            </div>
            {item.children?.length > 0 && (
              <ul className="ml-5 mt-1 space-y-1">
                {item.children.map((child, j) => (
                  <li key={j} className="flex items-start gap-2 text-[13px] text-slate-600 dark:text-slate-400">
                    <span className={`${subDotColor} shrink-0 mt-0.5 text-xs`}>◦</span>
                    <span className="leading-snug">{child}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    );
  }

  // ── Edit view ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-2">
      {normalized.map((item, i) => (
        <div key={i} className="group">

          {/* ── Top-level row ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            <span className={`${dotColor} shrink-0 font-bold text-sm leading-none mt-0.5`}>•</span>
            <p className="flex-1 text-sm text-slate-800 dark:text-slate-200 py-1 leading-snug">{item.text}</p>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <button
                onClick={() => moveUp(i)}
                disabled={i === 0}
                className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 disabled:opacity-20 transition-colors"
                title="Move up"
              >
                <ChevronUp size={12} />
              </button>
              <button
                onClick={() => moveDown(i)}
                disabled={i === normalized.length - 1}
                className="text-slate-300 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 disabled:opacity-20 transition-colors"
                title="Move down"
              >
                <ChevronDown size={12} />
              </button>
              <button
                onClick={() => {
                  if (subDraftIdx === i) { setSubDraftIdx(null); setSubDraft(''); }
                  else { setSubDraftIdx(i); setSubDraft(''); }
                }}
                className="text-slate-300 hover:text-yellow-500 dark:text-slate-600 dark:hover:text-yellow-400 transition-colors"
                title="Add sub-item"
              >
                <CornerDownRight size={12} />
              </button>
              <button
                onClick={() => removeItem(i)}
                className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-colors"
                title="Remove"
              >
                <X size={12} />
              </button>
            </div>
          </div>

          {/* ── Sub-items ──────────────────────────────────────────────────── */}
          {(item.children?.length > 0 || subDraftIdx === i) && (
            <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-100 dark:border-white/5 pl-3">

              {/* Existing sub-items */}
              {item.children.map((child, j) => (
                <div key={j} className="flex items-center gap-2 group/sub">
                  <span className={`${subDotColor} shrink-0 text-xs leading-none mt-0.5`}>◦</span>
                  <p className="flex-1 text-[13px] text-slate-700 dark:text-slate-300 py-0.5 leading-snug">{child}</p>
                  <button
                    onClick={() => removeSub(i, j)}
                    className="opacity-0 group-hover/sub:opacity-100 text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-all shrink-0"
                    title="Remove sub-item"
                  >
                    <X size={11} />
                  </button>
                </div>
              ))}

              {/* New sub-item input */}
              {subDraftIdx === i && (
                <div className="flex items-center gap-2 mt-1">
                  <span className={`${subDotColor} shrink-0 text-xs`}>◦</span>
                  <input
                    autoFocus
                    value={subDraft}
                    onChange={e => setSubDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter')  { e.preventDefault(); addSub(i); }
                      if (e.key === 'Escape') { setSubDraftIdx(null); setSubDraft(''); }
                    }}
                    placeholder="Sub-item… (Enter to add, Esc to close)"
                    className="flex-1 bg-blue-50/50 dark:bg-slate-800 border border-blue-100 dark:border-white/5 rounded-lg px-3 py-1.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-yellow-500/40 transition-colors"
                  />
                  <button
                    onClick={() => addSub(i)}
                    disabled={!subDraft.trim()}
                    className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 hover:bg-yellow-500 hover:text-slate-950 disabled:opacity-30 transition-all whitespace-nowrap"
                  >
                    + Add
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* New top-level item input */}
      <div className="flex gap-2 mt-1">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
          placeholder={placeholder}
          className="flex-1 bg-blue-50/50 dark:bg-slate-800 border border-blue-100 dark:border-white/5 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-yellow-500/40 transition-colors"
        />
        <button
          onClick={addItem}
          disabled={!draft.trim()}
          className="text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-lg bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 hover:bg-yellow-500 hover:text-slate-950 disabled:opacity-30 transition-all whitespace-nowrap"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
