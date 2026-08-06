import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, deleteDoc, doc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Megaphone, Trash2, Send, CheckCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import { ROLE_HIERARCHY, ADMIN_LEVEL, EVENT_TYPES } from '../constants';
import Footer from '../components/Footer';

const AdminAnnouncements = () => {
  const { userData, role } = useAuth();
  const [text, setText] = useState('');
  const [target, setTarget] = useState('All');
  const [eventType, setEventType] = useState('Meeting');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [sent, setSent] = useState(false);
  const [existingAnnouncements, setExistingAnnouncements] = useState([]);
  const [teams, setTeams] = useState([]);

  const userPower = ROLE_HIERARCHY[role] || 1;

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, "specialTeams"), orderBy("name", "asc")), (snap) => {
      setTeams(snap.docs.map(d => d.data().name).filter(Boolean));
    });
    return () => unsubscribe();
  }, []);

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

  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setExistingAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => console.error(err));
    return () => unsubscribe();
  }, []);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (eventType === 'Private Practice') {
      const isTopLevel = userPower >= ADMIN_LEVEL;
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
        issuer: `${userData?.rank || ''} ${userData?.fullName || userData?.name || 'Staff'}`.trim(),
        issuerLevel: userPower,
        target: target,
        eventType: eventType,
        team: eventType === 'Private Practice' ? selectedTeam : null,
        active: true,
        expiresAt: expiryDate ? new Date(expiryDate).getTime() : null,
      });
      setText('');
      setSent(true);
      setTimeout(() => setSent(false), 3000);
    } catch (err) { console.error("Broadcast Error:", err); }
  };

  const handleDelete = async (id, itemLevel) => {
    if (userPower < itemLevel) {
      alert("Priority Restriction: You cannot delete a broadcast from a superior officer.");
      return;
    }
    if (window.confirm("Delete this announcement?")) {
      await deleteDoc(doc(db, "announcements", id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pt-24 px-6 pb-20 font-sans transition-colors duration-300">
      <div className="max-w-6xl mx-auto">

        <div className="mb-8">
          <Link to="/admin/dashboard" className="flex items-center gap-2 text-slate-400 dark:text-slate-500 hover:text-yellow-500 transition-colors font-black uppercase text-[10px] tracking-widest mb-4">
            <ArrowLeft size={14} /> Back to Command
          </Link>
          <h1 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
            <Megaphone className="text-yellow-500" /> Global Broadcast
          </h1>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* CREATE ANNOUNCEMENT CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl dark:shadow-none h-fit">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-2">
              <Megaphone className="text-yellow-500" size={20} /> Send Broadcast
            </h2>

            <form onSubmit={handleBroadcast} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Target Audience</label>
                <select
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:border-yellow-500 outline-none transition-all"
                >
                  {getAvailableTargets().map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Event Category</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:border-yellow-500 outline-none transition-all"
                  >
                    {EVENT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Expiration</label>
                  <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:border-yellow-500 outline-none" />
                </div>
              </div>

              {eventType === 'Private Practice' && (
                <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
                  <label className="text-[10px] font-black uppercase text-yellow-500 ml-1">Team Assignment</label>
                  <select required value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-yellow-500/30 rounded-xl p-3 text-xs text-slate-900 dark:text-white focus:border-yellow-500 outline-none">
                    <option value="">Select Team...</option>
                    {teams.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1">Details</label>
                <textarea required value={text} onChange={(e) => setText(e.target.value)} className="w-full h-32 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-2xl p-4 text-slate-900 dark:text-white resize-none outline-none focus:border-yellow-500 transition-all" placeholder="Enter broadcast details..." />
              </div>

              <button type="submit" disabled={sent} className={`w-full font-black py-4 rounded-xl uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all ${sent ? "bg-green-600 text-white" : "bg-yellow-500 text-slate-950 hover:bg-yellow-400 shadow-lg shadow-yellow-500/20"}`}>
                {sent ? "SENT" : "SEND BROADCAST"}
              </button>
            </form>
          </div>

          {/* HISTORY CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-8 shadow-xl dark:shadow-none overflow-y-auto max-h-[700px]">
            <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 px-2">Broadcast History</h2>
            <div className="space-y-4">
              {existingAnnouncements.map(item => (
                <div key={item.id} className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-white/5 flex justify-between items-start hover:border-yellow-500/30 transition-all shadow-sm dark:shadow-none">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border border-yellow-500/50 text-yellow-500 bg-white dark:bg-slate-900">{item.eventType}</span>
                      <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400">To: {item.target}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed pr-4 font-medium italic">"{item.content}"</p>
                    <div className="flex items-center gap-2 mt-2">
                       <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">Issued By: {item.issuer}</p>
                       <span className="text-[8px] text-slate-400 dark:text-slate-500 font-black px-1 rounded bg-slate-200 dark:bg-white/10">LVL {item.issuerLevel}</span>
                    </div>
                  </div>
                  <button title="Delete announcement" onClick={() => handleDelete(item.id, item.issuerLevel)} className="text-slate-300 dark:text-slate-600 hover:text-red-500 p-2 transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {existingAnnouncements.length === 0 && (
                <p className="text-center text-slate-400 dark:text-slate-600 text-xs font-bold uppercase tracking-widest py-10">No records found</p>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default AdminAnnouncements;
