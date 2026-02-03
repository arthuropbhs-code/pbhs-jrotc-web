import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { 
  Save, Trash2, Edit3, ShieldAlert, 
  ArrowLeft, Users, Info, MapPin, Clock, Trophy, UserPlus
} from 'lucide-react';

const AdminTeams = () => {
  const { role } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    status: 'Open Practice',
    description: '',
    practice: '',
    location: '',
    requirements: '',
    highlights: '',
    // Commander Info Fields
    commanderName: '',
    commanderRank: '',
    commanderPosition: '',
    commanderEmail: '',
    commanderPortrait: '',
    commanderBio: '',
    commanderAchievements: '',
    commanderYears: ''
  });

  if (role !== 'battalion_4') return <Navigate to="/admin/dashboard" />;

  useEffect(() => {
    const q = query(collection(db, "specialTeams"), orderBy("name", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const docId = editingId || formData.name.toLowerCase().replace(/\s+/g, '-');
    
    const finalData = {
      ...formData,
      requirements: typeof formData.requirements === 'string' ? formData.requirements.split(',').map(r => r.trim()) : formData.requirements,
      highlights: typeof formData.highlights === 'string' ? formData.highlights.split(',').map(h => h.trim()) : formData.highlights,
      commanderAchievements: typeof formData.commanderAchievements === 'string' ? formData.commanderAchievements.split(',').map(a => a.trim()) : formData.commanderAchievements,
      updatedAt: new Date()
    };

    try {
      await setDoc(doc(doc(db, "specialTeams", docId)), finalData);
      resetForm();
      alert("Unit Intel Updated Successfully.");
    } catch (err) {
      console.error(err);
      alert("Error updating record.");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      name: '', status: 'Open Practice', description: '', practice: '', location: '',
      requirements: '', highlights: '', commanderName: '', commanderRank: '',
      commanderPosition: '', commanderEmail: '', commanderPortrait: '',
      commanderBio: '', commanderAchievements: '', commanderYears: ''
    });
  };

  const handleEdit = (team) => {
    setEditingId(team.id);
    setFormData({
      ...team,
      requirements: Array.isArray(team.requirements) ? team.requirements.join(', ') : '',
      highlights: Array.isArray(team.highlights) ? team.highlights.join(', ') : '',
      commanderAchievements: Array.isArray(team.commanderAchievements) ? team.commanderAchievements.join(', ') : ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white font-black">SYNCING COMMAND CONSOLE...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 pt-24 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <Link to="/admin/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-yellow-500 mb-8 transition-colors text-sm font-bold uppercase tracking-widest">
          <ArrowLeft size={16} /> Return to Dashboard
        </Link>

        <header className="mb-12">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
            <ShieldAlert className="text-yellow-500" /> TEAM COMMAND CONSOLE
          </h1>
          <div className="h-px bg-white/10 w-full mt-6"></div>
        </header>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Main Form Area */}
          <div className="lg:col-span-2 space-y-8">
            <form onSubmit={handleSave} className="bg-[#0f172a]/50 border border-white/5 p-8 rounded-3xl shadow-2xl space-y-8">
              <h2 className="text-xs font-black text-yellow-500 uppercase tracking-widest">
                {editingId ? "MODIFY EXISTING UNIT" : "INITIALIZE NEW UNIT"}
              </h2>
              
              {/* Unit Basics */}
              <div className="grid md:grid-cols-2 gap-6">
                <input required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full bg-[#020617] border border-white/10 p-4 rounded-xl text-sm outline-none focus:border-yellow-500 transition-all" placeholder="Unit Name (e.g. Raider Team)" />
                <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full bg-[#020617] border border-white/10 p-4 rounded-xl text-sm outline-none focus:border-yellow-500">
                  <option>Open Practice</option>
                  <option>Conditioning Only</option>
                  <option>Out of Season</option>
                  <option>Closed Roster</option>
                </select>
              </div>

              <textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-[#020617] border-2 border-yellow-500/30 p-4 rounded-xl text-sm h-32 outline-none focus:border-yellow-500" placeholder="Unit Description / Mission Statement..." />

              {/* Schedule & Intel */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2"><Clock size={14}/> Schedule & Intel</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <input value={formData.practice} onChange={(e) => setFormData({...formData, practice: e.target.value})} className="w-full bg-[#020617] border border-white/10 p-4 rounded-xl text-sm outline-none" placeholder="Practice Schedule (e.g. Mon-Wed 1530)" />
                  <input value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full bg-[#020617] border border-white/10 p-4 rounded-xl text-sm outline-none" placeholder="Location (e.g. Track / Room 102)" />
                </div>
              </div>

              {/* Requirements & Disciplines */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2"><Trophy size={14}/> Core Disciplines</h3>
                  <input value={formData.highlights} onChange={(e) => setFormData({...formData, highlights: e.target.value})} className="w-full bg-[#020617] border border-white/10 p-4 rounded-xl text-sm outline-none" placeholder="5K Team Run, Rope Bridge (comma separated)" />
                </div>
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black uppercase text-slate-500 flex items-center gap-2"><UserPlus size={14}/> Requirements</h3>
                  <input value={formData.requirements} onChange={(e) => setFormData({...formData, requirements: e.target.value})} className="w-full bg-[#020617] border border-white/10 p-4 rounded-xl text-sm outline-none" placeholder="Sports Physical, LET 1+ (comma separated)" />
                </div>
              </div>

              <div className="h-px bg-white/5"></div>

              {/* Commander Info Section */}
              <div className="space-y-6">
                <h3 className="text-[10px] font-black uppercase text-yellow-500 tracking-widest">Commander Personnel File</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  <input value={formData.commanderName} onChange={(e) => setFormData({...formData, commanderName: e.target.value})} className="bg-[#020617] border border-white/10 p-4 rounded-xl text-sm outline-none" placeholder="Full Name" />
                  <input value={formData.commanderRank} onChange={(e) => setFormData({...formData, commanderRank: e.target.value})} className="bg-[#020617] border border-white/10 p-4 rounded-xl text-sm outline-none" placeholder="Rank (e.g. CDT 1LT)" />
                  <input value={formData.commanderYears} onChange={(e) => setFormData({...formData, commanderYears: e.target.value})} className="bg-[#020617] border border-white/10 p-4 rounded-xl text-sm outline-none" placeholder="LET Level (e.g. LET 3)" />
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <input value={formData.commanderEmail} onChange={(e) => setFormData({...formData, commanderEmail: e.target.value})} className="bg-[#020617] border border-white/10 p-4 rounded-xl text-sm outline-none" placeholder="Email Address" />
                  <input value={formData.commanderPortrait} onChange={(e) => setFormData({...formData, commanderPortrait: e.target.value})} className="bg-[#020617] border border-white/10 p-4 rounded-xl text-sm outline-none" placeholder="Portrait Path (e.g. /covers/Name.jpg)" />
                </div>
                <textarea value={formData.commanderBio} onChange={(e) => setFormData({...formData, commanderBio: e.target.value})} className="w-full bg-[#020617] border border-white/10 p-4 rounded-xl text-sm h-20 outline-none" placeholder="Commander Biography..." />
                <input value={formData.commanderAchievements} onChange={(e) => setFormData({...formData, commanderAchievements: e.target.value})} className="w-full bg-[#020617] border border-white/10 p-4 rounded-xl text-sm outline-none" placeholder="Achievements (comma separated)" />
              </div>

              <button type="submit" className="w-full bg-yellow-500 text-slate-950 py-5 rounded-xl font-black uppercase text-xs tracking-[0.2em] hover:bg-yellow-400 transition-all flex items-center justify-center gap-2 shadow-xl shadow-yellow-500/10">
                <Save size={18} /> SAVE CHANGES
              </button>
            </form>
          </div>

          {/* Unit List Sidebar */}
          <div className="space-y-6">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Battalion Units</h3>
            {teams.map(team => (
              <div key={team.id} className="bg-[#0f172a]/50 border border-white/5 p-6 rounded-2xl group hover:border-yellow-500/40 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-black uppercase italic text-lg tracking-tight">{team.name}</h4>
                    <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest">{team.status}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleEdit(team)} className="p-2 text-slate-400 hover:text-white transition-colors"><Edit3 size={18}/></button>
                    <button onClick={async () => {if(window.confirm('Erase unit from command?')) await deleteDoc(doc(db, 'specialTeams', team.id))}} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 size={18}/></button>
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 font-bold uppercase">CMD: {team.commanderName || 'UNASSIGNED'}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTeams;