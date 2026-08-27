import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronLeft, RotateCcw, Copy, Check } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';

// ─── Quiz data ─────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    tag: 'Effort & Ability',
    text: 'I perform at my highest level when tasks come naturally to me — extra effort isn\'t really necessary.',
    options: [
      { label: 'A', text: 'Agree — natural ability is my strongest asset.',                  score: 0 },
      { label: 'B', text: 'It depends on the type of task.',                                   score: 1 },
      { label: 'C', text: 'Disagree — deliberate effort always makes the difference.',         score: 3 },
      { label: 'D', text: 'I\'m not sure.',                                                    score: 1 },
    ],
  },
  {
    tag: 'Opportunity & Resilience',
    text: 'If a cadet misses a key opportunity, that window is permanently closed.',
    options: [
      { label: 'A', text: 'Absolutely — missed chances rarely return.',                        score: 0 },
      { label: 'B', text: 'Never — consistent effort always creates new opportunities.',        score: 3 },
      { label: 'C', text: 'Not always — some opportunities circle back.',                      score: 2 },
      { label: 'D', text: 'I\'m not sure.',                                                    score: 1 },
    ],
  },
  {
    tag: 'Self-Awareness',
    text: 'I\'m aware of my personal strengths and the areas where I still need to improve.',
    options: [
      { label: 'A', text: 'Yes — I conduct regular self-assessments and seek feedback.',       score: 3 },
      { label: 'B', text: 'Not entirely — I\'m still figuring myself out.',                   score: 1 },
      { label: 'C', text: 'No — I find it difficult to evaluate myself clearly.',             score: 0 },
      { label: 'D', text: 'I don\'t think I have notable strengths.',                         score: 0 },
    ],
  },
  {
    tag: 'Training & Effort',
    text: 'The harder I train at a skill, the better I will become at it.',
    options: [
      { label: 'A', text: 'Agree — deliberate practice always pays off.',                      score: 3 },
      { label: 'B', text: 'In some cases, but not always.',                                    score: 2 },
      { label: 'C', text: 'Disagree — some people just have more natural talent.',             score: 0 },
      { label: 'D', text: 'I\'m not sure.',                                                    score: 1 },
    ],
  },
  {
    tag: 'Leader Mindset',
    text: 'Top-performing leaders and elite cadets don\'t have to work as hard as everyone else.',
    options: [
      { label: 'A', text: 'Agree — natural talent sets them apart.',                           score: 0 },
      { label: 'B', text: 'Sometimes — truly gifted people need less effort.',                 score: 1 },
      { label: 'C', text: 'Disagree — even the best maintain rigorous daily training.',        score: 3 },
      { label: 'D', text: 'That\'s how it usually appears from the outside.',                  score: 1 },
    ],
  },
  {
    tag: 'Accountability',
    text: 'When I make a mistake on a mission or task, I own it without excuses and take steps to correct it.',
    options: [
      { label: 'A', text: 'Agree — accountability is non-negotiable.',                         score: 3 },
      { label: 'B', text: 'Not always — it depends on the circumstances.',                     score: 2 },
      { label: 'C', text: 'Disagree — I tend to move past mistakes quickly.',                  score: 0 },
      { label: 'D', text: 'Neither agree nor disagree.',                                       score: 1 },
    ],
  },
  {
    tag: 'Intelligence & Growth',
    text: 'You can always develop new skills, but your raw intelligence level is fixed at birth.',
    options: [
      { label: 'A', text: 'Agree — base intelligence is determined early in life.',            score: 0 },
      { label: 'B', text: 'Sometimes — certain mental abilities are hard to change.',          score: 1 },
      { label: 'C', text: 'Disagree — the brain can always be trained and developed.',         score: 3 },
      { label: 'D', text: 'I\'m not sure.',                                                    score: 1 },
    ],
  },
  {
    tag: 'Learning & Humility',
    text: 'I embrace learning something new, even when I look inexperienced or make mistakes at first.',
    options: [
      { label: 'A', text: 'Agree — growth requires accepting the beginner stage.',             score: 3 },
      { label: 'B', text: 'Sometimes — only if the stakes are relatively low.',               score: 2 },
      { label: 'C', text: 'Disagree — I prefer to operate within my areas of mastery.',       score: 0 },
      { label: 'D', text: 'I\'m not sure.',                                                    score: 1 },
    ],
  },
  {
    tag: 'Mission Difficulty',
    text: 'When a mission objective is harder than expected, I push through and invest more time — not less.',
    options: [
      { label: 'A', text: 'Yes — difficulty is a signal that more training is needed.',        score: 3 },
      { label: 'B', text: 'Sometimes — it depends on the objective\'s overall priority.',      score: 2 },
      { label: 'C', text: 'Not really — I redirect effort toward achievable objectives.',      score: 0 },
      { label: 'D', text: 'I can\'t think of a clear example from my experience.',             score: 1 },
    ],
  },
  {
    tag: 'Comfort Zone',
    text: 'Attempting unfamiliar tasks stresses me out — so I usually stick to what I already know.',
    options: [
      { label: 'A', text: 'Agree — I prefer to operate on familiar ground.',                   score: 0 },
      { label: 'B', text: 'Sometimes — new tasks can take me outside my comfort zone.',       score: 1 },
      { label: 'C', text: 'Disagree — I actively pursue the unfamiliar to expand my capability.', score: 3 },
      { label: 'D', text: 'I\'m not sure.',                                                    score: 1 },
    ],
  },
  {
    tag: 'Character & Change',
    text: 'A person\'s character is mostly set — real behavioral change rarely happens.',
    options: [
      { label: 'A', text: 'Agree — people are fundamentally who they are.',                    score: 0 },
      { label: 'B', text: 'Sometimes — small adjustments are possible over time.',             score: 1 },
      { label: 'C', text: 'Disagree — sustained discipline and effort can transform character.', score: 3 },
      { label: 'D', text: 'I\'m not sure.',                                                    score: 1 },
    ],
  },
  {
    tag: 'Challenge & Leadership',
    text: 'I actively seek out challenges, even when success isn\'t guaranteed.',
    options: [
      { label: 'A', text: 'Agree — challenges sharpen me as a leader.',                        score: 3 },
      { label: 'B', text: 'Sometimes — if I feel adequately prepared.',                        score: 2 },
      { label: 'C', text: 'Disagree — I prefer objectives with a high probability of success.', score: 0 },
      { label: 'D', text: 'I\'m not sure.',                                                    score: 1 },
    ],
  },
  {
    tag: 'Peer Comparison',
    text: 'When a peer masters something faster than I do, it makes me doubt my own ability.',
    options: [
      { label: 'A', text: 'Yes — it signals that I\'m falling behind.',                        score: 0 },
      { label: 'B', text: 'Sometimes — it can shake my confidence temporarily.',               score: 1 },
      { label: 'C', text: 'Disagree — I use it as motivation to train harder.',                score: 3 },
      { label: 'D', text: 'I\'m not sure.',                                                    score: 1 },
    ],
  },
  {
    tag: 'After Action Review',
    text: 'I treat mistakes like After Action Reviews — I analyze them and adapt, rather than carry guilt.',
    options: [
      { label: 'A', text: 'Agree — every mistake is intelligence for future improvement.',     score: 3 },
      { label: 'B', text: 'Sometimes — certain mistakes are harder to process objectively.',   score: 2 },
      { label: 'C', text: 'Disagree — I prefer not to dwell on what went wrong.',             score: 0 },
      { label: 'D', text: 'I\'m not sure.',                                                    score: 1 },
    ],
  },
];

const MAX_SCORE = QUESTIONS.length * 3; // 42

const RESULTS = [
  {
    minScore: 0,  maxScore: 13,
    rank:  'Recruit',
    title: 'Fixed Mindset',
    desc:  'Your current thinking patterns lean toward a fixed mindset — the belief that talent and intelligence are static. Every great leader started here. Awareness of this tendency is the first and most important step in your development.',
  },
  {
    minScore: 14, maxScore: 24,
    rank:  'Cadet',
    title: 'Developing Mindset',
    desc:  'You show genuine growth potential. You understand that effort matters, but fixed-mindset habits still surface under pressure. Continue seeking feedback, embracing difficulty, and treating setbacks as training data.',
  },
  {
    minScore: 25, maxScore: 34,
    rank:  'Sergeant',
    title: 'Strong Growth Mindset',
    desc:  'You demonstrate solid growth-mindset principles in most situations. You value effort, own your mistakes, and push through difficulty. Focus on applying these principles consistently under high-pressure conditions.',
  },
  {
    minScore: 35, maxScore: 42,
    rank:  'Commander',
    title: 'Elite Growth Mindset',
    desc:  'You think like a leader built for sustained excellence. You actively seek challenge, learn from every failure, and understand that ability is developed — not assigned. Mission-ready mindset. Above and beyond.',
  },
];

// ─── Sub-components ────────────────────────────────────────────────────────

const MilitaryLabel = ({ children, className = '' }) => (
  <span className={`text-[0.65rem] font-bold tracking-[0.2em] uppercase text-slate-500 dark:text-slate-500 ${className}`}>
    {children}
  </span>
);

// ─── Screens ───────────────────────────────────────────────────────────────

const IntroScreen = ({ onStart }) => (
  <div className="animate-[fadeUp_0.35s_ease_both] text-center">
    <h1 className="font-black uppercase italic tracking-tighter text-[clamp(3.5rem,11vw,8rem)] leading-none text-slate-900 dark:text-white mb-3">
      Mindset<br />
      <span className="text-yellow-500">Readiness</span>
    </h1>
    <p className="text-sm font-bold tracking-[0.14em] uppercase text-slate-400 mb-10">
      Self-Assessment · Cadet Edition
    </p>

    <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-12 text-[0.97rem] max-w-xl mx-auto">
      Your mindset is one of the most powerful weapons in your arsenal as a leader.
      This assessment reveals whether your current thinking patterns support growth,
      resilience, and mission success — or limit your potential before training even begins.
    </p>

    <div className="flex gap-14 mb-14 justify-center">
      {[['14', 'Questions'], ['~5', 'Minutes'], ['4', 'Outcomes']].map(([val, lbl]) => (
        <div key={lbl}>
          <div className="font-black text-4xl text-yellow-500 leading-none tabular-nums">{val}</div>
          <div className="text-[0.65rem] font-bold tracking-[0.14em] uppercase text-slate-400 mt-1.5">{lbl}</div>
        </div>
      ))}
    </div>

    <button
      onClick={onStart}
      className="inline-flex items-center gap-2.5 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-slate-900 text-sm font-bold tracking-[0.06em] uppercase px-10 py-4 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-yellow-500 focus-visible:outline-offset-2"
    >
      Begin Assessment
      <ChevronRight size={16} />
    </button>
  </div>
);

const OptionButton = ({ option, selected, onClick }) => (
  <button
    onClick={onClick}
    aria-pressed={selected}
    className={`
      w-full flex items-start gap-3.5 px-4 py-3.5 rounded-lg border text-left transition-all
      focus-visible:outline-2 focus-visible:outline-yellow-500 focus-visible:outline-offset-1
      ${selected
        ? 'border-yellow-500 bg-yellow-500/8 dark:bg-yellow-500/8'
        : 'border-slate-200 dark:border-white/6 bg-slate-50 dark:bg-slate-800/60 hover:border-yellow-500/40 hover:bg-yellow-500/5 hover:translate-x-0.5'}
    `}
  >
    <span className={`
      flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-extrabold border transition-colors
      ${selected
        ? 'bg-yellow-500 border-yellow-500 text-slate-900'
        : 'border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900'}
    `}>
      {option.label}
    </span>
    <span className={`pt-0.5 text-[0.88rem] leading-relaxed transition-colors ${selected ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
      {option.text}
    </span>
  </button>
);

const QuizScreen = ({ question, questionIndex, selection, onSelect, onNext, onBack, total }) => (
  <div className="animate-[fadeUp_0.3s_ease_both]" key={questionIndex}>
    <MilitaryLabel className="mb-3 block">
      Question <span className="text-yellow-500">{questionIndex + 1}</span> of {total}
    </MilitaryLabel>

    {/* Card */}
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl p-6 md:p-8 shadow-sm dark:shadow-xl mb-5">
      <div className="text-[0.65rem] font-bold tracking-[0.2em] uppercase text-yellow-500 mb-3">
        {question.tag}
      </div>
      <p className="text-[1.05rem] md:text-[1.15rem] font-medium leading-relaxed text-slate-900 dark:text-white mb-7 max-w-[58ch]">
        {question.text}
      </p>

      <div className="flex flex-col gap-2.5">
        {question.options.map((opt, i) => (
          <OptionButton
            key={opt.label}
            option={opt}
            selected={selection === i}
            onClick={() => onSelect(i)}
          />
        ))}
      </div>
    </div>

    {/* Nav */}
    <div className="flex items-center justify-between">
      <button
        onClick={onBack}
        disabled={questionIndex === 0}
        className="flex items-center gap-1.5 text-sm font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <ChevronLeft size={16} /> Back
      </button>
      <button
        onClick={onNext}
        disabled={selection === null}
        className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 disabled:opacity-35 disabled:cursor-not-allowed text-slate-900 text-sm font-bold tracking-[0.06em] uppercase px-7 py-3 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-yellow-500 focus-visible:outline-offset-2"
      >
        {questionIndex === QUESTIONS.length - 1 ? 'See Results' : 'Next'}
        <ChevronRight size={14} />
      </button>
    </div>
  </div>
);

const CopyButton = ({ url }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }).catch(() => {});
  };

  return (
    <button
      onClick={handleCopy}
      className={`flex-shrink-0 flex items-center gap-1.5 text-xs font-bold tracking-[0.08em] uppercase px-4 py-2.5 rounded-lg transition-colors ${
        copied
          ? 'bg-green-600 text-white'
          : 'bg-yellow-500 hover:bg-yellow-400 text-slate-900'
      }`}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
};

const ResultsScreen = ({ scores, onRetake }) => {
  const total = scores.reduce((a, b) => a + b, 0);
  const pct   = Math.round((total / MAX_SCORE) * 100);
  const result = RESULTS.find(r => total >= r.minScore && total <= r.maxScore) || RESULTS[RESULTS.length - 1];

  const growthCount = scores.filter(s => s === 3).length;
  const fixedCount  = scores.filter(s => s === 0).length;

  // Animate gauge on mount
  const [gaugeWidth, setGaugeWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setGaugeWidth(pct), 60);
    return () => clearTimeout(t);
  }, [pct]);

  const pageUrl = typeof window !== 'undefined' ? `${window.location.origin}/mindset-quiz` : '/mindset-quiz';

  return (
    <div className="animate-[fadeUp_0.35s_ease_both]">
      <h2 className="font-black uppercase italic tracking-tighter text-4xl md:text-6xl leading-none text-slate-900 dark:text-white mb-4">
        {result.title}
      </h2>
      <p className="text-slate-600 dark:text-slate-300 leading-relaxed max-w-[50ch] mb-10 text-[0.95rem]">
        {result.desc}
      </p>

      {/* Score gauge */}
      <div className="mb-10">
        <div className="flex justify-between items-baseline mb-2.5">
          <MilitaryLabel>Your Score</MilitaryLabel>
          <span className="font-black text-3xl text-yellow-500 tabular-nums leading-none">
            {total}<span className="text-base font-normal text-slate-400 dark:text-slate-500">&thinsp;/ {MAX_SCORE}</span>
          </span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full transition-[width] duration-[1200ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ width: `${gaugeWidth}%` }}
          />
        </div>
        {/* Segment dots */}
        <div className="flex gap-px">
          {Array.from({ length: MAX_SCORE }).map((_, i) => (
            <div
              key={i}
              className={`flex-1 h-1 rounded-sm transition-colors ${i < total ? 'bg-yellow-500' : 'bg-slate-200 dark:bg-slate-800'}`}
            />
          ))}
        </div>
      </div>

      {/* Breakdown */}
      <MilitaryLabel className="mb-4 block">Score Breakdown</MilitaryLabel>
      <div className="grid grid-cols-2 gap-3 mb-10">
        {[
          { lbl: 'Total Score',       val: `${total} / ${MAX_SCORE}`, hi: true },
          { lbl: 'Percentile',        val: `${pct}%`,                 hi: false },
          { lbl: 'Growth Responses',  val: `${growthCount} / 14`,     hi: false },
          { lbl: 'Fixed Responses',   val: `${fixedCount} / 14`,      hi: false },
        ].map(({ lbl, val, hi }) => (
          <div
            key={lbl}
            className={`bg-white dark:bg-slate-900 border rounded-xl px-4 py-3.5 ${hi ? 'border-yellow-500/30' : 'border-slate-200 dark:border-white/5'}`}
          >
            <div className="text-[0.63rem] font-bold tracking-[0.15em] uppercase text-slate-400 mb-1">{lbl}</div>
            <div className={`font-black text-xl tabular-nums ${hi ? 'text-yellow-500' : 'text-slate-900 dark:text-white'}`}>{val}</div>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200 dark:border-white/5 mb-8" />

      {/* Share */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl p-6 mb-6">
        <h3 className="font-black uppercase italic tracking-tight text-base text-slate-900 dark:text-white mb-1">
          📡 Share This Assessment
        </h3>
        <p className="text-[0.8rem] text-slate-400 mb-4">
          Send this link to your cadets or post the QR code in your classroom.
        </p>
        <div className="flex gap-2 items-center">
          <div className="flex-1 min-w-0 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-lg px-3 py-2.5 text-[0.75rem] text-slate-500 font-mono truncate">
            {pageUrl}
          </div>
          <CopyButton url={pageUrl} />
        </div>
      </div>

      <button
        onClick={onRetake}
        className="flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
      >
        <RotateCcw size={14} /> Retake Assessment
      </button>
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────

const MindsetQuiz = () => {
  usePageMeta({
    title: 'Mindset Assessment',
    description: 'Take the PBHS JROTC Mindset Readiness Self-Assessment and discover whether your thinking patterns support growth, resilience, and mission success.',
    path: '/mindset-quiz',
  });

  const [screen, setScreen]         = useState('intro'); // 'intro' | 'quiz' | 'results'
  const [currentQ, setCurrentQ]     = useState(0);
  const [selections, setSelections] = useState(() => new Array(QUESTIONS.length).fill(null));
  const [scores, setScores]         = useState(() => new Array(QUESTIONS.length).fill(null));

  // Scroll to top of quiz area on question change
  const topRef = useRef(null);
  useEffect(() => {
    if (screen === 'quiz') {
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [currentQ, screen]);

  const progress =
    screen === 'intro'   ? 0 :
    screen === 'results' ? 100 :
    Math.round((currentQ / QUESTIONS.length) * 100);

  const handleSelect = (optIndex) => {
    setSelections(prev => {
      const next = [...prev];
      next[currentQ] = optIndex;
      return next;
    });
    setScores(prev => {
      const next = [...prev];
      next[currentQ] = QUESTIONS[currentQ].options[optIndex].score;
      return next;
    });
  };

  const handleNext = () => {
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(q => q + 1);
    } else {
      setScreen('results');
    }
  };

  const handleBack = () => {
    if (currentQ > 0) setCurrentQ(q => q - 1);
  };

  const handleRetake = () => {
    setScreen('intro');
    setCurrentQ(0);
    setSelections(new Array(QUESTIONS.length).fill(null));
    setScores(new Array(QUESTIONS.length).fill(null));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">

      {/* Progress bar — fixed below navbar-level, full width */}
      <div
        className="sticky top-0 z-30 h-[3px] bg-slate-200 dark:bg-slate-800"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Quiz progress"
      >
        <div
          className="h-full bg-yellow-500 transition-[width] duration-500 ease-in-out relative"
          style={{ width: `${progress}%` }}
        >
          {progress > 0 && progress < 100 && (
            <span className="absolute -right-1 -top-1 w-[7px] h-[7px] rounded-full bg-yellow-500" />
          )}
        </div>
      </div>

      {/* Scroll anchor — scroll-mt-20 offsets the sticky navbar */}
      <div ref={topRef} className="scroll-mt-20" />

      {/* Intro — fills remaining viewport height, content centred */}
      {screen === 'intro' && (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-6 py-16">
          <div className="w-full max-w-4xl">
            <IntroScreen onStart={() => setScreen('quiz')} />
          </div>
        </div>
      )}

      {/* Quiz & results — comfortable reading width */}
      {screen !== 'intro' && (
        <div className="max-w-2xl mx-auto px-5 sm:px-8 py-12 md:py-16">
          {screen === 'quiz' && (
            <QuizScreen
              question={QUESTIONS[currentQ]}
              questionIndex={currentQ}
              selection={selections[currentQ]}
              onSelect={handleSelect}
              onNext={handleNext}
              onBack={handleBack}
              total={QUESTIONS.length}
            />
          )}
          {screen === 'results' && (
            <ResultsScreen scores={scores} onRetake={handleRetake} />
          )}
        </div>
      )}
    </div>
  );
};

export default MindsetQuiz;
