// src/components/ScrambleText.jsx
//
// Scrambles characters randomly before settling on the real text — the same
// effect as Motion+ <ScrambleText />, built entirely on free framer-motion.
//
// Props:
//   text      — the string to display
//   trigger   — 'inView'  fires once when the element scrolls into view (default)
//               'hover'   rescrambles on every mouseenter
//               'mount'   fires once immediately on mount
//   speed     — ms between scramble frames (default 30)
//   className — forwarded to the wrapping <span>

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

const ScrambleText = ({ text, trigger = 'inView', speed = 30, className }) => {
  const ref        = useRef(null);
  const inView     = useInView(ref, { once: true });
  const [display, setDisplay] = useState(text);
  const frameRef   = useRef(null);
  const iterRef    = useRef(0);

  const scramble = () => {
    clearInterval(frameRef.current);
    iterRef.current = 0;
    frameRef.current = setInterval(() => {
      iterRef.current += 0.6;
      const iter = Math.floor(iterRef.current);
      setDisplay(
        text
          .split('')
          .map((char, i) => {
            if (char === ' ') return ' ';
            if (i < iter) return char;
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join('')
      );
      if (iter >= text.length) {
        clearInterval(frameRef.current);
        setDisplay(text);
      }
    }, speed);
  };

  // mount: fire once on first render only (empty-dep effect)
  useEffect(() => {
    if (trigger !== 'mount') return;
    scramble();
    return () => clearInterval(frameRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // inView: fire once when element enters the viewport
  useEffect(() => {
    if (trigger !== 'inView') return;
    if (inView) {
      scramble();
      return () => clearInterval(frameRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return (
    <span
      ref={ref}
      className={className}
      onMouseEnter={trigger === 'hover' ? scramble : undefined}
      style={trigger === 'hover' ? { cursor: 'default' } : undefined}
    >
      {display}
    </span>
  );
};

export default ScrambleText;
