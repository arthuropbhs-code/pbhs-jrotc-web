import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, getDocs, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import { Megaphone, Trash2, Send, CheckCircle, ChevronLeft, Users, Shield } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { ROLE_HIERARCHY, EVENT_TYPES } from '../constants';

const AdminAnnouncements = () => {
  const { userData, role } = useAuth();
  const [text, setText] = useState('');
  const [target, setTarget] = useState('All');
  const [eventType, setEventType] = useState('Meeting');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [sent, setSent] = useState(false);
  const [existingAnnouncements, setExistingAnnouncements] = useState([]);

  const userPower = ROLE_HIERARCHY[role] || 1;
  const teams = ['Raiders', 'Drill Team', 'Drone Team', 'JLAB', 'Color Guard'];

  const getAvailableTargets = () => {
    const options = [{ label: 'All Battalion', value: 'All' }];
    if (userPower >= 70) {
      options.push(
        { label: 'Battalion Staff', value: 'Staff' },
        { label: 'Company XOs', value: 'XO' },
        { label: 'Company Leadership', value: 'Leadership' },
        { label: 'Company CCs', value: 'CC' },
        { label: 'Company 1SGs', value: '1SG' }
      );
    }
    if (userData?.officerTeams?.length > 0) {
      userData.officerTeams.forEach(team => {
        options.push({ label: `${team} Team Only`, value: team });
      });
    }
    return options;
  };

  const fetchAnnouncements = async () => {
    try {
      const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"));
      const snap = await getDocs(q);
      setExistingAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (eventType === 'Private Practice') {
      const isTopLevel = userPower >= 90;
      const isTeamOfficer = userData?.officerTeams?.includes(selectedTeam);
      if (!isTopLevel && !isTeamOfficer) {
        alert("Unauthorized: You must be a Team Officer or Top 4 to schedule Private Practices.");
        return;
      }
    }

    try {
      await addDoc(collection(db, "announcements"), {
        content: text,
        timestamp: serverTimestamp(),
        issuer: `${userData?.rank || ''} ${userData?.name || 'Staff'}`.trim(),
        issuerLevel: userPower,
        target: target,
        eventType: eventType,
        team: eventType === 'Private Practice' ? selectedTeam : null,
        active: true,
        expiresAt: expiryDate ? new Date(expiryDate).getTime() : null,
      });
      setText('');
      setSent(true);
      fetchAnnouncements();
      setTimeout(() => setSent(false), 3000);
    } catch (err) { console.error("Broadcast Error:", err); }
  };

  const handleDelete = async (id, itemLevel) => {
    if (userPower < itemLevel && role !== 'admin') {
      alert("Priority Restriction: You cannot delete a broadcast from a superior officer.");
      return;
    }
    if (window.confirm("Delete this announcement?")) {
      await deleteDoc(doc(db, "announcements", id));
      fetchAnnouncements();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-24 px-6 pb-20 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex items-center justify-between mb-8">
          <Link to="/admin/dashboard" className="flex items-center gap-2 text-slate-400 hover:text-[#d4af37] transition-colors font-black uppercase text-[10px] tracking-widest">
            <ChevronLeft size={16} /> Dashboard
          </Link>
          <div className="bg-white border border-slate-200 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-sm">
            <Shield size={16} className="text-[#d4af37]" />
            <span className="text-[10px] font-black uppercase text-slate-600 tracking-widest">
              Auth Level: {userPower}
            </span>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* CREATE ANNOUNCEMENT CARD */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl h-fit">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2">
              <Megaphone className="text-[#d4af37]" size={20} /> Execute Transmission
            </h2>

            <form onSubmit={handleBroadcast} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Target Audience</label>
                <select 
                  value={target} 
                  onChange={(e) => setTarget(e.target.value)} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:border-[#d4af37] outline-none transition-all"
                >
                  {getAvailableTargets().map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Event Category</label>
                  <select 
                    value={eventType} 
                    onChange={(e) => setEventType(e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:border-[#d4af37] outline-none transition-all"
                  >
                    {EVENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Expiration</label>
                  <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:border-[#d4af37] outline-none" />
                </div>
              </div>

              {eventType === 'Private Practice' && (
                <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black uppercase text-[#d4af37] ml-1">Team Assignment</label>
                  <select required value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="w-full bg-slate-50 border border-[#d4af37]/30 rounded-xl p-3 text-xs text-slate-900 focus:border-[#d4af37] outline-none">
                    <option value="">Select Team...</option>
                    {teams.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Details</label>
                <textarea required value={text} onChange={(e) => setText(e.target.value)} className="w-full h-32 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-900 resize-none outline-none focus:border-[#d4af37] transition-all" placeholder="Enter broadcast details..." />
              </div>
              
              <button type="submit" disabled={sent} className={`w-full font-black py-4 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all ${sent ? "bg-green-600 text-white" : "bg-[#d4af37] text-white hover:bg-[#b8962d] shadow-lg shadow-[#d4af37]/20"}`}>
                {sent ? "TRANSMITTED" : "EXECUTE TRANSMISSION"}
              </button>
            </form>
          </div>

          {/* HISTORY CARD */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl overflow-y-auto max-h-[700px]">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 px-2">Broadcast History</h2>
            <div className="space-y-4">
              {existingAnnouncements.map(item => (
                <div key={item.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex justify-between items-start hover:border-[#d4af37]/30 transition-all shadow-sm">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border border-[#d4af37]/50 text-[#d4af37] bg-white">{item.eventType}</span>
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-500">To: {item.target}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed pr-4 font-medium italic">"{item.content}"</p>
                    <div className="flex items-center gap-2 mt-2">
                       <p className="text-[9px] text-slate-500 font-bold uppercase tracking-tight">Issued By: {item.issuer}</p>
                       <span className="text-[8px] text-slate-400 font-black px-1 rounded bg-slate-200">LVL {item.issuerLevel}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(item.id, item.issuerLevel)} className="text-slate-300 hover:text-red-500 p-2 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {existingAnnouncements.length === 0 && (
                <p className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest py-10">No records found</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnnouncements;