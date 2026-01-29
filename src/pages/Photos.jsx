import React from 'react';
import { motion } from 'framer-motion';
import { Camera, ExternalLink, Image as ImageIcon, FolderOpen } from 'lucide-react';

const Photos = () => {
  // CONFIGURATION: 
  // 1. Drop your images into /public/covers/
  // 2. Put the exact filename in the 'coverImage' field below.
  const albums = [
    { 
      id: 1, 
      title: "Yuletide Parade 2025-2026", 
      count: "163 Photos",
      coverImage: "/covers/Yuletide2025.JPG", // Path to your local file
      albumUrl: "https://photos.app.goo.gl/yQma34bERVQhy6zz8" 
    },
        { 
      id: 2, 
      title: "Raider States 2025-2026", 
      count: "517 Photos",
      coverImage: "/covers/Raiderstate2025.JPG", 
      albumUrl: "https://photos.app.goo.gl/NyxyyFzDe59e2x2V9" 
    },
    { 
      id: 3,
      title: "Raider County Competition 2025-2026", 
      count: "303 Photos",
      coverImage: "/covers/Raiders2025.JPG", 
      albumUrl: "https://photos.app.goo.gl/buYtCpjc3usGEWVc8" 
    },
    { 
      id: 4, 
      title: "Military Ball 2024-2025", 
      count: "848 Photos",
      coverImage: "/covers/ball2024.JPG", 
      albumUrl: "https://photos.app.goo.gl/UvXhZzj8Yca7ojEE6" 
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">
        
        <header className="mb-16 text-left border-l-4 border-[oklch(79.5%_0.184_86.047)] pl-8">
          <div className="flex items-center gap-3 mb-2">
            <FolderOpen className="text-[oklch(79.5%_0.184_86.047)]" size={24} />
            <span className="text-[10px] font-black text-[oklch(79.5%_0.184_86.047)] uppercase tracking-[0.3em]">Official Archives</span>
          </div>
          <h1 className="text-6xl font-black text-white uppercase italic tracking-tighter leading-none">
            Photo <span className="text-slate-500">Gallery</span>
          </h1>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {albums.map((album) => (
            <motion.a
              key={album.id}
              href={album.albumUrl}
              target="_blank"
              rel="noopener noreferrer"
              whileHover={{ y: -10 }}
              className="group relative bg-slate-900 rounded-3xl overflow-hidden border border-white/5 block shadow-2xl transition-all duration-300 hover:border-[oklch(79.5%_0.184_86.047)]/30"
            >
              {/* Cover Image Container */}
              <div className="aspect-[4/5] overflow-hidden bg-slate-800 flex items-center justify-center">
                {album.coverImage ? (
                  <img 
                    src={album.coverImage} 
                    className="w-full h-full object-cover opacity-70 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 ease-out" 
                    alt={album.title}
                    onError={(e) => { e.target.src = "https://via.placeholder.com/400x500?text=Image+Missing"; }}
                  />
                ) : (
                  <ImageIcon size={48} className="text-slate-700" />
                )}
              </div>

              {/* Tactical Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

              {/* UI Elements */}
              <div className="absolute bottom-0 left-0 p-8 w-full">
                <div className="flex items-center gap-2 mb-2">
                   <div className="h-1 w-1 rounded-full bg-[oklch(79.5%_0.184_86.047)] animate-pulse" />
                   <span className="text-[10px] font-black text-[oklch(79.5%_0.184_86.047)] uppercase tracking-widest">{album.count}</span>
                </div>
                <h3 className="text-3xl font-black text-white uppercase italic mb-6 tracking-tight">{album.title}</h3>
                
                <div className="inline-flex items-center gap-3 text-[10px] font-black text-white uppercase tracking-widest bg-white/5 backdrop-blur-md border border-white/10 px-5 py-3 rounded-xl group-hover:bg-[oklch(79.5%_0.184_86.047)] group-hover:text-slate-950 transition-all duration-300">
                  View External Album <ExternalLink size={14} />
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Photos;