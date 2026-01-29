import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle2, Circle, Clock } from 'lucide-react';

const MyDuties = () => {
  const { userData } = useAuth();
  const [myTasks, setMyTasks] = useState([]);

  useEffect(() => {
    // Only fetch tasks if we know the user's position (e.g., Company XO)
    if (!userData?.position) return;

    const q = query(
      collection(db, "tasks"), 
      where("assignedToPosition", "==", userData.position)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMyTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => unsubscribe();
  }, [userData]);

  const toggleComplete = async (id, currentStatus) => {
    await updateDoc(doc(db, "tasks", id), {
      status: currentStatus === 'pending' ? 'completed' : 'pending'
    });
  };

  return (
    <div className="space-y-4">
      {myTasks.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-white/5 rounded-2xl">
          <p className="text-slate-500 text-sm italic">All clear. No active orders for {userData?.position}.</p>
        </div>
      ) : (
        myTasks.map(task => (
          <div key={task.id} className={`p-5 rounded-2xl border transition-all duration-300 ${task.status === 'completed' ? 'bg-green-500/5 border-green-500/20' : 'bg-slate-800/50 border-white/5'}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <button 
                  onClick={() => toggleComplete(task.id, task.status)}
                  className="mt-1 hover:scale-110 transition-transform"
                >
                  {task.status === 'completed' ? 
                    <CheckCircle2 className="text-green-500" size={20} /> : 
                    <Circle className="text-slate-600" size={20} />
                  }
                </button>
                <div>
                  <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                    {task.taskContent}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded-md">
                      From: {task.assignedByPos}
                    </span>
                    <span className="text-[9px] text-slate-500 font-bold flex items-center gap-1 uppercase">
                      <Clock size={10} /> {task.timestamp?.toDate().toLocaleDateString() || "Recent"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

// THIS IS THE LINE YOU ARE MISSING:
export default MyDuties;