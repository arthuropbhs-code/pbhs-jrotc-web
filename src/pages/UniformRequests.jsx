import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, updateDoc, deleteDoc, doc, orderBy, query } from 'firebase/firestore';
import { Shirt, CheckCircle2, Clock, Trash2, ArrowLeft, Search, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const UniformRequests = () => {
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('Pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [showRegs, setShowRegs] = useState(false); // Toggle for regulations

  useEffect(() => {
    const q = query(collection(db, "uniform_requests"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const handleToggleStatus = async (id, currentStatus) => {
    const newStatus = currentStatus === 'Pending' ? 'Completed' : 'Pending';
    await updateDoc(doc(db, "uniform_requests", id), { status: newStatus });
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this request?")) {
      await deleteDoc(doc(db, "uniform_requests", id));
    }
  };

  const filteredRequests = requests.filter(req => {
    const matchesFilter = req.status === filter;
    const matchesSearch = req.cadetName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          req.item?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link to="/admin/dashboard" className="text-yellow-500 flex items-center gap-2 text-sm font-bold mb-2 hover:underline">
            <ArrowLeft size={16} /> Back to Command
          </Link>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
            <Shirt className="text-yellow-500" /> Supply Room
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowRegs(!showRegs)}
            className="flex items-center gap-2 bg-slate-900 border border-white/10 px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/5 transition-all"
          >
            <BookOpen size={16} /> {showRegs ? "Hide Regs" : "View Regs"}
          </button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text"
              placeholder="Search Cadet..."
              className="bg-slate-900 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm focus:border-yellow-500 outline-none transition-all"
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-slate-900 p-1 rounded-xl border border-white/5">
            {['Pending', 'Completed'].map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${filter === s ? 'bg-yellow-500 text-slate-950' : 'text-slate-500 hover:text-white'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Regulations Section (Conditional) */}
      <AnimatePresence>
        {showRegs && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="max-w-6xl mx-auto mb-12 overflow-hidden"
          >
            <div className="bg-white p-8 rounded-3xl shadow-xl text-slate-900 grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-xl font-black uppercase italic mb-4 border-b-2 border-yellow-500 inline-block">Male Standards</h2>
                <ul className="space-y-2 text-sm font-medium text-slate-600">
                  <li className="flex gap-2"><span>•</span> Hair: Neat appearance, not touching ears/collar.</li>
                  <li className="flex gap-2"><span>•</span> Shaving: Face must be clean-shaven.</li>
                  <li className="flex gap-2"><span>•</span> Gigline: Belt, shirt, and fly must be aligned.</li>
                </ul>
              </div>
              <div>
                <h2 className="text-xl font-black uppercase italic mb-4 border-b-2 border-yellow-500 inline-block">Female Standards</h2>
                <ul className="space-y-2 text-sm font-medium text-slate-600">
                  <li className="flex gap-2"><span>•</span> Hair: Must not fall below bottom edge of collar.</li>
                  <li className="flex gap-2"><span>•</span> Jewelry: Gold, silver, or pearl studs only.</li>
                  <li className="flex gap-2"><span>•</span> Cosmetics: Professional and conservative.</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Requests Grid */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRequests.length > 0 ? filteredRequests.map((req) => (
          <div key={req.id} className="bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-xl relative group">
            <div className={`absolute top-0 left-0 w-1 h-full ${req.status === 'Pending' ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-black text-lg leading-tight uppercase tracking-tighter">{req.cadetName}</h3>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{req.company} | {req.rank}</p>
              </div>
              <button onClick={() => handleDelete(req.id)} className="text-slate-700 hover:text-red-500"><Trash2 size={16} /></button>
            </div>
            <div className="bg-white/5 rounded-xl p-4 mb-6 border border-white/5">
              <p className="text-[10px] font-black uppercase text-yellow-500 mb-1">Requested Item</p>
              <p className="text-sm font-bold text-slate-200">{req.item}</p>
              {req.size && <p className="text-[10px] text-slate-400 font-bold mt-1">SIZE: {req.size}</p>}
            </div>
            <button 
              onClick={() => handleToggleStatus(req.id, req.status)}
              className={`w-full py-3 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 transition-all ${
                req.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-slate-950' : 'bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white'
              }`}
            >
              {req.status === 'Pending' ? <><Clock size={14} /> Mark Issued</> : <><CheckCircle2 size={14} /> Completed</>}
            </button>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center bg-slate-900/50 rounded-3xl border border-dashed border-white/10">
            <Shirt className="mx-auto text-slate-800 mb-4" size={48} />
            <p className="text-slate-500 font-bold italic">No {filter.toLowerCase()} requests found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UniformRequests;