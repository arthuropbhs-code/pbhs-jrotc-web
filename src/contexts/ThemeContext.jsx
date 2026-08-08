import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({ theme: 'system', isDark: false, toggleTheme: () => {}, setTheme: () => {} });

export const useThemeContext = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => localStorage.getItem('theme') || 'dark');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches);
      root.classList.toggle('dark', dark);
      setIsDark(dark);
    };

    apply();
    localStorage.setItem('theme', theme);

    if (theme === 'system') {
      mq.addEventListener('change', apply);
      return () => mq.removeEventListener('change', apply);
    }
  }, [theme]);

  const setTheme = (t) => setThemeState(t);
  // Toggle based on the COMPUTED result (dark class on <html>), not the stored
  // string — otherwise toggling from 'system' (the initial default) when the
  // system is already dark would flip to 'dark' with no visible change.
  const toggleTheme = () => setThemeState(document.documentElement.classList.contains('dark') ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};
