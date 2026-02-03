import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Plus, Save, Trash2, Edit3, ShieldAlert } from 'lucide-react';

const AdminTeams = () => {
  const [teams, setTeams] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '', commanderId: '', description: '', practice: '', 
    location: '', status: 'Open Practice', seasonText: ''
  });

  // 1. Fetch teams from Firebase
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "specialTeams"), (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 2. Handle Form Save (Add or Update)
  const handleSave = async (e) => {
    e.preventDefault();
    const docId = editingId || formData.name.toLowerCase().replace(/\s+/g, '-');
    
    try {
      await setDoc(doc(db, "specialTeams", docId), formData);
      setEditingId(null);
      setFormData({ name: '', commanderId: '', description: '', practice: '', location: '', status: 'Open Practice', seasonText: '' });
      alert("Operations updated successfully.");
    } catch (err) {
      console.error(err);
    }
  };

  const deleteTeam = async (id) => {
    if (window.confirm("Are you sure you want to decommission this team?")) {
      await deleteDoc(doc(db, "specialTeams", id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 pt-24">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 border-b border-white/10 pb-6">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
            <ShieldAlert className="text-yellow-500" /> Team Command Console
          </h1>
        </header>

        {/* Form Section */}
        <form onSubmit={handleSave} className="bg-slate-900 border border-white/5 p-8 rounded-3xl mb-12 shadow-2xl">
          <h2 className="text-xs font-black text-yellow-500 uppercase tracking-widest mb-6">
            {editingId ? "Modify Existing Unit" : "Commission New Unit"}
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <input 
              placeholder="Team Name (e.g. Drill Team)" 
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="bg-slate-950 border border-white/10 p-4 rounded-xl text-sm outline-none focus:border-yellow-500"
            />
            <select 
              value={formData.status}
              onChange={(e) => setFormData({...formData, status: e.target.value})}
              className="bg-slate-950 border border-white/10 p-4 rounded-xl text-sm outline-none focus:border-yellow-500"
            >
              <option value="Open Practice">Open Practice</option>
              <option value="Closed Practice">Closed Practice</option>
              <option value="Out of Season">Out of Season</option>
            </select>
            <textarea 
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="md:col-span-2 bg-slate-950 border border-white/10 p-4 rounded-xl text-sm h-32 outline-none focus:border-yellow-500"
            />
          </div>
          <button type="submit" className="mt-6 w-full bg-yellow-500 text-slate-950 py-4 rounded-xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2">
            <Save size={18} /> {editingId ? "Save Changes" : "Deploy Team"}
          </button>
        </form>

        {/* List Section */}
        <div className="space-y-4">
          {teams.map(team => (
            <div key={team.id} className="bg-slate-900/50 border border-white/5 p-6 rounded-2xl flex justify-between items-center">
              <div>
                <h3 className="font-black uppercase italic text-lg">{team.name}</h3>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">{team.status}</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => { setEditingId(team.id); setFormData(team); }} className="p-2 text-slate-400 hover:text-yellow-500"><Edit3 size={20}/></button>
                <button onClick={() => deleteTeam(team.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={20}/></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminTeams;