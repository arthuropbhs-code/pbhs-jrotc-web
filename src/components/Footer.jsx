import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, MapPin, ExternalLink, Instagram, Youtube } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    resources: [
      { name: "Cadet Creed", path: "/cadet-info" },
      { name: "Rank Structure", path: "/cadet-info" },
      { name: "Promotion Study Guide", path: "/promotion-board" },
      { name: "Documents & Regulations", path: "/documents" },
    ],
    battalion: [
      { name: "Leadership", path: "/leadership" },
      { name: "Special Teams", path: "/teams" },
      { name: "Announcements", path: "/announcements" },
    ],
  };

  return (
    <footer className="bg-[#0a0c12] border-t border-white/5 pt-16 pb-8 px-6 mt-20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* COLUMN 1: BRANDING */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Shield className="text-yellow-500" size={28} />
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">
                  PBHS <span className="text-yellow-500">JROTC</span>
                </h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                  Tornado Battalion
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed italic">
              "To motivate young people to be better citizens."
            </p>
            <p className="text-xs font-black text-yellow-500 uppercase tracking-[0.25em]">
              Above and Beyond
            </p>
            <div className="flex gap-4">
              <a
                href="https://www.instagram.com/pbhs.battalion"
                target="_blank"
                rel="noopener noreferrer"
                title="Instagram"
                aria-label="PBHS JROTC on Instagram"
                className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-yellow-500 transition-colors"
              >
                <Instagram size={18} />
              </a>
              <a
                href="https://www.youtube.com/@pbhsjrotc"
                target="_blank"
                rel="noopener noreferrer"
                title="YouTube"
                aria-label="PBHS JROTC on YouTube"
                className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-yellow-500 transition-colors"
              >
                <Youtube size={18} />
              </a>
            </div>
          </div>

          {/* COLUMN 2: QUICK RESOURCES */}
          <div>
            <h3 className="text-yellow-500 font-black uppercase text-xs mb-6 tracking-widest">Resources</h3>
            <ul className="space-y-4">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link to={link.path} className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <div className="w-1 h-1 bg-yellow-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* COLUMN 3: BATTALION */}
          <div>
            <h3 className="text-yellow-500 font-black uppercase text-xs mb-6 tracking-widest">Battalion</h3>
            <ul className="space-y-4">
              {footerLinks.battalion.map((link) => (
                <li key={link.name}>
                  <Link to={link.path} className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <div className="w-1 h-1 bg-yellow-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* COLUMN 4: CONTACT / LOCATION */}
          <div className="space-y-6">
            <h3 className="text-yellow-500 font-black uppercase text-xs mb-6 tracking-widest">Contact</h3>
            <div className="space-y-4 text-sm text-slate-400">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-yellow-500 shrink-0" />
                <span>600 NE 13th Ave,<br />Pompano Beach, FL 33060</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-yellow-500 shrink-0" />
                <span>info@pbhsjrotc.com</span>
              </div>
              <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-500 shrink-0"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <a href="tel:+17543222000" className="hover:text-white transition-colors">(754) 322-2000</a>
              </div>
            </div>
          </div>

        </div>

        {/* BOTTOM BAR */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            © {currentYear} PBHS JROTC Tornado Battalion.
          </p>
          <div className="flex items-center gap-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <Link to="/privacy" className="hover:text-yellow-500 transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-yellow-500 transition-colors">Terms of Service</Link>
            <Link to="/admin" className="hover:text-yellow-500 transition-colors">Admin Portal</Link>
            <a 
              href="https://www.usarmyjrotc.com/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 hover:text-white transition-colors"
            >
              U.S. Army JROTC <ExternalLink size={10} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;