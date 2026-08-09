// src/components/SmoothInput.jsx
//
// Drop-in <input> replacement with a spring-animated caret.
// Inspired by Skiper106 — dialkit removed, spring config hardcoded,
// converted from TypeScript to JSX. framer-motion is already installed.

import React, { useEffect, useRef, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

// Firefox uses a filled-circle glyph; every other browser uses a bullet.
const PASSWORD_CHAR =
  typeof navigator !== 'undefined' && navigator.userAgent.match(/firefox|fxios/i)
    ? '●'
    : '•';

const SPRING         = { stiffness: 500, damping: 30, mass: 0.5 };
const REDUCED_SPRING = { stiffness: 10_000, damping: 100, mass: 0.1 };

const SmoothInput = React.forwardRef(function SmoothInput(
  { className, style, value, defaultValue, onChange, onBlur, onFocus, onClick, onKeyUp, type = 'text', ...props },
  forwardedRef
) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const caretX       = useMotionValue(0);
  const caretOpacity = useMotionValue(0);
  const containerRef = useRef(null);
  const inputRef     = useRef(null);
  const measureRef   = useRef(null);
  const prefersReducedMotion = useReducedMotion();

  // Merge forwarded ref with internal ref
  const setRef = (node) => {
    inputRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  const isControlled = value !== undefined;
  const inputValue   = isControlled ? String(value ?? '') : internalValue;
  const springCaretX = useSpring(caretX, prefersReducedMotion ? REDUCED_SPRING : SPRING);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const syncMeasureSpan = () => {
    const input = inputRef.current;
    const span  = measureRef.current;
    if (!input || !span) return;
    const s = window.getComputedStyle(input);
    const isPass = input.type === 'password';
    let fontSize = s.fontSize;
    // Bullet glyph in non-Chrome browsers is slightly smaller; nudge it.
    if (PASSWORD_CHAR === '•' && isPass && !navigator.userAgent.match(/chrome|chromium|crios/i)) {
      fontSize = `${parseFloat(fontSize) + 6.25}px`;
    }
    span.style.font          = `${s.fontStyle} ${s.fontWeight} ${fontSize} ${s.fontFamily}`;
    span.style.letterSpacing = s.letterSpacing;
    span.style.textTransform = s.textTransform;
    span.style.wordSpacing   = s.wordSpacing;
  };

  // Measure the pixel width of an arbitrary string using the hidden span,
  // after syncing its font/spacing properties to match the input.
  const measureText = (text) => {
    const span = measureRef.current;
    if (!span) return 0;
    syncMeasureSpan();
    span.textContent = text;
    return span.offsetWidth;
  };

  // Compute the absolute X position of the cursor (in input-content coordinates,
  // i.e. not scrolled) for the text that precedes the cursor. Handles left-,
  // center-, and right-aligned inputs so the caret floats with the text.
  const computeAbsX = (target, prefix) => {
    const s         = window.getComputedStyle(target);
    const pl        = parseFloat(s.paddingLeft)  || 0;
    const pr        = parseFloat(s.paddingRight) || 0;
    const textAlign = s.textAlign;
    const prefixPx  = prefix.length > 0 ? measureText(prefix) : 0;

    if (textAlign === 'center') {
      // Text is centered in the content area (between the paddings). We need
      // the full-value width to find where the text block starts, then offset
      // by how much of it sits before the cursor.
      const isPass   = target.type === 'password';
      const fullText = isPass ? PASSWORD_CHAR.repeat(target.value.length) : target.value;
      const totalPx  = measureText(fullText);
      const contentW = target.clientWidth - pl - pr;
      const leftEdge = pl + Math.max(0, (contentW - totalPx) / 2);
      return prefix.length > 0 ? leftEdge + prefixPx : leftEdge - 1;
    }

    if (textAlign === 'right' || textAlign === 'end') {
      const isPass   = target.type === 'password';
      const fullText = isPass ? PASSWORD_CHAR.repeat(target.value.length) : target.value;
      const totalPx  = measureText(fullText);
      const leftEdge = target.clientWidth - pr - totalPx;
      return prefix.length > 0 ? leftEdge + prefixPx : leftEdge - 1;
    }

    // Default: left-aligned.
    return prefix.length > 0 ? prefixPx + pl : pl - 1;
  };

  const scrollCaretIntoView = (target, absX) => {
    const s     = window.getComputedStyle(target);
    const pl    = parseFloat(s.paddingLeft)  || 0;
    const pr    = parseFloat(s.paddingRight) || 0;
    const max   = Math.max(0, target.scrollWidth - target.clientWidth);
    const right = target.scrollLeft + target.clientWidth - pr;
    const left  = target.scrollLeft + pl;
    if (absX > right) target.scrollLeft = Math.min(absX - target.clientWidth + pr, max);
    else if (absX < left) target.scrollLeft = Math.max(0, absX - pl);
  };

  const updateCaret = (target) => {
    // email / number / date etc. return null for selectionStart — those types
    // don't allow cursor positioning mid-value, so the caret is always at the end.
    const supportsSelection = target.selectionStart !== null;
    const ss  = supportsSelection ? target.selectionStart : target.value.length;
    const se  = supportsSelection ? target.selectionEnd   : target.value.length;
    const sel = ss !== se;
    const idx = ss === se ? ss : (target.selectionDirection === 'backward' ? ss : se);
    const isPass = target.type === 'password';
    const prefix = isPass ? PASSWORD_CHAR.repeat(idx) : target.value.slice(0, idx);
    const absX   = computeAbsX(target, prefix);
    scrollCaretIntoView(target, absX);
    const s   = window.getComputedStyle(target);
    const pl  = parseFloat(s.paddingLeft)  || 0;
    const pr  = parseFloat(s.paddingRight) || 0;
    const x   = absX - target.scrollLeft;
    const min = pl - 1;
    const max = target.clientWidth - pr;
    caretX.set(Math.min(x, max));
    caretOpacity.set(!sel && x >= min && x <= max + 1 ? 1 : 0);
  };

  // Keep refs stable so event-listener closures always call latest version
  const updateCaretRef    = useRef(updateCaret);
  updateCaretRef.current  = updateCaret;
  const caretOpacityRef   = useRef(caretOpacity);
  caretOpacityRef.current = caretOpacity;

  // Re-sync caret when value changes
  useEffect(() => {
    const input = inputRef.current;
    if (input && document.activeElement === input) updateCaretRef.current(input);
  }, [inputValue]);

  // Set up persistent event listeners once
  useEffect(() => {
    const input     = inputRef.current;
    const container = containerRef.current;
    if (!input || !container) return;

    const ifFocused = () => {
      if (document.activeElement === input) updateCaretRef.current(input);
    };
    const onSel = () => {
      if (document.activeElement !== input) return;
      requestAnimationFrame(() => {
        if (document.activeElement === input) updateCaretRef.current(input);
      });
    };

    document.addEventListener('selectionchange', onSel);
    document.fonts?.addEventListener('loadingdone', ifFocused);
    document.fonts?.ready.then(ifFocused);
    input.addEventListener('scroll', ifFocused);

    const ro = new ResizeObserver(ifFocused);
    ro.observe(container);

    return () => {
      document.removeEventListener('selectionchange', onSel);
      document.fonts?.removeEventListener('loadingdone', ifFocused);
      input.removeEventListener('scroll', ifFocused);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        {...props}
        ref={setRef}
        type={type}
        className={className}
        style={{ ...style, caretColor: 'transparent' }}
        value={inputValue}
        onChange={(e) => {
          if (!isControlled) setInternalValue(e.target.value);
          onChange?.(e);
          requestAnimationFrame(() => updateCaretRef.current(e.target));
        }}
        onFocus={(e) => {
          requestAnimationFrame(() => updateCaretRef.current(e.target));
          onFocus?.(e);
        }}
        onBlur={(e) => {
          caretOpacityRef.current.set(0);
          onBlur?.(e);
        }}
        onClick={(e) => {
          updateCaretRef.current(e.currentTarget);
          onClick?.(e);
        }}
        onKeyUp={(e) => {
          updateCaretRef.current(e.currentTarget);
          onKeyUp?.(e);
        }}
      />
      {/* Hidden measure span — computes pixel width of text prefix */}
      <span
        ref={measureRef}
        aria-hidden
        className="pointer-events-none invisible absolute top-0 left-0 whitespace-pre"
      />
      {/* Spring-animated caret overlay */}
      <div className="pointer-events-none absolute inset-0 flex items-center overflow-hidden" aria-hidden>
        <motion.div
          className="w-0.5 rounded-sm bg-yellow-500 shrink-0"
          style={{ x: springCaretX, opacity: caretOpacity, height: '0.9em' }}
        />
      </div>
    </div>
  );
});

export default SmoothInput;
