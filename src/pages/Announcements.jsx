import React, { useState, useEffect } from 'react';
import { Megaphone, Calendar, User, Clock, AlertCircle } from 'lucide-react';

const Announcements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Dynamically pull all markdown files from the announcements CMS data folder
    const announcementFiles = import.meta.glob('../data/announcements/*.md', { query: '?raw', eager: true });
    const loadedAnnouncements = [];

    // Simple markdown frontmatter parsing engine
    const parseMD = (rawStr) => {
      const frontmatterMatch = rawStr.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      const body = rawStr.replace(/^---\r?\n([\s\S]*?)\r?\n---/, '').trim();
      
      const meta = {};
      if (frontmatterMatch) {
        frontmatterMatch[1].split('\n').forEach(line => {
          const parts = line.split(':');
          if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join(':').trim().replace(/^["']|["']$/g, '');
            meta[key] = value;
          }
        });
      }
      return { meta, body };
    };

    const todayStr = new Date().toISOString().split('T')[0];

    for (const path in announcementFiles) {
      const fileData = announcementFiles[path];
      const rawContent = fileData.default || fileData;
      
      if (typeof rawContent === 'string') {
        const { meta, body } = parseMD(rawContent);
        
        if (meta.title && meta.date_issued) {
          // Expiration Guard: If Notice Ends date has passed, don't show it to the public
          if (meta.notice_ends && meta.notice_ends < todayStr) {
            continue; 
          }

          loadedAnnouncements.push({
            id: path,
            title: meta.title,
            dateIssued: meta.date_issued,
            issuedBy: meta.issued_by || 'Battalion Staff',
            noticeEnds: meta.notice_ends || null,
            image: meta.image || null,
            content: body
          });
        }
      }
    }

    // Sort announcements chronologically (Newest first)
    loadedAnnouncements.sort((a, b) => new Date(b.dateIssued) - new Date(a.dateIssued));
    setAnnouncements(loadedAnnouncements);
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white pt-24 pb-20 px-6 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* HEADER */}
        <div className="text-center mb-16">
          <div className="inline-flex p-3 bg-yellow-500/10 rounded-full text-yellow-500 mb-4 animate-pulse">
            <Megaphone size={32} />
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-4">
            Battalion <span className="text-yellow-500">Announcements</span>
          </h1>
          <p className="text-slate-400 max-w-xl mx-auto text-xs uppercase tracking-[0.2em] font-bold">
            Stay informed on critical operations, upcoming events, and official military updates.
          </p>
        </div>

        {/* LOADING STATE */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-yellow-500"></div>
            <p className="text-xs font-black uppercase tracking-widest text-slate-500">Retrieving Orders...</p>
          </div>
        ) : announcements.length === 0 ? (
          /* EMPTY STATE */
          <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-12 text-center max-w-xl mx-auto">
            <AlertCircle className="text-slate-600 mx-auto mb-4" size={40} />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-300 mb-1">No Active Notices</h3>
            <p className="text-xs text-slate-500 font-medium">Check back later for newly published battalion updates.</p>
          </div>
        ) : (
          /* ANNOUNCEMENT FEED LIST */
          <div className="space-y-8">
            {announcements.map((post) => (
              <article 
                key={post.id} 
                className="bg-slate-900/60 border border-white/5 rounded-3xl overflow-hidden hover:border-yellow-500/20 transition-all duration-300 shadow-2xl flex flex-col md:flex-row"
              >
                {/* OPTIONAL IMAGE BLOCK */}
                {post.image && (
                  <div className="md:w-1/3 relative min-h-[200px] md:min-h-full bg-slate-950">
                    <img 
                      src={post.image} 
                      alt={post.title} 
                      className="absolute inset-0 w-full h-full object-cover opacity-80"
                    />
                  </div>
                )}

                {/* TEXT & DATA BLOCK */}
                <div className={`p-8 flex-1 flex flex-col justify-between ${post.image ? 'md:w-2/3' : 'w-full'}`}>
                  <div>
                    {/* META BADGES */}
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[10px] font-black uppercase tracking-wider text-slate-400 mb-4">
                      <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md">
                        <Calendar size={12} className="text-yellow-500" />
                        <span>Issued: {post.dateIssued}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-md">
                        <User size={12} className="text-yellow-500" />
                        <span>By: {post.issuedBy}</span>
                      </div>
                      {post.noticeEnds && (
                        <div className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-500 px-2.5 py-1 rounded-md border border-yellow-500/20">
                          <Clock size={12} />
                          <span>Ends: {post.noticeEnds}</span>
                        </div>
                      )}
                    </div>

                    {/* TITLE */}
                    <h2 className="text-2xl md:text-3xl font-black uppercase italic tracking-tight mb-4 text-white group-hover:text-yellow-500 transition-colors">
                      {post.title}
                    </h2>

                    {/* CONTENT BODY */}
                    <div className="text-sm leading-relaxed text-slate-300 prose prose-invert max-w-none whitespace-pre-wrap font-medium">
                      {post.content}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;