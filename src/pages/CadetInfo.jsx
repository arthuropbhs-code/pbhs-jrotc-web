import React from 'react';
import { Shield, Star, Users, Award, Target, Book, Scale, GraduationCap, ChevronDown } from 'lucide-react';

const Section = ({ title, icon: Icon, children, color = "yellow" }) => (
  <div className="bg-slate-900/80 border border-white/5 p-8 rounded-3xl hover:border-yellow-500/20 transition-all shadow-xl">
    <div className="flex items-center gap-4 mb-6">
      <div className={`p-3 bg-${color}-500/10 rounded-2xl text-${color}-500`}>
        <Icon size={28} />
      </div>
      <h2 className="text-2xl font-black uppercase italic tracking-tighter">{title}</h2>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

const RankItem = ({ name, description, type }) => (
  <div className="flex flex-col items-center bg-black/40 p-3 rounded-xl border border-white/5 group hover:border-yellow-500/50 transition-colors">
    <div className="w-full aspect-square mb-3 bg-white/5 rounded-lg flex flex-col items-center justify-center p-2 text-center">
      <span className={`text-[10px] font-black uppercase ${type === 'officer' ? 'text-yellow-500' : 'text-slate-400'}`}>
        {description}
      </span>
    </div>
    <span className="text-[10px] font-black uppercase text-center leading-tight tracking-tighter">{name}</span>
  </div>
);

const CadetInfo = () => {
  const officerRanks = [
    { name: "Cadet Colonel", desc: "3 Diamonds" },
    { name: "Cadet LTC", desc: "2 Diamonds" },
    { name: "Cadet Major", desc: "1 Diamond" },
    { name: "Cadet Captain", desc: "3 Disks" },
    { name: "Cadet 1st LT", desc: "2 Disks" },
    { name: "Cadet 2nd LT", desc: "1 Disk" },
  ];

  const enlistedRanks = [
    { name: "Cadet CSM", desc: "3 Up / 3 Down / Wreath" },
    { name: "Cadet SGM", desc: "3 Up / 3 Down / Star" },
    { name: "Cadet 1SG", desc: "3 Up / 3 Down / Diamond" },
    { name: "Cadet MSG", desc: "3 Up / 3 Down" },
    { name: "Cadet SFC", desc: "3 Up / 2 Down" },
    { name: "Cadet SSG", desc: "3 Up / 1 Down" },
    { name: "Cadet SGT", desc: "3 Up" },
    { name: "Cadet CPL", desc: "2 Up" },
    { name: "Cadet PFC", desc: "1 Up / 1 Down" },
    { name: "Cadet Private", desc: "1 Up" },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-24 pb-20 px-6 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* HERO HEADER */}
        <div className="text-center mb-16">
          <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter mb-4">
            General <span className="text-yellow-500">Info</span>
          </h1>
          <div className="flex items-center justify-center gap-4 text-slate-500 font-bold uppercase tracking-[0.4em] text-xs">
            <span>PBHS JROTC</span>
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span>Est. 2006</span>
          </div>
        </div>

        {/* TOP ROW: MISSION & MEANINGS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-yellow-500 p-6 rounded-3xl text-slate-950">
            <h3 className="text-xs font-black uppercase mb-1 opacity-70 tracking-widest">The Mission</h3>
            <p className="text-xl font-black uppercase italic leading-tight">To motivate young people to be better citizens.</p>
          </div>
          <div className="bg-slate-900 border border-white/10 p-6 rounded-3xl">
            <h3 className="text-xs font-black uppercase mb-2 text-yellow-500 tracking-widest">Definitions</h3>
            <div className="space-y-1 text-sm font-bold uppercase italic">
              <p><span className="text-slate-500 not-italic mr-2">JROTC:</span> Junior Reserve Officer Training Corps</p>
              <p><span className="text-slate-500 not-italic mr-2">LET:</span> Leadership Education Training</p>
            </div>
          </div>
          <div className="bg-slate-900 border border-white/10 p-6 rounded-3xl">
            <h3 className="text-xs font-black uppercase mb-2 text-yellow-500 tracking-widest">Leadership</h3>
            <p className="text-[11px] leading-relaxed text-slate-400 font-medium">
              The ability to influence others to accomplish a mission in the manner desired by providing <span className="text-white">purpose, direction, and motivation.</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          <div className="space-y-8 lg:col-span-2">
            
            {/* INSIGNIA SECTION */}
            <Section title="Insignia of Grade" icon={GraduationCap} color="yellow">
              <div className="space-y-8">
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4 flex items-center gap-2">
                    <div className="h-px flex-1 bg-white/10"></div>
                    Officer Ranks
                    <div className="h-px flex-1 bg-white/10"></div>
                  </h4>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                    {officerRanks.map(r => <RankItem key={r.name} name={r.name} description={r.desc} type="officer" />)}
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4 flex items-center gap-2">
                    <div className="h-px flex-1 bg-white/10"></div>
                    Enlisted Ranks
                    <div className="h-px flex-1 bg-white/10"></div>
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {enlistedRanks.map(r => <RankItem key={r.name} name={r.name} description={r.desc} type="enlisted" />)}
                  </div>
                </div>
              </div>
            </Section>

            {/* THE CREED */}
            <Section title="The Cadet Creed" icon={Shield} color="yellow">
              <p className="text-sm leading-relaxed italic text-slate-300 whitespace-pre-line border-l-2 border-yellow-500/50 pl-6 py-2">
                I am an Army Junior R.O.T.C. Cadet.{"\n"}
                I will always conduct myself to bring credit to my family, country, school, and the Corps of Cadets.{"\n"}
                I am loyal and patriotic. I am the future of the United States of America.{"\n"}
                I do not lie, cheat, or steal, and will always be held accountable for my actions and deeds.{"\n"}
                I will always practice good citizenship and patriotism.{"\n"}
                I will work hard to improve my mind and strengthen my body.{"\n"}
                I will seek the mantle of leadership and stand prepared to uphold the Constitution and the American Way of Life.{"\n"}
                May God grant me the strength to always live by this creed.
              </p>
            </Section>

            {/* 11 PRINCIPLES */}
            <Section title="11 Principles of Leadership" icon={Scale} color="blue">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "Know yourself and seek self-improvement.",
                  "Be technically and tactically proficient.",
                  "Set the example.",
                  "Ensure the task is understood, supervised, and accomplished.",
                  "Know your subordinates and look out for their welfare.",
                  "Seek responsibility and take responsibility for your actions.",
                  "Make sound and timely decisions.",
                  "Keep your subordinates informed.",
                  "Develop a sense of responsibility among your subordinates.",
                  "Employ your subordinates in accordance with their capabilities.",
                  "Train your subordinates as a team."
                ].map((p, i) => (
                  <div key={i} className="flex gap-3 text-[11px] bg-black/40 p-3 rounded-xl border border-white/5 group hover:border-blue-500/30 transition-colors">
                    <span className="text-blue-500 font-black">{i + 1}</span>
                    <span className="text-slate-300 group-hover:text-white transition-colors">{p}</span>
                  </div>
                ))}
              </div>
            </Section>
          </div>

          <div className="space-y-8">
            {/* BATTALION LEADERSHIP */}
            <Section title="Battalion Leadership" icon={Users} color="yellow">
              <div className="space-y-4">
                <div className="bg-yellow-500 p-4 rounded-2xl text-slate-950">
                  <p className="text-[10px] font-black uppercase opacity-60">Battalion Commander</p>
                  <p className="text-lg font-black uppercase italic tracking-tighter">Cadet Pacheco</p>
                </div>
                <div className="grid grid-cols-1 gap-2 text-[13px] font-black uppercase italic">
                  <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                    <span className="text-slate-500 not-italic text-[9px]">DC</span>
                    <span>Cadet T. Kitts</span>
                  </div>
                  <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                    <span className="text-slate-500 not-italic text-[9px]">XO</span>
                    <span>Cadet G. Kitts</span>
                  </div>
                  <div className="bg-black/40 p-3 rounded-xl border border-white/5 flex justify-between items-center">
                    <span className="text-slate-500 not-italic text-[9px]">CSM</span>
                    <span>Cadet Morrison</span>
                  </div>
                </div>
              </div>
            </Section>

            {/* ARMY VALUES */}
            <Section title="Army Values" icon={Award} color="yellow">
              <div className="space-y-3">
                {[
                  { l: "L", v: "Loyalty", d: "True faith and allegiance." },
                  { l: "D", v: "Duty", d: "Fulfill your obligations." },
                  { l: "R", v: "Respect", d: "Treat others as they should be." },
                  { l: "S", v: "Selfless Service", d: "Nation before self." },
                  { l: "H", v: "Honor", d: "Live up to all values." },
                  { l: "I", v: "Integrity", d: "Do what is right." },
                  { l: "P", v: "Personal Courage", d: "Face fear or adversity." }
                ].map((item) => (
                  <div key={item.l} className="group">
                    <div className="flex items-center gap-3">
                      <span className="text-xl font-black text-yellow-500">{item.l}</span>
                      <span className="font-bold text-xs text-white uppercase tracking-wider">{item.v}</span>
                    </div>
                    <p className="text-[10px] text-slate-500 ml-6 group-hover:text-slate-300 transition-colors">{item.d}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* INSTRUCTORS */}
            <Section title="Instructors" icon={Star} color="yellow">
              <div className="space-y-2">
                <div className="p-3 rounded-xl border border-white/5 bg-black/20 flex items-center justify-between">
                  <span className="text-[10px] text-yellow-500 font-black">SAI</span>
                  <p className="font-black uppercase italic text-sm">LTC Johnson</p>
                </div>
                <div className="p-3 rounded-xl border border-white/5 bg-black/20 flex items-center justify-between">
                  <span className="text-[10px] text-yellow-500 font-black">AI</span>
                  <p className="font-black uppercase italic text-sm">1SG Chevrestt</p>
                </div>
              </div>
            </Section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CadetInfo;