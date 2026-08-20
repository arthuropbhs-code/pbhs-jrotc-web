import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, doc, addDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, getDoc
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { ROLE_HIERARCHY, ADMIN_LEVEL } from '../constants';
import {
  FileText, Plus, Trash2, X, Loader2, CheckCircle2, UploadCloud, Download, File
} from 'lucide-react';
import ScrambleText from '../components/ScrambleText';
import AdminPageHeader from '../components/AdminPageHeader';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadPdfSigned } from '../utils/cloudinarySignedUpload';

// Same unsigned-upload pattern as AdminLeadership.jsx's portrait uploads -
// this app hosts all uploaded files on Cloudinary rather than Firebase
// Storage, so there's no separate Storage security rule to publish here.
// uploadToCloudinary validates the real file bytes are a PDF (not just the
// extension) before it ever reaches Cloudinary.

const DEFAULT_CATEGORIES = ["Regulations", "Forms", "Handbooks & Guides", "Uniform", "Other"];

const initialForm = { title: '', description: '', category: '', fileUrl: '', fileName: '' };

const inputClass = "w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-3 rounded-xl outline-none focus:border-yellow-500 text-sm font-bold text-slate-900 dark:text-white";
const labelClass = "text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 block mb-1";

const formatBytes = (bytes) => {
  if (!bytes) return '';
  const kb = bytes / 1024;
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
};

const AdminDocuments = () => {
  const { role, userData, loading: authLoading } = useAuth();
  const isAuthorized = role === 's5_public_affairs' || role === 's6_technology' || (ROLE_HIERARCHY[role] || 0) >= ADMIN_LEVEL;

  const [documents, setDocuments] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [dataLoading, setDataLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    if (!isAuthorized) return;
    // Load configurable categories from settings (falls back to DEFAULT_CATEGORIES if not yet set)
    getDoc(doc(db, 'settings', 'documentCategories')).then(snap => {
      if (snap.exists()) {
        const cats = snap.data()?.categories;
        if (Array.isArray(cats) && cats.length > 0) setCategories(cats);
      }
    });
    const q = query(collection(db, "documents"), orderBy("uploadedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setDocuments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setDataLoading(false);
    }, () => setDataLoading(false));
    return () => unsub();
  }, [isAuthorized]);

  const showStatus = (msg) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 3500);
  };

  const openAdd = () => { setForm({ ...initialForm, category: categories[0] || 'Regulations' }); setShowModal(true); };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await uploadPdfSigned(file, 'documents/regulations');
      setForm(prev => ({
        ...prev,
        fileUrl: data.url,
        fileName: data.fileName,
        fileSize: data.bytes,
        title: prev.title || file.name.replace(/\.[^/.]+$/, '')
      }));
    } catch (err) {
      console.error("Document upload failed:", err);
      showStatus(err.message || "Upload Failed");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.fileUrl) return showStatus("Choose a file first");
    setSaving(true);
    try {
      await addDoc(collection(db, "documents"), {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        fileUrl: form.fileUrl,
        fileName: form.fileName,
        fileSize: form.fileSize || null,
        uploadedAt: serverTimestamp(),
        uploadedBy: userData?.fullName || 'Battalion Staff'
      });
      showStatus("Document Published");
      setShowModal(false);
      setForm(initialForm);
    } catch (err) {
      console.error("Save failed:", err);
      showStatus("Save Failed");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDoc(doc(db, "documents", deleteConfirm.id));
      showStatus("Document Removed");
    } catch (err) {
      console.error("Delete failed:", err);
      showStatus("Delete Failed");
    } finally {
      setDeleteConfirm(null);
    }
  };

  if (authLoading || (dataLoading && isAuthorized)) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-yellow-600">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (!isAuthorized) return <Navigate to="/admin/dashboard" />;

  return (
    <div className="flex-1 p-6 md:p-10 w-full">
      <div className="max-w-4xl mx-auto">

        <AdminPageHeader icon={FileText} title="Documents" />

        <div className="flex justify-end mb-6">
          <button onClick={openAdd} className="bg-yellow-500 text-slate-950 font-black uppercase text-xs px-6 py-4 rounded-2xl hover:bg-yellow-400 transition-all flex items-center gap-2 shadow-lg shadow-yellow-500/20">
            <Plus size={16} /> Upload Document
          </button>
        </div>

        {/* List */}
        <div className="space-y-3">
          {documents.length === 0 && (
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 p-10 rounded-[2rem] text-center text-slate-400 dark:text-slate-500 text-sm font-bold uppercase tracking-widest">
              No documents published yet
            </div>
          )}
          {documents.map(d => (
            <div key={d.id} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 p-6 rounded-[2rem] flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 p-3 rounded-xl flex-shrink-0">
                  <File size={22} />
                </div>
                <div className="min-w-0">
                  <p className="font-black uppercase italic truncate">{d.title}</p>
                  <div className="flex flex-wrap gap-2 items-center mt-1">
                    <span className="text-yellow-600 dark:text-yellow-500 font-black text-[10px] uppercase">{d.category}</span>
                    {d.fileSize && <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase">{formatBytes(d.fileSize)}</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a href={d.fileUrl} target="_blank" rel="noopener noreferrer" title="Download" className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-yellow-500 hover:text-slate-950 transition-all text-slate-500">
                  <Download size={18} />
                </a>
                <button title="Remove document" onClick={() => setDeleteConfirm(d)} className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-red-500 hover:text-white transition-all text-slate-500">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* UPLOAD MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80" onClick={() => setShowModal(false)} />
            <motion.form
              onSubmit={handleSave}
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2rem] p-8 max-w-lg w-full shadow-2xl space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-black uppercase italic">Upload Document</h3>
                <button type="button" title="Close" onClick={() => setShowModal(false)} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white"><X size={20} /></button>
              </div>

              <div>
                <label className={labelClass}>File</label>
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl p-6 cursor-pointer hover:border-yellow-500 transition-all text-xs font-black uppercase text-slate-500">
                  {uploading ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                  {uploading ? 'Uploading...' : form.fileName || 'Choose PDF'}
                  <input type="file" accept="application/pdf" className="hidden" onChange={handleFileSelect} disabled={uploading} />
                </label>
              </div>

              <div>
                <label className={labelClass}>Title</label>
                <input required className={inputClass} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>

              <div>
                <label className={labelClass}>Category</label>
                <select className={inputClass} value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Description (optional)</label>
                <textarea className={`${inputClass} h-20 resize-none`} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>

              <button type="submit" disabled={saving || uploading || !form.fileUrl} className="w-full bg-yellow-500 text-slate-950 font-black uppercase py-4 rounded-2xl hover:bg-yellow-400 transition-all text-sm shadow-lg shadow-yellow-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
                {saving ? <Loader2 className="animate-spin" size={18} /> : 'Publish Document'}
              </button>
            </motion.form>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRM */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80" onClick={() => setDeleteConfirm(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-[2rem] p-8 max-w-sm w-full shadow-2xl text-center space-y-6">
              <p className="font-black uppercase italic text-lg">Remove "{deleteConfirm.title}"?</p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">This takes it off the public page immediately</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 bg-slate-100 dark:bg-white/5 py-3 rounded-xl font-black uppercase text-xs">Cancel</button>
                <button onClick={confirmDelete} className="flex-1 bg-red-500 text-white py-3 rounded-xl font-black uppercase text-xs">Remove</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* STATUS TOAST */}
      <AnimatePresence>
        {status && (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }} className="fixed bottom-8 right-8 bg-yellow-500 text-slate-950 px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-3 shadow-2xl z-[200]">
            <CheckCircle2 size={18} /> {status}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDocuments;
