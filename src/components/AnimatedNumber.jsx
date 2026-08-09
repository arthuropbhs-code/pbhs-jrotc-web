// src/components/AnimatedNumber.jsx
//
// Number counter powered by anime.js (v4).
// Counts from 0 to `value` when it first scrolls into view, then animates
// between the old and new value on subsequent prop changes (e.g. live stat
// updates from Firestore).  Uses outExpo easing — snappier and cleaner than
// a spring for integers.

import { useEffect, useRef } from 'react';
import { useInView } from 'framer-motion';
import { animate } from 'animejs';

const AnimatedNumber = ({ value, className, duration = 1200 }) => {
  const ref       = useRef(null);
  const inView    = useInView(ref, { once: true });
  const animRef   = useRef(null);
  const currentVal = useRef(0);

  useEffect(() => {
    if (!inView || !ref.current) return;

    const from = currentVal.current;
    if (from === value) return;

    // Pause any in-progress animation before starting a new one.
    if (animRef.current) animRef.current.pause();

    // Animate a plain proxy object — anime.js interpolates its `n` property
    // each frame so we can write the rounded integer to the DOM ourselves,
    // avoiding any innerHTML / modifier API differences across v4 builds.
    const proxy = { n: from };

    animRef.current = animate(proxy, {
      n: value,
      duration,
      ease: 'outExpo',
      onUpdate: () => {
        currentVal.current = Math.round(proxy.n);
        if (ref.current) ref.current.textContent = currentVal.current;
      },
      onComplete: () => {
        currentVal.current = value;
        if (ref.current) ref.current.textContent = value;
      },
    });

    return () => {
      if (animRef.current) animRef.current.pause();
    };
  }, [inView, value, duration]);

  return <span ref={ref} className={className}>0</span>;
};

export default AnimatedNumber;
