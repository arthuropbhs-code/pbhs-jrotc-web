// src/components/AnimatedNumber.jsx
//
// Spring-animated number counter. Animates from its previous value to the
// new one whenever the `value` prop changes. Drop-in replacement for a
// bare number rendered in JSX — just wrap it: <AnimatedNumber value={n} />

import { animate } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

const AnimatedNumber = ({ value, className }) => {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const to   = value;
    if (from === to) return;

    const controls = animate(from, to, {
      type: 'spring',
      stiffness: 300,
      damping: 30,
      onUpdate: (v) => setDisplay(Math.round(v)),
      onComplete: () => { prevRef.current = to; },
    });

    return () => controls.stop();
  }, [value]);

  return <span className={className}>{display}</span>;
};

export default AnimatedNumber;
