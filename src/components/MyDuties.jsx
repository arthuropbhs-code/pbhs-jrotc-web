import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { CheckCircle2, Circle, Clock, Bell, ClipboardCheck } from 'lucide-react';

const MyDuties = () => {
  const { userData, role } = useAuth();
  const [myTasks, setMyTasks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

useEffect(() => {
    if (!role || !userData?.position || !userData?.company) return;

    setLoading(true);

    const qTasks = query(
      collection(db, "tasks"), 
      where("assignedToPosition", "==", userData.position)
    );

// Inside useEffect in MyDuties.jsx
const qOrders = query(
  collection(db, "orders"),
  where("active", "==", true),
  where("targets", "array-contains-any", [
    "All Battalion", 
    "Staff", 
    "Top 4",
    userData.company,               // Matches "X-Ray"
    `${userData.company} Company`,   // Matches "X-Ray Company"
    userData.position,
    "All"
  ]),
  orderBy("timestamp", "desc")
);
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      setMyTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Task Query Failed:", error);
    });

    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      // Success! Stop the loading spinner even if 0 results
      setLoading(false); 
    }, (error) => {
      console.error("Order Query Failed:", error);
      setLoading(false); // Stop loading so user sees "No Orders" instead of a hang
    });

    return () => {
      unsubTasks();
      unsubOrders();
    };
  }, [role, userData?.position, userData?.company]);

  const toggleComplete = async (id, currentStatus) => {
    if (!id) return;
    try {
      const taskRef = doc(db, "tasks", id);
      await updateDoc(taskRef, {
        status: currentStatus === 'pending' ? 'completed' : 'pending',
        lastUpdated: serverTimestamp()
      });
    } catch (error) {
      console.error("Permission/Update Error:", error);
      alert("Could not update task. Check your Firestore Rules.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-10 space-y-4">
        <div className="w-6 h-6 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
        <p className="text-slate-500 animate-pulse text-[10px] font-black uppercase tracking-widest">
          Syncing with HQ...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* SECTION 1: ORDERS */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest flex items-center gap-2">
          <Bell size={14} /> Active Orders
        </h4>
        {orders.length === 0 ? (
          <p className="text-slate-600 text-[10px] uppercase font-bold pl-6">No current broadcast orders.</p>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-slate-950/40 border-l-2 border-yellow-500 p-4 rounded-r-xl">
              <p className="text-sm text-slate-200 font-medium">{order.content}</p>
              <div className="mt-2 flex justify-between items-center text-[9px] font-black uppercase tracking-tighter">
                <span className="text-slate-500">Issuer: {order.issuer}</span>
                <span className="text-slate-600 italic">
                   {order.timestamp?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || "Just now"}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* SECTION 2: TASKS */}
      <div className="space-y-4">
        <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-2">
          <ClipboardCheck size={14} /> My Action Items
        </h4>
        {myTasks.length === 0 ? (
          <div className="text-center py-8 border border-white/5 bg-white/[0.02] rounded-2xl">
            <p className="text-slate-600 text-[10px] uppercase font-bold">No tasks assigned to your position.</p>
          </div>
        ) : (
          myTasks.map(task => (
            <div key={task.id} className={`p-4 rounded-xl border transition-all ${
              task.status === 'completed' ? 'bg-green-500/5 border-green-500/10 opacity-60' : 'bg-slate-900 border-white/5 shadow-lg'
            }`}>
              <div className="flex gap-4">
                <button onClick={() => toggleComplete(task.id, task.status)} className="mt-1 transition-transform active:scale-90">
                  {task.status === 'completed' ? <CheckCircle2 className="text-green-500" size={20} /> : <Circle className="text-slate-700" size={20} />}
                </button>
                <div className="flex-1">
                  <p className={`text-sm ${task.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-200 font-medium'}`}>{task.taskContent}</p>
                  <p className="text-[9px] font-black text-slate-500 uppercase mt-2 tracking-widest">Assigner: {task.assignedByPos}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MyDuties;