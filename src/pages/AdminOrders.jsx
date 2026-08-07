import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  where,
  onSnapshot,
  deleteDoc,
  doc
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { ROLE_HIERARCHY, EVENT_TYPES, STAFF_LEVEL } from '../constants';
import {
  Send,
  Calendar,
  Bell,
  CheckCircle,
  ArrowLeft,
  Check,
  Trash2,
  RefreshCcw,
  Clock,
  AlertTriangle,
  X,
  Target
} from 'lucide-react';
import Footer from '../components/Footer';

const AdminOrders = () => {
  const { userData, role } = useAuth();
  const [mode, setMode] = useState('order'); 
  const [status, setStatus] = useState({ loading: false, success: false });
  const [recentItems, setRecentItems] = useState([]);
  
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });
  const [errorMessage, setErrorMessage] = useState(null);

  const [orderText, setOrderText] = useState('');
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [eventData, setEventData] = useState({
    title: '',
    date: '',
    location: '',
    type: 'Inspection'
  });

  const targetOptions = [
    `${userData?.company} Company`,
  ];

  if ((ROLE_HIERARCHY[role] || 0) >= STAFF_LEVEL) {
    if (!targetOptions.includes("All Battalion")) {
      targetOptions.unshift("All Battalion", "Staff", "Top 4");
    }
  }

  useEffect(() => {
    if (!userData?.company) return;
    const collectionName = mode === 'order' ? "orders" : "events";
    const userLevel = ROLE_HIERARCHY[role] || 0;

    // Staff+ get full battalion visibility (they need the whole audit trail).
    // Below that, orders are scoped to what this user was actually targeted
    // by, same list MyDuties.jsx uses - a Company Commander shouldn't see
    // "Staff"/"Top 4"-only orders or another company's orders. Events stay
    // unfiltered: they're already fully public on the unauthenticated
    // /events calendar, so there's no scoping to enforce here.
    const q = collectionName === 'orders' && userLevel < STAFF_LEVEL
      ? query(
          collection(db, "orders"),
          where("targets", "array-contains-any", [
            "All Battalion",
            userData.company,
            `${userData.company} Company`,
            userData.position,
            "All"
          ].filter(Boolean)),
          orderBy("timestamp", "desc")
        )
      : query(collection(db, collectionName), orderBy("timestamp", "desc"));

    const unsub = onSnapshot(q, (snapshot) => {
      setRecentItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 5));
    });
    return () => unsub();
  }, [mode, role, userData?.company, userData?.position]);

  const toggleTarget = (target) => {
    setSelectedTargets(prev => 
      prev.includes(target) ? prev.filter(t => t !== target) : [...prev, target]
    );
  };

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  const requestDelete = (item) => {
    const userWeight = ROLE_HIERARCHY[role] || 0;
    const issuerWeight = ROLE_HIERARCHY[item.issuerRole] ?? 0;

    if (userWeight < issuerWeight) {
      showError("RANK INSUFFICIENT: Cannot delete higher-echelon transmissions.");
      return;
    }

    // Rank alone isn't enough below staff level - a Company Commander in
    // one company shouldn't be able to delete another company's orders
    // just because they outrank that company's issuer.
    const sameCompany = !item.company || item.company === "Battalion" || item.company === userData?.company;
    if (userWeight < STAFF_LEVEL && !sameCompany) {
      showError("ACCESS DENIED: Outside your company's transmissions.");
      return;
    }

    setDeleteConfirm({ show: true, id: item.id });
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, mode === 'order' ? "orders" : "events", deleteConfirm.id));
      setDeleteConfirm({ show: false, id: null });
    } catch {
      showError("Sync Error: Deletion failed.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedTargets.length === 0) return showError("Operational Error: Select at least one target.");
    if (mode === 'order' && !orderText.trim()) return showError("Operational Error: Order content cannot be empty.");

    setStatus({ loading: true, success: false });

    try {
      const collectionName = mode === 'order' ? "orders" : "events";
      const payload = mode === 'order' ? {
        content: orderText,
        targets: selectedTargets,
        issuer: `${userData?.rank} ${userData?.fullName || userData?.name}`,
        issuerRole: role,
        company: userData?.company || "Battalion",
        timestamp: serverTimestamp(),
        active: true
      } : {
        ...eventData,
        targets: selectedTargets,
        issuer: `${userData?.rank} ${userData?.fullName || userData?.name}`,
        issuerRole: role,
        company: userData?.company || "Battalion",
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, collectionName), payload);
      setOrderText('');
      setEventData({ title: '', date: '', location: '', type: 'Inspection' });
      setSelectedTargets([]);
      setStatus({ loading: false, success: true });
      setTimeout(() => setStatus({ loading: false, success: false }), 3000);
    } catch {
      setStatus({ loading: false, success: false });
      showError("System Error: Failed to publish transmission.");
    }
  };

  return (
    /* REMOVED ml-64 TO DELETE THE SIDEBAR SPACE */
    <div className="min-h-screen bg-blue-50 dark:bg-slate-950 pt-12 pb-20 px-6 relative overflow-x-hidden transition-colors duration-300">
      
      {/* ERROR TOAST */}
      {errorMessage && (
        <div className="fixed top-8 right-8 z-[110] flex items-center gap-4 bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-300">
          <AlertTriangle size={20} />
          <p className="text-[10px] font-black uppercase tracking-widest">{errorMessage}</p>
          <button onClick={() => setErrorMessage(null)} className="ml-4 hover:rotate-90 transition-transform">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <Link to="/admin/dashboard" className="flex items-center gap-2 text-blue-400 dark:text-slate-500 hover:text-yellow-500 transition-colors mb-8 text-[10px] font-black uppercase tracking-[0.2em]">
          <ArrowLeft size={14} /> Back to Command
        </Link>

        {/* HEADER */}
        <header className="mb-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="w-full md:w-auto text-center md:text-left">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">
              Orders <span className="text-yellow-500">& Events</span>
            </h1>
            <p className="text-blue-300 dark:text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] mt-3">
              Authorized Personnel | {userData?.company || "Battalion"}
            </p>
          </div>

          <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-blue-100 dark:border-white/5 shadow-sm">
            <button type="button" onClick={() => setMode('order')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${mode === 'order' ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}>
              <Bell size={14} /> Issue Order
            </button>
            <button type="button" onClick={() => setMode('event')}
              className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${mode === 'event' ? 'bg-yellow-500 text-slate-950 shadow-lg shadow-yellow-500/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'}`}>
              <Calendar size={14} /> Create Event
            </button>
          </div>
        </header>

        {/* MAIN INPUT CARD */}
        <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/10 rounded-[2.5rem] p-8 md:p-10 shadow-xl transition-all">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="flex items-center gap-2 text-[10px] font-black text-blue-400 dark:text-slate-500 uppercase tracking-widest mb-4">
                <Target size={14} className="text-yellow-500" /> Target Audience
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {targetOptions.map((t) => (
                  <button key={t} type="button" onClick={() => toggleTarget(t)}
                    className={`px-3 py-3.5 rounded-2xl text-[9px] font-bold uppercase transition-all border-2 flex items-center justify-between ${
                      selectedTargets.includes(t) 
                        ? 'bg-blue-50/50 border-yellow-500 text-yellow-500 dark:bg-yellow-500/10' 
                        : 'bg-white dark:bg-slate-950 border-blue-50 dark:border-white/5 text-slate-400 hover:border-blue-100'
                    }`}
                  >
                    <span className="truncate mr-1">{t}</span>
                    {selectedTargets.includes(t) && <Check size={12} strokeWidth={3} className="flex-shrink-0" />}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'order' ? (
              <textarea 
                value={orderText} 
                onChange={(e) => setOrderText(e.target.value)}
                className="w-full bg-blue-50/30 dark:bg-black/40 border-2 border-blue-50 dark:border-white/5 rounded-3xl p-6 text-slate-900 dark:text-white text-sm focus:border-yellow-500 focus:bg-white outline-none transition-all min-h-[160px] placeholder:text-blue-200 font-medium shadow-inner"
                placeholder="Enter battalion orders for broadcast..." 
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input 
                  className="bg-blue-50/30 dark:bg-black/40 border-2 border-blue-50 dark:border-white/5 rounded-2xl p-4 text-slate-900 dark:text-white text-sm focus:border-yellow-500 focus:bg-white outline-none placeholder:text-blue-200 transition-all shadow-inner" 
                  placeholder="Event Title" 
                  value={eventData.title} 
                  onChange={(e) => setEventData({...eventData, title: e.target.value})} 
                />
                <input 
                  type="date"
                  className="bg-blue-50/30 dark:bg-black/40 border-2 border-blue-50 dark:border-white/5 rounded-2xl p-4 text-slate-400 text-sm focus:border-yellow-500 focus:bg-white outline-none transition-all shadow-inner" 
                  value={eventData.date} 
                  onChange={(e) => setEventData({...eventData, date: e.target.value})} 
                />
                <input 
                  className="bg-blue-50/30 dark:bg-black/40 border-2 border-blue-50 dark:border-white/5 rounded-2xl p-4 text-slate-900 dark:text-white text-sm focus:border-yellow-500 focus:bg-white outline-none placeholder:text-blue-200 transition-all shadow-inner" 
                  placeholder="Location" 
                  value={eventData.location} 
                  onChange={(e) => setEventData({...eventData, location: e.target.value})} 
                />
                <select 
                  className="bg-blue-50/30 dark:bg-black/40 border-2 border-blue-50 dark:border-white/5 rounded-2xl p-4 text-slate-900 dark:text-white text-sm focus:border-yellow-500 focus:bg-white outline-none transition-all shadow-inner" 
                  value={eventData.type} 
                  onChange={(e) => setEventData({...eventData, type: e.target.value})}
                >
                  {EVENT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            )}

            <button 
              disabled={status.loading} 
              className={`w-full font-black uppercase py-5 rounded-2xl transition-all flex items-center justify-center gap-3 shadow-xl transform active:scale-[0.98] ${
                status.success 
                  ? 'bg-green-500 text-white shadow-green-500/20' 
                  : 'bg-yellow-500 text-slate-950 hover:bg-yellow-400 shadow-yellow-500/30 disabled:opacity-50'
              }`}
            >
              {status.loading ? <RefreshCcw className="animate-spin" size={20} /> : status.success ? <CheckCircle size={20} /> : <Send size={20} />}
              {status.loading ? "Synchronizing..." : status.success ? "Published" : "Execute Transmission"}
            </button>
          </form>
        </div>

        {/* LOG HISTORY */}
        <div className="mt-16 space-y-6">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-blue-300 dark:text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
              <Clock size={14} /> Recent Log
            </h3>
            <div className="h-px flex-1 bg-blue-100 dark:bg-white/5 mx-4"></div>
          </div>
          
          <div className="grid gap-4">
            {recentItems.map((item) => (
              <div key={item.id} className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 p-6 rounded-[2rem] flex justify-between items-center group transition-all hover:border-yellow-500/30 shadow-sm">
                <div className="max-w-[80%] pl-4 border-l-[3px] border-yellow-500 rounded-sm">
                  <p className="text-sm text-slate-800 dark:text-slate-200 font-bold mb-1.5 leading-tight">
                    {mode === 'order' ? item.content : item.title}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 items-center">
                    <span className="text-[9px] font-black text-yellow-500 uppercase tracking-widest">Targets: {item.targets?.join(', ')}</span>
                    <span className="text-[9px] text-blue-300 dark:text-slate-600 font-bold uppercase tracking-widest">| By: {item.issuer}</span>
                  </div>
                </div>
                
                {((ROLE_HIERARCHY[role] || 0) >= (ROLE_HIERARCHY[item.issuerRole] || 0)) && (
                  <button
                    title="Delete this transmission"
                    onClick={() => requestDelete(item)}
                    className="p-3.5 text-slate-300 dark:text-slate-700 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-2xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* DELETE CONFIRMATION MODAL */}
        {deleteConfirm.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-blue-100/20 dark:bg-slate-950/80 animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 p-8 rounded-[2rem] max-w-sm w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200 text-center">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-500"></div>
              <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-2">Confirm <span className="text-red-500">Destruction</span></h3>
              <p className="text-blue-300 dark:text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-8 leading-relaxed px-4">This transmission will be permanently scrubbed. This action cannot be undone.</p>
              <div className="flex flex-col gap-3">
                <button onClick={confirmDelete} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl transition-all shadow-xl shadow-red-600/20">Confirm Destruction</button>
                <button onClick={() => setDeleteConfirm({ show: false, id: null })} className="w-full py-4 bg-blue-50 dark:bg-slate-800 text-blue-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-[0.2em] rounded-xl transition-all">Abort Mission</button>
              </div>
            </div>
          </div>
        )}

      </div>
      <Footer />
    </div>
  );
};

export default AdminOrders;