// src/hooks/useCompanies.js
//
// Single source of truth for the battalion's company names.
// Reads `settings/companies` in Firestore in real-time so every page
// reflects a change made in AdminCompanies instantly, with no redeploy.
//
// Shape of the Firestore doc:
//   settings/companies  →  { names: ["Zulu", "Alpha", "Bravo", "Charlie", "Delta"] }
//
// Falls back to the five default names while loading or when the doc
// doesn't exist yet (first-run / offline), so every caller is safe to
// destructure without guarding for undefined.

import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

const DEFAULT_COMPANIES = ["Zulu", "Alpha", "Bravo", "Charlie", "Delta"];

export function useCompanies() {
  const [companies, setCompanies] = useState(DEFAULT_COMPANIES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'companies'),
      (snap) => {
        if (snap.exists()) {
          const names = snap.data()?.names;
          if (Array.isArray(names) && names.length > 0) {
            setCompanies(names);
          } else {
            setCompanies(DEFAULT_COMPANIES);
          }
        } else {
          // Doc hasn't been written yet - keep defaults
          setCompanies(DEFAULT_COMPANIES);
        }
        setLoading(false);
      },
      () => {
        // Firestore offline / permission error - keep defaults
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  // companiesWithBattalion is kept for backward compatibility with callers
  // that still reference it, but is now identical to `companies`. "Battalion"
  // is no longer appended as a separate option — Zulu (the first configured
  // company) serves as the battalion-level company. Existing records with
  // company:"Battalion" remain valid in Firestore; only new signups and edits
  // use the Firestore-configured list, where Zulu fills that role.
  const companiesWithBattalion = companies;

  return { companies, companiesWithBattalion, loading };
}
