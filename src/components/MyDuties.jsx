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
import { CheckCircle2, Circle, Bell, ClipboardCheck } from 'lucide-react';

const MyDuties = () => {
  const { userData, role } = useAuth();
  const [myTasks, setMyTasks] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!role || !userData?.position || !userData?.company) return;

    // Intentional: resets the loading state when role/position/company
    // change (e.g. a live reassignment), not just on mount (loading already
    // starts true there) - the fresh onSnapshot listeners below set it back
    // to false once they resolve. Not something a lazy initializer or
    // derived value can express, since this needs to re-fire on dep change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    // TASK QUERY: Position specific
    const qTasks = query(
      collection(db, "tasks"), 
      where("assignedToPosition", "==", userData.position)
    );

    // ORDER QUERY: Targeting Logic
    const qOrders = query(
      collection(db, "orders"),
      where("active", "==", true),
      where("targets", "array-contains-any", [
        "All Battalion", 
        "Staff", 
        "Top 4",
        userData.company,               
        `${userData.company} Company`,   
        userData.position,
        "All"
      ]),
      orderBy("timestamp", "desc")
    );

    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      setMyTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Task Query Failed:", error));

    const unsubOrders = onSnapshot(qOrders, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false); 
    }, (error) => {
      console.error("Order Query Failed:", error);
      setLoading(false); 
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
      console.error("Update Error:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="w-6 h-6 border-2 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin"></div>
        <p className="text-blue-400 dark:text-slate-500 animate-pulse text-[10px] font-black uppercase tracking-[0.2em]">
          Syncing HQ Transmissions...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* --- SECTION 1: ACTIVE ORDERS (TRANSMISSIONS) --- */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-yellow-500 rounded-full"></div>
          <h4 className="text-[10px] font-black text-yellow-500 uppercase tracking-widest flex items-center gap-2">
            <Bell size={14} /> Priority Orders
          </h4>
        </div>

        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="pl-4 py-4 border-l border-blue-100 dark:border-white/5">
              <p className="text-blue-300 dark:text-slate-600 text-[10px] uppercase font-bold tracking-tight">No current broadcast orders.</p>
            </div>
          ) : (
            orders.map((order) => (
              <div 
                key={order.id} 
                className="group relative bg-blue-50/50 dark:bg-slate-950/50 border border-blue-100 dark:border-white/5 p-5 rounded-2xl transition-all shadow-sm"
              >
                {/* Visual Identity Strip */}
                <div className="absolute left-0 top-4 bottom-4 w-[3px] bg-yellow-500 rounded-r-full shadow-[0_0_8px_rgba(212,175,55,0.3)]"></div>
                
                <div className="flex justify-between items-start pl-3">
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                      {order.content}
                    </p>
                    <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-widest">
                      <span className="text-blue-400 dark:text-slate-500">Issuer: {order.issuer}</span>
                      <span className="w-1 h-1 bg-blue-200 dark:bg-slate-800 rounded-full"></span>
                      <span className="text-yellow-500 opacity-80">Command Feed</span>
                    </div>
                  </div>
                  <span className="text-[9px] font-black text-blue-300 dark:text-slate-700 tabular-nums">
                    {order.timestamp?.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || "RECENT"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- SECTION 2: ACTION ITEMS (TASKS) --- */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-1 h-4 bg-blue-500 dark:bg-blue-600 rounded-full"></div>
          <h4 className="text-[10px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
            <ClipboardCheck size={14} /> My Action Items
          </h4>
        </div>

        {myTasks.length === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-blue-100 dark:border-white/5 bg-blue-50/20 dark:bg-white/[0.02] rounded-3xl">
            <p className="text-blue-200 dark:text-slate-800 text-[10px] uppercase font-black tracking-widest">
              No tasks assigned to your position.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {myTasks.map(task => (
              <div 
                key={task.id} 
                className={`p-5 rounded-2xl border transition-all ${
                  task.status === 'completed' 
                    ? 'bg-green-500/5 border-green-500/10 opacity-60' 
                    : 'bg-white dark:bg-slate-900 border-blue-100 dark:border-white/5 shadow-sm'
                }`}
              >
                <div className="flex gap-4 items-center">
                  <button 
                    onClick={() => toggleComplete(task.id, task.status)} 
                    className="transition-transform active:scale-90"
                  >
                    {task.status === 'completed' 
                      ? <CheckCircle2 className="text-green-500" size={22} /> 
                      : <Circle className="text-blue-100 dark:text-slate-800 group-hover:text-blue-500" size={22} />
                    }
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm font-bold leading-tight ${
                      task.status === 'completed' 
                        ? 'text-slate-400 line-through' 
                        : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {task.taskContent}
                    </p>
                    <p className="text-[9px] font-black text-blue-400 dark:text-slate-600 uppercase mt-1 tracking-widest">
                      Assigner: {task.assignedByPos}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MyDuties;