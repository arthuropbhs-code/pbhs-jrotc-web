import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { ROLE_HIERARCHY, EVENT_TYPES } from '../constants';
import { 
  Send, 
  Calendar, 
  Bell, 
  CheckCircle, 
  MapPin, 
  Tag, 
  ChevronLeft,
  Check,
  Trash2,
  RefreshCcw,
  Clock,
  AlertTriangle,
  X
} from 'lucide-react';

const AdminOrders = () => {
  const { userData, role } = useAuth();
  const [mode, setMode] = useState('order'); 
  const [status, setStatus] = useState({ loading: false, success: false });
  const [recentItems, setRecentItems] = useState([]);
  
  // Custom UI State
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });
  const [errorMessage, setErrorMessage] = useState(null);

  // Form State
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
    "Platoon 1",
    "Platoon 2",
    "Platoon Leaders",
    "Platoon Sergeants",
    "Squad Leaders",
    "Squad Members"
  ];

  if (role === 'battalion_4' || role === 'battalion_staff') {
    if (!targetOptions.includes("All Battalion")) {
      targetOptions.unshift("All Battalion", "Staff", "Top 4");
    }
  }

  useEffect(() => {
    const collectionName = mode === 'order' ? "orders" : "events";
    const q = query(collection(db, collectionName), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setRecentItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })).slice(0, 5));
    });
    return () => unsub();
  }, [mode]);

  const toggleTarget = (target) => {
    setSelectedTargets(prev => 
      prev.includes(target) ? prev.filter(t => t !== target) : [...prev, target]
    );
  };

  const showError = (msg) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(null), 4000);
  };

  // SECURITY: Check rank before showing delete modal
  const requestDelete = (item) => {
    const userWeight = ROLE_HIERARCHY[role] || 0;
    // Using ?? 0 ensures legacy items (no issuerRole) are treated as level 0
    const issuerWeight = ROLE_HIERARCHY[item.issuerRole] ?? 0;

    // ALLOW delete if user is higher OR equal rank
    if (userWeight >= issuerWeight) {
      setDeleteConfirm({ show: true, id: item.id });
    } else {
      showError("RANK INSUFFICIENT: Cannot delete higher-echelon transmissions.");
    }
  };

  const confirmDelete = async () => {
    try {
      await deleteDoc(doc(db, mode === 'order' ? "orders" : "events", deleteConfirm.id));
      setDeleteConfirm({ show: false, id: null });
    } catch (error) {
      showError("Sync Error: Deletion failed.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedTargets.length === 0) {
      showError("Operational Error: Select at least one target.");
      return;
    }

    if (mode === 'order' && !orderText.trim()) {
      showError("Operational Error: Order content cannot be empty.");
      return;
    }

    setStatus({ loading: true, success: false });

    try {
      const collectionName = mode === 'order' ? "orders" : "events";
      const payload = mode === 'order' ? {
        content: orderText,
        targets: selectedTargets,
        issuer: `${userData?.rank} ${userData?.name}`,
        issuerRole: role,
        company: userData?.company || "Battalion",
        timestamp: serverTimestamp(),
        active: true
      } : {
        ...eventData,
        targets: selectedTargets,
        issuer: `${userData?.rank} ${userData?.name}`,
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
    } catch (error) {
      setStatus({ loading: false, success: false });
      showError("System Error: Failed to publish transmission.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-12 pb-20 px-6 ml-64 relative overflow-x-hidden">
      
      {/* ERROR TOAST NOTIFICATION */}
      {errorMessage && (
        <div className="fixed top-8 right-8 z-[110] flex items-center gap-4 bg-red-600 text-white px-6 py-4 rounded-2xl shadow-2xl shadow-red-600/20 animate-in slide-in-from-right duration-300">
          <AlertTriangle size={20} />
          <p className="text-[10px] font-black uppercase tracking-widest">{errorMessage}</p>
          <button onClick={() => setErrorMessage(null)} className="ml-4 hover:rotate-90 transition-transform">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        <Link to="/admin/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-yellow-500 transition-colors mb-8 text-[10px] font-black uppercase tracking-[0.2em]">
          <ChevronLeft size={14} /> Back to Command Dashboard
        </Link>

        {/* HEADER SECTION */}
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
              Command <span className="text-yellow-500">Ops</span>
            </h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-2 tracking-[0.3em]">
              Authorized Personnel | {userData?.company}
            </p>
          </div>

          <div className="flex bg-slate-900 p-1 rounded-xl border border-white/5 shadow-2xl">
            <button type="button" onClick={() => setMode('order')}
              className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${mode === 'order' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-slate-500 hover:text-white'}`}>
              <Bell size={14} /> Issue Order
            </button>
            <button type="button" onClick={() => setMode('event')}
              className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-2 ${mode === 'event' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : 'text-slate-400 hover:text-white'}`}>
              <Calendar size={14} /> Create Event
            </button>
          </div>
        </header>

        {/* MAIN INPUT CARD */}
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 backdrop-blur-md shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Target Audience</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {targetOptions.map((t) => (
                  <button key={t} type="button" onClick={() => toggleTarget(t)}
                    className={`px-3 py-3 rounded-xl text-[9px] font-bold uppercase transition-all border flex items-center justify-between ${selectedTargets.includes(t) ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500' : 'bg-slate-950 border-white/5 text-slate-500'}`}>
                    {t} {selectedTargets.includes(t) && <Check size={12} />}
                  </button>
                ))}
              </div>
            </div>

            {mode === 'order' ? (
              <textarea value={orderText} onChange={(e) => setOrderText(e.target.value)}
                className="w-full bg-slate-950 border border-white/5 rounded-2xl p-6 text-white text-sm focus:border-yellow-500 outline-none transition-all min-h-[150px] shadow-inner"
                placeholder="Enter battalion orders..." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input className="bg-slate-950 border border-white/5 rounded-xl p-4 text-white text-sm focus:border-yellow-500 outline-none" placeholder="Event Title" value={eventData.title} onChange={(e) => setEventData({...eventData, title: e.target.value})} />
                <input type="date" className="bg-slate-950 border border-white/5 rounded-xl p-4 text-white text-sm text-slate-400 focus:border-yellow-500 outline-none" value={eventData.date} onChange={(e) => setEventData({...eventData, date: e.target.value})} />
                <input className="bg-slate-950 border border-white/5 rounded-xl p-4 text-white text-sm focus:border-yellow-500 outline-none" placeholder="Location" value={eventData.location} onChange={(e) => setEventData({...eventData, location: e.target.value})} />
                <select className="bg-slate-950 border border-white/5 rounded-xl p-4 text-white text-sm focus:border-yellow-500 outline-none" value={eventData.type} onChange={(e) => setEventData({...eventData, type: e.target.value})}>
                  {EVENT_TYPES.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            )}

            <button disabled={status.loading} className={`w-full font-black uppercase py-5 rounded-2xl transition-all flex items-center justify-center gap-3 ${status.success ? 'bg-green-500 text-white' : 'bg-yellow-500 text-slate-950 hover:bg-yellow-400 disabled:opacity-50'}`}>
              {status.loading ? <RefreshCcw className="animate-spin" size={20} /> : status.success ? <CheckCircle size={20} /> : <Send size={20} />}
              {status.loading ? "Synchronizing..." : status.success ? "Published" : "Execute Transmission"}
            </button>
          </form>
        </div>

        {/* LOG HISTORY */}
        <div className="mt-12 space-y-6">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center gap-2">
            <Clock size={14} /> Recent Log
          </h3>
          <div className="grid gap-3">
            {recentItems.map((item) => (
              <div key={item.id} className="bg-slate-900/80 border border-white/5 p-5 rounded-2xl flex justify-between items-center group transition-all hover:border-red-500/20">
                <div className="max-w-[80%]">
                  <p className="text-sm text-slate-200 font-medium mb-1 truncate">{mode === 'order' ? item.content : item.title}</p>
                  <div className="flex gap-3 items-center mt-1">
                    <span className="text-[8px] font-black text-yellow-500/80 uppercase tracking-widest">Targets: {item.targets?.join(', ')}</span>
                    <span className="text-[7px] text-slate-600 font-bold uppercase tracking-widest">| By: {item.issuer}</span>
                  </div>
                </div>
                
                {/* Trash icon logic based on ROLE_HIERARCHY */}
                {/* Trash icon logic */}
{((ROLE_HIERARCHY[role] || 0) >= (ROLE_HIERARCHY[item.issuerRole] || 0)) && (
  <button 
    onClick={() => requestDelete(item)} 
    className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all shadow-xl"
  >
    <Trash2 size={16} />
  </button>
)}
              </div>
            ))}
          </div>
        </div>

        {/* CUSTOM DELETE MODAL */}
        {deleteConfirm.show && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-slate-950/80 animate-in fade-in duration-300">
            <div className="bg-slate-900 border border-white/5 p-8 rounded-3xl max-w-sm w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
              <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 mb-6 mx-auto">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-black text-white text-center uppercase italic tracking-tighter mb-2">Confirm <span className="text-red-500">Destruction</span></h3>
              <p className="text-slate-400 text-[10px] text-center font-bold uppercase tracking-[0.2em] mb-8 leading-relaxed px-4">This transmission will be permanently scrubbed. This action cannot be undone.</p>
              <div className="flex flex-col gap-3">
                <button onClick={confirmDelete} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black uppercase text-[10px] tracking-[0.2em] rounded-xl transition-all shadow-xl shadow-red-600/20">Confirm Destruction</button>
                <button onClick={() => setDeleteConfirm({ show: false, id: null })} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-slate-400 font-black uppercase text-[10px] tracking-[0.2em] rounded-xl transition-all">Abort Mission</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminOrders;