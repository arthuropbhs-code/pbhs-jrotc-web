import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { ROLE_HIERARCHY, ADMIN_LEVEL } from '../constants';
import { DEFAULT_ABOUT, DEFAULT_CADET_INFO, DEFAULT_PROMOTION_BOARD } from '../data/defaultPageContent';
import {
  FileText, ArrowLeft, Save, ChevronDown, CheckCircle2, Loader2, BookOpen, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Footer from '../components/Footer';

const TABS = [
  { id: 'about', label: 'About JROTC' },
  { id: 'cadet-info', label: 'General Info' },
  { id: 'promotion-board', label: 'Promotion Board' }
];

const linesToArray = (text) => (text || '').split('\n').map(s => s.trim()).filter(Boolean);

const inputClass = "w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-3 rounded-xl outline-none focus:border-yellow-500 text-sm font-bold text-slate-900 dark:text-white";
const labelClass = "text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 block mb-1";

const AdminContent = () => {
  const { role, loading: authLoading } = useAuth();
  const isAuthorized = role === 's5_public_affairs' || role === 's6_technology' || (ROLE_HIERARCHY[role] || 0) >= ADMIN_LEVEL;

  const [activeTab, setActiveTab] = useState('about');
  const [dataLoading, setDataLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  const [aboutForm, setAboutForm] = useState(DEFAULT_ABOUT);
  const [cadetInfoForm, setCadetInfoForm] = useState(DEFAULT_CADET_INFO);
  const [promoForm, setPromoForm] = useState(DEFAULT_PROMOTION_BOARD);
  const [expandedRank, setExpandedRank] = useState(null);
  const [expandedStaffSection, setExpandedStaffSection] = useState(null);

  useEffect(() => {
    if (!isAuthorized) return;
    const unsubs = [
      onSnapshot(doc(db, "pageContent", "about"), (snap) => {
        if (snap.exists()) setAboutForm({ ...DEFAULT_ABOUT, ...snap.data() });
        setDataLoading(false);
      }),
      onSnapshot(doc(db, "pageContent", "cadet-info"), (snap) => {
        if (snap.exists()) setCadetInfoForm({ ...DEFAULT_CADET_INFO, ...snap.data() });
      }),
      onSnapshot(doc(db, "pageContent", "promotion-board"), (snap) => {
        if (snap.exists()) setPromoForm({ ...DEFAULT_PROMOTION_BOARD, ...snap.data() });
      })
    ];
    return () => unsubs.forEach(u => u());
  }, [isAuthorized]);

  const showStatus = (msg) => {
    setStatus(msg);
    setTimeout(() => setStatus(null), 3000);
  };

  const saveTab = async (id, data) => {
    setSaving(true);
    try {
      await setDoc(doc(db, "pageContent", id), data);
      showStatus("Saved — live on the site now");
    } catch (err) {
      console.error("Save failed:", err);
      showStatus("Save Failed");
    } finally {
      setSaving(false);
    }
  };

  // --- ABOUT helpers ---
  const updateHistory = (index, field, value) => {
    const history = [...aboutForm.history];
    history[index] = { ...history[index], [field]: value };
    setAboutForm({ ...aboutForm, history });
  };
  const updatePillar = (index, field, value) => {
    const pillars = [...aboutForm.pillars];
    pillars[index] = { ...pillars[index], [field]: value };
    setAboutForm({ ...aboutForm, pillars });
  };

  // --- CADET INFO helpers ---
  const updateArmyValue = (index, field, value) => {
    const armyValues = [...cadetInfoForm.armyValues];
    armyValues[index] = { ...armyValues[index], [field]: value };
    setCadetInfoForm({ ...cadetInfoForm, armyValues });
  };

  // --- PROMOTION BOARD helpers ---
  const updateRank = (index, field, value) => {
    const ranks = [...promoForm.ranks];
    ranks[index] = { ...ranks[index], [field]: value };
    setPromoForm({ ...promoForm, ranks });
  };
  const updateStaffAssistants = (field, value) => {
    setPromoForm({ ...promoForm, staffAssistants: { ...promoForm.staffAssistants, [field]: value } });
  };
  const updateStaffSection = (index, field, value) => {
    const sections = [...promoForm.staffAssistants.sections];
    sections[index] = { ...sections[index], [field]: value };
    setPromoForm({ ...promoForm, staffAssistants: { ...promoForm.staffAssistants, sections } });
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
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <Link to="/admin/dashboard" className="text-slate-400 dark:text-slate-500 hover:text-yellow-600 dark:hover:text-yellow-500 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-4">
            <ArrowLeft size={14} /> Back to Command
          </Link>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
            <FileText className="text-yellow-600 dark:text-yellow-500" /> Site Content
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest mt-2">
            Edits publish live immediately
          </p>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-200/50 dark:bg-white/5 p-1 rounded-2xl w-fit border border-slate-200 dark:border-white/5 mb-8">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-yellow-500 text-slate-950 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* --- ABOUT TAB --- */}
        {activeTab === 'about' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 p-8 rounded-[2rem] space-y-5">
              <div>
                <label className={labelClass}>Mission Statement</label>
                <textarea className={`${inputClass} h-24 resize-none`} value={aboutForm.missionText} onChange={e => setAboutForm({ ...aboutForm, missionText: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>The Student-Led Experience</label>
                <textarea className={`${inputClass} h-24 resize-none`} value={aboutForm.studentLedText} onChange={e => setAboutForm({ ...aboutForm, studentLedText: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Call to Action Title</label>
                <input className={inputClass} value={aboutForm.ctaTitle} onChange={e => setAboutForm({ ...aboutForm, ctaTitle: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Call to Action Text</label>
                <textarea className={`${inputClass} h-20 resize-none`} value={aboutForm.ctaText} onChange={e => setAboutForm({ ...aboutForm, ctaText: e.target.value })} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 p-8 rounded-[2rem] space-y-5">
              <h3 className="text-xs font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-widest">Historical Context Cards</h3>
              {aboutForm.history.map((card, i) => (
                <div key={i} className="grid md:grid-cols-2 gap-3 pb-4 border-b border-slate-100 dark:border-white/5 last:border-0 last:pb-0">
                  <input className={inputClass} placeholder="Card Title" value={card.title} onChange={e => updateHistory(i, 'title', e.target.value)} />
                  <textarea className={`${inputClass} h-20 resize-none`} placeholder="Card Text" value={card.text} onChange={e => updateHistory(i, 'text', e.target.value)} />
                </div>
              ))}
            </div>

            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 p-8 rounded-[2rem] space-y-5">
              <h3 className="text-xs font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-widest">Program Pillar Cards</h3>
              {aboutForm.pillars.map((card, i) => (
                <div key={i} className="grid md:grid-cols-2 gap-3 pb-4 border-b border-slate-100 dark:border-white/5 last:border-0 last:pb-0">
                  <input className={inputClass} placeholder="Pillar Title" value={card.title} onChange={e => updatePillar(i, 'title', e.target.value)} />
                  <textarea className={`${inputClass} h-20 resize-none`} placeholder="Pillar Description" value={card.desc} onChange={e => updatePillar(i, 'desc', e.target.value)} />
                </div>
              ))}
            </div>

            <button disabled={saving} onClick={() => saveTab('about', aboutForm)} className="w-full bg-yellow-500 text-slate-950 font-black uppercase py-5 rounded-2xl hover:bg-yellow-400 transition-all text-sm shadow-lg shadow-yellow-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
              <Save size={18} /> Save About Page
            </button>
          </div>
        )}

        {/* --- GENERAL INFO (CADET INFO) TAB --- */}
        {activeTab === 'cadet-info' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 p-8 rounded-[2rem] space-y-5">
              <div>
                <label className={labelClass}>Mission Statement</label>
                <input className={inputClass} value={cadetInfoForm.missionText} onChange={e => setCadetInfoForm({ ...cadetInfoForm, missionText: e.target.value })} />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>JROTC Definition</label>
                  <input className={inputClass} value={cadetInfoForm.jrotcDefinition} onChange={e => setCadetInfoForm({ ...cadetInfoForm, jrotcDefinition: e.target.value })} />
                </div>
                <div>
                  <label className={labelClass}>LET Definition</label>
                  <input className={inputClass} value={cadetInfoForm.letDefinition} onChange={e => setCadetInfoForm({ ...cadetInfoForm, letDefinition: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Leadership Definition</label>
                <textarea className={`${inputClass} h-20 resize-none`} value={cadetInfoForm.leadershipDefinition} onChange={e => setCadetInfoForm({ ...cadetInfoForm, leadershipDefinition: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Cadet Creed (one line each)</label>
                <textarea className={`${inputClass} h-40 resize-none`} value={cadetInfoForm.cadetCreed} onChange={e => setCadetInfoForm({ ...cadetInfoForm, cadetCreed: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>11 Principles of Leadership (one per line)</label>
                <textarea className={`${inputClass} h-48 resize-none`} value={(cadetInfoForm.principles || []).join('\n')} onChange={e => setCadetInfoForm({ ...cadetInfoForm, principles: e.target.value.split('\n') })} />
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 p-8 rounded-[2rem] space-y-4">
              <h3 className="text-xs font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-widest">Army Values</h3>
              {cadetInfoForm.armyValues.map((item, i) => (
                <div key={i} className="grid grid-cols-[50px_1fr_2fr] gap-3 items-center">
                  <input className={`${inputClass} text-center`} maxLength={1} value={item.l} onChange={e => updateArmyValue(i, 'l', e.target.value)} />
                  <input className={inputClass} placeholder="Value" value={item.v} onChange={e => updateArmyValue(i, 'v', e.target.value)} />
                  <input className={inputClass} placeholder="Description" value={item.d} onChange={e => updateArmyValue(i, 'd', e.target.value)} />
                </div>
              ))}
            </div>

            <button disabled={saving} onClick={() => saveTab('cadet-info', { ...cadetInfoForm, principles: linesToArray(cadetInfoForm.principles.join('\n')) })} className="w-full bg-yellow-500 text-slate-950 font-black uppercase py-5 rounded-2xl hover:bg-yellow-400 transition-all text-sm shadow-lg shadow-yellow-500/20 disabled:opacity-50 flex items-center justify-center gap-2">
              <Save size={18} /> Save General Info
            </button>
          </div>
        )}

        {/* --- PROMOTION BOARD TAB --- */}
        {activeTab === 'promotion-board' && (
          <div className="space-y-4">
            <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-[11px] text-blue-700 dark:text-blue-300">
              <Info size={16} className="flex-shrink-0 mt-0.5" />
              Click a rank to expand and edit its knowledge, duties, and leadership requirement. Knowledge and duties are one item per line.
            </div>

            {promoForm.ranks.map((rank, i) => (
              <div key={i} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden">
                <button onClick={() => setExpandedRank(expandedRank === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left">
                  <span className="font-black uppercase italic text-sm flex items-center gap-2"><BookOpen size={14} className="text-yellow-600 dark:text-yellow-500" /> {rank.name}</span>
                  <ChevronDown size={16} className={`transition-transform ${expandedRank === i ? 'rotate-180' : ''}`} />
                </button>
                {expandedRank === i && (
                  <div className="p-5 pt-0 space-y-4 border-t border-slate-100 dark:border-white/5">
                    <div>
                      <label className={labelClass}>Leadership Requirement</label>
                      <input className={inputClass} value={rank.leadership} onChange={e => updateRank(i, 'leadership', e.target.value)} />
                    </div>
                    <div>
                      <label className={labelClass}>Knowledge (one per line)</label>
                      <textarea className={`${inputClass} h-32 resize-none`} value={rank.knowledge.join('\n')} onChange={e => updateRank(i, 'knowledge', e.target.value.split('\n'))} />
                    </div>
                    <div>
                      <label className={labelClass}>Duties & Responsibilities (one per line)</label>
                      <textarea className={`${inputClass} h-32 resize-none`} value={rank.duties.join('\n')} onChange={e => updateRank(i, 'duties', e.target.value.split('\n'))} />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Staff Assistants */}
            <div className="bg-white dark:bg-slate-900/40 border border-yellow-500/20 rounded-2xl p-5 space-y-4">
              <h3 className="font-black uppercase italic text-sm flex items-center gap-2"><BookOpen size={14} className="text-yellow-600 dark:text-yellow-500" /> Staff Assistants (Shared)</h3>
              <div>
                <label className={labelClass}>Leadership Requirement</label>
                <input className={inputClass} value={promoForm.staffAssistants.leadership} onChange={e => updateStaffAssistants('leadership', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Knowledge (one per line)</label>
                <textarea className={`${inputClass} h-32 resize-none`} value={promoForm.staffAssistants.knowledge.join('\n')} onChange={e => updateStaffAssistants('knowledge', e.target.value.split('\n'))} />
              </div>

              <div className="space-y-3 pt-2">
                {promoForm.staffAssistants.sections.map((section, i) => (
                  <div key={section.id} className="bg-slate-50 dark:bg-black/30 border border-slate-100 dark:border-white/5 rounded-xl overflow-hidden">
                    <button onClick={() => setExpandedStaffSection(expandedStaffSection === i ? null : i)} className="w-full flex items-center justify-between p-4 text-left">
                      <span className="text-xs font-bold uppercase"><span className="text-yellow-600 dark:text-yellow-500">{section.id}</span> &middot; {section.title}</span>
                      <ChevronDown size={14} className={`transition-transform ${expandedStaffSection === i ? 'rotate-180' : ''}`} />
                    </button>
                    {expandedStaffSection === i && (
                      <div className="p-4 pt-0 space-y-3 border-t border-slate-200 dark:border-white/5">
                        <div>
                          <label className={labelClass}>Title</label>
                          <input className={inputClass} value={section.title} onChange={e => updateStaffSection(i, 'title', e.target.value)} />
                        </div>
                        <div>
                          <label className={labelClass}>Duties (one per line)</label>
                          <textarea className={`${inputClass} h-24 resize-none`} value={section.asst.join('\n')} onChange={e => updateStaffSection(i, 'asst', e.target.value.split('\n'))} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <button
              disabled={saving}
              onClick={() => saveTab('promotion-board', {
                ranks: promoForm.ranks.map(r => ({ ...r, knowledge: linesToArray(r.knowledge.join('\n')), duties: linesToArray(r.duties.join('\n')) })),
                staffAssistants: {
                  ...promoForm.staffAssistants,
                  knowledge: linesToArray(promoForm.staffAssistants.knowledge.join('\n')),
                  sections: promoForm.staffAssistants.sections.map(s => ({ ...s, asst: linesToArray(s.asst.join('\n')) }))
                }
              })}
              className="w-full bg-yellow-500 text-slate-950 font-black uppercase py-5 rounded-2xl hover:bg-yellow-400 transition-all text-sm shadow-lg shadow-yellow-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={18} /> Save Promotion Board
            </button>
          </div>
        )}
      </div>

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

export default AdminContent;
