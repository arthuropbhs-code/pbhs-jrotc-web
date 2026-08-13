import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, orderBy, query, where, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { Shirt, CheckCircle2, Clock, Trash2, ArrowLeft, Search, BookOpen, Plus, X, Package, Target, UserCheck, ShieldAlert, AlertCircle, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Import constants
import { ROLE_HIERARCHY, ADMIN_LEVEL, STAFF_LEVEL } from '../constants';
import { useCompanies } from '../hooks/useCompanies';
import Footer from '../components/Footer';
import ScrambleText from '../components/ScrambleText';

const UniformRequests = () => {
  const { companiesWithBattalion: COMPANIES } = useCompanies();
  const [requests, setRequests] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [filter, setFilter] = useState('Pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);

  // --- NOTIFICATION & VALIDATION STATE ---
  const [notification, setNotification] = useState(null); 
  const [deleteConfirm, setDeleteConfirm] = useState(null); 

  // Form State
  const [formData, setFormData] = useState({
    issuedBy: '',   
    cadetName: '',  
    company: COMPANIES[0] ?? 'Zulu',
    rank: '',
    item: '', 
    detail: '', 
    notes: ''
  });

  const showNotify = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // --- PERMISSION LOGIC ---
  const userRole = userProfile?.role || 'cadet';
  const userLevel = ROLE_HIERARCHY[userRole] || 1;

  // Roles that can APPROVE requests (Pending → Approved): S4 logistics, XO, BC, CSM.
  // Note: BC/CSM outrank XO so they're included even though the request said "S4 and XO" —
  // omitting senior command would block them from managing logistics which is clearly not intent.
  const APPROVE_ROLES = ['s4_logistics', 'battalion_xo', 'battalion_commander', 'battalion_csm'];
  const canApprove = APPROVE_ROLES.includes(userRole);

  // MARK AS ISSUED (Approved → Issued): only the person who submitted the request.
  // Checked per-request inline (req.requestedByUid === auth.currentUser?.uid).

  // Roles that can REQUEST (submit a new issuance): S4 assistants + approvers.
  const REQUEST_ROLES = ['company_s4_assistant', ...APPROVE_ROLES];
  const canRequest = REQUEST_ROLES.includes(userRole);

  // S4 Assistant specifically (affects form labels + email notification path)
  const isS4Assistant = userRole === 'company_s4_assistant';

  // Anyone at admin level or above (sergeant_major, BC, XO, CSM, SAI, AI) —
  // can view all records even if not in APPROVE_ROLES explicitly.
  const isHighCommand = userLevel >= ADMIN_LEVEL;

  // Company Leadership (CC through 1SG) — can view their company's records
  const isCompanyLeadership = userLevel >= 45 && userLevel <= 55;

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchProfile = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserProfile(data);

          setFormData(prev => ({
            ...prev,
            issuedBy: canRequest ? (data.fullName || '') : '',
            company: data.company || COMPANIES[0] || 'Zulu'
          }));
        }
      }
    };
    fetchProfile();
  }, []);

  // Query is scoped server-side to match what each tier is allowed to see,
  // instead of fetching every cadet's requests (names, items, notes) and
  // filtering client-side - a plain cadet or company leader's browser should
  // never receive requests outside their own scope in the first place.
  useEffect(() => {
    if (!userProfile) return;

    let q;
    if (canApprove || isHighCommand) {
      // S4 logistics, battalion XO/BC/CSM, sergeant major, SAI/AI — see everything
      q = query(collection(db, "uniform_requests"), orderBy("timestamp", "desc"));
    } else if (isS4Assistant || isCompanyLeadership) {
      // Company S4 assistant or company CC/XO/1SG — scoped to their company
      q = query(collection(db, "uniform_requests"), where("company", "==", userProfile.company));
    } else {
      // Personal view: any other signed-in user sees only requests for their own name
      if (userProfile.fullName) {
        q = query(collection(db, "uniform_requests"), where("cadetName", "==", userProfile.fullName));
      } else {
        setRequests([]);
        return;
      }
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reqs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (isS4Assistant || isCompanyLeadership) {
        reqs.sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0));
      }
      setRequests(reqs);
    });
    return () => unsubscribe();
  }, [userProfile, canApprove, isHighCommand, isS4Assistant, isCompanyLeadership]);

  // --- DATA CONFIGURATION ---
  const OFFICIAL_RIBBONS = ["Medal for Heroism (Ribbon)", "Superior Cadet Award (Ribbon)", "N-1-1 Distinguished Cadet", "N-1-2 Academic Excellence", "N-1-3 Academic Achievement", "N-1-4 Perfect Attendance", "N-1-5 Student Governement", "N-1-6 LET Service", "N-1-7 Superior Instructor", "N-1-8 CPR First Aid", "N-1-9 Distinguished Cadet", "N-1-10 Honor Cadet", "N-3-1 Dai/Sai Leadership", "N-3-2 Personal Appearance", "N-3-3 Proficiency", "N-3-4 Drill Team", "N-3-5 Orienteering", "N-3-6 Color | Honor Guard", "N-3-7 Rifle Marksmanship", "N-3-8 Adventure Training", "N-3-9 Commendation", "N-3-10 Good Conduct", "N-3-11 JCLC Participation", "N-3-12 Championship Drill", "N-3-13 Raider Team", "N-3-14 Recondo / Rappelling", "N-3-15 Meritorious Actions", "N-2-1 Varsity Athletics", "N-2-2 Physical Fitness", "N-2-3 JROTC Athletics", "N-2-4 Junior Varsity Athletics", "N-2-5 Athletic Service", "N-4-1 Parade", "N-4-2 Recruiting", "N-4-3 School Support", "N-4-4 Community Service", "N-4-5 Confidence Course", "N-4-6 Service Learning", "N-4-7 Excellent Staff Performance", "Company Commander of the Quarter", "Company XO of the Quarter", "100 Flags", "Funeral Detail"];
  const JROTC_RANKS = ["C/PVT", "C/PFC", "C/CPL", "C/SGT", "C/SSG", "C/SFC", "C/MSG", "C/1SG", "C/SGM", "C/CSM", "C/2LT", "C/1LT", "C/CPT", "C/MAJ", "C/LTC", "C/COL"];
  const ARCS = ["Cadet Challenge", "Color Guard", "Drill Team", "Flag Detail", "Fundraising", "JCLC", "Raider", "Saber Team", "Staff"];
  const MEDALS = ["JPA Medal", "100 Flag Medal", "Superior Cadet Medal"];

  const supplyOptions = {
    "Uniform Components": ["Class A Jacket (Male)", "Class A Jacket (Female)", "Class B Shirt (Male)", "Class B Shirt (Female)", "Male Pants", "Female Pants"],
    "OCP Gear": ["OCP Shirt", "OCP Jacket", "OCP Pants", "OCP Belt"],
    "Accoutrements": ["Ribbons", "Medals", "Arcs", "Unit Crest", "Rank Insignia"],
    "PT Gear": ["PT Shirt", "PT Shorts"]
  };

  const detailOptions = {
    "Ribbons": OFFICIAL_RIBBONS,
    "Medals": MEDALS,
    "Arcs": ARCS,
    "Rank Insignia": JROTC_RANKS,
    "Uniform Components": ["34S", "34R", "36S", "36R", "38R", "38L", "40R", "42R", "14.5 Neck", "15.5 Neck", "Size 2 (F)", "Size 4 (F)", "Size 6 (F)"],
    "OCP Gear": ["XS-R", "S-R", "M-R", "L-R", "L-L"],
    "PT Gear": ["Small", "Medium", "Large", "XL"]
  };

  // --- ACTIONS ---

  // Stage 1 → 2: S4/XO/BC/CSM approve a pending request.
  // Sends email to the requester so they know their item was approved.
  const handleApprove = async (req) => {
    if (!canApprove) {
      showNotify("Access Denied: Only S-4, XO, or Command can approve requests.", "error");
      return;
    }
    if (req.status !== 'Pending') return;
    await updateDoc(doc(db, "uniform_requests", req.id), { status: 'Approved' });
    showNotify("Request marked as Approved");

    // Best-effort notification — a failed email doesn't undo the status change.
    if (req.requestedByEmail) {
      try {
        const idToken = await auth.currentUser.getIdToken();
        await fetch('/api/admin-update-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({
            type: 'notify-uniform-issued',
            targetUid: auth.currentUser.uid,
            toEmail: req.requestedByEmail,
            cadetName: req.cadetName,
            item: req.item,
            detail: req.detail
          })
        });
      } catch (err) {
        console.error('Uniform-approved notification failed:', err);
      }
    }
  };

  // Stage 2 → 3: the person who submitted the request confirms they received the item.
  const handleMarkIssued = async (req) => {
    if (req.requestedByUid !== auth.currentUser?.uid) {
      showNotify("Only the person who submitted this request can mark it as received.", "error");
      return;
    }
    if (req.status !== 'Approved') return;
    await updateDoc(doc(db, "uniform_requests", req.id), { status: 'Issued' });
    showNotify("Item marked as Received!");
  };

  const handleDelete = async (id) => {
    if (!canApprove) return;
    await deleteDoc(doc(db, "uniform_requests", id));
    setDeleteConfirm(null);
    showNotify("Request permanently deleted", "error");
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!canRequest) return;

    const finalIssuedBy = formData.issuedBy || userProfile?.fullName;
    
    if (!finalIssuedBy || !formData.cadetName || !formData.company || !formData.item || (formData.item !== "Unit Crest" && !formData.detail)) {
      showNotify("Incomplete Information.", "error");
      return;
    }

    try {
      await addDoc(collection(db, "uniform_requests"), {
        ...formData,
        issuedBy: finalIssuedBy,
        status: 'Pending',
        timestamp: serverTimestamp(),
        // uid used to gate the "Mark as Issued" button (only the submitter can confirm receipt).
        requestedByUid: auth.currentUser?.uid || null,
        // Email used to notify non-approvers when S4/XO approves their request.
        requestedByEmail: !canApprove ? (userProfile?.email || null) : null
      });
      setShowModal(false);
      setFormData(prev => ({ 
        ...prev, 
        cadetName: '', 
        item: '', 
        detail: '', 
        notes: '' 
      }));
      showNotify("Request Logged Successfully!");
    } catch (err) {
      console.error("Uniform request save failed:", err);
      showNotify("System Error.", "error");
    }
  };

  const getDetailLabel = () => {
    if (formData.item === "Ribbons") return "Select Ribbon Name";
    if (formData.item === "Medals") return "Select Medal Type";
    if (formData.item === "Arcs") return "Select Arc Name";
    if (formData.item === "Rank Insignia") return "Select Rank Level";
    return "Select Size / Specification";
  };

  // Personal-view users: neither requesters nor approvers
  const isPersonalView = !canRequest && !canApprove && !isHighCommand && !isCompanyLeadership;

  const filteredRequests = requests.filter(req => {
    const matchesFilter = req.status === filter;
    const matchesSearch = req.cadetName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          req.item?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // ── PERSONAL VIEW ─────────────────────────────────────────────────────────────
  if (isPersonalView) {
    const STATUS_COLORS = {
      Pending:  'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20',
      Approved: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
      Issued:   'bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20',
    };
    return (
      <div className="flex-1 text-slate-900 dark:text-slate-100">
        <main className="p-6 md:p-10 max-w-7xl">
          <div className="mb-8">
            <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
              Uniform <span className="text-yellow-500">Items</span>
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 mt-1">
              My Requests · {userProfile?.fullName || 'Cadet'}
            </p>
          </div>

          {!userProfile ? (
            <div className="flex items-center justify-center py-24">
              <Clock size={32} className="text-yellow-500 animate-spin" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl">
              <Shirt className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={36} />
              <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No requests on file</p>
              <p className="text-slate-400 text-xs mt-2 max-w-xs mx-auto">
                When your S4 assistant logs a uniform request for you, it will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...requests]
                .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0))
                .map(req => (
                  <div key={req.id} className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-slate-900 dark:text-white text-sm truncate">{req.item}{req.detail ? ` — ${req.detail}` : ''}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Logged by {req.issuedBy || '—'} · {req.timestamp?.toDate
                          ? req.timestamp.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—'}
                      </p>
                      {req.notes && <p className="text-xs text-slate-500 mt-1 italic">{req.notes}</p>}
                    </div>
                    <span className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-xl shrink-0 ${STATUS_COLORS[req.status] || STATUS_COLORS.Pending}`}>
                      {req.status}
                    </span>
                  </div>
                ))}
            </div>
          )}
          <Footer />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 pt-24 font-sans">
      
      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div initial={{ opacity: 0, y: -50, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -50, x: '-50%' }} className={`fixed top-10 left-1/2 z-[200] flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border-l-4 ${notification.type === 'error' ? 'bg-slate-900 border-red-500 text-red-400' : 'bg-slate-900 border-yellow-500 text-yellow-500'}`}>
            {notification.type === 'error' ? <AlertCircle size={18}/> : <Bell size={18}/>}
            <span className="text-[11px] font-black uppercase tracking-wider">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 border border-white/10 p-8 rounded-[2rem] max-w-sm w-full text-center">
              <div className="bg-red-500/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-black uppercase italic mb-2">Delete Record?</h3>
              <p className="text-slate-400 text-xs font-bold mb-6 uppercase tracking-tight">This action will permanently remove this logistics record.</p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 rounded-xl bg-white/5 font-black uppercase text-[10px]">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="flex-1 py-3 rounded-xl bg-red-600 font-black uppercase text-[10px]">Delete</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <Link to="/admin/dashboard" className="text-yellow-500 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-2 hover:opacity-70 transition-all">
            <ArrowLeft size={14} /> Back to Command
          </Link>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
            <Package className="text-yellow-500" /> <ScrambleText text="Uniform Items" trigger="mount" />
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative mr-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text"
              placeholder="Search Records..."
              className="bg-slate-900 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs focus:border-yellow-500 outline-none w-48"
              onChange={(e) => setSearchTerm(e.target.value || '')}
            />
          </div>
          {canRequest && (
            <button onClick={() => setShowModal(true)} className="bg-yellow-500 text-slate-950 px-6 py-2.5 rounded-xl text-xs font-black uppercase hover:bg-yellow-400 transition-all flex items-center gap-2 shadow-lg shadow-yellow-500/10">
              <Plus size={16} /> Request Issuance
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto mb-6 flex bg-slate-900/50 p-1 rounded-xl w-fit border border-white/5">
        {['Pending', 'Approved', 'Issued'].map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${filter === s ? 'bg-yellow-500 text-slate-950' : 'text-slate-500 hover:text-slate-300'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRequests.map((req) => (
          <div key={req.id} className="bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden group transition-all hover:border-white/10">
            <div className={`absolute top-0 left-0 w-1 h-full ${req.status === 'Pending' ? 'bg-yellow-500' : req.status === 'Approved' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-black text-lg uppercase tracking-tighter">{req.cadetName}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase">Issued By: {req.issuedBy || "S-4 Staff"}</p>
              </div>
              {canApprove && (
                <button title="Delete request" onClick={() => setDeleteConfirm(req.id)} className="text-slate-700 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
              )}
            </div>
            
            <div className="bg-black/20 rounded-xl p-4 mb-6 border border-white/5">
              <p className="text-[10px] font-black uppercase text-yellow-500 mb-1">Item Info</p>
              <p className="text-sm font-bold text-slate-200">{req.item}</p>
              <div className="flex justify-between mt-3 pt-3 border-t border-white/5">
                <span className="text-[10px] text-slate-400 font-bold uppercase">{req.detail || 'Standard Issue'}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{req.company}</span>
              </div>
            </div>

            {(() => {
              const isRequester = req.requestedByUid === auth.currentUser?.uid;
              if (canApprove && req.status === 'Pending') {
                return (
                  <button onClick={() => handleApprove(req)} className="w-full py-3 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 bg-yellow-500 text-slate-950 hover:bg-yellow-400 transition-all">
                    <Clock size={14} /> Mark as Approved
                  </button>
                );
              }
              if (isRequester && req.status === 'Approved') {
                return (
                  <button onClick={() => handleMarkIssued(req)} className="w-full py-3 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/20 transition-all">
                    <CheckCircle2 size={14} /> Mark as Received
                  </button>
                );
              }
              if (req.status === 'Issued') {
                return (
                  <div className="w-full py-3 rounded-xl font-black uppercase text-[10px] text-center text-green-500 flex items-center justify-center gap-2">
                    <CheckCircle2 size={14} /> Item Received
                  </div>
                );
              }
              if (req.status === 'Approved') {
                return (
                  <div className="w-full py-3 rounded-xl font-black uppercase text-[10px] text-center border border-white/5 text-blue-400">
                    Approved — Awaiting Receipt
                  </div>
                );
              }
              return (
                <div className="w-full py-3 rounded-xl font-black uppercase text-[10px] text-center border border-white/5 text-yellow-500/40">
                  Awaiting S-4 Approval
                </div>
              );
            })()}
          </div>
        ))}
      </div>

      {/* ISSUANCE MODAL */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowModal(false)} className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-slate-900 border border-white/10 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-10 overflow-y-auto max-h-[90vh]">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Request for Issuance</h2>
                <button title="Close" onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><X /></button>
              </div>

              <form onSubmit={handleSubmitRequest} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center gap-1">
                    <UserCheck size={12}/> Issued By
                  </label>
                  <input 
                    readOnly
                    className="w-full bg-black/30 border border-white/5 p-3 rounded-xl text-sm outline-none text-slate-400 cursor-not-allowed"
                    value={userProfile?.fullName || ''}
                    onChange={e => setFormData({...formData, issuedBy: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* FIX 3: RECIPIENT NAME NOW TYPABLE */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-yellow-500 ml-1">
                      Recipient Cadet
                    </label>
                    <input 
                      placeholder="Type Cadet Name" 
                      className="w-full bg-black/50 border border-white/10 p-3 rounded-xl text-sm text-white outline-none focus:border-yellow-500" 
                      value={formData.cadetName} 
                      onChange={e => setFormData({...formData, cadetName: e.target.value})} 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1">
                      Company
                    </label>
                    <select 
                      className="w-full bg-black/50 border border-white/10 p-3 rounded-xl text-sm text-white" 
                      value={formData.company} 
                      onChange={e => setFormData({...formData, company: e.target.value || COMPANIES[0] || 'Zulu'})}
                    >
                      {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Select Item</label>
                  <select className="w-full bg-black/50 border border-white/10 p-3 rounded-xl text-sm text-white" value={formData.item || ''} onChange={e => setFormData({...formData, item: e.target.value || '', detail: ''})}>
                    <option value="">Choose Supply...</option>
                    {Object.entries(supplyOptions).map(([cat, items]) => (
                      <optgroup key={cat} label={cat}>
                        {items.map(i => <option key={i} value={i}>{i}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {formData.item && formData.item !== "Unit Crest" && (
                  <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-yellow-500 ml-1 flex items-center gap-1"><Target size={10}/> {getDetailLabel()}</label>
                    <select className="w-full bg-black/50 border border-yellow-500/20 p-3 rounded-xl text-sm text-white focus:border-yellow-500" value={formData.detail || ''} onChange={e => setFormData({...formData, detail: e.target.value || ''})}>
                      <option value="">Select Option...</option>
                      {(detailOptions[formData.item] || detailOptions[Object.keys(supplyOptions).find(cat => supplyOptions[cat].includes(formData.item))])?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </motion.div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1">Logistics Notes</label>
                  <textarea placeholder="Reason for issuance or size requests..." className="w-full h-24 bg-black/50 border border-white/10 p-3 rounded-xl text-sm outline-none" value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value || ''})} />
                </div>

                <button type="submit" className="w-full bg-yellow-500 text-slate-950 font-black uppercase py-4 rounded-2xl hover:bg-yellow-400 transition-all shadow-xl shadow-yellow-500/10">
                  {canApprove ? "Log Request" : "Submit Request to S-4"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <Footer />
    </div>
  );
};

export default UniformRequests;