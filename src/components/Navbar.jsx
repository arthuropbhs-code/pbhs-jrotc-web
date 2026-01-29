import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav className="bg-slate-900/95 backdrop-blur-sm text-white p-4 fixed top-0 w-full z-50 shadow-lg border-b border-yellow-600/30"> 
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        <div className="flex items-center space-x-8">
          <Link to="/" className="text-xs font-black uppercase tracking-[0.2em] hover:text-yellow-500 transition">
            Home
          </Link>

          {/* Cadet Info Dropdown */}
          <div className="relative group">
            <Link to="/cadet-info" className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-white transition-colors">
              Cadet Info
            </Link>
            <div className="absolute top-full -left-2 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 shadow-2xl">
              <Link to="/cadet-info" className="block p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 rounded">General Info</Link>
              {/* FIXED LINK BELOW */}
              <Link to="/promotion-board" className="block p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 rounded">Promotion Board</Link>
            </div>
          </div>

          {/* Battalion Dropdown */}
          <div className="relative group">
            <span className="cursor-default text-xs font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-white transition-colors">
              Battalion
            </span>
            <div className="absolute top-full -left-2 mt-2 w-48 bg-slate-900 border border-slate-800 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all p-2 shadow-2xl">
              <Link to="/announcements" className="block p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 rounded">Announcements</Link>
              <Link to="/photos" className="block p-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/5 rounded">Photo Gallery</Link>
            </div>
          </div>

          <Link to="/leadership" className="text-xs font-black uppercase tracking-[0.2em] hover:text-white transition">
            Leadership
          </Link>
          <Link to="/teams" className="text-xs font-black uppercase tracking-[0.2em] hover:text-white transition">
            Teams
          </Link>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-6">
          <Link 
            to="/admin" 
            className="text-[10px] font-black uppercase tracking-widest text-yellow-500 hover:brightness-125 transition-all"
          >
            Admin Portal
          </Link>
          <button className="bg-yellow-600 px-6 py-2 rounded font-black uppercase text-[10px] tracking-widest hover:bg-yellow-700 transition-all shadow-lg shadow-yellow-900/20">
            Contact
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;