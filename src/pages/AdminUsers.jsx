import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, doc, updateDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';
import { ShieldCheck, UserCog, Search, ArrowLeft, CheckCircle2, Loader2, Star } from 'lucide-react';
// Import your hierarchy constants
import { ROLE_HIERARCHY } from '../constants';

const AdminUsers = () => {
  const { role, loading: authLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [status, setStatus] = useState(null);
  const [fetching, setFetching] = useState(true);

  // FIX: Instead of checking specific strings, check the hierarchy level.
  // We'll allow anyone with Level 60 (Staff Assistant) or higher to access this page.
  const userLevel = ROLE_HIERARCHY[role] || 0;
  const isAuthorized = userLevel >= 60; 

  // Role Hierarchy Configuration for the Dropdown
  const ROLES = [
    { id: 'cadet', label: 'Standard Cadet' },
    { id: 'company_leadership', label: 'Company Leadership' },
    { divider: '--- Staff Assistants ---' },
    { id: 's1_assistant', label: 'S-1 Assistant' },
    { id: 's2_assistant', label: 'S-2 Assistant' },
    { id: 's3_assistant', label: 'S-3 Assistant' },
    { id: 's4_assistant', label: 'S-4 Assistant' },
    { id: 's5_assistant', label: 'S-5 Assistant' },
    { id: 's6_assistant', label: 'S-6 Assistant' },
    { id: 's7_assistant', label: 'S-7 Assistant' },
    { divider: '--- Battalion Staff ---' },
    { id: 's1_battalion', label: 'S-1 Battalion' },
    { id: 's2_battalion', label: 'S-2 Battalion' },
    { id: 's3_battalion', label: 'S-3 Battalion' },
    { id: 's4_battalion', label: 'S-4 Battalion' },
    { id: 's5_battalion', label: 'S-5 Battalion' },
    { id: 's6_battalion', label: 'S-6 Battalion' },
    { id: 's7_battalion', label: 'S-7 Battalion' },
    { divider: '--- Command ---' },
    { id: 'battalion_staff', label: 'Battalion Executive/Staff' },
    { id: 'battalion_4', label: 'Battalion Top 4 (Admin)' },
    { id: 'admin', label: 'System Admin' }
  ];

  useEffect(() => {
    // Only fetch if authorized
    if (!authLoading && isAuthorized) {
      const q = query(collection(db, "users"), orderBy("email", "asc"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        setFetching(false);
      }, (error) => {
        console.error("Firestore Error:", error.message);
        setFetching(false);
      });
      return () => unsubscribe();
    }
  }, [authLoading, isAuthorized]);

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateDoc(doc(db, "users", userId), { 
        role: newRole,
        updatedAt: new Date()
      });
      setStatus('updated');
      setTimeout(() => setStatus(null), 3000);
    } catch (error) {
      console.error("Error updating role:", error);
    }
  };

  const filteredUsers = users.filter(u => {
    const searchTarget = `${u.displayName || u.name || ''} ${u.email || ''}`.toLowerCase();
    return searchTarget.includes(searchTerm.toLowerCase());
  });

  if (authLoading) return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
      <Loader2 className="animate-spin text-yellow-500 mb-4" size={40} />
      <p className="font-black uppercase tracking-[0.3em] text-xs">Syncing Encryption Keys...</p>
    </div>
  );

  // If the user role isn't high enough in the constants file, they get bounced
  if (!isAuthorized) return <Navigate to="/dashboard" />;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8 pt-24">
      <div className="max-w-5xl mx-auto">
        <Link to="/admin/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-yellow-500 mb-8 font-bold uppercase text-[10px] tracking-widest transition-all">
          <ArrowLeft size={14} /> Return to Operations
        </Link>

        <header className="mb-12">
          <h1 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
            <UserCog className="text-yellow-500" /> Personnel Command
          </h1>
          <p className="text-slate-500 text-xs mt-2 font-bold uppercase tracking-[0.2em]">Manage Access & Authority Levels</p>
        </header>

        <div className="relative mb-10 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-yellow-500 transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Search Dossiers..." 
            className="w-full bg-[#0f172a] border border-white/10 p-5 pl-14 rounded-2xl text-white outline-none focus:border-yellow-500/50 transition-all font-medium"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          {fetching ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-600">
              <Loader2 className="animate-spin mb-4" size={32} />
              <p className="font-black uppercase tracking-widest text-[10px]">Accessing Personnel Records...</p>
            </div>
          ) : filteredUsers.length > 0 ? (
            filteredUsers.map(u => (
              <div key={u.id} className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-slate-900 transition-all group">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-xl font-black text-slate-400 group-hover:text-yellow-500 transition-colors border border-white/5">
                    {(u.displayName || u.name || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-black uppercase italic text-lg tracking-tight leading-none mb-1">
                      {u.displayName || u.name || "Unknown Cadet"}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{u.email}</p>
                  </div>
                </div>

                <div className="flex flex-col min-w-[240px]">
                  <span className="text-[9px] text-slate-600 font-black uppercase mb-2 ml-1 tracking-widest flex items-center gap-1">
                    <ShieldCheck size={12} /> Authority Role
                  </span>
                  <select 
                    value={u.role || 'cadet'} 
                    onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    className="bg-slate-950 border border-white/10 p-3.5 rounded-xl text-[11px] font-black text-yellow-500 uppercase outline-none focus:ring-1 ring-yellow-500/50 cursor-pointer"
                  >
                    {ROLES.map((roleOpt, idx) => 
                      roleOpt.divider ? (
                        <option key={`div-${idx}`} disabled className="text-slate-600 bg-slate-900">
                          {roleOpt.divider}
                        </option>
                      ) : (
                        <option key={roleOpt.id} value={roleOpt.id}>
                          {roleOpt.label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20 bg-slate-900/20 rounded-3xl border border-dashed border-white/5">
              <p className="text-slate-600 font-black uppercase text-xs tracking-widest">No matching personnel dossiers found</p>
            </div>
          )}
        </div>
      </div>

      {status && (
        <div className="fixed bottom-8 right-8 bg-yellow-500 text-slate-950 px-8 py-4 rounded-2xl font-black uppercase text-xs flex items-center gap-3 shadow-[0_0_40px_rgba(234,179,8,0.2)]">
          <CheckCircle2 size={20} /> Personnel Dossier Updated
        </div>
      )}
    </div>
  );
};

export default AdminUsers;