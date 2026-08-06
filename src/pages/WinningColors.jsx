import React, { useState } from 'react';
import { Shield, Award, HelpCircle, RefreshCw, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePageMeta } from '../hooks/usePageMeta';

const WinningColors = () => {
  usePageMeta({
    title: 'Winning Colors Assessment',
    description: 'Winning Colors personal behavioral assessment for PBHS JROTC Tornado Battalion cadets.',
    path: '/cadet-info/winning-colors',
  });
  // 5 rows of assessment questions matching your file layout
  const assessmentRows = [
    {
      A: "Being prepared",
      B: "Let's all be friends",
      C: "Developing better and more logical ways",
      D: "Living today and not worrying about tomorrow"
    },
    {
      A: "Telling people what they should do",
      B: "Talking and socializing",
      C: "Understanding and analyzing about tomorrow",
      D: "Having fun and excitement with people"
    },
    {
      A: "Saving and budgeting",
      B: "Giving",
      C: "Creating",
      D: "Spending"
    },
    {
      A: "Leading",
      B: "Relating",
      C: "Planning",
      D: "Exploring"
    },
    {
      A: "Being Organized",
      B: "Being loved and accepted",
      C: "Being correct and competent",
      D: "Being in spontaneous action"
    }
  ];

  // Initialize empty grid state for selections [rowIndex][columnKey]
  const [selections, setSelections] = useState(
    Array(5).fill(null).map(() => ({ A: '', B: '', C: '', D: '' }))
  );

  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  // Handle value change while ensuring unique numbers 1-4 per horizontal row
  const handleSelectChange = (rowIndex, colKey, value) => {
    setError('');
    const updatedRow = { ...selections[rowIndex] };

    // Check if another column in the same row already has this value chosen
    if (value !== '') {
      const valueExists = Object.entries(updatedRow).some(
        ([key, val]) => key !== colKey && val === String(value)
      );

      if (valueExists) {
        setError(`Oops! You can only use each rank (1-4) once per horizontal row.`);
        return;
      }
    }

    updatedRow[colKey] = value;
    const newSelections = [...selections];
    newSelections[rowIndex] = updatedRow;
    setSelections(newSelections);
  };

  // Calculate Column Totals dynamically
  const getColumnTotal = (colKey) => {
    return selections.reduce((sum, row) => sum + (parseInt(row[colKey]) || 0), 0);
  };

  const totals = {
    A: getColumnTotal('A'),
    B: getColumnTotal('B'),
    C: getColumnTotal('C'),
    D: getColumnTotal('D')
  };

  // Process scores and determine Primary & Backup Powers (Lowest score wins)
  const calculateScores = () => {
    // Verify all selections are completely filled out
    const isComplete = selections.every(row => Object.values(row).every(val => val !== ''));
    if (!isComplete) {
      setError("Please complete all sections of the assessment before processing results!");
      return;
    }

    const cardsData = [
      { id: 'A', title: 'Builder', color: 'Brown', hex: 'bg-amber-800', description: 'Leadership, Decisiveness, & Responsibility', element: 'Earth', score: totals.A },
      { id: 'B', title: 'Relater', color: 'Blue', hex: 'bg-blue-600', description: 'Openness, Feeling, Socializing, & Teamwork', element: 'Air', score: totals.B },
      { id: 'C', title: 'Planner', color: 'Green', hex: 'bg-emerald-600', description: 'Deep Thinking, Logical Systems, & Reality Check', element: 'Water', score: totals.C },
      { id: 'D', title: 'Adventurer', color: 'Red', hex: 'bg-red-600', description: 'Excitement, Spontaneous Action, & Innovation', element: 'Fire', score: totals.D }
    ];

    // Sort ascending: Lowest absolute score determines the dominant style priority
    const sorted = [...cardsData].sort((a, b) => a.score - b.score);

    setResults({
      primary: sorted[0],
      secondary: sorted[1],
      allCards: cardsData
    });

    // Smooth scroll down to reveal results
    setTimeout(() => {
      document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  const resetForm = () => {
    setSelections(Array(5).fill(null).map(() => ({ A: '', B: '', C: '', D: '' })));
    setResults(null);
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white p-6 md:p-12 pt-48 font-sans transition-colors duration-300">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER SECTION */}
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-[2.5rem] p-8 md:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none mb-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
            <Award size={120} className="text-slate-900 dark:text-white" />
          </div>
          <h2 className="text-[10px] font-black text-yellow-600 dark:text-yellow-500 uppercase tracking-[0.4em] mb-2 flex items-center gap-2">
            <Shield size={14} /> Personal Growth & Behaviors
          </h2>
          <h1 className="text-3xl md:text-5xl font-black uppercase italic tracking-tighter text-slate-900 dark:text-white">
            Winning Colors® Assessment
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-4 font-medium max-w-2xl leading-relaxed">
            Exercise #1: Discover your present communication behavioral strengths. Rank the traits horizontally across each row from <strong className="text-yellow-600 dark:text-yellow-500">1 (Most Important)</strong> to <strong className="text-slate-400">4 (Least Important)</strong>.
          </p>
        </div>

        {/* ERROR BOX */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl text-sm text-red-600 dark:text-red-400 font-bold">
            ⚠️ {error}
          </div>
        )}

        {/* QUIZ MATRIX */}
        <div className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-white/5">
                  <th className="p-5 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">A (BUILDER)</th>
                  <th className="p-5 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">B (RELATER)</th>
                  <th className="p-5 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">C (PLANNER)</th>
                  <th className="p-5 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">D (ADVENTURER)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {assessmentRows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-slate-50/50 dark:hover:bg-black/10 transition-colors">
                    {['A', 'B', 'C', 'D'].map((colKey) => (
                      <td key={colKey} className="p-5 min-w-[220px] vertical-top">
                        <div className="flex flex-col h-full justify-between gap-4">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed italic">
                            "{row[colKey]}"
                          </p>
                          <select
                            value={selections[rowIndex][colKey]}
                            onChange={(e) => handleSelectChange(rowIndex, colKey, e.target.value)}
                            className="w-full mt-auto p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-950 text-xs font-bold focus:outline-none focus:border-yellow-500 transition-all text-slate-900 dark:text-white"
                          >
                            <option value="">Select Rank...</option>
                            <option value="1">1 - Most Important</option>
                            <option value="2">2 - Very Important</option>
                            <option value="3">3 - Somewhat Important</option>
                            <option value="4">4 - Least Important</option>
                          </select>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
                
                {/* COLUMN TOTALS FOOTER ROW */}
                <tr className="bg-slate-100/60 dark:bg-black/30 font-black border-t-2 border-slate-200 dark:border-white/10">
                  {['A', 'B', 'C', 'D'].map((colKey) => (
                    <td key={colKey} className="p-6 text-sm">
                      <span className="text-[10px] uppercase text-slate-400 dark:text-slate-500 tracking-wider block mb-1">Column {colKey} Total</span>
                      <span className="text-xl italic font-black text-yellow-600 dark:text-yellow-500">{totals[colKey]}</span>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* ACTIONS */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <button
            onClick={calculateScores}
            className="w-full sm:w-auto px-8 py-4 bg-yellow-500 text-slate-950 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-yellow-400 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-yellow-500/10 flex items-center justify-center gap-2"
          >
            <HelpCircle size={16} /> Compute Profile
          </button>
          <button
            onClick={resetForm}
            className="w-full sm:w-auto px-8 py-4 bg-slate-200 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw size={14} /> Clear Matrix
          </button>
        </div>

        {/* RESULTS SECTION */}
        <AnimatePresence>
          {results && (
            <motion.div
              id="results-section"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="space-y-6 pt-4 border-t border-slate-200 dark:border-white/5"
            >
              <h4 className="text-xl font-black uppercase italic tracking-tight text-slate-900 dark:text-white mb-6">
                Your Behavior Power Debrief
              </h4>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {results.allCards.map((card) => {
                  const isPrimary = results.primary.id === card.id;
                  const isSecondary = results.secondary.id === card.id;

                  return (
                    <div 
                      key={card.id}
                      className={`relative rounded-[2rem] p-6 border transition-all duration-300 ${card.hex} text-white shadow-xl flex flex-col justify-between min-h-[260px] ${
                        isPrimary ? 'ring-4 ring-yellow-500 ring-offset-4 dark:ring-offset-slate-950 scale-[1.03] z-10' : 'opacity-80 dark:opacity-60'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-widest bg-black/20 px-2.5 py-1 rounded-md">
                              Element: {card.element}
                            </span>
                            <h5 className="text-2xl font-black uppercase italic tracking-tight mt-2">{card.title}</h5>
                            <p className="text-xs font-bold text-white/80 mt-0.5">Color Base: {card.color}</p>
                          </div>
                          <span className="text-3xl font-black italic bg-white/20 px-3 py-1 rounded-2xl">
                            {card.score}
                          </span>
                        </div>
                        <p className="text-xs font-medium leading-relaxed bg-black/10 p-3 rounded-xl border border-white/5 italic">
                          "{card.description}"
                        </p>
                      </div>

                      {/* Power badging based on lowest calculated total logic */}
                      <div className="mt-6 pt-4 border-t border-white/10">
                        {isPrimary && (
                          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-yellow-500 text-slate-950 py-1.5 px-3 rounded-xl w-full justify-center shadow-lg">
                            <Star size={12} fill="currentColor" /> Present Color
                          </span>
                        )}
                        {isSecondary && (
                          <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider bg-slate-300 text-slate-950 py-1.5 px-3 rounded-xl w-full justify-center">
                            Backup Color
                          </span>
                        )}
                        {!isPrimary && !isSecondary && (
                          <span className="text-[9px] font-black uppercase tracking-widest text-center block text-white/40">
                            Supporting Ability
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default WinningColors;