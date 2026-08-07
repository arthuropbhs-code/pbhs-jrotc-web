import React from 'react';
import { motion } from 'framer-motion';

/**
 * Fades + slides a section in as it scrolls into view. `once: true` means it
 * animates a single time on first entry, never again on scroll-up/down -
 * both for a calmer feel (re-triggering on every pass reads as gimmicky
 * fast) and to avoid the exact class of layout-shift bug fixed earlier in
 * Home.jsx's hero: opacity/transform here don't affect layout either way,
 * but a scroll-triggered, once-only reveal is squarely a response to user
 * input, unlike a timer-driven animation, so it doesn't carry that risk.
 */
const Reveal = ({ children, delay = 0, y = 24, className = '' }) => (
  <motion.div
    initial={{ opacity: 0, y }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-80px' }}
    transition={{ duration: 0.6, delay, ease: 'easeOut' }}
    className={className}
  >
    {children}
  </motion.div>
);

export default Reveal;
