import React, { useState, useEffect } from 'react';
import { Megaphone, Calendar, User, Clock, AlertCircle, Tag } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { ROLE_HIERARCHY } from '../constants';
import { AnnouncementCardSkeleton } from '../components/Skeleton';
import { usePageMeta } from '../hooks/usePageMeta';
import Reveal from '../components/Reveal';
import ScrambleText from '../components/ScrambleText';
import Typewriter from '../components/Typewriter';

// Mirrors AdminAnnouncements.jsx's getAvailableTargets() so a viewer only
// sees announcements actually addressed to them (plus anything sent to "All").
const getAllowedTargets = (userData, userPower) => {
  const targets = ['All'];
  if (userPower >= 70) {
    targets.push('Staff', 'XO', 'Leadership', 'CC', '1SG');
  }
  if (userData?.officerTeams?.length > 0) {
    targets.push(...userData.officerTeams);
  }
  return targets;
};

const Announcements = () => {
  usePageMeta({
    title: 'Announcements',
    description: 'Battalion-wide announcements and upcoming events for PBHS JROTC Tornado Battalion.',
    path: '/announcements',
  });
  const { userData, role } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const userPower = ROLE_HIERARCHY[role] || 1;

  useEffect(() => {
    // Filtering "active" client-side (rather than in the query) avoids needing
    // a composite Firestore index for active + timestamp.
    const q = query(collection(db, "announcements"), orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Date.now();
      const allowedTargets = getAllowedTargets(userData, userPower);

      const loaded = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(item => item.active)
        .filter(item => !item.expiresAt || item.expiresAt > now)
        .filter(item => allowedTargets.includes(item.target));

      setAnnouncements(loaded);
      setLoading(false);
    }, (error) => {
      console.error("Announcements Sync Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData?.officerTeams, userPower]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white pt-24 pb-20 px-6 font-sans">
      <div className="max-w-5xl mx-auto">

        {/* HEADER */}
        <Reveal className="text-center mb-16">
          <div className="inline-flex p-3 bg-yellow-500/10 rounded-full text-yellow-500 mb-4 animate-pulse">
            <Megaphone size={32} />
          </div>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter mb-4">
            <ScrambleText text="Battalion " trigger="mount" /><span className="text-yellow-500"><ScrambleText text="Announcements" trigger="mount" /></span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto text-xs uppercase tracking-[0.2em] font-bold">
            <Typewriter text="Stay informed on upcoming events and official updates." speed={35} />
          </p>
        </Reveal>

        {/* LOADING STATE */}
        {loading ? (
          <div className="space-y-8">
            <AnnouncementCardSkeleton />
            <AnnouncementCardSkeleton />
            <AnnouncementCardSkeleton />
          </div>
        ) : announcements.length === 0 ? (
          /* EMPTY STATE */
          <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-white/5 rounded-3xl p-12 text-center max-w-xl mx-auto">
            <AlertCircle className="text-slate-400 dark:text-slate-600 mx-auto mb-4" size={40} />
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-1">No Active Notices</h3>
            <p className="text-xs text-slate-500 font-medium">Check back later for newly published battalion updates.</p>
          </div>
        ) : (
          /* ANNOUNCEMENT FEED LIST */
          <div className="space-y-8">
            {announcements.map((post, idx) => (
              <Reveal key={post.id} delay={idx * 0.05}>
              <article
                className="bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-white/5 rounded-3xl overflow-hidden hover:border-yellow-500/20 transition-all duration-300 shadow-sm dark:shadow-2xl p-8"
              >
                {/* META BADGES */}
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
                  {post.eventType && (
                    <div className="flex items-center gap-1.5 bg-yellow-500/10 text-yellow-500 px-2.5 py-1 rounded-md border border-yellow-500/20">
                      <Tag size={12} />
                      <span>{post.eventType}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-md">
                    <Calendar size={12} className="text-yellow-500" />
                    <span>{post.timestamp?.toDate().toLocaleDateString() || "Recent"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-md">
                    <User size={12} className="text-yellow-500" />
                    <span>By: {post.issuer || 'Battalion Staff'}</span>
                  </div>
                  {post.expiresAt && (
                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-white/5 px-2.5 py-1 rounded-md">
                      <Clock size={12} className="text-yellow-500" />
                      <span>Ends: {new Date(post.expiresAt).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {/* CONTENT BODY */}
                <div className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 prose dark:prose-invert max-w-none whitespace-pre-wrap font-medium">
                  {post.content}
                </div>
              </article>
              </Reveal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Announcements;
