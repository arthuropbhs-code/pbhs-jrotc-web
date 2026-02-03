import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Shield } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Helper to determine if a link should be hidden
  const isActive = (path) => currentPath === path;

  return (
    <nav className="bg-slate-900/95 backdrop-blur-sm text-white p-4 fixed top-0 w-full z-50 shadow-lg border-b border-yellow-600/30">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        <div className="flex items-center space-x-8">
          {/* Logo / Home - Only shows if not on Home */}
          {!isActive('/') && (
            <Link to="/" className="flex items-center gap-2 group mr-4">
              <Shield className="text-yellow-500 group-hover:rotate-12 transition-transform" size={18} />
              <span className="text-xs font-black uppercase tracking-[0.2em] hover:text-yellow-500 transition">
                Home
              </span>
            </Link>
          )}

          {/* Cadet Info Dropdown - Hidden if on /cadet-info unless sub-pages are needed */}
          <div className="relative group">
            <span className={`text-xs font-black uppercase tracking-[0.2em] cursor-default transition-colors ${currentPath.includes('cadet') ? 'text-yellow-500' : 'text-slate-400 group-hover:text-white'}`}>
              Cadet Info
            </span>
            <div className="absolute top-full -left-2 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 shadow-2xl">
              {!isActive('/cadet-info') && (
                <Link to="/cadet-info" className="block p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 rounded">
                  General Info
                </Link>
              )}
              {!isActive('/promotion-board') && (
                <Link to="/promotion-board" className="block p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 rounded">
                  Promotion Board
                </Link>
              )}
            </div>
          </div>

          {/* Battalion Dropdown */}
          <div className="relative group">
            <span className="cursor-default text-xs font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-white transition-colors">
              Battalion
            </span>
            <div className="absolute top-full -left-2 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 shadow-2xl">
              {!isActive('/announcements') && (
                <Link to="/announcements" className="block p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 rounded">
                  Announcements
                </Link>
              )}
              {!isActive('/photos') && (
                <Link to="/photos" className="block p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 rounded">
                  Photo Gallery
                </Link>
              )}
            </div>
          </div>

          {!isActive('/leadership') && (
            <Link to="/leadership" className="text-xs font-black uppercase tracking-[0.2em] hover:text-white transition">
              Leadership
            </Link>
          )}

          {!isActive('/teams') && (
            <Link to="/teams" className="text-xs font-black uppercase tracking-[0.2em] hover:text-white transition">
              Teams
            </Link>
          )}
        </div>

        {/* Right Side */}
        <div className="flex items-center">
          {!isActive('/admin') && (
            <Link 
              to="/admin" 
              className="text-[10px] font-black uppercase tracking-widest text-yellow-500 hover:brightness-125 transition-all border border-yellow-500/20 px-4 py-2 rounded"
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