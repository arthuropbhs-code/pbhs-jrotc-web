// src/pages/AdminCompanies.jsx
//
// SAI/AI-only page to configure the battalion's lettered companies.
// Changes write to `settings/companies` in Firestore and propagate
// instantly everywhere via the useCompanies() hook.

import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { ROLE_HIERARCHY, ADMIN_LEVEL } from '../constants';
import {
  Building2, ArrowLeft, Plus, Trash2, GripVertical,
  Loader2, CheckCircle2, AlertCircle, Save
} from 'lucide-react';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';

const DEFAULT_COMPANIES = ["Zulu", "Alpha", "Bravo", "Charlie", "Delta"];

const AdminCompanies = () => {
  const { user, role, loading: authLoading } = useAuth();
  const isAuthorized = (ROLE_HIERARCHY[role] || 0) >= ADMIN_LEVEL;

  const [companies, setCompanies] = useState(DEFAULT_COMPANIES);
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success'|'error', msg: string }
  const [newName, setNewName] = useState('');
  const [dragIdx, setDragIdx] = useState(null);

  // Load existing config once on mount
  useEffect(() => {
    if (!isAuthorized) return;
    getDoc(doc(db, 'settings', 'companies')).then((snap) => {
      if (snap.exists()) {
        const names = snap.data()?.names;
        if (Array.isArray(names) && names.length > 0) setCompanies(names);
      }
      setDataLoading(false);
    }).catch(() => setDataLoading(false));
  }, [isAuthorized]);

  const showStatus = (type, msg) => {
    setStatus({ type, msg });
    setTimeout(() => setStatus(null), 3500);
  };

  const handleSave = async () => {
    const trimmed = companies.map(c => c.trim()).filter(Boolean);
    if (trimmed.length === 0) {
      showStatus('error', 'At least one company is required.');
      return;
    }
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'companies'), { names: trimmed });
      setCompanies(trimmed);
      showStatus('success', 'Company list saved. Changes are live instantly.');
    } catch (err) {
      showStatus('error', 'Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    if (companies.map(c => c.toLowerCase()).includes(name.toLowerCase())) {
      showStatus('error', `"${name}" already exists.`);
      return;
    }
    setCompanies([...companies, name]);
    setNewName('');
  };

  const handleRename = (idx, value) => {
    const updated = [...companies];
    updated[idx] = value;
    setCompanies(updated);
  };

  const handleDelete = (idx) => {
    setCompanies(companies.filter((_, i) => i !== idx));
  };

  // Simple drag-to-reorder
  const handleDragStart = (idx) => setDragIdx(idx);
  const handleDragOver = (e, idx) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const updated = [...companies];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, moved);
    setCompanies(updated);
    setDragIdx(idx);
  };
  const handleDragEnd = () => setDragIdx(null);

  if (authLoading) return (
    <div className="min-h-screen bg-blue-50 dark:bg-slate-950 flex items-center justify-center">
      <Loader2 className="animate-spin text-yellow-500" size={32} />
    </div>
  );

  if (!user) return <Navigate to="/admin" />;
  if (!isAuthorized) return <Navigate to="/admin/dashboard" />;

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-slate-950 flex flex-col transition-colors duration-300">
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-10">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link to="/admin/dashboard" className="p-2 rounded-xl hover:bg-blue-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 size={20} className="text-yellow-500" />
              Company Names
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-widest mt-0.5">
              Admin-configurable · "Battalion" is always appended
            </p>
          </div>
        </div>

        {/* Status toast */}
        <AnimatePresence>
          {status && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className={`flex items-center gap-2 p-3 rounded-xl text-sm font-bold mb-6 ${
                status.type === 'success'
                  ? 'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20'
                  : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
              }`}
            >
              {status.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              {status.msg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Company list */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-blue-100 dark:border-white/5 shadow-sm p-6 mb-6">
          <p className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-4">
            Current Companies — drag to reorder
          </p>

          {dataLoading ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-11 bg-blue-50 dark:bg-white/5 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {companies.map((name, idx) => (
                <div
                  key={idx}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
                    dragIdx === idx
                      ? 'border-yellow-500/40 bg-yellow-500/5 shadow-lg'
                      : 'border-blue-100 dark:border-white/10 bg-blue-50/50 dark:bg-white/5 hover:border-blue-200 dark:hover:border-white/20'
                  }`}
                >
                  <GripVertical size={16} className="text-slate-400 flex-shrink-0" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => handleRename(idx, e.target.value)}
                    maxLength={30}
                    className="flex-1 bg-transparent text-sm font-bold text-slate-900 dark:text-white outline-none border-b border-transparent focus:border-yellow-500 transition-colors"
                  />
                  <button
                    onClick={() => handleDelete(idx)}
                    disabled={companies.length <= 1}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Remove company"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {/* Always-present Battalion row (non-removable) */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-slate-200 dark:border-white/10 opacity-50">
                <GripVertical size={16} className="text-slate-300" />
                <span className="flex-1 text-sm font-bold text-slate-500 dark:text-slate-400">Battalion</span>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fixed</span>
              </div>
            </div>
          )}
        </div>

        {/* Add new company */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-blue-100 dark:border-white/5 shadow-sm p-6 mb-6">
          <p className="text-[11px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-3">
            Add Company
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="e.g. Echo"
              maxLength={30}
              className="flex-1 bg-blue-50 dark:bg-black/50 border border-blue-200 dark:border-white/10 p-3 rounded-xl outline-none focus:border-yellow-500 text-sm font-bold text-slate-900 dark:text-white transition-colors"
            />
            <button
              onClick={handleAdd}
              disabled={!newName.trim()}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-yellow-500 text-slate-950 font-black text-sm uppercase tracking-widest hover:bg-yellow-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={16} /> Add
            </button>
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving || dataLoading}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-yellow-500 text-slate-950 font-black text-sm uppercase tracking-widest hover:bg-yellow-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/20"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'Saving…' : 'Save Company List'}
        </button>

        <p className="text-center text-[11px] text-slate-400 dark:text-slate-600 mt-4">
          Saves to Firestore → all pages update instantly. Renaming a company here does not rename existing cadet records — update those separately in Manage Personnel.
        </p>
      </div>
      <Footer />
    </div>
  );
};

export default AdminCompanies;
