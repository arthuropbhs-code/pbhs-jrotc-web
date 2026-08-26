// src/pages/UniformItemRequest.jsx
//
// Public page — no login required. Embeds the battalion's Google Form so any
// cadet (or parent) can submit a uniform item request directly from the site.
// Falls back to a prominent open-in-new-tab button if the browser or form
// settings block the iframe.

import React, { useState } from 'react';
import { ExternalLink, Shirt, Package, AlertCircle } from 'lucide-react';
import Footer from '../components/Footer';
import { usePageMeta } from '../hooks/usePageMeta';

// The public Google Form URL for uniform item requests.
const FORM_URL = 'https://forms.gle/bLAdMCkmkZkpinUE8';

// Item categories shown in the info grid so cadets know what they can request.
const CATEGORIES = [
  {
    label: 'Uniform Components',
    items: ['Class A Jacket (Male / Female)', 'Class B Shirt (Male / Female)', 'Male Pants · Female Pants'],
  },
  {
    label: 'OCP Gear',
    items: ['OCP Shirt · OCP Jacket', 'OCP Pants · OCP Belt'],
  },
  {
    label: 'Accoutrements',
    items: ['Ribbons & Medals', 'Arcs (Drill, Raider, etc.)', 'Rank Insignia · Unit Crest'],
  },
  {
    label: 'PT Gear',
    items: ['PT Shirt (S · M · L · XL)', 'PT Shorts (S · M · L · XL)'],
  },
];

const UniformItemRequest = () => {
  usePageMeta({
    title: 'Request Uniform Items',
    description: 'Submit a uniform item request to the S4 logistics team.',
    path: '/uniform-request',
  });

  const [iframeError, setIframeError] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="pt-28 pb-14 px-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 mb-6 mx-auto">
          <Shirt className="text-yellow-500" size={28} />
        </div>
        <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white leading-none">
          Request<br />
          <span className="text-yellow-500">Uniform Items</span>
        </h1>
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Fill out the form below to request uniform items from our S4 logistics team.
          Your request will be reviewed and fulfilled as soon as possible.
        </p>
        <a
          href={FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.25em] text-yellow-600 dark:text-yellow-500 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors"
        >
          <ExternalLink size={12} /> Open form in a new tab
        </a>
      </div>

      {/* ── What you can request ──────────────────────────────────────────── */}
      <div className="max-w-4xl mx-auto px-6 mb-12">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 mb-4 text-center">
          Available Items
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {CATEGORIES.map(cat => (
            <div
              key={cat.label}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-3">
                <Package size={13} className="text-yellow-500 shrink-0" />
                <p className="text-[10px] font-black uppercase tracking-widest text-yellow-600 dark:text-yellow-500 leading-tight">
                  {cat.label}
                </p>
              </div>
              <ul className="space-y-1.5">
                {cat.items.map(item => (
                  <li key={item} className="text-[10px] text-slate-500 dark:text-slate-400 font-bold leading-snug">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* ── Embedded Google Form ──────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden shadow-lg">
          {!iframeError ? (
            <iframe
              src={FORM_URL}
              title="Uniform Item Request Form"
              width="100%"
              height="820"
              frameBorder="0"
              marginHeight="0"
              marginWidth="0"
              onError={() => setIframeError(true)}
              className="block"
            >
              Loading form…
            </iframe>
          ) : (
            /* Fallback: iframe blocked by browser or form settings */
            <div className="flex flex-col items-center justify-center py-20 px-8 text-center gap-6">
              <div className="w-14 h-14 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                <AlertCircle className="text-yellow-500" size={24} />
              </div>
              <div>
                <p className="font-black uppercase tracking-widest text-sm text-slate-900 dark:text-white mb-2">
                  Form preview unavailable
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs">
                  Your browser is blocking the embedded form. Use the button below to open it directly.
                </p>
              </div>
              <a
                href={FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black uppercase text-xs tracking-widest px-8 py-4 rounded-2xl transition-all shadow-lg shadow-yellow-500/20"
              >
                <ExternalLink size={14} /> Open Request Form
              </a>
            </div>
          )}
        </div>

        {/* Always-visible fallback CTA below the iframe */}
        <p className="mt-5 text-center text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
          Form not displaying?{' '}
          <a
            href={FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-500 hover:text-yellow-400 transition-colors underline underline-offset-4"
          >
            Click here to open it directly
          </a>
        </p>
      </div>

      <Footer />
    </div>
  );
};

export default UniformItemRequest;
