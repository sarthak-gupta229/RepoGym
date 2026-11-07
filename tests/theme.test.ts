import { describe, it, expect, beforeEach } from 'vitest';

describe('Theme State and Preferences', () => {
  let mockStorage: Record<string, string> = {};
  let classList: Set<string> = new Set();

  beforeEach(() => {
    mockStorage = {};
    classList = new Set(['dark']);
  });

  const getTheme = () => mockStorage['repogym_theme'] || (classList.has('light') ? 'light' : 'dark');

  const setTheme = (next: 'dark' | 'light') => {
    mockStorage['repogym_theme'] = next;
    if (next === 'light') {
      classList.delete('dark');
      classList.add('light');
    } else {
      classList.delete('light');
      classList.add('dark');
    }
  };

  it('defaults to dark mode when no preference is saved', () => {
    expect(mockStorage['repogym_theme']).toBeUndefined();
    expect(getTheme()).toBe('dark');
  });

  it('saves light theme preference to storage and updates theme class', () => {
    setTheme('light');
    expect(mockStorage['repogym_theme']).toBe('light');
    expect(classList.has('light')).toBe(true);
    expect(classList.has('dark')).toBe(false);
    expect(getTheme()).toBe('light');
  });

  it('switches back to dark theme cleanly', () => {
    setTheme('light');
    setTheme('dark');
    expect(mockStorage['repogym_theme']).toBe('dark');
    expect(classList.has('dark')).toBe(true);
    expect(classList.has('light')).toBe(false);
    expect(getTheme()).toBe('dark');
  });
});
