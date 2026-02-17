import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin, Clock, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const CalendarPage = () => {
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
    <div className="min-h-screen bg-slate-950 text-white p-8 pt-24 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <Link to="/admin/dashboard" className="text-yellow-500 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest mb-2 hover:opacity-70 transition-all">
              <ArrowLeft size={14} /> Back to Command
            </Link>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              <CalendarIcon className="text-yellow-500" /> Battalion Schedule
            </h1>
          </div>

          <div className="flex items-center gap-4 bg-slate-900 p-2 rounded-2xl border border-white/5 shadow-2xl">
            <button onClick={prevMonth} className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white"><ChevronLeft /></button>
            <h2 className="text-lg font-black uppercase italic min-w-[160px] text-center tracking-tight">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-white/5 rounded-xl transition-all text-slate-400 hover:text-white"><ChevronRight /></button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-7 gap-8">
          
          {/* MAIN CALENDAR GRID */}
          <div className="lg:col-span-5 bg-slate-900/50 border border-white/5 rounded-[2.5rem] p-8 backdrop-blur-md shadow-inner">
            <div className="grid grid-cols-7 mb-6">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="text-center text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">{d}</div>
              ))}
            </div>
            
            <div className="grid grid-cols-7 gap-3">
              {/* Padding for start of month */}
              {[...Array(firstDayOfMonth)].map((_, i) => <div key={`empty-${i}`} />)}
              
              {/* Individual Day Cells */}
              {[...Array(daysInMonth)].map((_, i) => {
                const day = i + 1;
                const today = new Date();
                
                // TODAY CHECK (Matches Feb 5th 2026)
                const isToday = 
                  day === today.getDate() && 
                  currentDate.getMonth() === today.getMonth() && 
                  currentDate.getFullYear() === today.getFullYear();

                // EVENT CHECK (Fixed Offset Logic)
                const hasEvent = events.some(e => {
                  if (!e.date) return false;
                  // replace(/-/g, '\/') forces JS to parse date in local timezone
                  const eventDate = new Date(e.date.replace(/-/g, '\/'));
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
                        ? 'border-blue-500 bg-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.15)]' 
                        : hasEvent 
                          ? 'border-yellow-500/40 bg-yellow-500/5' 
                          : 'border-white/5 bg-black/20 hover:border-white/10'
                      }`}
                  >
                    <span className={`text-sm font-black 
                      ${isToday ? 'text-blue-400' : hasEvent ? 'text-yellow-500' : 'text-slate-500'}`}
                    >
                      {day}
                    </span>
                    
                    {isToday && (
                      <span className="absolute top-2 text-[7px] font-black uppercase tracking-widest text-blue-500 animate-pulse">
                        Today
                      </span>
                    )}

                    {hasEvent && !isToday && (
                      <div className="absolute bottom-2 w-1 h-1 bg-yellow-500 rounded-full shadow-[0_0_8px_rgba(234,179,8,0.6)]" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* SIDEBAR AGENDA */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Monthly Agenda</h3>
              <div className="h-px flex-1 bg-white/5 ml-4" />
            </div>
            
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {events
                  .filter(e => {
                    const eventDate = new Date(e.date.replace(/-/g, '\/'));
                    return eventDate.getMonth() === currentDate.getMonth() && eventDate.getFullYear() === currentDate.getFullYear();
                  })
                  .map(event => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    key={event.id} 
                    className="bg-slate-900 border border-white/5 p-5 rounded-3xl relative overflow-hidden group hover:border-white/10 transition-all"
                  >
                    <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500" />
                    <p className="text-[10px] font-black text-yellow-500 uppercase mb-1 tracking-tighter">{event.date}</p>
                    <h4 className="font-bold text-white mb-3 tracking-tight group-hover:text-yellow-500 transition-colors">{event.title}</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-slate-400">
                        <MapPin size={12} className="text-slate-600" /> 
                        <span className="text-[10px] font-bold uppercase truncate">{event.location}</span>
                      </div>
                      {event.time && (
                        <div className="flex items-center gap-2 text-slate-400">
                          <Clock size={12} className="text-slate-600" /> 
                          <span className="text-[10px] font-bold uppercase">{event.time}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {events.filter(e => new Date(e.date.replace(/-/g, '\/')).getMonth() === currentDate.getMonth()).length === 0 && (
                <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-[2rem] text-slate-700 text-[10px] font-black uppercase tracking-widest">
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