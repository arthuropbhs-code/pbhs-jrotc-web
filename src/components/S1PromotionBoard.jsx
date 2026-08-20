// src/components/S1PromotionBoard.jsx
//
// Promotion Board tab within the S1 Tracker page.
//
// WHO CAN DO WHAT
//   Create board : s1_adjutant + ADMIN_LEVEL (80+)
//   Enter scores : company_xo (own company only) + ADMIN_LEVEL
//   Submit company: company_xo (own company, board open, not yet submitted)
//   Close board  : s1_adjutant + ADMIN_LEVEL
//   View         : everyone who can reach /admin/s1
//
// SCORING
//   11 fixed knowledge categories × max 100 pts each = 1100 base
//   + extra credit (0–100) = 1200 max total
//   Each category score must be one of: 100 / 90 / 80 / 0
//
// DATA MODEL (Firestore)
//   promotionBoards/{id}:
//     title, boardDate (Timestamp), status ('open'|'closed'),
//     categories [{id, label}], maxExtraCredit, totalPossible,
//     createdBy, createdByName, createdAt (Timestamp),
//     companyStatus: { [company]: { submitted, submittedAt, submittedByName } },
//     totalCadets
//
//   promotionScores/{id}:
//     boardId, rosterDocId, linkedUid, cadetName, rank, company,
//     scores: { [categoryId]: 100|90|80|0|null },
//     extraCredit (0–100), totalScore,
//     notes, updatedAt, updatedByName

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { db, auth } from '../firebase';
import {
  collection, query, where, onSnapshot,
  writeBatch, doc, getDocs, Timestamp, updateDoc,
} from 'firebase/firestore';
import {
  Trophy, Plus, ChevronLeft, CheckCircle2, Clock,
  X, ChevronDown, ChevronUp, AlertCircle, Unlock,
} from 'lucide-react';
import { ROLE_HIERARCHY, ADMIN_LEVEL } from '../constants';
import { useCompanies } from '../hooks/useCompanies';

// ── Constants ──────────────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES = [
  { id: 'cadet_creed',       label: 'Cadet Creed'                       },
  { id: 'ldrship',           label: 'LDRSHIP (with Definitions)'         },
  { id: 'jrotc_meaning',     label: 'JROTC Meaning'                      },
  { id: 'let_meaning',       label: 'LET Meaning'                        },
  { id: 'mission_statement', label: 'Mission Statement'                  },
  { id: 'sai_ai',            label: 'Who & What Are the SAI and AI'      },
  { id: 'all_duties',        label: 'List All Duties'                    },
  { id: 'chain_of_command',  label: 'Battalion Chain of Command'         },
  { id: 'def_leadership',    label: 'Definition of Leadership'           },
  { id: 'cadet_ranks',       label: 'Cadet Ranks (Show Ranks)'           },
  { id: 'principles',        label: 'Principles of Leadership'           },
];

// Short names for table column headers
const CAT_SHORT = {
  cadet_creed:       'Creed',
  ldrship:           'LDRSHIP',
  jrotc_meaning:     'JROTC',
  let_meaning:       'LET',
  mission_statement: 'Mission',
  sai_ai:            'SAI/AI',
  all_duties:        'Duties',
  chain_of_command:  'CoC',
  def_leadership:    'Ldrship',
  cadet_ranks:       'Ranks',
  principles:        'Principles',
};

const SCORE_OPTIONS  = [100, 90, 80, 0];
const MAX_EC         = 100;
const BASE_MAX       = DEFAULT_CATEGORIES.length * 100; // 1100
const TOTAL_MAX      = BASE_MAX + MAX_EC;               // 1200

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function calcTotal(scores, extraCredit) {
  const base = DEFAULT_CATEGORIES.reduce((sum, cat) => {
    const s = scores?.[cat.id];
    return sum + (s != null ? Number(s) : 0);
  }, 0);
  return base + (Number(extraCredit) || 0);
}

function scoreColor(total) {
  if (total >= 1080) return 'text-green-600 dark:text-green-400';
  if (total >= 960)  return 'text-yellow-600 dark:text-yellow-500';
  if (total > 0)     return 'text-orange-500 dark:text-orange-400';
  return 'text-slate-300 dark:text-slate-600';
}

// ── ScoreTableRow ──────────────────────────────────────────────────────────────
// Renders one cadet row in the score entry / review table.
// Extra credit uses an uncontrolled input + onBlur save to avoid setState-in-effect.
function ScoreTableRow({ scoreDoc, canEdit, formsOk, ccOk, onScoreChange, onExtraCreditBlur }) {
  const ecRef  = useRef(null);
  const total  = calcTotal(scoreDoc.scores, scoreDoc.extraCredit);

  return (
    <tr className="border-b border-blue-50 dark:border-white/5 hover:bg-blue-50/20 dark:hover:bg-white/[0.02] transition-colors">
      {/* Cadet */}
      <td className="px-3 py-2 sticky left-0 bg-white dark:bg-slate-900 z-10 min-w-[160px]">
        <p className="text-sm font-bold text-slate-900 dark:text-white whitespace-nowrap">{scoreDoc.cadetName || '—'}</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase">{scoreDoc.rank}</p>
      </td>

      {/* Eligibility badges */}
      <td className="px-2 py-2">
        <div className="flex flex-col gap-0.5">
          <span title="Forms" className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${formsOk ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>
            {formsOk ? '✓ Forms' : '✗ Forms'}
          </span>
          <span title="Cadet Challenge" className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full ${ccOk ? 'bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400'}`}>
            {ccOk ? '✓ CC' : '✗ CC'}
          </span>
        </div>
      </td>

      {/* Category scores */}
      {DEFAULT_CATEGORIES.map(cat => {
        const val = scoreDoc.scores?.[cat.id];
        return (
          <td key={cat.id} className="px-1.5 py-2 text-center">
            {canEdit ? (
              <select
                value={val ?? ''}
                onChange={e => onScoreChange(scoreDoc.id, cat.id, e.target.value)}
                className="w-14 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold text-center text-slate-900 dark:text-white outline-none focus:border-yellow-500 transition-colors px-0.5 py-1"
              >
                <option value="">—</option>
                {SCORE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <span className={`text-xs font-bold ${val != null ? (val >= 90 ? 'text-green-600 dark:text-green-400' : val >= 80 ? 'text-yellow-600 dark:text-yellow-500' : val === 0 ? 'text-red-500' : 'text-slate-600 dark:text-slate-400') : 'text-slate-300 dark:text-slate-600'}`}>
                {val ?? '—'}
              </span>
            )}
          </td>
        );
      })}

      {/* Extra credit */}
      <td className="px-1.5 py-2 text-center">
        {canEdit ? (
          <input
            ref={ecRef}
            type="number"
            min={0}
            max={MAX_EC}
            defaultValue={scoreDoc.extraCredit || 0}
            key={`${scoreDoc.id}-ec`}
            onBlur={() => {
              const v = Math.min(MAX_EC, Math.max(0, parseInt(ecRef.current?.value) || 0));
              onExtraCreditBlur(scoreDoc.id, v);
            }}
            className="w-14 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-bold text-center text-slate-900 dark:text-white outline-none focus:border-yellow-500 transition-colors px-0.5 py-1"
          />
        ) : (
          <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
            {scoreDoc.extraCredit || 0}
          </span>
        )}
      </td>

      {/* Total */}
      <td className="px-3 py-2 text-center">
        <span className={`text-sm font-black ${scoreColor(total)}`}>{total}</span>
        <p className="text-[9px] text-slate-300 dark:text-slate-600">/ {TOTAL_MAX}</p>
      </td>
    </tr>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
const S1PromotionBoard = ({ userData, role, userLevel, myCompany, isBattalionLevel, isS1 }) => {
  const { companies } = useCompanies();

  // ── Access flags ─────────────────────────────────────────────────────────────
  const canCreateBoard = isS1;
  const canEnterScores = role === 'company_xo' || userLevel >= ADMIN_LEVEL;
  const canCloseBoard  = isS1;

  // ── View state ────────────────────────────────────────────────────────────────
  const [view,          setView]          = useState('list'); // 'list' | 'detail'
  const [selectedBoard, setSelectedBoard] = useState(null);

  // ── Data state ────────────────────────────────────────────────────────────────
  const [boards,         setBoards]         = useState([]);
  const [scores,         setScores]         = useState([]);
  const [pendingFormMap, setPendingFormMap]  = useState({}); // rosterDocId -> true if pending in active form event
  const [ccCompleteMap,  setCcCompleteMap]   = useState({}); // rosterDocId -> true if CC complete
  const [loadingElig,    setLoadingElig]     = useState(false);
  const [showArchived,   setShowArchived]    = useState(false);

  // S1 filter controls
  const [minScore,     setMinScore]     = useState(0);
  const [maxScore,     setMaxScore]     = useState(TOTAL_MAX);
  const [companyFil,   setCompanyFil]   = useState('all');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ title: '', boardDate: '' });
  const [creating,   setCreating]   = useState(false);

  // Submit feedback
  const [submitting, setSubmitting] = useState(false);
  // Unlocking a company's submitted scores (S1 only)
  const [unlocking,  setUnlocking]  = useState(null); // company string being unlocked

  // ── Subscribe: boards ─────────────────────────────────────────────────────────
  useEffect(() => {
    const q = query(collection(db, 'promotionBoards'));
    return onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => (b.boardDate?.seconds || 0) - (a.boardDate?.seconds || 0));
      setBoards(docs);
    });
  }, []);

  // ── Subscribe: scores for selected board ──────────────────────────────────────
  useEffect(() => {
    if (!selectedBoard) { setScores([]); return; }
    const q = query(collection(db, 'promotionScores'), where('boardId', '==', selectedBoard.id));
    return onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      docs.sort((a, b) => {
        const co = (a.company || '').localeCompare(b.company || '');
        return co !== 0 ? co : (a.cadetName || '').localeCompare(b.cadetName || '');
      });
      setScores(docs);
    });
  }, [selectedBoard?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load eligibility data once when a board is opened ─────────────────────────
  useEffect(() => {
    if (!selectedBoard) { setPendingFormMap({}); setCcCompleteMap({}); return; }
    (async () => {
      setLoadingElig(true);
      try {
        const now = new Date();

        // 1. Active form events (dueDate >= now)
        const evSnap = await getDocs(collection(db, 'formEvents'));
        const activeEventIds = new Set(
          evSnap.docs
            .filter(d => {
              const ts = d.data().dueDate;
              if (!ts) return false;
              const dt = ts.toDate ? ts.toDate() : new Date(ts);
              return dt >= now;
            })
            .map(d => d.id)
        );

        // 2. Pending form submissions for active events
        const subSnap = await getDocs(
          query(collection(db, 'formSubmissions'), where('status', '==', 'pending'))
        );
        const pMap = {};
        subSnap.docs.forEach(d => {
          const { eventId, rosterDocId } = d.data();
          if (activeEventIds.has(eventId) && rosterDocId) pMap[rosterDocId] = true;
        });
        setPendingFormMap(pMap);

        // 3. CC records: cadetId = roster doc ID (set via { uid: d.id, ...d.data() } in AdminCadetChallenge)
        const ccSnap = await getDocs(collection(db, 'cadetChallengeRecords'));
        const ccMap = {};
        ccSnap.docs.forEach(d => {
          const r = d.data();
          const id = r.cadetId;
          if (!id || id === 'manual' || ccMap[id]) return;
          const allFilled =
            (r.pushUps   != null && r.pushUps   !== '') &&
            (r.sitUps    != null && r.sitUps    !== '') &&
            (r.shuttleRun != null && r.shuttleRun !== '') &&
            (r.oneMile   != null && r.oneMile   !== '') &&
            (r.sitNReach != null && r.sitNReach !== '');
          if (r.medicalExempt === true || allFilled) ccMap[id] = true;
        });
        setCcCompleteMap(ccMap);
      } catch (err) {
        console.error('Eligibility load error:', err);
      } finally {
        setLoadingElig(false);
      }
    })();
  }, [selectedBoard?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ───────────────────────────────────────────────────────────────────
  const openBoard    = useMemo(() => boards.find(b => b.status === 'open'),   [boards]);
  const closedBoards = useMemo(() => boards.filter(b => b.status === 'closed'), [boards]);

  const myCompanySubmitted = selectedBoard?.companyStatus?.[myCompany]?.submitted === true;
  const canEditThisBoard   = canEnterScores && !myCompanySubmitted && selectedBoard?.status === 'open';

  // Scores visible to this user
  const visibleScores = useMemo(() => {
    return isBattalionLevel ? scores : scores.filter(s => s.company === myCompany);
  }, [scores, isBattalionLevel, myCompany]);

  // Filtered/sorted scores for S1 review
  const filteredScores = useMemo(() => {
    let list = visibleScores;
    if (companyFil !== 'all') list = list.filter(s => s.company === companyFil);
    list = list.filter(s => {
      const t = s.totalScore || 0;
      return t >= minScore && t <= maxScore;
    });
    return [...list].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));
  }, [visibleScores, companyFil, minScore, maxScore]);

  // Company submission status summary
  const companyStatusSummary = useMemo(() => {
    if (!selectedBoard?.companyStatus) return [];
    return Object.entries(selectedBoard.companyStatus).map(([co, st]) => ({ company: co, ...st }));
  }, [selectedBoard?.companyStatus]);

  const allSubmitted = companyStatusSummary.length > 0 && companyStatusSummary.every(cs => cs.submitted);
  const submittedCount = companyStatusSummary.filter(cs => cs.submitted).length;

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleCreateBoard = async () => {
    if (!createForm.title.trim() || !createForm.boardDate) return;
    setCreating(true);
    try {
      const rosterSnap = await getDocs(collection(db, 'roster'));
      const cadets     = rosterSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (cadets.length > 498) {
        alert('Roster too large for a single batch (>498). Contact S6.');
        return;
      }

      // Initialize company status map from current companies list
      const companyStatus = {};
      companies.forEach(co => { companyStatus[co] = { submitted: false }; });

      const batch    = writeBatch(db);
      const boardRef = doc(collection(db, 'promotionBoards'));

      batch.set(boardRef, {
        title:        createForm.title.trim(),
        boardDate:    Timestamp.fromDate(new Date(createForm.boardDate)),
        status:       'open',
        categories:   DEFAULT_CATEGORIES,
        maxExtraCredit: MAX_EC,
        totalPossible:  TOTAL_MAX,
        createdBy:    auth.currentUser.uid,
        createdByName: userData?.fullName || '',
        createdAt:    Timestamp.now(),
        companyStatus,
        totalCadets:  cadets.length,
      });

      const emptyScores = Object.fromEntries(DEFAULT_CATEGORIES.map(c => [c.id, null]));
      cadets.forEach(cadet => {
        const scoreRef = doc(collection(db, 'promotionScores'));
        batch.set(scoreRef, {
          boardId:      boardRef.id,
          rosterDocId:  cadet.id,
          linkedUid:    cadet.linkedUid || null,
          cadetName:    cadet.fullName  || '',
          rank:         cadet.rank      || '',
          company:      cadet.company   || '',
          scores:       { ...emptyScores },
          extraCredit:  0,
          totalScore:   0,
          notes:        '',
          updatedAt:    null,
          updatedByName: '',
        });
      });

      await batch.commit();
      setShowCreate(false);
      setCreateForm({ title: '', boardDate: '' });
    } catch (err) {
      console.error('Create board error:', err);
      alert('Failed to create promotion board.');
    } finally {
      setCreating(false);
    }
  };

  const handleScoreChange = async (scoreDocId, catId, rawValue) => {
    const numVal = rawValue === '' || rawValue == null ? null : parseInt(rawValue);
    const current = scores.find(s => s.id === scoreDocId);
    if (!current) return;

    const newScores = { ...(current.scores || {}), [catId]: numVal };
    const newTotal  = calcTotal(newScores, current.extraCredit);

    await updateDoc(doc(db, 'promotionScores', scoreDocId), {
      [`scores.${catId}`]: numVal,
      totalScore:          newTotal,
      updatedAt:           Timestamp.now(),
      updatedByName:       userData?.fullName || '',
    }).catch(err => console.error('Score save error:', err));
  };

  const handleExtraCreditBlur = async (scoreDocId, value) => {
    const current = scores.find(s => s.id === scoreDocId);
    if (!current) return;

    const newTotal = calcTotal(current.scores, value);
    await updateDoc(doc(db, 'promotionScores', scoreDocId), {
      extraCredit:   value,
      totalScore:    newTotal,
      updatedAt:     Timestamp.now(),
      updatedByName: userData?.fullName || '',
    }).catch(err => console.error('Extra credit save error:', err));
  };

  const handleSubmitCompany = async () => {
    if (!selectedBoard || !myCompany) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'promotionBoards', selectedBoard.id), {
        [`companyStatus.${myCompany}.submitted`]:      true,
        [`companyStatus.${myCompany}.submittedAt`]:    Timestamp.now(),
        [`companyStatus.${myCompany}.submittedByName`]: userData?.fullName || '',
      });
    } catch (err) {
      console.error('Submit error:', err);
      alert('Failed to submit scores.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseBoard = async () => {
    if (!selectedBoard) return;
    const ok = window.confirm('Close this promotion board? All scores will be locked. This cannot be undone.');
    if (!ok) return;
    await updateDoc(doc(db, 'promotionBoards', selectedBoard.id), { status: 'closed' });
  };

  // S1 only: unlock (un-submit) a company's scores so the XO can make corrections
  const handleUnlockCompany = async (company) => {
    if (!selectedBoard || !isS1) return;
    const ok = window.confirm(`Unlock ${company} Company's submitted scores? Their XO will be able to make changes again.`);
    if (!ok) return;
    setUnlocking(company);
    try {
      await updateDoc(doc(db, 'promotionBoards', selectedBoard.id), {
        [`companyStatus.${company}.submitted`]:      false,
        [`companyStatus.${company}.unlockedAt`]:     Timestamp.now(),
        [`companyStatus.${company}.unlockedByName`]: userData?.fullName || '',
      });
    } catch (err) {
      console.error('Unlock error:', err);
      alert('Failed to unlock company scores.');
    } finally {
      setUnlocking(null);
    }
  };

  const openDetail = (board) => {
    setSelectedBoard(board);
    setView('detail');
    setMinScore(0);
    setMaxScore(TOTAL_MAX);
    setCompanyFil('all');
  };

  const closeDetail = () => {
    setView('list');
    setSelectedBoard(null);
    setScores([]);
  };

  // ════════════════════════════════════════════════════════════════════════════════
  // BOARD DETAIL VIEW
  // ════════════════════════════════════════════════════════════════════════════════
  if (view === 'detail' && selectedBoard) {
    const isClosed    = selectedBoard.status === 'closed';
    const displayScores = isBattalionLevel ? filteredScores : visibleScores;

    return (
      <div>
        {/* Back + header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <button
              onClick={closeDetail}
              className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-yellow-500 transition-colors mb-3"
            >
              <ChevronLeft size={13} /> Back to Boards
            </button>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
              {selectedBoard.title}
            </h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${isClosed ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' : 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-500'}`}>
                {isClosed ? 'Closed' : 'Open'}
              </span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                Board Date: {fmtDate(selectedBoard.boardDate)}
              </span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                {selectedBoard.totalCadets ?? '—'} cadets
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* XO: submit button */}
            {canEnterScores && !isBattalionLevel && !isClosed && (
              myCompanySubmitted ? (
                <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-500/10 px-4 py-2 rounded-xl border border-green-200 dark:border-green-500/20">
                  <CheckCircle2 size={13} /> Scores Submitted
                </span>
              ) : (
                <button
                  onClick={handleSubmitCompany}
                  disabled={submitting}
                  className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-slate-950 text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-colors"
                >
                  {submitting ? 'Submitting…' : 'Submit Scores'}
                </button>
              )
            )}
            {/* S1: close board button */}
            {canCloseBoard && !isClosed && (
              <button
                onClick={handleCloseBoard}
                className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-colors border border-slate-200 dark:border-white/5"
              >
                Close Board
              </button>
            )}
          </div>
        </div>

        {/* Company submission status */}
        {companyStatusSummary.length > 0 && (
          <div className="mb-6">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-600 mb-2">
              Company Submissions — {submittedCount}/{companyStatusSummary.length}
            </p>
            <div className="flex flex-wrap gap-2">
              {companyStatusSummary.map(cs => (
                <div key={cs.company} className="flex items-center gap-1">
                  <div
                    className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border ${
                      cs.submitted
                        ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-white/5'
                    }`}
                  >
                    {cs.submitted ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                    {cs.company}
                    {cs.submitted && cs.submittedByName && (
                      <span className="font-normal opacity-70">— {cs.submittedByName}</span>
                    )}
                  </div>
                  {/* S1 can unlock a submitted company so the XO can correct scores */}
                  {isS1 && cs.submitted && selectedBoard?.status === 'open' && (
                    <button
                      onClick={() => handleUnlockCompany(cs.company)}
                      disabled={unlocking === cs.company}
                      title={`Unlock ${cs.company} Company's scores`}
                      className="p-1 rounded-full text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-all disabled:opacity-40"
                    >
                      <Unlock size={11} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All-submitted notice for S1 */}
        {allSubmitted && !isClosed && canCloseBoard && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-500/5 border border-green-200 dark:border-green-500/20 rounded-2xl flex items-center gap-3">
            <CheckCircle2 className="text-green-600 dark:text-green-400 shrink-0" size={16} />
            <p className="text-xs font-bold text-green-700 dark:text-green-400">
              All companies have submitted their scores. You can now close the board.
            </p>
          </div>
        )}

        {/* S1 filter bar */}
        {isBattalionLevel && (
          <div className="flex items-center gap-3 mb-4 flex-wrap bg-blue-50/50 dark:bg-slate-800/50 rounded-2xl p-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mr-2">Filter:</p>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-400">Min Score</label>
              <input
                type="number"
                min={0} max={TOTAL_MAX}
                value={minScore}
                onChange={e => setMinScore(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-20 bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-yellow-500 transition-colors text-center"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-400">Max Score</label>
              <input
                type="number"
                min={0} max={TOTAL_MAX}
                value={maxScore}
                onChange={e => setMaxScore(Math.min(TOTAL_MAX, parseInt(e.target.value) || TOTAL_MAX))}
                className="w-20 bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-yellow-500 transition-colors text-center"
              />
            </div>
            <select
              value={companyFil}
              onChange={e => setCompanyFil(e.target.value)}
              className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 outline-none"
            >
              <option value="all">All Companies</option>
              {companies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <p className="text-[10px] text-slate-400 ml-auto">{displayScores.length} cadet{displayScores.length !== 1 ? 's' : ''}</p>
          </div>
        )}

        {/* Submitted warning for XO */}
        {myCompanySubmitted && canEnterScores && !isBattalionLevel && !isClosed && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-500/5 border border-blue-200 dark:border-blue-500/20 rounded-2xl flex items-center gap-3">
            <AlertCircle className="text-blue-500 shrink-0" size={16} />
            <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
              Your company's scores have been submitted and are now read-only.
              Contact the S1 Adjutant if you need to make changes.
            </p>
          </div>
        )}

        {/* Score table */}
        <div className="bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded-3xl shadow-sm overflow-hidden">
          {scores.length === 0 ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-yellow-500 mx-auto" />
              <p className="text-slate-400 text-xs font-bold mt-4 uppercase tracking-widest">Loading cadets…</p>
            </div>
          ) : displayScores.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No cadets match the current filters</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-blue-100 dark:border-white/5 bg-blue-50/40 dark:bg-slate-800/30">
                    <th className="px-3 py-2 text-left text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 sticky left-0 bg-blue-50/40 dark:bg-slate-800/30 z-10">Cadet</th>
                    <th className="px-2 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Elig.</th>
                    {DEFAULT_CATEGORIES.map(cat => (
                      <th key={cat.id} className="px-1.5 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center whitespace-nowrap">
                        {CAT_SHORT[cat.id]}
                      </th>
                    ))}
                    <th className="px-1.5 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">EC</th>
                    <th className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-center">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {displayScores.map(scoreDoc => (
                    <ScoreTableRow
                      key={scoreDoc.id}
                      scoreDoc={scoreDoc}
                      canEdit={canEditThisBoard && !isBattalionLevel}
                      formsOk={!pendingFormMap[scoreDoc.rosterDocId]}
                      ccOk={!!ccCompleteMap[scoreDoc.rosterDocId]}
                      onScoreChange={handleScoreChange}
                      onExtraCreditBlur={handleExtraCreditBlur}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Eligibility legend */}
        {!loadingElig && (
          <p className="text-[9px] text-slate-400 dark:text-slate-600 mt-3 text-right">
            Forms: no pending active form events · CC: all Cadet Challenge events entered
          </p>
        )}
        {loadingElig && (
          <p className="text-[9px] text-slate-400 dark:text-slate-600 mt-3 text-right animate-pulse">
            Loading eligibility data…
          </p>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // BOARD LIST VIEW
  // ════════════════════════════════════════════════════════════════════════════════
  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
            <Trophy className="text-yellow-500" size={20} /> Promotion Board
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 mt-0.5">
            Score: 100 / 90 / 80 / 0 per category · Max {TOTAL_MAX} pts total
          </p>
        </div>
        {canCreateBoard && (
          <button
            onClick={() => setShowCreate(true)}
            disabled={!!openBoard}
            title={openBoard ? 'Close the current open board before creating a new one' : 'Create a new promotion board'}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-black uppercase tracking-wider px-4 py-2.5 rounded-xl transition-colors"
          >
            <Plus size={14} /> New Board
          </button>
        )}
      </div>

      {/* Open board */}
      {openBoard ? (
        <div className="mb-8">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-300 dark:text-slate-600 mb-3">Open</p>
          <BoardCard board={openBoard} onClick={() => openDetail(openBoard)} />
        </div>
      ) : (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-white/5 rounded-3xl mb-8">
          <Trophy className="mx-auto text-slate-300 dark:text-slate-700 mb-4" size={32} />
          <p className="text-slate-400 font-black uppercase tracking-widest text-sm">No open promotion board</p>
          {canCreateBoard && (
            <button
              onClick={() => setShowCreate(true)}
              className="mt-3 text-yellow-600 dark:text-yellow-500 text-xs font-black uppercase tracking-widest hover:underline"
            >
              Create one →
            </button>
          )}
        </div>
      )}

      {/* Archived (closed) boards */}
      {closedBoards.length > 0 && (
        <div>
          <button
            onClick={() => setShowArchived(s => !s)}
            className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-600 mb-3 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
          >
            {showArchived ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            Archived — {closedBoards.length}
          </button>
          {showArchived && (
            <div className="space-y-3 opacity-70">
              {closedBoards.map(b => (
                <BoardCard key={b.id} board={b} onClick={() => openDetail(b)} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-blue-100 dark:border-white/5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
                New Promotion Board
              </h3>
              <button onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Categories preview */}
              <div className="bg-blue-50/50 dark:bg-slate-800 rounded-2xl p-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
                  11 Scoring Categories (100 pts each) + Up to 100 Extra Credit = {TOTAL_MAX} Max
                </p>
                <div className="flex flex-wrap gap-1">
                  {DEFAULT_CATEGORIES.map(cat => (
                    <span key={cat.id} className="text-[9px] bg-white dark:bg-slate-900 border border-blue-100 dark:border-white/5 rounded px-1.5 py-0.5 text-slate-500 dark:text-slate-400">
                      {cat.label}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1.5">Board Title</label>
                <input
                  value={createForm.title}
                  onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g., Fall 2026 Promotion Board"
                  className="w-full bg-blue-50/50 dark:bg-slate-800 border border-blue-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:border-yellow-500/40 transition-colors"
                />
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1.5">Board Date</label>
                <input
                  type="date"
                  value={createForm.boardDate}
                  onChange={e => setCreateForm(f => ({ ...f, boardDate: e.target.value }))}
                  className="w-full bg-blue-50/50 dark:bg-slate-800 border border-blue-100 dark:border-white/5 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none focus:border-yellow-500/40 transition-colors"
                />
              </div>

              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                All {'{'}N{'}'} cadets from the battalion roster will be auto-added. Each Company XO will score their own company.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-blue-50/50 dark:bg-slate-800 hover:bg-blue-100 dark:hover:bg-slate-700 transition-colors border border-blue-100 dark:border-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBoard}
                disabled={!createForm.title.trim() || !createForm.boardDate || creating}
                className="flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-yellow-500 hover:bg-yellow-400 text-slate-950 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? 'Creating…' : 'Create Board'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── BoardCard ──────────────────────────────────────────────────────────────────
function BoardCard({ board, onClick }) {
  const companyStatus = board.companyStatus || {};
  const companies     = Object.keys(companyStatus);
  const submitted     = companies.filter(c => companyStatus[c]?.submitted).length;
  const total         = companies.length;
  const pct           = total > 0 ? Math.round((submitted / total) * 100) : 0;
  const isClosed      = board.status === 'closed';

  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white dark:bg-slate-900 border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group ${
        isClosed
          ? 'border-blue-100/50 dark:border-white/[0.03] hover:border-slate-300 dark:hover:border-white/10'
          : 'border-yellow-200 dark:border-yellow-500/20 hover:border-yellow-400 dark:hover:border-yellow-500/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className={`text-sm font-black leading-tight ${isClosed ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white group-hover:text-yellow-600 dark:group-hover:text-yellow-500'} transition-colors`}>
          {board.title}
        </h3>
        <span className={`shrink-0 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${isClosed ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-500'}`}>
          {isClosed ? 'Closed' : 'Open'}
        </span>
      </div>
      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">
        Board Date: {fmtDate(board.boardDate)} · {board.totalCadets ?? '—'} cadets
      </p>
      {total > 0 && (
        <div>
          <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
            <span>Companies submitted</span>
            <span>{submitted}/{total}</span>
          </div>
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-yellow-500 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}
    </button>
  );
}

// Missing ChevronLeft import — add it here as a simple inline fallback
// (Already imported above from lucide-react)

export default S1PromotionBoard;
