import React from 'react';
import { motion } from 'framer-motion';

const Uniform = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-20 px-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }}
        className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-xl"
      >
        <h1 className="text-4xl font-bold text-slate-900 border-b-4 border-yellow-500 inline-block mb-8">
          Uniform Regulations
        </h1>
        
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-yellow-700">Male Standards</h2>
            <ul className="list-disc ml-5 space-y-2 text-slate-700">
              <li>Hair: Neat appearance, not touching ears or collar.</li>
              <li>Shaving: Face must be clean-shaven.</li>
              <li>Gigline: Belt, shirt, and fly must be perfectly aligned.</li>
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-yellow-700">Female Standards</h2>
            <ul className="list-disc ml-5 space-y-2 text-slate-700">
              <li>Hair: Must not fall below the bottom edge of the collar.</li>
              <li>Jewelry: One pair of gold, silver, or pearl studs allowed.</li>
              <li>Cosmetics: Must be conservative and professional.</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Uniform;