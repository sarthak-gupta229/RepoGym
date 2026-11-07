'use client';

import React, { useEffect, useState } from 'react';

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = '', showLabel = true }: ThemeToggleProps) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('repogym_theme');
    const isLight = savedTheme === 'light' || document.documentElement.classList.contains('light');
    const initial = isLight ? 'light' : 'dark';
    setTheme(initial);
    applyTheme(initial);

    const handleThemeEvent = () => {
      const active = localStorage.getItem('repogym_theme') === 'light' ? 'light' : 'dark';
      setTheme(active);
    };

    window.addEventListener('repogym-theme-change', handleThemeEvent);
    return () => window.removeEventListener('repogym-theme-change', handleThemeEvent);
  }, []);

  const applyTheme = (newTheme: 'dark' | 'light') => {
    if (newTheme === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('repogym_theme', nextTheme);
    applyTheme(nextTheme);
    window.dispatchEvent(new Event('repogym-theme-change'));
  };

  if (!mounted) {
    return (
      <div className={`w-16 h-6 bg-[#171717] border border-[#262626] animate-pulse ${className}`} />
    );
  }

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`px-2.5 py-1 flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold tracking-wider border transition-all cursor-pointer ${
        theme === 'light'
          ? 'bg-[#ffffff] text-[#111827] border-[#d1d5db] hover:bg-[#f3f4f6] shadow-xs'
          : 'bg-[#171717] text-[#EDEDED] border-[#333333] hover:border-[#EDEDED] hover:bg-[#222222]'
      } ${className}`}
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} mode`}
      aria-label="Toggle Theme"
    >
      <span className="text-xs select-none">{theme === 'dark' ? '🌙' : '☀️'}</span>
      {showLabel && <span>{theme === 'dark' ? 'Dark' : 'Light'}</span>}
    </button>
  );
}
