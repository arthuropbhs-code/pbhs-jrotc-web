// src/components/AdminPageHeader.jsx
//
// Standardized header block for every admin page.
// Provides a consistent "← Back to Dashboard" breadcrumb and h1 title.
// Import once and drop at the top of each admin page's content area.

import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * @param {React.ElementType} icon  — Lucide icon component (not JSX, just the reference)
 * @param {string}            title — Page title text
 * @param {React.ReactNode}   meta  — Optional subtitle / count / badge line below the h1
 * @param {string}            backTo — Override back link path (default: /admin/dashboard)
 */
const AdminPageHeader = ({ icon: Icon, title, meta, backTo = '/admin/dashboard' }) => (
  <div className="mb-8">
    <Link
      to={backTo}
      className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 hover:text-yellow-500 transition-colors mb-3"
    >
      <ArrowLeft size={13} /> Back to Dashboard
    </Link>

    <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
      {Icon && <Icon size={32} className="text-yellow-500 flex-shrink-0" />}
      {title}
    </h1>

    {meta && (
      <p className="mt-1.5 text-sm text-slate-400 dark:text-slate-500 ml-0">
        {meta}
      </p>
    )}
  </div>
);

export default AdminPageHeader;
