import React from 'react';

/**
 * Base pulsing placeholder block. Compose these into page-specific skeletons
 * (see AnnouncementsSkeleton, TeamsSkeleton, etc. below) rather than reusing
 * a single generic shape everywhere — a skeleton should roughly match the
 * geometry of what's about to load so the transition doesn't jump around.
 */
export const SkeletonBlock = ({ className = '' }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-white/10 rounded-md ${className}`} />
);

// Announcements.jsx feed card
export const AnnouncementCardSkeleton = () => (
  <div className="bg-slate-900/60 border border-white/5 rounded-3xl overflow-hidden shadow-2xl p-8">
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
      <SkeletonBlock className="h-6 w-24" />
      <SkeletonBlock className="h-6 w-28" />
      <SkeletonBlock className="h-6 w-32" />
    </div>
    <SkeletonBlock className="h-4 w-full mb-2" />
    <SkeletonBlock className="h-4 w-11/12 mb-2" />
    <SkeletonBlock className="h-4 w-2/3" />
  </div>
);

// Teams.jsx / roster-style card grid
export const TeamCardSkeleton = () => (
  <div className="bg-slate-900 border border-white/5 rounded-3xl p-8">
    <SkeletonBlock className="h-12 w-12 rounded-2xl mb-6" />
    <SkeletonBlock className="h-5 w-2/3 mb-3" />
    <SkeletonBlock className="h-3 w-1/2 mb-6" />
    <SkeletonBlock className="h-3 w-full mb-2" />
    <SkeletonBlock className="h-3 w-5/6" />
  </div>
);

// Documents.jsx list row
export const DocumentRowSkeleton = () => (
  <div className="flex items-center gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-3xl p-6">
    <SkeletonBlock className="h-11 w-11 rounded-xl flex-shrink-0" />
    <div className="flex-1 min-w-0 space-y-2">
      <SkeletonBlock className="h-4 w-1/3" />
      <SkeletonBlock className="h-3 w-1/2" />
    </div>
    <SkeletonBlock className="h-5 w-5 rounded flex-shrink-0" />
  </div>
);

// Teams.jsx sidebar nav item + main detail panel
export const TeamsPageSkeleton = () => (
  <div className="grid lg:grid-cols-4 gap-8">
    <div className="space-y-2">
      {[0, 1, 2, 3].map(i => (
        <SkeletonBlock key={i} className="h-14 w-full rounded-xl" />
      ))}
    </div>
    <div className="lg:col-span-3">
      <div className="bg-slate-900 border border-white/5 p-8 rounded-3xl">
        <div className="flex flex-col md:flex-row md:items-center gap-6 mb-8">
          <SkeletonBlock className="h-16 w-16 rounded-2xl flex-shrink-0" />
          <div className="flex-1 space-y-3">
            <SkeletonBlock className="h-6 w-1/3" />
            <SkeletonBlock className="h-3 w-1/4" />
            <SkeletonBlock className="h-3 w-2/3" />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <SkeletonBlock className="h-3 w-1/3" />
            <SkeletonBlock className="h-3 w-2/3" />
            <SkeletonBlock className="h-3 w-1/2" />
          </div>
          <SkeletonBlock className="h-40 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  </div>
);

// Home.jsx "Live Bulletins" card - matches the real card's
// bg-slate-950 border p-6 rounded-2xl shape
export const BulletinCardSkeleton = () => (
  <div className="bg-slate-950 border border-white/5 p-6 rounded-2xl">
    <SkeletonBlock className="h-3 w-24 mb-3" />
    <SkeletonBlock className="h-4 w-full mb-2" />
    <SkeletonBlock className="h-4 w-5/6 mb-4" />
    <SkeletonBlock className="h-3 w-20" />
  </div>
);

// Home.jsx "Meet the Top 3" portrait card - matches the real card's
// aspect-[3/4] image + name/rank/quote layout
export const TopThreeCardSkeleton = () => (
  <div>
    <SkeletonBlock className="aspect-[3/4] w-full rounded-2xl mb-6" />
    <SkeletonBlock className="h-5 w-2/3 mb-2" />
    <SkeletonBlock className="h-3 w-1/2 mb-4" />
    <SkeletonBlock className="h-3 w-full" />
  </div>
);

// AdminUsers.jsx roster card row
export const RosterRowSkeleton = () => (
  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl p-5 flex items-center gap-4">
    <SkeletonBlock className="h-12 w-12 rounded-xl flex-shrink-0" />
    <div className="flex-1 min-w-0 space-y-2">
      <SkeletonBlock className="h-4 w-1/3" />
      <SkeletonBlock className="h-3 w-1/4" />
    </div>
    <SkeletonBlock className="h-6 w-16 rounded-md flex-shrink-0" />
    <SkeletonBlock className="h-8 w-8 rounded-lg flex-shrink-0" />
  </div>
);
