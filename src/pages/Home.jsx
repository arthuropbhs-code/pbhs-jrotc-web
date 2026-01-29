import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Users, Award, ArrowRight, Star, ChevronDown, ChevronLeft, ChevronRight, Megaphone, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { db } from '../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

const Home = () => {
  // --- LOCAL SLIDESHOW DATA ---
  // These point directly to your public/covers folder
const slides = [
    {
      url: "/covers/Yuletide2025.JPG", 
      title: "TORNADO",
      subtitle: "BATTALION",
    },
    {
      url: "/covers/ball2024.JPG", 
      title: "DECORATED",
      subtitle: "UNIT WITH DISTINCTION",
    },
    {
      url: "/covers/Raiderstate2025.JPG", 
      title: "PHYSICAL",
      subtitle: "READY FOR THE CHALLENGE",
    },
    {
      url: "/covers/fallenheros2025.JPG", 
      title: "HONORING",
      subtitle: "OUR FALLEN HEROES",
    }
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [news, setNews] = useState([]);

  // Auto-rotate slides
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev === slides.length - 1 ? 0 : prev + 1));
    }, 6000);
    return () => clearInterval(timer);
  }, [slides.length]);

  // Fetch Live Announcements
  useEffect(() => {
    const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"), limit(3));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNews(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  const nextSlide = () => setCurrentIndex(currentIndex === slides.length - 1 ? 0 : currentIndex + 1);
  const prevSlide = () => setCurrentIndex(currentIndex === 0 ? slides.length - 1 : currentIndex - 1);

  return (
    <div className="bg-slate-950 text-slate-200 min-h-screen font-sans">
      
      {/* --- HERO SLIDESHOW --- */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 z-0"
          >
            <img 
              src={slides[currentIndex].url} 
              alt="Battalion Slide"
              className="w-full h-full object-cover"
            />
            {/* Darker Overlay for better text contrast */}
            <div className="absolute inset-0 bg-black/60" />
          </motion.div>
        </AnimatePresence>
        
        <div className="relative z-10 text-center px-6">
          <motion.span 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-yellow-500 font-bold tracking-[0.4em] uppercase text-xs md:text-sm mb-6 block"
          >
            Pompano Beach High School
          </motion.span>
          
          <motion.h1 
            key={slides[currentIndex].title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-9xl font-black text-white mb-6 tracking-tighter leading-none"
          >
            {slides[currentIndex].title} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 via-yellow-200 to-yellow-600">
              {slides[currentIndex].subtitle}
            </span>
          </motion.h1>

          <div className="flex flex-wrap justify-center gap-4 mt-10">
            <Link to="/cadet-info" className="bg-yellow-500 text-slate-950 px-8 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-yellow-400 transition-all">
              Enter Portal
            </Link>
            <Link to="/teams" className="bg-white/10 border border-white/20 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-white/20 transition-all backdrop-blur-md">
              Special Teams
            </Link>
          </div>
        </div>

        {/* Navigation Arrows */}
        <button onClick={prevSlide} className="absolute left-6 z-20 p-2 text-white/50 hover:text-yellow-500 transition-colors">
          <ChevronLeft size={40} />
        </button>
        <button onClick={nextSlide} className="absolute right-6 z-20 p-2 text-white/50 hover:text-yellow-500 transition-colors">
          <ChevronRight size={40} />
        </button>

        {/* Progress Dots */}
        <div className="absolute bottom-10 flex gap-2 z-20">
          {slides.map((_, i) => (
            <button 
              key={i} 
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 transition-all rounded-full ${i === currentIndex ? "w-12 bg-yellow-500" : "w-4 bg-white/20"}`}
            />
          ))}
        </div>
      </section>

      {/* --- LIVE BULLETINS (From Firebase) --- */}
      {news.length > 0 && (
        <section className="py-12 bg-slate-900/50 border-y border-white/5">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center gap-3 mb-8">
              <Megaphone className="text-yellow-500" size={20} />
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-white">Battalion Bulletins</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {news.map((item) => (
                <div key={item.id} className="bg-slate-950 border border-white/5 p-6 rounded-2xl">
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mb-3 font-bold uppercase tracking-widest">
                    <Clock size={12} />
                    {item.timestamp?.toDate().toLocaleDateString() || "Active Order"}
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed mb-4">{item.content}</p>
                  <div className="text-yellow-500/40 text-[9px] font-black uppercase tracking-widest">Signed: {item.author}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --- ARMY VALUES --- */}
      <section className="py-24 bg-white text-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-center text-[10px] font-black tracking-[0.5em] text-slate-400 uppercase mb-16">The Seven Army Values</h2>
          <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
            {['Loyalty', 'Duty', 'Respect', 'Service', 'Honor', 'Integrity', 'Courage'].map((val, i) => (
              <div key={i} className="group border border-slate-100 p-6 flex flex-col items-center hover:bg-slate-950 hover:text-white transition-all duration-500 rounded-2xl cursor-default">
                <Star className="text-yellow-500 mb-3 group-hover:scale-110 transition-transform" size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">{val}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- QUICK ACCESS --- */}
      <section className="py-32 max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        <InfoCard icon={<Shield />} title="Cadet Info" desc="Regulations, Creed, and Knowledge." link="/cadet-info" />
        <InfoCard icon={<Users />} title="Leadership" desc="Battalion Staff & Command." link="/leadership" />
        <InfoCard icon={<Award />} title="Special Teams" desc="Raiders, Drill, and Color Guard." link="/teams" />
      </section>
    </div>
  );
};

const InfoCard = ({ icon, title, desc, link }) => (
  <Link to={link} className="bg-slate-900 border border-white/5 p-10 rounded-3xl hover:border-yellow-500/40 transition-all block group relative">
    <div className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity text-yellow-500">
      <ArrowRight size={20} />
    </div>
    <div className="mb-6 p-4 bg-yellow-500/5 text-yellow-500 rounded-xl w-fit group-hover:bg-yellow-500 group-hover:text-slate-950 transition-colors">
      {icon}
    </div>
    <h3 className="text-2xl font-black uppercase italic mb-4 text-white">{title}</h3>
    <p className="text-slate-400 text-sm leading-relaxed">{desc}</p>
  </Link>
);

export default Home;