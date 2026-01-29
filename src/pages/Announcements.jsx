import React from 'react';
import { Bell, Calendar, Megaphone } from 'lucide-react';

const Announcements = () => {
  const news = [
    { id: 1, title: "Annual Inspection Date Set", date: "Feb 15, 2026", category: "Mandatory", content: "All cadets must have uniforms ready for the upcoming SAI inspection." },
    { id: 2, title: "Raider Competition Results", date: "Jan 20, 2026", category: "Teams", content: "Congratulations to our Raiders for taking 2nd place at the regional meet!" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-5xl font-black text-white uppercase italic mb-12">Battalion <span className="text-[oklch(79.5%_0.184_86.047)]">Announcements</span></h1>
        
        <div className="space-y-6">
          {news.map((item) => (
            <div key={item.id} className="bg-[oklch(97%_0.014_254.604)] p-8 rounded-2xl border-l-8 border-[oklch(79.5%_0.184_86.047)] shadow-xl">
              <div className="flex justify-between items-start mb-4">
                <span className="text-[10px] font-black bg-slate-900 text-white px-3 py-1 rounded-full uppercase tracking-widest">{item.category}</span>
                <span className="text-slate-500 text-xs flex items-center gap-1"><Calendar size={12}/> {item.date}</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">{item.title}</h3>
              <p className="text-slate-700 leading-relaxed">{item.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Announcements;