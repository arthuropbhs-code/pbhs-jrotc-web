import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Megaphone, ShieldAlert, Trash2, Send, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const AdminAnnouncements = () => {
  const { userData, role } = useAuth();
  const [type, setType] = useState('announcement'); // 'announcement' or 'order'
  const [text, setText] = useState('');
  const [target, setTarget] = useState('All'); // For Announcements
  const [position, setPosition] = useState('S-1'); // For Orders
  const [expiryDate, setExpiryDate] = useState('');
  const [sent, setSent] = useState(false);
  const [existingItems, setExistingItems] = useState([]);

  const fetchData = async () => {
    // Fetch both to manage them in one list
    const annSnap = await getDocs(query(collection(db, "announcements"), orderBy("timestamp", "desc")));
    const ordSnap = await getDocs(query(collection(db, "orders"), orderBy("timestamp", "desc")));
    
    const combined = [
      ...annSnap.docs.map(d => ({ id: d.id, itemType: 'announcement', ...d.data() })),
      ...ordSnap.docs.map(d => ({ id: d.id, itemType: 'order', ...d.data() }))
    ];
    setExistingItems(combined.sort((a, b) => b.timestamp - a.timestamp));
  };

  useEffect(() => { fetchData(); }, []);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    const collectionName = type === 'announcement' ? "announcements" : "orders";
    
    try {
      await addDoc(collection(db, collectionName), {
        content: text,
        timestamp: serverTimestamp(),
        issuer: `${userData?.rank || ''} ${userData?.name || 'Staff'}`.trim(),
        target: type === 'announcement' ? target : position, // Position vs Company
        active: true,
        expiresAt: expiryDate ? new Date(expiryDate).getTime() : null,
      });
      setText('');
      setSent(true);
      fetchData();
      setTimeout(() => setSent(false), 3000);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (id, itemType) => {
    if (window.confirm("Permanent Delete?")) {
      await deleteDoc(doc(db, itemType === 'announcement' ? "announcements" : "orders", id));
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 pt-32 px-6 pb-20">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8">
        
        {/* --- POSTING FORM --- */}
        <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 shadow-2xl h-fit">
          <div className="flex gap-2 mb-8 bg-black/40 p-1 rounded-xl">
            <button 
              onClick={() => setType('announcement')}
              className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${type === 'announcement' ? 'bg-yellow-500 text-slate-950' : 'text-slate-500 hover:text-white'}`}
            >
              Battalion Announcement
            </button>
            <button 
              onClick={() => setType('order')}
              className={`flex-1 py-2 rounded-lg font-black text-[10px] uppercase tracking-widest transition-all ${type === 'order' ? 'bg-yellow-500 text-slate-950' : 'text-slate-500 hover:text-white'}`}
            >
              Direct Position Order
            </button>
          </div>

          <form onSubmit={handleBroadcast} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500">Distribution</label>
                {type === 'announcement' ? (
                  <select value={target} onChange={(e) => setTarget(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white">
                    <option value="All">All Companies</option>
                    <option value="Alpha Company">Alpha</option>
                    <option value="Bravo Company">Bravo</option>
                  </select>
                ) : (
                  <select value={position} onChange={(e) => setPosition(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white">
                    <option value="S-1">S-1 Adjutant</option>
                    <option value="S-3">S-3 Operations</option>
                    <option value="S-4">S-4 Logistics</option>
                    <option value="S-5">S-5 Public Affairs</option>
                    <option value="Company Commander">Company Commanders</option>
                  </select>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-500">Expiration Date</label>
                <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white" />
              </div>
            </div>

            <textarea required value={text} onChange={(e) => setText(e.target.value)} placeholder={type === 'announcement' ? "General news..." : "Specific tasking for this position..."} className="w-full h-32 bg-slate-950 border border-white/10 rounded-2xl p-4 text-white resize-none outline-none focus:border-yellow-500" />
            
            <button type="submit" className="w-full bg-yellow-500 text-slate-950 font-black py-4 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2">
              {sent ? <CheckCircle size={18}/> : <Send size={18}/>}
              {sent ? "TRANSMITTED" : `PUBLISH ${type.toUpperCase()}`}
            </button>
          </form>
        </div>

        {/* --- MANAGEMENT LIST --- */}
        <div className="bg-slate-900/50 border border-white/5 rounded-3xl p-8 overflow-y-auto max-h-[700px]">
          <h2 className="text-xl font-black text-white uppercase italic mb-6">Active Comms</h2>
          <div className="space-y-4">
            {existingItems.map(item => (
              <div key={item.id} className="bg-slate-950 p-5 rounded-2xl border border-white/5 flex justify-between items-start">
                <div>
                  <div className="flex gap-2 mb-2">
                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${item.itemType === 'announcement' ? 'border-yellow-500/50 text-yellow-500' : 'border-blue-500/50 text-blue-500'}`}>
                      {item.itemType}
                    </span>
                    <span className="text-[8px] font-black text-slate-500 uppercase py-0.5">To: {item.target}</span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed italic">"{item.content}"</p>
                </div>
                <button onClick={() => handleDelete(item.id, item.itemType)} className="text-slate-700 hover:text-red-500 p-2">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminAnnouncements;