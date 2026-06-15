import React from 'react';
import { Link } from 'react-router-dom';
import { Shield, Mail, MapPin, ExternalLink, Instagram } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    resources: [
      { name: "Cadet Creed", path: "/cadet-info" },
      { name: "Rank Structure", path: "/cadet-info" },
      { name: "Promotion Study Guide", path: "/promotion-board" },
      { name: "Uniform Regulations", path: "/cadet-info" },
    ],
    battalion: [
      { name: "Leadership", path: "/leadership" },
      { name: "Teams & Units", path: "/teams" },
      { name: "Photo Gallery", path: "/photos" },
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
              <Shield className="text-[#d4af37]" size={28} />
              <div>
                <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">
                  PBHS <span className="text-[#d4af37]">JROTC</span>
                </h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">
                  Tornado Battalion
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed italic">
              "To motivate young people to be better citizens."
            </p>
            <div className="flex gap-4">
              <a 
                href="https://www.instagram.com/pbhs.battalion" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 bg-white/5 rounded-lg text-slate-400 hover:text-[#d4af37] transition-colors"
              >
                <Instagram size={18} />
              </a>
            </div>
          </div>

          {/* COLUMN 2: QUICK RESOURCES */}
          <div>
            <h4 className="text-[#d4af37] font-black uppercase text-xs mb-6 tracking-widest">Resources</h4>
            <ul className="space-y-4">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  <Link to={link.path} className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <div className="w-1 h-1 bg-[#d4af37] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* COLUMN 3: BATTALION */}
          <div>
            <h4 className="text-[#d4af37] font-black uppercase text-xs mb-6 tracking-widest">Battalion</h4>
            <ul className="space-y-4">
              {footerLinks.battalion.map((link) => (
                <li key={link.name}>
                  <Link to={link.path} className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-2 group">
                    <div className="w-1 h-1 bg-[#d4af37] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* COLUMN 4: CONTACT / LOCATION */}
          <div className="space-y-6">
            <h4 className="text-[#d4af37] font-black uppercase text-xs mb-6 tracking-widest">Contact</h4>
            <div className="space-y-4 text-sm text-slate-400">
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-[#d4af37] shrink-0" />
                <span>600 NE 13th Ave,<br />Pompano Beach, FL 33060</span>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={18} className="text-[#d4af37] shrink-0" />
                <span>info@pbhsjrotc.com</span>
              </div>
            </div>
          </div>

        </div>

        {/* DISCLAIMER BOX */}
        <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-xl">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider leading-relaxed text-center">
            <span className="text-[#d4af37] font-black">Disclaimer:</span> This current website is not affiliated with PBHS JROTC Tornado Battalion BCPS, Army JROTC, or Pompano Beach High. This is an independent project.
          </p>
        </div>

        {/* BOTTOM BAR */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            © {currentYear} PBHS JROTC Tornado Battalion.
          </p>
          <div className="flex items-center gap-6 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            <Link to="/admin" className="hover:text-[#d4af37] transition-colors">Admin Portal</Link>
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