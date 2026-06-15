import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield, ChevronDown } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path) => currentPath === path;

  // Refined NavLink component
  const NavLink = ({ to, children }) => {
    if (isActive(to)) return null;
    return (
      <Link 
        to={to} 
        className="text-[11px] font-black uppercase tracking-[0.3em] transition-all duration-200 
                   text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:scale-105 active:scale-95"
      >
        {children}
      </Link>
    );
  };

  return (
    <nav className="fixed top-0 w-full z-50 h-16 transition-colors duration-300
                    bg-white/95 dark:bg-[#0a0c12]/95 backdrop-blur-sm 
                    border-b border-slate-200 dark:border-white/5 shadow-md dark:shadow-2xl">
      <div className="max-w-7xl mx-auto h-full flex items-center justify-between px-6">
        
        {/* LEFT SECTION: Logo & Primary Links */}
        <div className="flex items-center gap-10">
          {!isActive('/') ? (
            <Link to="/" className="flex items-center gap-3 group">
              <Shield className="text-[#d4af37] group-hover:rotate-12 transition-transform" size={20} />
              <span className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white group-hover:text-[#d4af37] transition">
                Home
              </span>
            </Link>
          ) : (
            <div className="flex items-center gap-3 opacity-40 cursor-default">
              <Shield className="text-[#d4af37]" size={20} />
              <span className="text-[12px] font-black uppercase tracking-[0.4em] text-slate-900 dark:text-white">Home</span>
            </div>
          )}

          <div className="hidden md:flex items-center gap-8">
            <NavLink to="/about">About</NavLink>

            {/* --- CADET INFO DROPDOWN --- */}
            <div className="relative group py-5">
              <div className="flex items-center gap-1 cursor-pointer">
                <span className={`text-[11px] font-black uppercase tracking-[0.3em] transition-colors 
                  ${currentPath.includes('cadet') || currentPath === '/promotion-board' || currentPath.includes('winning-colors') 
                  ? 'text-[#d4af37]' 
                  : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                  Cadet Info
                </span>
                <ChevronDown size={14} className="text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white" />
              </div>
              
              <div className="absolute top-[100%] -left-4 w-56 p-2 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 
                              bg-white dark:bg-[#161923] border border-slate-200 dark:border-white/10 shadow-xl">
                {!isActive('/cadet-info') && (
                  <Link to="/cadet-info" className="block p-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                    General Info
                  </Link>
                )}
                {!isActive('/promotion-board') && (
                  <Link to="/promotion-board" className="block p-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                    Promotion Board
                  </Link>
                )}
                {/* --- ADDED WINNING COLORS ITEM --- */}
                {!isActive('/cadet-info/winning-colors') && (
                  <Link to="/cadet-info/winning-colors" className="block p-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors border-t border-slate-100 dark:border-white/5 mt-1 pt-3">
                    Winning Colors
                  </Link>
                )}
              </div>
            </div>

            <div className="relative group py-5">
              <div className="flex items-center gap-1 cursor-pointer text-slate-500 dark:text-slate-400">
                <span className={`text-[11px] font-black uppercase tracking-[0.3em] transition-colors 
                  ${['/announcements', '/photos'].includes(currentPath) ? 'text-[#d4af37]' : 'group-hover:text-slate-900 dark:group-hover:text-white'}`}>
                  Battalion
                </span>
                <ChevronDown size={14} />
              </div>
              <div className="absolute top-[100%] -left-4 w-56 p-2 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 
                              bg-white dark:bg-[#161923] border border-slate-200 dark:border-white/10 shadow-xl">
                <Link to="/announcements" className="block p-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">Announcements</Link>
                <Link to="/photos" className="block p-3 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">Photo Gallery</Link>
              </div>
            </div>

            <NavLink to="/leadership">Leadership</NavLink>
            <NavLink to="/teams">Teams</NavLink>
          </div>
        </div>

        <div className="flex items-center">
          {!isActive('/admin') && (
            <Link 
              to="/admin" 
              className="text-[10px] font-black uppercase tracking-[0.2em] text-[#d4af37] hover:bg-[#d4af37] hover:text-white transition-all duration-300 border border-[#d4af37]/40 px-5 py-2 rounded-full"
            >
              Admin Portal
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;