import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { ROLE_HIERARCHY, STAFF_LEVEL } from '../constants';
import {
  Users, GraduationCap, ArrowLeft, Plus, Edit3, Trash2, X, Loader2,
  CheckCircle2, UploadCloud
} from 'lucide-react';
import Footer from '../components/Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { withRetry } from '../utils/withRetry';

const COMPANIES = ["None", "Zulu Company", "Alpha Company", "Bravo Company", "Charlie Company", "Delta Company"];
const INSTRUCTOR_TYPES = ["SAI", "AI"];
// Must exactly match the position names Leadership.jsx's getCompanyPosition()
// looks for - that's how a company entry ends up in its correct box on the
// public page instead of silently not showing up anywhere.
const COMPANY_POSITIONS = ["Commander", "Executive Officer", "First Sergeant"];

// Cloud name and unsigned upload preset are not secrets - Cloudinary's
// unsigned-upload flow is designed to be called directly from client code.
// Never put the API key/secret here; those are for signed (server-side) uploads.
const CLOUDINARY_CLOUD_NAME = 'q77zogcy';
const CLOUDINARY_UPLOAD_PRESET = 'ml_default';

const initialLeaderForm = { name: '', role: '', rank: '', portrait: '', desc: '', quote: '', company: 'None' };
const initialInstructorForm = { type: 'SAI', name: '' };

const AdminLeadership = () => {
  const { role, loading: authLoading } = useAuth();
  const isAuthorized = (ROLE_HIERARCHY[role] || 0) >= STAFF_LEVEL;

  const [activeTab, setActiveTab] = useState('leadership');
  const [leadership, setLeadership] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [showLeaderModal, setShowLeaderModal] = useState(false);
  const [editingLeader, setEditingLeader] = useState(null);
  const [leaderForm, setLeaderForm] = useState(initialLeaderForm);

  const [showInstructorModal, setShowInstructorModal] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState(null);
  const [instructorForm, setInstructorForm] = useState(initialInstructorForm);

  const [status, setStatus] = useState(null);
  const [uploadingPortrait, setUploadingPortrait] = useState(false);

  useEffect(() => {
    if (!isAuthorized) return;
    const qLead = query(collection(db, "leadership"), orderBy("role", "asc"));
    const unsubLead = onSnapshot(qLead, (snap) => {
      setLeadership(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setDataLoading(false);
    }, () => setDataLoading(false));

    const unsubInst = onSnapshot(collection(db, "instructors"), (snap) => {
      setInstructors(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubLead(); unsubInst(); };
  }, [isAuthorized]);

  const showStatus = (msg) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 3500);
  };

  // --- LEADERSHIP CRUD ---
  const openAddLeader = () => { setEditingLeader(null); setLeaderForm(initialLeaderForm); setShowLeaderModal(true); };
  const openEditLeader = (item) => { setEditingLeader(item); setLeaderForm({ ...initialLeaderForm, ...item }); setShowLeaderModal(true); };

  const handlePortraitUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPortrait(true);
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

      const data = await withRetry(async () => {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body
        });
        const json = await res.json();
        if (!res.ok || !json.secure_url) {
          throw new Error(json.error?.message || 'Upload failed');
        }
        return json;
      });
      setLeaderForm(prev => ({ ...prev, portrait: data.secure_url }));
    } catch (err) {
      console.error("Portrait upload failed:", err);
      showStatus("Portrait Upload Failed");
    } finally {
      setUploadingPortrait(false);
    }
  };

  const handleSaveLeader = async (e) => {
    e.preventDefault();
    try {
      if (editingLeader) {
        await updateDoc(doc(db, "leadership", editingLeader.id), { ...leaderForm, updatedAt: serverTimestamp() });
      } else {
        await addDoc(collection(db, "leadership"), { ...leaderForm, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
      }
      setShowLeaderModal(false);
      setEditingLeader(null);
      setLeaderForm(initialLeaderForm);
      showStatus("Leadership Record Saved");
    } catch {
      showStatus("Error Saving Record");
    }
  };

  const handleDeleteLeader = async (id) => {
    if (!window.confirm("Remove this leadership record?")) return;
    try {
      await deleteDoc(doc(db, "leadership", id));
      showStatus("Record Removed");
    } catch {
      showStatus("Error Removing Record");
    }
  };

  // --- INSTRUCTOR CRUD ---
  const openAddInstructor = () => { setEditingInstructor(null); setInstructorForm(initialInstructorForm); setShowInstructorModal(true); };
  const openEditInstructor = (item) => { setEditingInstructor(item); setInstructorForm({ ...initialInstructorForm, ...item }); setShowInstructorModal(true); };

  const handleSaveInstructor = async (e) => {
    e.preventDefault();
    try {
      if (editingInstructor) {
        await updateDoc(doc(db, "instructors", editingInstructor.id), instructorForm);
      } else {
        await addDoc(collection(db, "instructors"), instructorForm);
      }
      setShowInstructorModal(false);
      setEditingInstructor(null);
      setInstructorForm(initialInstructorForm);
      showStatus("Instructor Saved");
    } catch {
      showStatus("Error Saving Instructor");
    }
  };

  const handleDeleteInstructor = async (id) => {
    if (!window.confirm("Remove this instructor?")) return;
    try {
      await deleteDoc(doc(db, "instructors", id));
      showStatus("Instructor Removed");
    } catch {
      showStatus("Error Removing Instructor");
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-6 md:p-12 pt-24 font-sans transition-colors duration-300">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
          <div>
            <Link to="/admin/dashboard" className="text-slate-400 dark:text-slate-500 hover:text-yellow-600 dark:hover:text-yellow-500 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-4">
              <ArrowLeft size={14} /> Back to Command
            </Link>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              <Users className="text-yellow-600 dark:text-yellow-500" /> Battalion Leadership
            </h1>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-200/50 dark:bg-white/5 p-1 rounded-2xl w-fit border border-slate-200 dark:border-white/5 mb-8">
          {[
            { id: 'leadership', label: 'Leadership Roster', icon: Users },
            { id: 'instructors', label: 'Instructors', icon: GraduationCap }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-yellow-500 text-slate-950 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              <tab.icon size={14} /> {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'leadership' ? (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={openAddLeader} className="bg-yellow-500 text-slate-950 px-6 py-3 rounded-2xl font-black uppercase text-xs flex items-center gap-2 hover:bg-yellow-400 shadow-lg shadow-yellow-500/20 transition-all">
                <Plus size={18} /> New Entry
              </button>
            </div>

            <div className="grid gap-4">
              {leadership.map(item => (
                <div key={item.id} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 p-6 rounded-[2rem] flex flex-wrap items-center justify-between gap-6 hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-white/5 flex-shrink-0">
                      {item.portrait ? (
                        <img src={item.portrait} alt={item.name} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                      ) : null}
                    </div>
                    <div>
                      <h3 className="font-black uppercase italic text-lg">{item.name || "Unnamed"}</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <span className="text-[9px] font-black text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded uppercase">{item.role}</span>
                        <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded uppercase">{item.rank}</span>
                        {item.company && item.company !== 'None' && (
                          <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded uppercase">{item.company}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button title="Edit leader" onClick={() => openEditLeader(item)} className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-yellow-500 hover:text-slate-950 transition-all text-slate-500">
                      <Edit3 size={18} />
                    </button>
                    <button title="Delete leader" onClick={() => handleDeleteLeader(item.id)} className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-red-500 hover:text-white transition-all text-slate-500">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {leadership.length === 0 && (
                <div className="text-center py-16 text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-widest">No leadership records yet</div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-end mb-4">
              <button onClick={openAddInstructor} className="bg-yellow-500 text-slate-950 px-6 py-3 rounded-2xl font-black uppercase text-xs flex items-center gap-2 hover:bg-yellow-400 shadow-lg shadow-yellow-500/20 transition-all">
                <Plus size={18} /> New Entry
              </button>
            </div>

            <div className="grid gap-4">
              {instructors.map(item => (
                <div key={item.id} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 p-6 rounded-[2rem] flex items-center justify-between gap-6 hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-white/5 text-slate-400 dark:text-slate-500">
                      <GraduationCap size={20} />
                    </div>
                    <div>
                      <h3 className="font-black uppercase italic text-lg">{item.name || "Unnamed"}</h3>
                      <span className="text-[9px] font-black text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded uppercase">{item.type}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button title="Edit instructor" onClick={() => openEditInstructor(item)} className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-yellow-500 hover:text-slate-950 transition-all text-slate-500">
                      <Edit3 size={18} />
                    </button>
                    <button title="Delete instructor" onClick={() => handleDeleteInstructor(item.id)} className="p-3 bg-slate-100 dark:bg-white/5 rounded-xl hover:bg-red-500 hover:text-white transition-all text-slate-500">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
              {instructors.length === 0 && (
                <div className="text-center py-16 text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-widest">No instructors yet</div>
              )}
            </div>
          </>
        )}
      </div>

      {/* LEADER MODAL */}
      <AnimatePresence>
        {showLeaderModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowLeaderModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 md:p-10 rounded-[3rem] max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                  {editingLeader ? 'Edit Leadership Record' : 'New Leadership Record'}
                </h2>
                <button title="Close" onClick={() => setShowLeaderModal(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><X /></button>
              </div>

              <form onSubmit={handleSaveLeader} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Full Name</label>
                  <input required className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none focus:border-yellow-500 text-sm font-bold text-slate-900 dark:text-white" value={leaderForm.name} onChange={e => setLeaderForm({ ...leaderForm, name: e.target.value })} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">
                    {leaderForm.company !== 'None' ? 'Company Position' : 'Role / Position Title'}
                  </label>
                  {leaderForm.company !== 'None' ? (
                    <select required className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none text-sm font-bold text-slate-900 dark:text-white appearance-none" value={leaderForm.role} onChange={e => setLeaderForm({ ...leaderForm, role: e.target.value })}>
                      <option value="" disabled className="bg-white dark:bg-slate-900">Select position...</option>
                      {COMPANY_POSITIONS.map(p => <option key={p} value={p} className="bg-white dark:bg-slate-900">{p}</option>)}
                    </select>
                  ) : (
                    <input required placeholder="e.g. Battalion Commander, S-1 Adjutant" className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none focus:border-yellow-500 text-sm font-bold text-slate-900 dark:text-white" value={leaderForm.role} onChange={e => setLeaderForm({ ...leaderForm, role: e.target.value })} />
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Rank Shortcode</label>
                  <input placeholder="e.g. c/LTC" className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none focus:border-yellow-500 text-sm font-bold text-slate-900 dark:text-white" value={leaderForm.rank} onChange={e => setLeaderForm({ ...leaderForm, rank: e.target.value })} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Company Assignment</label>
                  <select className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none text-sm font-bold text-slate-900 dark:text-white appearance-none" value={leaderForm.company} onChange={e => setLeaderForm({ ...leaderForm, company: e.target.value })}>
                    {COMPANIES.map(c => <option key={c} value={c} className="bg-white dark:bg-slate-900">{c}</option>)}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Portrait Photo</label>
                  <div className="flex items-center gap-4">
                    {leaderForm.portrait && (
                      <img src={leaderForm.portrait} alt="Preview" className="w-14 h-14 rounded-xl object-cover border border-slate-200 dark:border-white/10 flex-shrink-0" />
                    )}
                    <label className="flex-1 cursor-pointer bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 rounded-2xl text-sm font-bold text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2 hover:border-yellow-500 transition-all">
                      {uploadingPortrait ? <Loader2 className="animate-spin" size={16} /> : <UploadCloud size={16} />}
                      {uploadingPortrait ? 'Uploading...' : leaderForm.portrait ? 'Change Photo' : 'Upload Photo'}
                      <input type="file" accept="image/*" className="hidden" onChange={handlePortraitUpload} disabled={uploadingPortrait} />
                    </label>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Staff Description</label>
                  <input placeholder="Only used for S-staff, e.g. Personnel & Administration" className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none focus:border-yellow-500 text-sm font-bold text-slate-900 dark:text-white" value={leaderForm.desc} onChange={e => setLeaderForm({ ...leaderForm, desc: e.target.value })} />
                </div>

                <div className="md:col-span-2 space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Leadership Quote</label>
                  <textarea className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none focus:border-yellow-500 text-sm font-bold text-slate-900 dark:text-white h-24 resize-none" value={leaderForm.quote} onChange={e => setLeaderForm({ ...leaderForm, quote: e.target.value })} />
                </div>

                <button type="submit" disabled={uploadingPortrait} className="md:col-span-2 w-full bg-yellow-500 text-slate-950 font-black uppercase py-5 rounded-2xl hover:bg-yellow-400 transition-all mt-4 text-sm shadow-lg shadow-yellow-500/20 disabled:opacity-50">
                  {editingLeader ? 'Update Record' : 'Add to Roster'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* INSTRUCTOR MODAL */}
      <AnimatePresence>
        {showInstructorModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm" onClick={() => setShowInstructorModal(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-8 md:p-10 rounded-[3rem] max-w-md w-full shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                  {editingInstructor ? 'Edit Instructor' : 'New Instructor'}
                </h2>
                <button title="Close" onClick={() => setShowInstructorModal(false)} className="text-slate-500 hover:text-slate-900 dark:hover:text-white"><X /></button>
              </div>

              <form onSubmit={handleSaveInstructor} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Instructor Type</label>
                  <select className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none text-sm font-bold text-slate-900 dark:text-white appearance-none" value={instructorForm.type} onChange={e => setInstructorForm({ ...instructorForm, type: e.target.value })}>
                    {INSTRUCTOR_TYPES.map(t => <option key={t} value={t} className="bg-white dark:bg-slate-900">{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Rank and Last Name</label>
                  <input required placeholder="e.g. LTC Johnson" className="w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-4 rounded-2xl outline-none focus:border-yellow-500 text-sm font-bold text-slate-900 dark:text-white" value={instructorForm.name} onChange={e => setInstructorForm({ ...instructorForm, name: e.target.value })} />
                </div>
                <button type="submit" className="w-full bg-yellow-500 text-slate-950 font-black uppercase py-4 rounded-2xl hover:bg-yellow-400 transition-all text-sm shadow-lg shadow-yellow-500/20">
                  {editingInstructor ? 'Update Instructor' : 'Add Instructor'}
                </button>
              </form>
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
      <Footer />
    </div>
  );
};

export default AdminLeadership;
