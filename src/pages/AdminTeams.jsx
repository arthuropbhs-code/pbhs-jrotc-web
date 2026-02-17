import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, updateDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { 
  Save, Trash2, Edit3, ShieldAlert, 
  ArrowLeft, Mail, CheckCircle2, Users, Plus, Loader2,
  UserCircle, BookOpen, Calendar, Settings2, Target, ListChecks
} from 'lucide-react';
import { ROLE_HIERARCHY } from '../constants';

const AdminTeams = () => {
  const { user, role, userData, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState('teams'); 
  const [teams, setTeams] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [showStatus, setShowStatus] = useState(null); 
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, name: '' });

  // Team Form State - ADDED disciplines
  const [formData, setFormData] = useState({
    name: '', status: 'Open Practice', description: '', practice: '', location: '',
    requirements: '', disciplines: '', teamEvents: '', leadership: [] 
  });

  const [dossier, setDossier] = useState({
    bio: userData?.bio || '',
    practiceDays: userData?.practiceDays || ''
  });
  const [uploading, setUploading] = useState(false);

  const userLevel = ROLE_HIERARCHY[role] || 0;
  const isPowerUser = userLevel >= 90; 
  const userEmail = user?.email?.toLowerCase().trim();

  useEffect(() => {
    if (!authLoading && user) {
      const q = query(collection(db, "specialTeams"), orderBy("name", "asc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setDataLoading(false);
      }, (err) => {
        console.error("Fetch Error:", err);
        setDataLoading(false);
      });
      return () => unsubscribe();
    }
  }, [authLoading, user]);

  useEffect(() => {
    if (userData) {
      setDossier({
        bio: userData.bio || '',
        practiceDays: userData.practiceDays || ''
      });
    }
  }, [userData]);

  const accessibleTeams = teams.filter(t => 
    isPowerUser || (t.commanderEmails && t.commanderEmails.includes(userEmail))
  );

  const isAuthorized = isPowerUser || accessibleTeams.length > 0;
  const currentTeam = teams.find(t => t.id === editingId);
  const userInTeam = currentTeam?.leadership?.find(l => l.email?.toLowerCase().trim() === userEmail);
  const teamSpecificRole = userInTeam?.teamRole || 'Team Member';
  const canEditMainFields = isPowerUser || teamSpecificRole === "Commander" || teamSpecificRole === "Co-Commander";

  const handleUpdateDossier = async (e) => {
    e.preventDefault();
    setUploading(true);
    const userRef = doc(db, "users", user.uid);
    try {
      await updateDoc(userRef, {
        bio: dossier.bio,
        practiceDays: dossier.practiceDays,
        updatedAt: new Date()
      });
      setShowStatus('success');
      setTimeout(() => setShowStatus(null), 4000);
    } catch (err) {
      console.error("Dossier Error:", err);
      setShowStatus('error');
    } finally {
      setUploading(false);
    }
  };

  const addLeader = () => {
    setFormData({
      ...formData,
      leadership: [...formData.leadership, { name: '', rank: '', teamRole: 'Team Member', letLevel: '', email: '' }]
    });
  };

  const updateLeader = (index, field, value) => {
    const updatedLeadership = [...formData.leadership];
    updatedLeadership[index][field] = value;
    setFormData({ ...formData, leadership: updatedLeadership });
  };

  const removeLeader = (index) => {
    const updatedLeadership = formData.leadership.filter((_, i) => i !== index);
    setFormData({ ...formData, leadership: updatedLeadership });
  };

  const handleEdit = (team) => {
    setEditingId(team.id);
    setFormData({
      ...team,
      requirements: Array.isArray(team.requirements) ? team.requirements.join(', ') : '',
      disciplines: Array.isArray(team.disciplines) ? team.disciplines.join(', ') : '', // Map array to string
      teamEvents: Array.isArray(team.teamEvents) ? team.teamEvents.join(', ') : '',
      leadership: team.leadership || []
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSaveTeam = async (e) => {
    e.preventDefault();
    const docId = editingId || formData.name.toLowerCase().replace(/\s+/g, '-');
    const commanderEmails = formData.leadership
      .map(l => l.email?.toLowerCase().trim())
      .filter(email => email && email !== "");

    const finalData = {
      ...formData,
      commanderEmails,
      requirements: formData.requirements ? formData.requirements.split(',').map(r => r.trim()).filter(Boolean) : [],
      disciplines: formData.disciplines ? formData.disciplines.split(',').map(d => d.trim()).filter(Boolean) : [], // Map string to array
      teamEvents: formData.teamEvents ? formData.teamEvents.split(',').map(e => e.trim()).filter(Boolean) : [],
      updatedAt: new Date(),
      lastUpdatedBy: userEmail
    };

    try {
      await setDoc(doc(db, "specialTeams", docId), finalData);
      setEditingId(null);
      setFormData({ name: '', status: 'Open Practice', description: '', practice: '', location: '', requirements: '', disciplines: '', teamEvents: '', leadership: [] });
      setShowStatus('success');
      setTimeout(() => setShowStatus(null), 4000);
    } catch (err) {
      console.error("Save Error:", err);
      setShowStatus('error');
    }
  };

  if (authLoading || (dataLoading && teams.length === 0)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="animate-spin text-yellow-500 mb-4" size={40} />
        <p className="font-black uppercase tracking-widest text-[10px]">Establishing Secure Command Link...</p>
      </div>
    );
  }

  if (!isAuthorized && !dataLoading) return <Navigate to="/dashboard" replace />;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 pt-24 font-sans relative">
      {showStatus && (
        <div className={`fixed top-8 right-8 z-50 flex items-center gap-3 p-4 rounded-2xl border shadow-2xl animate-in fade-in slide-in-from-top-4 ${
          showStatus === 'success' ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'
        }`}>
          {showStatus === 'success' ? <CheckCircle2 size={20} /> : <ShieldAlert size={20} />}
          <p className="text-sm font-black uppercase tracking-widest">
            {showStatus === 'success' ? 'System Synced' : 'Sync Failed'}
          </p>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <header className="mb-12">
          <div className="flex justify-between items-end">
            <div>
              <Link to="/admin/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-yellow-500 mb-4 text-[10px] font-black uppercase tracking-widest transition-all">
                <ArrowLeft size={14} /> Back to Operations
              </Link>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
                <ShieldAlert className="text-yellow-500" /> 
                {isPowerUser ? "BATTALION COMMAND" : "UNIT COMMAND"}
              </h1>
            </div>
            
            <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 shadow-inner">
              <button 
                onClick={() => setActiveTab('teams')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'teams' ? 'bg-yellow-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <Settings2 size={14} /> Team Management
              </button>
              <button 
                onClick={() => setActiveTab('dossier')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'dossier' ? 'bg-yellow-500 text-slate-950 shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <UserCircle size={14} /> Personnel Dossier
              </button>
            </div>
          </div>
          <div className="h-px bg-white/10 w-full mt-6"></div>
        </header>

        {activeTab === 'teams' ? (
          <div className="grid lg:grid-cols-3 gap-12 animate-in fade-in duration-500">
            <div className="lg:col-span-2">
              <form onSubmit={handleSaveTeam} className="bg-[#0f172a]/50 border border-white/5 p-8 rounded-3xl space-y-8">
                <div className="flex justify-between items-center">
                  <h2 className="text-xs font-black text-yellow-500 uppercase tracking-widest">
                    {editingId ? `Modifying: ${formData.name}` : "Initialize New Special Team"}
                  </h2>
                  {editingId && (
                    <button type="button" onClick={() => setEditingId(null)} className="text-[10px] font-black text-slate-500 uppercase hover:text-white transition-colors">Cancel</button>
                  )}
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Team Name</label>
                    <input required readOnly={!isPowerUser} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className={`w-full bg-[#020617] border border-white/10 p-4 rounded-xl text-sm text-white focus:border-yellow-500/50 outline-none ${!isPowerUser && 'opacity-50 cursor-not-allowed'}`} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Team Status</label>
                    <select value={formData.status} onChange={(e) => setFormData({...formData, status: e.target.value})} className="w-full bg-[#020617] border border-white/10 p-4 rounded-xl text-sm text-white outline-none focus:border-yellow-500/50">
                      <option>Open Practice</option>
                      <option>Conditioning Only</option>
                      <option>Out of Season</option>
                      <option>Closed Roster</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest">Mission Statement / Description</label>
                  <textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full bg-[#020617] border border-white/10 p-4 rounded-xl text-sm h-32 text-white outline-none focus:border-yellow-500/50" />
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <input value={formData.practice} onChange={(e) => setFormData({...formData, practice: e.target.value})} className="bg-[#020617] border border-white/10 p-4 rounded-xl text-sm text-white" placeholder="Practice Days" />
                  <input value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="bg-[#020617] border border-white/10 p-4 rounded-xl text-sm text-white" placeholder="Location" />
                </div>

                {/* --- NEW FIELDS: CORE DISCIPLINES & REQUIREMENTS --- */}
                <div className="grid md:grid-cols-2 gap-6 border-t border-white/5 pt-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest flex items-center gap-2">
                      <Target size={12}/> Teams & Events
                    </label>
                    <input 
                      value={formData.disciplines} 
                      onChange={(e) => setFormData({...formData, disciplines: e.target.value})} 
                      className="w-full bg-[#020617] border border-white/10 p-4 rounded-xl text-sm text-white outline-none focus:border-yellow-500/50" 
                      placeholder="e.g. Armed Drill, Color Guard, Unarmed" 
                    />
                    <p className="text-[9px] text-slate-600 ml-1">Separate with commas</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-500 ml-1 tracking-widest flex items-center gap-2">
                      <ListChecks size={12}/> Joining Requirements
                    </label>
                    <input 
                      value={formData.requirements} 
                      onChange={(e) => setFormData({...formData, requirements: e.target.value})} 
                      className="w-full bg-[#020617] border border-white/10 p-4 rounded-xl text-sm text-white outline-none focus:border-yellow-500/50" 
                      placeholder="e.g. 2.5 GPA, Passing PT Score" 
                    />
                    <p className="text-[9px] text-slate-600 ml-1">Separate with commas</p>
                  </div>
                </div>

                {/* --- LEADERSHIP SECTION --- */}
                <div className="space-y-6 border-t border-white/5 pt-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2"><Users size={14}/> Team Leadership</h3>
                    {isPowerUser && (
                      <button type="button" onClick={addLeader} className="text-[10px] bg-yellow-500/10 text-yellow-500 px-3 py-1 rounded-full font-black border border-yellow-500/20 hover:bg-yellow-500 hover:text-slate-950 transition-all flex items-center gap-1">
                        <Plus size={12}/> ADD OFFICER
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    {formData.leadership.map((leader, index) => (
                      <div key={index} className="bg-black/40 p-6 rounded-2xl border border-white/5 relative group border-l-2 border-l-transparent hover:border-l-yellow-500 transition-all">
                        {isPowerUser && (
                          <button type="button" onClick={() => removeLeader(index)} className="absolute top-4 right-4 text-slate-600 hover:text-red-500 transition-colors">
                            <Trash2 size={16}/>
                          </button>
                        )}
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <input value={leader.name} onChange={(e) => updateLeader(index, 'name', e.target.value)} className="bg-slate-950 border border-white/10 p-3 rounded-lg text-xs text-white" placeholder="Full Name" />
                          <input value={leader.rank} onChange={(e) => updateLeader(index, 'rank', e.target.value)} className="bg-slate-950 border border-white/10 p-3 rounded-lg text-xs text-white" placeholder="Rank" />
                          
                          <select 
                            value={leader.teamRole || 'Team Member'} 
                            onChange={(e) => updateLeader(index, 'teamRole', e.target.value)}
                            className="bg-slate-950 border border-white/10 p-3 rounded-lg text-xs text-yellow-500 font-bold uppercase outline-none focus:ring-1 ring-yellow-500/50"
                          >
                            <option value="Battalion Officer">Battalion Officer</option>
                            <option value="Commander">Commander</option>
                            <option value="Co-Commander">Co-Commander</option>
                            <option value="Team Commander">Team Commander</option>
                            <option value="Team Co-Commander">Team Co-Commander</option>
                            <option value="Team Member">Team Member</option>
                          </select>

                          <input value={leader.letLevel} onChange={(e) => updateLeader(index, 'letLevel', e.target.value)} className="bg-slate-950 border border-white/10 p-3 rounded-lg text-xs text-white" placeholder="LET Level" />
                          
                          <div className="lg:col-span-2 relative">
                            <Mail size={12} className="absolute left-3 top-3.5 text-slate-500" />
                            <input 
                              readOnly={!isPowerUser} 
                              value={leader.email} 
                              onChange={(e) => updateLeader(index, 'email', e.target.value)} 
                              className={`w-full bg-slate-950 border border-white/10 p-3 pl-8 rounded-lg text-xs text-white ${!isPowerUser && 'opacity-50 font-mono'}`} 
                              placeholder="Cadet Email" 
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button type="submit" disabled={!canEditMainFields} className={`w-full py-5 rounded-xl font-black uppercase text-xs tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${
                  canEditMainFields ? 'bg-yellow-500 text-slate-950 hover:bg-yellow-400 shadow-xl' : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}>
                  <Save size={18} /> SYNC UNIT DATA
                </button>
              </form>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Authorized Teams</h3>
              {accessibleTeams.map(team => (
                <div key={team.id} onClick={() => handleEdit(team)} className="bg-[#0f172a]/50 border border-white/5 p-6 rounded-2xl flex justify-between items-center group hover:border-yellow-500/40 transition-all cursor-pointer">
                  <div>
                    <h4 className="font-black uppercase italic text-lg group-hover:text-yellow-500 transition-colors">{team.name}</h4>
                    <p className="text-[10px] text-yellow-500 font-bold uppercase tracking-widest">{team.status}</p>
                  </div>
                  <div className="flex gap-1">
                    <div className="p-2 text-slate-600 group-hover:text-white"><Edit3 size={16}/></div>
                    {isPowerUser && (
                      <button onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm({ open: true, id: null, name: team.name });
                      }} className="p-2 text-slate-600 hover:text-red-500 transition-colors">
                        <Trash2 size={16}/>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Dossier View remains unchanged */
          <div className="max-w-2xl mx-auto animate-in slide-in-from-bottom-4 duration-500">
            <form onSubmit={handleUpdateDossier} className="bg-[#0f172a]/50 border border-white/5 p-10 rounded-[40px] shadow-2xl space-y-8">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-[24px] bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                  <UserCircle className="text-yellow-500" size={40} />
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase italic text-white tracking-tighter">{userData?.displayName || 'Unknown Cadet'}</h3>
                  <p className="text-xs font-bold text-yellow-500 uppercase tracking-widest">{role?.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center gap-2 tracking-widest">
                    <BookOpen size={12} /> Personnel Biography
                  </label>
                  <textarea 
                    value={dossier.bio}
                    onChange={(e) => setDossier({...dossier, bio: e.target.value})}
                    placeholder="Describe your goals, experience, and leadership mission..." 
                    className="w-full bg-[#020617] border border-white/10 p-5 rounded-2xl text-sm h-40 text-white focus:border-yellow-500/50 outline-none transition-all placeholder:text-slate-800 font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-500 ml-1 flex items-center gap-2 tracking-widest">
                    <Calendar size={12} /> Instructor Availability
                  </label>
                  <input 
                    type="text"
                    value={dossier.practiceDays}
                    onChange={(e) => setDossier({...dossier, practiceDays: e.target.value})}
                    placeholder="e.g. Mon, Wed, Fri (1500 - 1630)" 
                    className="w-full bg-[#020617] border border-white/10 p-5 rounded-2xl text-sm text-white focus:border-yellow-500/50 outline-none transition-all placeholder:text-slate-800 font-medium"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={uploading}
                className="w-full bg-yellow-500 text-slate-950 font-black uppercase py-5 rounded-2xl hover:bg-yellow-400 transition-all flex items-center justify-center gap-3 shadow-xl shadow-yellow-500/10"
              >
                {uploading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <><Save size={20}/> Synchronize Profile</>
                )}
              </button>
            </form>
          </div>
        )}
      </div>

      {deleteConfirm.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="bg-slate-900 border border-white/10 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-xl font-black uppercase italic mb-2 text-white">Decommission?</h3>
            <p className="text-slate-400 text-sm mb-8 font-medium italic">Erase <span className="text-white font-bold">{deleteConfirm.name}</span> dossier permanently?</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteConfirm({ open: false, id: null, name: '' })} className="flex-1 px-4 py-3 rounded-xl font-bold text-slate-400 hover:text-white transition-all uppercase text-[10px] tracking-widest">Abort</button>
              <button onClick={async () => {
                await deleteDoc(doc(db, 'specialTeams', deleteConfirm.id));
                setDeleteConfirm({ open: false, id: null, name: '' });
              }} className="flex-1 bg-red-600 px-4 py-3 rounded-xl font-black text-white uppercase text-[10px] tracking-widest hover:bg-red-500 transition-all">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTeams;