import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Target, 
  Users, 
  Award, 
  ArrowLeft, 
  ChevronRight, 
  History, 
  MapPin, 
  School 
} from 'lucide-react';

const AboutPage = () => {
  const values = [
    {
      icon: <Shield className="text-[#d4af37]" size={24} />,
      title: "Character",
      desc: "Developing lifelong habits of integrity, ethics, and personal responsibility."
    },
    {
      icon: <Target className="text-[#d4af37]" size={24} />,
      title: "Leadership",
      desc: "Teaching cadets how to lead by example and motivate others toward a common goal."
    },
    {
      icon: <Users className="text-[#d4af37]" size={24} />,
      title: "Citizenship",
      desc: "Preparing young people to be active and informed members of their community."
    },
    {
      icon: <Award className="text-[#d4af37]" size={24} />,
      title: "Academic Excellence",
      desc: "Maintaining the highest standards in academics, physical fitness, and graduation readiness."
    }
  ];

  return (
    <div className="min-h-screen transition-colors duration-300 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-sans selection:bg-[#d4af37]/30">
      
      {/* Hero Section */}
      <div className="relative h-[50vh] flex items-center justify-center overflow-hidden border-b border-slate-200 dark:border-white/5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#d4af37]/10 via-transparent to-transparent opacity-50" />
        <div className="z-10 text-center px-6">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white mb-6 text-xs font-black uppercase tracking-widest transition-all">
            <ArrowLeft size={14} /> Back to Command
          </Link>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter">
            About <span className="text-[#d4af37]">JROTC</span>
          </h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.4em] mt-4 text-xs md:text-sm">
            Pompano Beach High School JROTC
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-20 space-y-32">
        
        {/* Mission Statement */}
        <section className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="text-3xl font-black uppercase italic border-l-4 border-[#d4af37] pl-6 flex items-center gap-3">
              <Target className="text-[#d4af37]" /> The Mission
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
              The mission of JROTC is <span className="text-slate-900 dark:text-white font-black italic">"To motivate young people to be better citizens."</span> 
              It is a high school elective course designed to teach leadership, personal responsibility, and the value of community service without any military obligation.
            </p>
          </div>
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 p-8 rounded-3xl shadow-xl dark:shadow-2xl relative transition-colors duration-300">
            <div className="absolute -top-4 -right-4 bg-[#d4af37] text-slate-950 p-3 rounded-xl font-black rotate-12 uppercase text-xs">Academic Credit</div>
            <h3 className="text-[#d4af37] font-black uppercase tracking-widest text-xs mb-4">The Student-Led Experience</h3>
            <p className="text-slate-500 dark:text-slate-400 italic text-sm leading-loose">
              Unlike traditional classes, JROTC is student-led. Senior students hold leadership positions, managing the battalion's daily operations, planning events, and mentoring younger peers under the guidance of retired Army instructors.
            </p>
          </div>
        </section>

        {/* Triple History Section */}
        <section className="space-y-16">
          <div className="text-center">
            <h2 className="text-3xl font-black uppercase italic">Historical Context</h2>
            <div className="w-24 h-1 bg-[#d4af37] mx-auto mt-4"></div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* National History */}
            <div className="bg-white dark:bg-slate-900/40 p-8 rounded-3xl border border-slate-200 dark:border-white/5 hover:border-[#d4af37]/50 transition-all shadow-sm dark:shadow-none">
              <History className="text-[#d4af37] mb-6" size={32} />
              <h3 className="font-black uppercase italic mb-4">Army JROTC</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Established by the National Defense Act of 1916, JROTC has evolved from a military preparation program into a world-class leadership and citizenship program. Today, it operates in over 1,700 schools nationwide.
              </p>
            </div>

            {/* County History */}
            <div className="bg-white dark:bg-slate-900/40 p-8 rounded-3xl border border-slate-200 dark:border-white/5 hover:border-[#d4af37]/50 transition-all shadow-sm dark:shadow-none">
              <MapPin className="text-[#d4af37] mb-6" size={32} />
              <h3 className="font-black uppercase italic mb-4">Broward County</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Broward County Public Schools (BCPS) boasts one of the largest JROTC footprints in the U.S. With over <span className="text-slate-900 dark:text-white font-bold">33 programs</span>, Broward is a national leader in competitive excellence.
              </p>
            </div>

            {/* School History */}
            <div className="bg-white dark:bg-slate-900/40 p-8 rounded-3xl border border-slate-200 dark:border-white/5 hover:border-[#d4af37]/50 transition-all shadow-sm dark:shadow-none">
              <School className="text-[#d4af37] mb-6" size={32} />
              <h3 className="font-black uppercase italic mb-4">PBHS Legacy</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Pompano Beach High School, established in 1928, has a rich legacy of academic excellence. Our JROTC battalion continues this tradition, bridging school pride with community leadership.
              </p>
            </div>
          </div>
        </section>

        {/* Core Pillars */}
        <section className="space-y-12">
          <div className="text-center">
            <h2 className="text-3xl font-black uppercase italic">Program Pillars</h2>
            <p className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Skills for life beyond high school</p>
          </div>
          <div className="grid md:grid-cols-4 gap-6">
            {values.map((v, i) => (
              <div key={i} className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 p-8 rounded-3xl hover:border-[#d4af37] transition-all group shadow-sm dark:shadow-none">
                <div className="mb-6 bg-slate-100 dark:bg-black/40 w-fit p-4 rounded-2xl group-hover:scale-110 transition-transform">
                  {v.icon}
                </div>
                <h4 className="font-black uppercase italic mb-2">{v.title}</h4>
                <p className="text-slate-500 text-sm font-medium leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Updated Call to Action */}
        <section className="bg-[#d4af37] rounded-[3rem] p-12 text-slate-950 flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl shadow-[#d4af37]/10 transition-transform hover:scale-[1.01]">
          <div>
            <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">Ready to Lead?</h2>
            <p className="font-bold uppercase tracking-widest text-sm opacity-80 mt-4">
              Join the class for next semester! Select JROTC during course registration.
            </p>
          </div>
          <Link 
            to="/admin/signup" 
            className="bg-slate-950 text-white px-8 py-5 rounded-2xl font-black uppercase text-sm flex items-center gap-3 hover:bg-slate-800 transition-all shadow-xl"
          >
            Create Cadet Profile <ChevronRight size={18} />
          </Link>
        </section>
      </div>

      <footer className="py-20 border-t border-slate-200 dark:border-white/5 text-center bg-white dark:bg-slate-900/20 transition-colors duration-300">
        <p className="text-slate-400 dark:text-slate-700 text-[10px] font-black uppercase tracking-[0.5em]">
          Character • Leadership • Academic Excellence
        </p>
      </footer>
    </div>
  );
};

export default AboutPage;