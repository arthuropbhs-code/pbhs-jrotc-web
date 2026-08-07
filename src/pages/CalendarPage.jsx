import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageMeta } from '../hooks/usePageMeta';

const CalendarPage = () => {
  usePageMeta({
    title: 'Events Calendar',
    description: 'Upcoming PBHS JROTC Tornado Battalion events, meetings, and competitions.',
    path: '/events',
  });
  const [events, setEvents] = useState([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  // --- DATA FETCHING ---
  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("date", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // --- CALENDAR MATH ---
  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));

  return (
    /* pt-48 ensures clearance from global nav bar */
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-6 md:p-12 pt-48 font-sans transition-colors duration-300">
      <div className="max-w-6xl mx-auto mt-8">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <Link to="/admin/dashboard" className="text-slate-400 dark:text-slate-500 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-2 hover:text-yellow-600 dark:hover:text-yellow-500 transition-all">
              <ArrowLeft size={14} /> Back to Command
            </Link>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              <CalendarIcon className="text-yellow-600 dark:text-yellow-500" /> Battalion Schedule
            </h1>
          </div>

          <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-200 dark:border-white/5 shadow-xl shadow-slate-200/50 dark:shadow-none">
            <button onClick={prevMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <ChevronLeft />
            </button>
            <h2 className="text-lg font-black uppercase italic min-w-[160px] text-center tracking-tight">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white">
              <ChevronRight />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
          
          {/* MAIN CALENDAR GRID */}
          <div className="lg:col-span-5 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 backdrop-blur-md shadow-xl shadow-slate-200/40 dark:shadow-none">
            <div className="grid grid-cols-7 mb-6">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em]">{d}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-3">
              {[...Array(firstDayOfMonth)].map((_, i) => <div key={`empty-${i}`} />)}
              
              {[...Array(daysInMonth)].map((_, i) => {
                const day = i + 1;
                const today = new Date();
                
                const isToday = 
                  day === today.getDate() && 
                  currentDate.getMonth() === today.getMonth() && 
                  currentDate.getFullYear() === today.getFullYear();

                const hasEvent = events.some(e => {
                  if (!e.date) return false;
                  const eventDate = new Date(e.date.replace(/-/g, '/'));
                  return (
                    eventDate.getDate() === day && 
                    eventDate.getMonth() === currentDate.getMonth() &&
                    eventDate.getFullYear() === currentDate.getFullYear()
                  );
                });

                return (
                  <div 
                    key={day} 
                    className={`aspect-square rounded-2xl border transition-all duration-300 flex flex-col items-center justify-center relative group
                      ${isToday 
                        ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                        : hasEvent 
                          ? 'border-yellow-500/40 bg-yellow-500/5' 
                          : 'border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20 hover:border-slate-300 dark:hover:border-white/10'
                      }`}
                  >
                    <span className={`text-sm font-black 
                      ${isToday ? 'text-blue-600 dark:text-blue-400' : hasEvent ? 'text-yellow-600 dark:text-yellow-500' : 'text-slate-300 dark:text-slate-600'}`}
                    >
                      {day}
                    </span>
                    
                    {isToday && (
                      <span className="absolute top-2 text-[7px] font-black uppercase tracking-widest text-blue-500 animate-pulse">
                        Today
                      </span>
                    )}

                    {hasEvent && !isToday && (
                      <div className="absolute bottom-2 w-1.5 h-1.5 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.4)]" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SIDEBAR AGENDA */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Monthly Agenda</h3>
              <div className="h-px flex-1 bg-slate-200 dark:bg-white/5 ml-4" />
            </div>
            
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {events
                  .filter(e => {
                    if (!e.date) return false;
                    const eventDate = new Date(e.date.replace(/-/g, '/'));
                    return eventDate.getMonth() === currentDate.getMonth() && eventDate.getFullYear() === currentDate.getFullYear();
                  })
                  .map((event, idx) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={event.id} 
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 p-6 rounded-[2rem] relative overflow-hidden group hover:border-yellow-500/30 transition-all shadow-lg shadow-slate-200/40 dark:shadow-none"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-yellow-600 dark:bg-yellow-500" />
                    <p className="text-[10px] font-black text-yellow-600 dark:text-yellow-500 uppercase mb-1 tracking-tighter">{event.date}</p>
                    <h4 className="font-bold text-slate-900 dark:text-white mb-3 tracking-tight group-hover:text-yellow-600 dark:group-hover:text-yellow-500 transition-colors">
                      {event.title}
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-500">
                        <MapPin size={12} className="text-slate-400 dark:text-slate-600" /> 
                        <span className="text-[10px] font-bold uppercase truncate">{event.location}</span>
                      </div>
                      {event.time && (
                        <div className="flex items-center gap-2 text-slate-500">
                          <Clock size={12} className="text-slate-400 dark:text-slate-600" /> 
                          <span className="text-[10px] font-bold uppercase">{event.time}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {events.filter(e => {
                if(!e.date) return false;
                return new Date(e.date.replace(/-/g, '/')).getMonth() === currentDate.getMonth();
              }).length === 0 && (
                <div className="text-center py-24 bg-slate-100/50 dark:bg-transparent border-2 border-dashed border-slate-200 dark:border-white/5 rounded-[3rem] text-slate-400 dark:text-slate-800 text-[10px] font-black uppercase tracking-widest">
                  No Mission Entries
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;