import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { Send, ClipboardList, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const TaskManagement = () => {
  const { userData } = useAuth();
  const [task, setTask] = useState('');
  const [targetPos, setTargetPos] = useState('Company XO');
  const [isSending, setIsSending] = useState(false);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!task.trim()) return;

    setIsSending(true);
    try {
      await addDoc(collection(db, "tasks"), {
        taskContent: task,
        assignedBy: userData.name,
        assignedByPos: userData.position, 
        assignedToPosition: targetPos,    
        status: 'pending',
        timestamp: serverTimestamp(),
      });
      setTask('');
      alert(`Orders published to all ${targetPos}s`);
    } catch (err) {
      console.error("Error deploying task:", err);
      alert("Failed to deploy task. Check console.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 pt-20">
      <div className="max-w-2xl mx-auto">
        <Link to="/admin/dashboard" className="flex items-center gap-2 text-slate-500 hover:text-yellow-500 mb-8 transition-colors text-sm font-bold uppercase tracking-widest">
          <ArrowLeft size={16} /> Back to Command
        </Link>

        <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 shadow-2xl">
          <header className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <ClipboardList className="text-yellow-500" size={24} />
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Publish Operations</h2>
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Battalion Command Channel</p>
          </header>

          <form onSubmit={handleAssign} className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Target Personnel</label>
              <select 
                value={targetPos} 
                onChange={(e) => setTargetPos(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 p-4 rounded-xl text-white focus:border-yellow-500 outline-none transition-all font-bold text-sm"
              >
                <option value="Company XO">Company XOs</option>
                <option value="S1 Assistant">S1 Assistants</option>
                <option value="S2 Assistant">S2 Assistants</option>
                <option value="S3 Assistant">S3 Assistants</option>
                <option value="S4 Assistant">S4 Assistants</option>
                <option value="S5 Assistant">S5 Assistants</option>
                <option value="Company Commander">Company Commanders</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Duty Instructions</label>
              <textarea 
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Ex: Ensure all Alpha Company merit logs are updated by 1500 Friday."
                className="w-full bg-slate-950 border border-white/10 p-4 rounded-xl text-white h-40 focus:border-yellow-500 outline-none transition-all text-sm resize-none"
              />
            </div>

            <button 
              type="submit" 
              disabled={isSending}
              className={`w-full font-black py-4 rounded-xl transition-all flex items-center justify-center gap-2 uppercase tracking-widest ${
                isSending ? 'bg-slate-800 text-slate-500' : 'bg-yellow-500 text-slate-950 hover:bg-yellow-400'
              }`}
            >
              <Send size={18} /> {isSending ? 'Deploying...' : 'Deploy Task'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// CRITICAL: This is the line your App.jsx is looking for!
export default TaskManagement;