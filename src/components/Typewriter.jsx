// src/components/Typewriter.jsx
//
// Types characters one-by-one with a blinking cursor — the same effect as
// Motion+ <Typewriter />, built entirely on free framer-motion.
//
// Props:
//   text      — the string to type
//   speed     — ms per character (default 50)
//   delay     — ms to wait before starting (default 0)
//   cursor    — show blinking cursor (default true)
//   className — forwarded to the wrapping <span>

import { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

const Typewriter = ({ text, speed = 50, delay = 0, cursor = true, className }) => {
  const ref  = useRef(null);
  const inView = useInView(ref, { once: true });
  const [displayed, setDisplayed] = useState('');
  const [done, setDone]     = useState(false);

  useEffect(() => {
    if (!inView) return;

    let i = 0;
    setDisplayed('');
    setDone(false);

    const start = () => {
      const timer = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(timer);
          setDone(true);
        }
      }, speed);
      return timer;
    };

    let timer;
    const delayTimer = delay > 0
      ? setTimeout(() => { timer = start(); }, delay)
      : (() => { timer = start(); return null; })();

    return () => {
      clearTimeout(delayTimer);
      clearInterval(timer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);

  return (
    <span ref={ref} className={className}>
      {displayed}
      {cursor && (
        <span
          className={`ml-0.5 inline-block w-[2px] h-[0.9em] bg-current align-middle transition-opacity duration-300 ${
            done ? 'animate-pulse opacity-50' : 'opacity-100'
          }`}
        />
      )}
    </span>
  );
};

export default Typewriter;
