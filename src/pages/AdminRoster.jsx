// src/pages/AdminRoster.jsx
//
// Battalion Roster — source of truth for every cadet regardless of whether
// they have a Command Portal account. Each entry can optionally be linked to
// a user UID (linkedUid) to show a portal-account indicator on the row.
//
// Access tiers:
//   canManageAll  — staff (70+): view/edit any company
//   canManageOwn  — command (45+): view/edit own company only
//
// Cadet Challenge scores are joined client-side by cadetName from the
// cadet_challenge collection (most-recent record per cadet).

import React, { useState, useEffect, useMemo } from 'react';
import { db } from '../firebase';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, where, serverTimestamp, getDocs,
} from 'firebase/firestore';
import { useAuth } from '../hooks/useAuth';
import { writeLog } from '../lib/writeLog';
import { useCompanies } from '../hooks/useCompanies';
import {
  ROLE_HIERARCHY, STAFF_LEVEL, COMMAND_LEVEL, ADMIN_LEVEL,
  JROTC_RANKS, JROTC_POSITIONS,
} from '../constants';
import {
  Link2, UserCircle, Plus, Edit3, Trash2, X,
  Loader2, CheckCircle2, Search, ChevronDown, Eye, RefreshCw,
  History, GraduationCap, Trophy, Tent, BookOpen, ChevronRight, Filter,
  ShieldAlert, Clock, CheckCheck, XCircle, AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ScrambleText from '../components/ScrambleText';
import AdminPageHeader from '../components/AdminPageHeader';

// ── constants ─────────────────────────────────────────────────────────────────

const PLATOONS = ['1st Platoon', '2nd Platoon', '3rd Platoon', 'Company HQ'];
const SQUADS   = ['1st Squad', '2nd Squad', '3rd Squad', '4th Squad'];
const LET_LEVELS = ['LET 1', 'LET 2', 'LET 3', 'LET 4'];
const GENDERS  = ['Male', 'Female', 'Other'];

// Roles exempt from the roster self-edit restriction — keep in sync with firestore.rules isSelfEditExempt()
const SELF_EDIT_EXEMPT_ROLES = [
  'battalion_commander', 'battalion_xo', 'battalion_csm',
  'senior_army_instructor', 'army_instructor', 's1_adjutant',
];

// Authority fields that non-exempt accounts cannot change on their own entry.
const AUTHORITY_FIELDS = ['position', 'rank', 'letLevel', 'company', 'linkedUid'];

// Fields captured in the rosterChangelog snapshot (excludes timestamps).
const CHANGELOG_FIELDS = [
  'fullName', 'rank', 'position', 'company', 'platoon', 'squad',
  'gender', 'letLevel', 'linkedUid', 'secondaryCompany', 'notes',
];

// 'Zulu' kept for backward compat — old Firestore records still carry it.
// All new records use 'Battalion'. Both are treated as HQ throughout.
const BATTALION_COMPANIES = ['Battalion', 'Zulu'];

const EMPTY_FORM = {
  fullName: '', rank: '', position: '', company: '',
  platoon: '', squad: '', gender: '', letLevel: '',
  notes: '', linkedUid: '', secondaryCompany: '',
  syncMaster: 'roster',
};

const iCls = 'w-full bg-slate-50 dark:bg-black/50 border border-slate-200 dark:border-white/10 p-3 rounded-xl outline-none focus:border-yellow-500 text-sm font-bold text-slate-900 dark:text-white transition-all';
const lCls = 'text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 ml-1 block mb-1 tracking-widest';

// ── helpers ───────────────────────────────────────────────────────────────────

// Handles null/undefined gracefully — Battalion entries store platoon/squad
// as null, and searching would throw if we called null.trim() directly.
const normalize = (s) => (s ?? '').trim().toLowerCase();

// Pull the most-recent challenge record for a cadet by name (case-insensitive)
const latestChallenge = (cadetName, challengeMap) =>
  challengeMap[normalize(cadetName)] ?? null;

// ── sub-components ────────────────────────────────────────────────────────────

const ScoreBadge = ({ label, value }) => {
  if (value == null || value === '' || value === 0) return null;
  return (
    <span className="inline-flex flex-col items-center leading-none bg-slate-100 dark:bg-white/5 rounded-lg px-2 py-1 mr-1 mb-1">
      <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">{label}</span>
      <span className="text-xs font-black text-slate-800 dark:text-slate-200">{value}</span>
    </span>
  );
};

// ── main ──────────────────────────────────────────────────────────────────────

const AdminRoster = () => {
  const { user, userData, role, loading: authLoading } = useAuth();
  const { companies } = useCompanies();

  const userLevel     = !authLoading ? (ROLE_HIERARCHY[role] || 0) : 0;
  const canManageAll  = userLevel >= STAFF_LEVEL;
  const canManageOwn  = userLevel >= COMMAND_LEVEL;
  // S1 and S3 assistants can create, edit, and delete cadets in their own
  // company — but they cannot change a cadet's name or company assignment.
  const canS1Edit     = role === 'company_s1_assistant' || role === 'company_s3_assistant';
  // S6, S7, and MSgt are view-only (no write access).
  // S6/S7 can see all companies (canManageAll=true for queries) but cannot modify.
  // company_master_sergeant is view-only here — edit rights limited to Cadet Challenge.
  const canViewOwn    = role === 'company_master_sergeant';
  const canEdit       = role !== 's7_special_projects' && role !== 's6_technology'
    && role !== 'company_master_sergeant'
    && (canManageAll || canManageOwn || canS1Edit);
  const myCompany     = userData?.company || '';

  // Self-edit security: this account is exempt if they hold a top-level role.
  // All other accounts are blocked from editing authority fields on their own entry.
  const isSelfEditExempt = SELF_EDIT_EXEMPT_ROLES.includes(role);
  // Battalion S1 (70+) can review and approve pending deletion requests.
  const canApproveDeletion = userLevel >= STAFF_LEVEL;

  // Staff default to the Battalion tab; company command default to their own company.
  const [activeCompany, setActiveCompany] = useState('');

  // set the tab once auth is ready
  useEffect(() => {
    if (!authLoading && !activeCompany) {
      setActiveCompany(canManageAll ? 'Battalion' : myCompany);
    }
  }, [authLoading, canManageAll, myCompany, activeCompany]);

  const [rosterEntries,    setRosterEntries]    = useState([]);
  const [challengeRecords, setChallengeRecords] = useState([]);
  const [portalUsers,      setPortalUsers]      = useState([]);
  const [dataLoading,      setDataLoading]      = useState(true);
  const [search,           setSearch]           = useState('');

  const [showModal,   setShowModal]   = useState(false);
  const [editingId,   setEditingId]   = useState(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [deleteConf,  setDeleteConf]  = useState(null);
  const [toast,       setToast]       = useState(null);

  // ── Pending deletion requests (Battalion S1 approval queue) ────────────────
  const [pendingActions,    setPendingActions]    = useState([]);
  const [pendingLoading,    setPendingLoading]    = useState(false);
  const [approvingAction,   setApprovingAction]   = useState(null);
  const [rejectingAction,   setRejectingAction]   = useState(null);
  const [deleteRequestConf, setDeleteRequestConf] = useState(null); // entry asking for deletion

  // ── Cadet History (view archived years) ────────────────────────────────────
  const [historyEntry,   setHistoryEntry]   = useState(null); // entry being viewed
  const [historyRecords, setHistoryRecords] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(null); // expanded year key

  // ── Graduate cadet ─────────────────────────────────────────────────────────
  const [graduateConf, setGraduateConf] = useState(null);
  const [graduating,   setGraduating]   = useState(false);

  // ── data subscriptions ────────────────────────────────────────────────────

  // Roster entries — company-scoped or all depending on access
  useEffect(() => {
    if (authLoading || !activeCompany) return;

    const q = canManageAll
      ? query(collection(db, 'roster'), orderBy('fullName', 'asc'))
      : query(
          collection(db, 'roster'),
          where('company', '==', activeCompany),
          orderBy('fullName', 'asc'),
        );

    setDataLoading(true);
    const unsub = onSnapshot(q, (snap) => {
      setRosterEntries(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setDataLoading(false);
    }, () => setDataLoading(false));

    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, activeCompany, canManageAll]);

  // All challenge records (for client-side join)
  useEffect(() => {
    if (authLoading) return;
    const unsub = onSnapshot(
      query(collection(db, 'cadet_challenge'), orderBy('submittedAt', 'desc')),
      (snap) => setChallengeRecords(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
    );
    return () => unsub();
  }, [authLoading]);

  // Portal users (for link picker and account indicator)
  useEffect(() => {
    if (authLoading) return;
    const unsub = onSnapshot(
      query(collection(db, 'users'), orderBy('fullName', 'asc')),
      (snap) => setPortalUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() }))),
    );
    return () => unsub();
  }, [authLoading]);

  // Pending deletion requests (visible to Battalion S1 / staff 70+)
  useEffect(() => {
    if (authLoading || !canApproveDeletion) return;
    setPendingLoading(true);
    const unsub = onSnapshot(
      query(collection(db, 'rosterPendingActions'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'asc')),
      (snap) => {
        setPendingActions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setPendingLoading(false);
      },
      () => setPendingLoading(false),
    );
    return () => unsub();
  }, [authLoading, canApproveDeletion]);

  // ── derived data ──────────────────────────────────────────────────────────

  // Map: normalised cadetName → most recent challenge record
  const challengeMap = useMemo(() => {
    const map = {};
    // Records are already sorted newest-first; keep only the first hit per cadet
    for (const rec of challengeRecords) {
      const key = normalize(rec.cadetName);
      if (key && !map[key]) map[key] = rec;
    }
    return map;
  }, [challengeRecords]);

  // Map: uid → user (for linkedUid lookups)
  const userMap = useMemo(() => {
    const m = {};
    for (const u of portalUsers) m[u.uid] = u;
    return m;
  }, [portalUsers]);

  // Entries for the active company tab, filtered by search.
  // Battalion tab shows both 'Battalion' and legacy 'Zulu' records.
  const visibleEntries = useMemo(() => {
    const base = rosterEntries.filter(e =>
      BATTALION_COMPANIES.includes(activeCompany)
        ? BATTALION_COMPANIES.includes(e.company)
        : e.company === activeCompany
    );
    if (!search.trim()) return base;
    const q = normalize(search);
    return base.filter(e =>
      normalize(e.fullName).includes(q) ||
      normalize(e.position).includes(q) ||
      normalize(e.rank).includes(q) ||
      normalize(e.platoon).includes(q),
    );
  }, [rosterEntries, activeCompany, search]);

  // ── helpers ───────────────────────────────────────────────────────────────

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, company: activeCompany });
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (entry) => {
    setForm({
      fullName:         entry.fullName         || '',
      rank:             entry.rank             || '',
      position:         entry.position         || '',
      company:          entry.company          || activeCompany,
      platoon:          entry.platoon          || '',
      squad:            entry.squad            || '',
      gender:           entry.gender           || '',
      letLevel:         entry.letLevel         || '',
      notes:            entry.notes            || '',
      linkedUid:        entry.linkedUid        || '',
      secondaryCompany: entry.secondaryCompany || '',
      syncMaster:       entry.syncMaster       || 'roster',
    });
    setEditingId(entry.id);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditingId(null); setForm(EMPTY_FORM); };

  // ── CRUD ─────────────────────────────────────────────────────────────────

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) return;
    setSaving(true);
    try {
      const isBn = BATTALION_COMPANIES.includes(form.company || activeCompany);
      const resolvedCompany = (form.company || activeCompany || '').trim();
    if (!resolvedCompany) {
      showToast('Your company is not configured — ask an admin to update your profile', true);
      setSaving(false);
      return;
    }

    const payload = {
        fullName:         form.fullName.trim().toUpperCase(),
        rank:             form.rank      || null,
        position:         form.position  || null,
        company:          resolvedCompany,
        platoon:          isBn ? null : (form.platoon || null),
        squad:            isBn ? null : (form.squad   || null),
        secondaryCompany: isBn ? (form.secondaryCompany || null) : null,
        gender:           form.gender    || null,
        letLevel:         form.letLevel  || null,
        notes:            form.notes.trim() || null,
        linkedUid:        form.linkedUid || null,
        syncMaster:       form.linkedUid ? (form.syncMaster || 'roster') : null,
      };
      if (editingId) {
        // ── Roster changelog: capture before/after diff ────────────────────
        const existingEntry = rosterEntries.find(e => e.id === editingId);
        if (existingEntry) {
          const changedFields = {};
          for (const field of CHANGELOG_FIELDS) {
            const oldVal = existingEntry[field] ?? null;
            const newVal = payload[field] ?? null;
            if (String(oldVal) !== String(newVal)) changedFields[field] = { from: oldVal, to: newVal };
          }
          if (Object.keys(changedFields).length > 0) {
            // Flag S1 adjutant rank/position changes for BC/CSM review —
            // per policy, only BC/CSM can freely change rank/position; S1 adjutant
            // is permitted but the change must be reviewed by BC if commissioned
            // officer or BC/CSM if NCO.
            const rankOrPositionChanged = 'rank' in changedFields || 'position' in changedFields;
            const isS1Change = role === 's1_adjutant';
            addDoc(collection(db, 'rosterChangelog'), {
              rosterId: editingId,
              cadetName: existingEntry.fullName,
              changes: changedFields,
              changedBy: user?.uid || '',
              changedByName: userData?.fullName || '',
              changedByRole: role || '',
              timestamp: serverTimestamp(),
              ...(rankOrPositionChanged && isS1Change && {
                flaggedForApproval: true,
                flagReason: 'S1 adjutant changed rank/position — requires BC/CSM review per chain of command policy',
              }),
            }).catch(err => console.warn('[rosterChangelog] write failed:', err));

            // Write an immediate security alert log entry when S1 changes rank/position
            if (rankOrPositionChanged && isS1Change) {
              writeLog({
                type: 'roster', action: 'rank_change_flagged',
                description: `⚑ S1 adjutant changed rank/position for ${existingEntry.fullName} — pending BC/CSM review`,
                userId: user?.uid || '', userFullName: userData?.fullName || '',
                userRole: role || '', targetId: editingId, targetName: existingEntry.fullName,
                category: 'security',
              });
            }
          }
        }

        await updateDoc(doc(db, 'roster', editingId), { ...payload, updatedAt: serverTimestamp() });
        showToast('Entry updated');
        writeLog({
          type: 'roster', action: 'update',
          description: `Updated roster entry for ${payload.fullName}`,
          userId: user?.uid || '', userFullName: userData?.fullName || '',
          userRole: role || '', targetId: editingId, targetName: payload.fullName,
        });
      } else {
        const newDoc = await addDoc(collection(db, 'roster'), {
          ...payload,
          createdAt:  serverTimestamp(),
          updatedAt:  serverTimestamp(),
          createdBy:  user?.uid || '',
        });
        showToast('Cadet added');
        writeLog({
          type: 'roster', action: 'create',
          description: `Added ${payload.fullName} to the roster (${payload.company})`,
          userId: user?.uid || '', userFullName: userData?.fullName || '',
          userRole: role || '', targetId: newDoc.id, targetName: payload.fullName,
        });
      }

      // ── Roster → account sync ────────────────────────────────────────────
      // Whenever a linked account exists, push the shared fields to the users/
      // doc so the portal profile stays in sync automatically. This fires
      // regardless of syncMaster — the syncMaster flag only controls the
      // reverse direction (portal → roster, handled in AdminUsers.jsx).
      if (form.linkedUid) {
        const syncFields = {
          fullName: payload.fullName,
          rank:     payload.rank,
          position: payload.position,
          company:  payload.company,
          ...(payload.platoon          !== undefined ? { platoon:          payload.platoon          } : {}),
          ...(payload.squad            !== undefined ? { squad:            payload.squad            } : {}),
          ...(payload.secondaryCompany !== undefined ? { secondaryCompany: payload.secondaryCompany } : {}),
          gender:   payload.gender,
          letLevel: payload.letLevel,
          updatedAt: serverTimestamp(),
        };
        try {
          await updateDoc(doc(db, 'users', form.linkedUid), syncFields);
        } catch (syncErr) {
          // Non-fatal — roster save succeeded; just log the sync miss
          console.warn('Roster→portal sync failed:', syncErr);
        }
      }

      closeModal();
    } catch (err) {
      console.error('Roster save failed:', err);
      if (err?.code === 'permission-denied') {
        showToast('Permission denied — verify your company matches the entry');
      } else {
        showToast('Save failed — try again');
      }
    } finally {
      setSaving(false);
    }
  };

  // handleDelete: staff (70+) can delete immediately; everyone else submits a
  // pending action for Battalion S1 to approve. The actual Firestore delete is
  // gated by rules to level 70+ only.
  const handleDelete = async () => {
    if (!deleteConf) return;
    const entry = deleteConf;
    try {
      if (canApproveDeletion) {
        // Staff (70+): immediate delete
        await deleteDoc(doc(db, 'roster', entry.id));
        writeLog({
          type: 'roster', action: 'delete',
          description: `Removed ${entry.fullName} from the roster`,
          userId: user?.uid || '', userFullName: userData?.fullName || '',
          userRole: role || '', targetId: entry.id, targetName: entry.fullName,
        });
        showToast('Entry removed');
      } else {
        // Commander / assistant: submit for S1 approval
        await addDoc(collection(db, 'rosterPendingActions'), {
          type: 'delete',
          rosterId:          entry.id,
          cadetName:         entry.fullName,
          cadetCompany:      entry.company,
          cadetRank:         entry.rank    || null,
          cadetPosition:     entry.position || null,
          requestedBy:       user?.uid || '',
          requestedByName:   userData?.fullName || '',
          requestedByRole:   role || '',
          status:            'pending',
          createdAt:         serverTimestamp(),
        });
        writeLog({
          type: 'roster', action: 'delete_requested',
          description: `${userData?.fullName} requested deletion of ${entry.fullName} — pending Battalion S1 approval`,
          userId: user?.uid || '', userFullName: userData?.fullName || '',
          userRole: role || '', targetId: entry.id, targetName: entry.fullName,
          category: 'security',
        });
        showToast('Deletion request submitted — Battalion S1 will review');
      }
      setDeleteConf(null);
    } catch {
      showToast('Failed — try again');
    }
  };

  // S1 approves a pending deletion: perform the actual delete and mark resolved.
  const handleApproveDelete = async (action) => {
    if (approvingAction) return;
    setApprovingAction(action.id);
    try {
      await deleteDoc(doc(db, 'roster', action.rosterId));
      await updateDoc(doc(db, 'rosterPendingActions', action.id), {
        status:          'approved',
        reviewedBy:      user?.uid || '',
        reviewedByName:  userData?.fullName || '',
        reviewedAt:      serverTimestamp(),
      });
      writeLog({
        type: 'roster', action: 'delete',
        description: `Approved deletion of ${action.cadetName} (requested by ${action.requestedByName})`,
        userId: user?.uid || '', userFullName: userData?.fullName || '',
        userRole: role || '', targetId: action.rosterId, targetName: action.cadetName,
      });
      showToast(`${action.cadetName} removed`);
    } catch {
      showToast('Approval failed — try again');
    } finally {
      setApprovingAction(null);
    }
  };

  // S1 rejects a pending deletion: mark resolved with status 'rejected'.
  const handleRejectDelete = async (action) => {
    if (rejectingAction) return;
    setRejectingAction(action.id);
    try {
      await updateDoc(doc(db, 'rosterPendingActions', action.id), {
        status:          'rejected',
        reviewedBy:      user?.uid || '',
        reviewedByName:  userData?.fullName || '',
        reviewedAt:      serverTimestamp(),
      });
      writeLog({
        type: 'roster', action: 'delete_rejected',
        description: `Rejected deletion request for ${action.cadetName} (requested by ${action.requestedByName})`,
        userId: user?.uid || '', userFullName: userData?.fullName || '',
        userRole: role || '', targetId: action.rosterId, targetName: action.cadetName,
      });
      showToast('Request rejected');
    } catch {
      showToast('Failed — try again');
    } finally {
      setRejectingAction(null);
    }
  };

  // ── Cadet History helpers ─────────────────────────────────────────────────

  const openHistory = async (entry) => {
    setHistoryEntry(entry);
    setHistoryRecords([]);
    setHistoryExpanded(null);
    setHistoryLoading(true);
    try {
      const q    = query(collection(db, 'cadetYearlyHistory'), where('rosterId', '==', entry.id));
      const snap = await getDocs(q);
      const records = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.schoolYear || '').localeCompare(a.schoolYear || ''));
      setHistoryRecords(records);
      if (records.length > 0) setHistoryExpanded(records[0].schoolYear);
    } catch (err) {
      console.error('History load failed:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // ── Graduate helpers ──────────────────────────────────────────────────────

  const handleGraduate = async () => {
    if (!graduateConf) return;
    setGraduating(true);
    try {
      await updateDoc(doc(db, 'roster', graduateConf.id), {
        graduated:   true,
        graduatedAt: serverTimestamp(),
      });
      setGraduateConf(null);
      showToast(`${graduateConf.fullName} marked as graduated`);
    } catch {
      showToast('Update failed');
    } finally {
      setGraduating(false);
    }
  };

  // ── access guard ──────────────────────────────────────────────────────────

  if (authLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="animate-spin text-yellow-500" size={40} />
    </div>
  );

  if (!canManageOwn && !canManageAll && !canViewOwn && !canS1Edit) return (
    <div className="min-h-screen flex items-center justify-center p-8 text-center">
      <div>
        <UserCircle className="mx-auto text-yellow-500 mb-4" size={40} />
        <p className="font-black uppercase text-sm text-slate-500">Access Restricted</p>
        <p className="text-xs text-slate-400 mt-2">Company command and above.</p>
      </div>
    </div>
  );

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 p-6 md:p-10 w-full">
      <AdminPageHeader icon={UserCircle} title="Battalion Roster" />

        {/* ── Header actions ── */}
        <div className="flex items-center justify-end mb-8 gap-4 flex-wrap">
          {canEdit && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs uppercase tracking-widest px-5 py-3 rounded-xl transition-all shadow-lg shadow-yellow-500/20"
            >
              <Plus size={16} /> Add Cadet
            </button>
          )}
          {canViewOwn && !canEdit && (
            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-white/5 px-4 py-2.5 rounded-xl">
              Read Only
            </span>
          )}
        </div>

        {/* ── Pending Deletion Approvals (Battalion S1 only) ── */}
        {canApproveDeletion && (pendingLoading || pendingActions.length > 0) && (
          <div className="mb-8 rounded-2xl border border-amber-300/60 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-900/10 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3 border-b border-amber-200 dark:border-amber-500/20 bg-amber-100/60 dark:bg-amber-900/20">
              <Clock size={15} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-[11px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                Pending Roster Deletions — {pendingActions.length} request{pendingActions.length !== 1 ? 's' : ''}
              </span>
            </div>
            {pendingLoading ? (
              <div className="flex items-center gap-2 px-5 py-4 text-amber-600 dark:text-amber-400">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-xs font-bold">Loading requests…</span>
              </div>
            ) : (
              <div className="divide-y divide-amber-200/60 dark:divide-amber-500/10">
                {pendingActions.map(action => (
                  <div key={action.id} className="flex items-center gap-4 px-5 py-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-black text-slate-900 dark:text-white">
                        {action.cadetName}
                        {action.cadetRank && (
                          <span className="ml-2 text-[9px] font-bold text-slate-400">({action.cadetRank})</span>
                        )}
                        <span className="ml-2 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded-full">
                          {action.cadetCompany} Co.
                        </span>
                      </p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Requested by <strong className="text-slate-700 dark:text-slate-300">{action.requestedByName}</strong>
                        {' '}({action.requestedByRole?.replace(/_/g, ' ')})
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleRejectDelete(action)}
                        disabled={rejectingAction === action.id || approvingAction === action.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 disabled:opacity-50 transition-all"
                      >
                        {rejectingAction === action.id ? <Loader2 size={10} className="animate-spin" /> : <XCircle size={10} />}
                        Reject
                      </button>
                      <button
                        onClick={() => handleApproveDelete(action)}
                        disabled={approvingAction === action.id || rejectingAction === action.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-wider disabled:opacity-50 transition-all"
                      >
                        {approvingAction === action.id ? <Loader2 size={10} className="animate-spin" /> : <CheckCheck size={10} />}
                        Approve &amp; Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Company filter ── */}
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          {canManageAll ? (
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-xl px-4 py-2.5 shadow-sm">
              <Filter size={13} className="text-slate-400 shrink-0" />
              <select
                value={activeCompany}
                onChange={e => setActiveCompany(e.target.value)}
                className="text-xs font-bold text-slate-700 dark:text-slate-300 bg-transparent outline-none pr-2 cursor-pointer"
              >
                {['Battalion', ...companies].filter(Boolean).map(co => (
                  <option key={co} value={co}>
                    {BATTALION_COMPANIES.includes(co) ? `${co} · HQ` : `${co} Company`}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">
              {BATTALION_COMPANIES.includes(myCompany) ? `${myCompany} · HQ` : `${myCompany} Company`}
            </span>
          )}
          <span className="ml-auto self-center text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
            {visibleEntries.length} cadet{visibleEntries.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── Search ── */}
        <div className="relative mb-5">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, rank, or position…"
            className="w-full max-w-sm pl-10 pr-4 py-2.5 bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-xl text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-yellow-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
          />
        </div>

        {/* ── Roster table ── */}
        {dataLoading ? (
          <div className="space-y-2">
            {[1,2,3,4,5].map(n => (
              <div key={n} className="h-14 bg-slate-100 dark:bg-slate-900/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl">
            <UserCircle className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={40} />
            <p className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest text-sm">
              {search ? 'No cadets match your search' : `No cadets in ${activeCompany} Company yet`}
            </p>
            {!search && canEdit && (
              <button onClick={openCreate} className="mt-4 text-yellow-500 text-xs font-black uppercase tracking-widest hover:text-yellow-400 transition-colors">
                + Add first cadet
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-blue-100 dark:border-white/5 shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80 border-b border-blue-100 dark:border-white/5">
                  {['Rank','Name','Position','Platoon','Squad','Gender','Challenge Scores',''].map(h => (
                    <th key={h} className="text-left text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-4 py-3 whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleEntries.map((entry, idx) => {
                  const ch  = latestChallenge(entry.fullName, challengeMap);
                  const acc = entry.linkedUid ? userMap[entry.linkedUid] : null;
                  const hasAccount = Boolean(entry.linkedUid);
                  // Self-edit check: is this the current user's own roster entry?
                  const isSelfEntry    = Boolean(user?.uid && entry.linkedUid === user.uid);
                  const selfEditBlocked = isSelfEntry && !isSelfEditExempt;

                  return (
                    <tr
                      key={entry.id}
                      className={`border-b border-blue-50 dark:border-white/[0.03] hover:bg-yellow-50/30 dark:hover:bg-yellow-500/5 transition-colors ${idx % 2 === 0 ? '' : 'bg-slate-50/50 dark:bg-slate-900/30'}`}
                    >
                      {/* Rank */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-[10px] font-black uppercase text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded-full">
                          {entry.rank || '—'}
                        </span>
                      </td>

                      {/* Name + account indicator + company-watch badge for Battalion */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight whitespace-nowrap">
                            {entry.fullName}
                          </span>
                          {hasAccount && (
                            <span
                              title={acc ? `Portal: ${acc.fullName}` : 'Has portal account'}
                              className="text-blue-400 shrink-0"
                            >
                              <Link2 size={12} />
                            </span>
                          )}
                          {/* "Watches over" badge — only shown for Battalion members */}
                          {BATTALION_COMPANIES.includes(entry.company) && entry.secondaryCompany && (
                            <span
                              title={`Watches over ${entry.secondaryCompany} Company`}
                              className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full"
                            >
                              <Eye size={9} />
                              {entry.secondaryCompany}
                            </span>
                          )}
                        </div>
                        {entry.letLevel && (
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">{entry.letLevel}</p>
                        )}
                      </td>

                      {/* Position */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-slate-600 dark:text-slate-300 font-bold">{entry.position || '—'}</span>
                      </td>

                      {/* Platoon */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400">{entry.platoon || '—'}</span>
                      </td>

                      {/* Squad */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-slate-500 dark:text-slate-400">{entry.squad || '—'}</span>
                      </td>

                      {/* Gender */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {entry.gender ? (
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            entry.gender === 'Male'
                              ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                              : entry.gender === 'Female'
                                ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400'
                                : 'bg-slate-100 dark:bg-white/5 text-slate-500'
                          }`}>
                            {entry.gender === 'Male' ? 'M' : entry.gender === 'Female' ? 'F' : entry.gender}
                          </span>
                        ) : <span className="text-slate-300 dark:text-slate-700">—</span>}
                      </td>

                      {/* Challenge scores */}
                      <td className="px-4 py-3">
                        {ch ? (
                          <div className="flex flex-wrap">
                            <ScoreBadge label="PU"   value={ch.pushUps} />
                            <ScoreBadge label="SU"   value={ch.sitUps} />
                            <ScoreBadge label="Pull" value={ch.pullUps} />
                            <ScoreBadge label="Mile" value={ch.milePace} />
                            <ScoreBadge label="Sht"  value={ch.shuttleRun} />
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-300 dark:text-slate-700 font-bold uppercase">No record</span>
                        )}
                      </td>

                      {/* Actions — hidden for read-only roles (S1/S3 assistants) */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          {/* History — visible to any staff/command viewer */}
                          {(canManageAll || canManageOwn) && (
                            <button
                              onClick={() => openHistory(entry)}
                              title="View cadet history"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-all"
                            >
                              <History size={14} />
                            </button>
                          )}
                          {canEdit && (
                            <>
                              <button
                                onClick={() => {
                                  if (selfEditBlocked) {
                                    // Log and block the attempt
                                    writeLog({
                                      type: 'roster', action: 'self_edit_blocked',
                                      description: `${userData?.fullName || 'Unknown'} attempted to edit their own roster entry`,
                                      userId: user?.uid || '', userFullName: userData?.fullName || '',
                                      userRole: role || '', targetId: entry.id, targetName: entry.fullName,
                                      category: 'security',
                                    });
                                    // Immediate security alert for commander+ accounts
                                    if (userLevel >= COMMAND_LEVEL) {
                                      user?.getIdToken?.().then(idToken => {
                                        fetch('/api/notify-security', {
                                          method: 'POST',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({
                                            idToken,
                                            event: 'self_edit_attempt',
                                            actorName: userData?.fullName || '',
                                            actorRole: role || '',
                                            targetName: entry.fullName,
                                            targetId: entry.id,
                                          }),
                                        }).catch(() => {});
                                      }).catch(() => {});
                                    }
                                    showToast('You cannot edit your own roster entry — contact a staff member');
                                    return;
                                  }
                                  openEdit(entry);
                                }}
                                title={selfEditBlocked ? 'Self-editing blocked — contact staff' : 'Edit entry'}
                                className={`p-1.5 rounded-lg transition-all ${
                                  selfEditBlocked
                                    ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                                    : 'text-slate-400 hover:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-500/10'
                                }`}
                              >
                                {selfEditBlocked
                                  ? <ShieldAlert size={14} />
                                  : <Edit3 size={14} />
                                }
                              </button>
                              <button
                                onClick={() => setDeleteConf({ id: entry.id, fullName: entry.fullName, company: entry.company, rank: entry.rank, position: entry.position })}
                                title={canApproveDeletion ? 'Remove from roster' : 'Request removal (requires S1 approval)'}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                          {/* Graduate — admin only, only for non-graduated cadets */}
                          {userLevel >= ADMIN_LEVEL && !entry.graduated && (
                            <button
                              onClick={() => setGraduateConf({ id: entry.id, fullName: entry.fullName })}
                              title="Mark as graduated"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-500/10 transition-all"
                            >
                              <GraduationCap size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}


      {/* ── Add / Edit Modal ── */}
      {showModal && (
          <div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && closeModal()}
          >
            <div className="modal-enter bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/10 rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-xl">
              <div className="p-6 border-b border-blue-100 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
                <h2 className="font-black uppercase text-sm tracking-widest text-slate-900 dark:text-white">
                  {editingId ? 'Edit Roster Entry' : 'Add Cadet'}
                </h2>
                <button onClick={closeModal} aria-label="Close" className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-all">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">

                {/* Full Name — locked for S1 assistants when editing (can't rename a cadet) */}
                {(() => {
                  const nameLocked = canS1Edit && !!editingId;
                  return (
                    <div>
                      <label className={lCls}>
                        Full Name * (LAST, FIRST)
                        {nameLocked && (
                          <span className="ml-2 text-slate-400 normal-case tracking-normal font-bold">— contact staff to change</span>
                        )}
                      </label>
                      <input
                        required
                        type="text"
                        value={form.fullName}
                        readOnly={nameLocked}
                        onChange={nameLocked ? undefined : e => setForm(f => ({ ...f, fullName: e.target.value }))}
                        placeholder="DOE, JOHN"
                        className={`${iCls} ${nameLocked ? 'opacity-60 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  );
                })()}

                <div className="grid grid-cols-2 gap-4">
                  {/* Rank */}
                  <div>
                    <label className={lCls}>Rank</label>
                    <select
                      value={form.rank}
                      onChange={e => setForm(f => ({ ...f, rank: e.target.value }))}
                      className={iCls}
                    >
                      <option value="">— Select —</option>
                      {JROTC_RANKS.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>

                  {/* Gender */}
                  <div>
                    <label className={lCls}>Gender</label>
                    <select
                      value={form.gender}
                      onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                      className={iCls}
                    >
                      <option value="">— Select —</option>
                      {GENDERS.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                </div>

                {/* Position */}
                <div>
                  <label className={lCls}>Position</label>
                  <select
                    value={form.position}
                    onChange={e => setForm(f => ({ ...f, position: e.target.value }))}
                    className={iCls}
                  >
                    <option value="">— Select —</option>
                    {JROTC_POSITIONS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>

                {/* Company row + conditional platoon/squad or secondary company */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Company */}
                  <div>
                    <label className={lCls}>Company</label>
                    <input
                      type="text"
                      value={form.company}
                      readOnly={!canManageAll}
                      onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                      className={`${iCls} ${!canManageAll ? 'opacity-60 cursor-not-allowed' : ''}`}
                    />
                  </div>

                  {/* Platoon / Squad — hidden for Battalion */}
                  {!BATTALION_COMPANIES.includes(form.company) && (
                    <div>
                      <label className={lCls}>Platoon</label>
                      <select
                        value={form.platoon}
                        onChange={e => {
                          const next = e.target.value;
                          setForm(f => ({
                            ...f,
                            platoon: next,
                            // Company HQ has no squad — clear it when switching to HQ
                            ...(next === 'Company HQ' ? { squad: '' } : {}),
                          }));
                        }}
                        className={iCls}
                      >
                        <option value="">— —</option>
                        {PLATOONS.map(p => <option key={p}>{p}</option>)}
                      </select>
                    </div>
                  )}

                  {!BATTALION_COMPANIES.includes(form.company) && form.platoon !== 'Company HQ' && (
                    <div>
                      <label className={lCls}>Squad</label>
                      <select
                        value={form.squad}
                        onChange={e => setForm(f => ({ ...f, squad: e.target.value }))}
                        className={iCls}
                      >
                        <option value="">— —</option>
                        {SQUADS.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Secondary company — only for Battalion */}
                  {BATTALION_COMPANIES.includes(form.company) && (
                    <div className="col-span-2">
                      <label className={lCls}>Class Period Company</label>
                      <select
                        value={form.secondaryCompany}
                        onChange={e => setForm(f => ({ ...f, secondaryCompany: e.target.value }))}
                        className={`${iCls} border-yellow-500/40`}
                      >
                        <option value="">— None —</option>
                        {companies
                          .filter(c => !BATTALION_COMPANIES.includes(c))
                          .map(c => <option key={c} value={c}>{c} Co. (Observer)</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* LET Level */}
                <div>
                  <label className={lCls}>LET Level</label>
                  <select
                    value={form.letLevel}
                    onChange={e => setForm(f => ({ ...f, letLevel: e.target.value }))}
                    className={iCls}
                  >
                    <option value="">— Select —</option>
                    {LET_LEVELS.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>

                {/* Link to Portal Account */}
                <div>
                  <label className={lCls}>
                    <span className="flex items-center gap-1"><Link2 size={10} /> Link to Portal Account (optional)</span>
                  </label>
                  <select
                    value={form.linkedUid}
                    onChange={e => setForm(f => ({ ...f, linkedUid: e.target.value }))}
                    className={iCls}
                  >
                    <option value="">— No account linked —</option>
                    {portalUsers
                      .filter(u => u.approved && u.fullName)
                      .map(u => (
                        <option key={u.uid} value={u.uid}>
                          {u.fullName}{u.rank ? ` · ${u.rank}` : ''}
                        </option>
                      ))
                    }
                  </select>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-1 ml-1">
                    Linking shows the portal icon (🔗) on their row.
                  </p>
                </div>

                {/* Sync Settings — only visible when an account is linked */}
                {form.linkedUid && (
                  <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl p-4 space-y-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <RefreshCw size={10} />
                      Sync Settings
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                      Roster saves <strong className="text-slate-600 dark:text-slate-300">always</strong> push updates to the linked account. This setting controls the reverse: whether saving from the account page also updates this roster entry.
                    </p>

                    {/* Master toggle */}
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { value: 'roster',  label: 'One-way sync',      desc: 'Roster → Portal only' },
                        { value: 'portal',  label: 'Two-way sync',      desc: 'Roster ↔ Portal' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, syncMaster: opt.value }))}
                          className={`text-left px-3 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                            form.syncMaster === opt.value
                              ? 'bg-yellow-500 border-yellow-500 text-slate-950'
                              : 'border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500 hover:border-yellow-400'
                          }`}
                        >
                          <span className="block">{opt.label}</span>
                          <span className={`block font-normal normal-case tracking-normal mt-0.5 text-[9px] ${
                            form.syncMaster === opt.value ? 'text-slate-800' : 'text-slate-400 dark:text-slate-600'
                          }`}>{opt.desc}</span>
                        </button>
                      ))}
                    </div>

                    {/* Pull from Portal button */}
                    {form.syncMaster === 'portal' && userMap[form.linkedUid] && (() => {
                      const pu = userMap[form.linkedUid];
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            // Only pull personal-info fields from the portal.
                            // Company, platoon, squad, and secondaryCompany are
                            // organisational assignments managed by the roster —
                            // pulling them would move the entry to the wrong
                            // company tab or overwrite battalion-null values.
                            setForm(f => ({
                              ...f,
                              fullName: pu.fullName || f.fullName,
                              rank:     pu.rank     || f.rank,
                              position: pu.position || f.position,
                              gender:   pu.gender   || f.gender,
                              letLevel: pu.letLevel || f.letLevel,
                            }));
                            showToast('Personal info pulled from portal account');
                          }}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-dashed border-slate-300 dark:border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:border-yellow-400 hover:text-yellow-500 transition-all"
                        >
                          <RefreshCw size={10} />
                          Pull from Portal Account
                        </button>
                      );
                    })()}
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className={lCls}>Notes (optional)</label>
                  <textarea
                    rows={2}
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Any additional notes…"
                    className={`${iCls} resize-none`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {saving
                    ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                    : <><CheckCircle2 size={14} /> {editingId ? 'Save Changes' : 'Add to Roster'}</>
                  }
                </button>
              </form>
            </div>
          </div>
        )}

      {/* ── Delete Confirmation ── */}
        {deleteConf && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="modal-enter bg-white dark:bg-slate-900 border border-red-200 dark:border-red-500/20 rounded-3xl p-8 max-w-sm w-full text-center">
              {canApproveDeletion
                ? <Trash2 className="mx-auto text-red-500 mb-4" size={32} />
                : <AlertTriangle className="mx-auto text-amber-500 mb-4" size={32} />
              }
              <h3 className="font-black uppercase text-sm tracking-widest text-slate-900 dark:text-white mb-2">
                {canApproveDeletion ? 'Remove from Roster?' : 'Request Removal?'}
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                {canApproveDeletion
                  ? <>This removes <strong>{deleteConf.fullName}</strong> from the battalion roster. Their portal account (if any) is not affected.</>
                  : <>A removal request will be sent to the <strong>Battalion S1</strong> for approval. <strong>{deleteConf.fullName}</strong> will remain on the roster until approved.</>
                }
              </p>
              {!canApproveDeletion && (
                <p className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 tracking-widest mb-4">
                  Requires Battalion S1 sign-off
                </p>
              )}
              <div className="flex gap-3 mt-4">
                <button onClick={() => setDeleteConf(null)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 font-black text-xs uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className={`flex-1 py-3 rounded-xl text-white font-black text-xs uppercase transition-all ${
                    canApproveDeletion
                      ? 'bg-red-500 hover:bg-red-600'
                      : 'bg-amber-500 hover:bg-amber-600'
                  }`}
                >
                  {canApproveDeletion ? 'Remove' : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ── Cadet History Modal ── */}
        {historyEntry && (
          <div
            className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
            onClick={e => e.target === e.currentTarget && setHistoryEntry(null)}
          >
            <div className="modal-enter bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/10 rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-xl">
              {/* Header */}
              <div className="p-6 border-b border-blue-100 dark:border-white/5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                    <History size={18} className="text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Cadet History</p>
                    <h3 className="font-black text-slate-900 dark:text-white">{historyEntry.fullName}</h3>
                  </div>
                </div>
                <button onClick={() => setHistoryEntry(null)} aria-label="Close" className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5">
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6">
                {historyLoading ? (
                  <div className="flex items-center gap-3 text-slate-400 py-8">
                    <Loader2 size={18} className="animate-spin" /> Loading history…
                  </div>
                ) : historyRecords.length === 0 ? (
                  <div className="text-center py-12">
                    <History size={32} className="mx-auto text-slate-200 dark:text-slate-700 mb-3" />
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No archived records yet</p>
                    <p className="text-xs text-slate-400 mt-1">Year-end archives will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyRecords.map(rec => (
                      <div key={rec.id} className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                        {/* Year header */}
                        <button
                          onClick={() => setHistoryExpanded(historyExpanded === rec.schoolYear ? null : rec.schoolYear)}
                          className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-black text-sm text-slate-900 dark:text-white">{rec.schoolYear}</span>
                            <span className="text-xs text-slate-500">{rec.rank} · {rec.company ? `${rec.company} Co.` : '—'}</span>
                          </div>
                          <ChevronRight size={14} className={`text-slate-400 transition-transform ${historyExpanded === rec.schoolYear ? 'rotate-90' : ''}`} />
                        </button>

                        {/* Expanded details */}
                        {historyExpanded === rec.schoolYear && (
                          <div className="px-4 py-4 space-y-4">
                            {/* Basics */}
                            <div className="grid grid-cols-2 gap-3 text-sm">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Position</p>
                                <p className="text-slate-700 dark:text-slate-200">{rec.position || '—'}</p>
                              </div>
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-0.5 flex items-center gap-1"><BookOpen size={9} /> LET Level</p>
                                <p className="text-slate-700 dark:text-slate-200">{rec.letLevel || '—'}</p>
                              </div>
                            </div>

                            {/* Challenge Scores */}
                            {rec.scores && (
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1"><Trophy size={9} /> Challenge Scores</p>
                                {rec.scores.medicalExempt ? (
                                  <p className="text-xs text-slate-400 italic">Medical exemption</p>
                                ) : (
                                  <div className="flex flex-wrap gap-1.5">
                                    {[
                                      { l: 'Push-Ups',  v: rec.scores.pushUps },
                                      { l: 'Sit-Ups',   v: rec.scores.sitUps },
                                      { l: 'Shuttle',   v: rec.scores.shuttleRun },
                                      { l: '1 Mile',    v: rec.scores.oneMile },
                                      { l: 'S&R',       v: rec.scores.sitNReach },
                                    ].filter(i => i.v != null && i.v !== '').map(({ l, v }) => (
                                      <span key={l} className="inline-flex flex-col items-center bg-slate-100 dark:bg-white/5 rounded-xl px-3 py-1.5 min-w-[52px]">
                                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wide">{l}</span>
                                        <span className="text-sm font-black text-slate-800 dark:text-slate-200">{v}</span>
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Awards */}
                            {rec.awards && (
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1"><Trophy size={9} /> Awards</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300">{rec.awards}</p>
                              </div>
                            )}

                            {/* Camp */}
                            {rec.campNotes && (
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1"><Tent size={9} /> Camp Attendance</p>
                                <p className="text-sm text-slate-700 dark:text-slate-300">{rec.campNotes}</p>
                              </div>
                            )}

                            <p className="text-[10px] text-slate-400">Archived {rec.archivedByName ? `by ${rec.archivedByName}` : ''} · {rec.archivedAt?.toDate ? rec.archivedAt.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* ── Graduate Confirmation ── */}
        {graduateConf && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="modal-enter bg-white dark:bg-slate-900 border border-green-200 dark:border-green-500/20 rounded-3xl p-8 max-w-sm w-full text-center">
              <GraduationCap className="mx-auto text-green-500 mb-4" size={32} />
              <h3 className="font-black uppercase text-sm tracking-widest text-slate-900 dark:text-white mb-2">Mark as Graduated?</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                <strong>{graduateConf.fullName}</strong> will be marked as graduated. Their roster entry will remain for historical reference but will be excluded from future year-end archives.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setGraduateConf(null)} className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-white/10 font-black text-xs uppercase text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                  Cancel
                </button>
                <button onClick={handleGraduate} disabled={graduating} className="flex-1 py-3 rounded-xl bg-green-500 hover:bg-green-600 text-white font-black text-xs uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-60">
                  {graduating && <Loader2 size={12} className="animate-spin" />} Confirm
                </button>
              </div>
            </div>
          </div>
        )}

      {/* ── Toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-6 right-6 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black uppercase tracking-widest px-5 py-3 rounded-2xl shadow-xl z-50"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminRoster;
