import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'blue' | 'neon' | 'pink';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  themes: Array<{ id: Theme; name: string; description: string }>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const THEME_OPTIONS: Array<{ id: Theme; name: string; description: string }> = [
  { id: 'light', name: 'Light', description: 'Clean and bright interface' },
  { id: 'dark', name: 'Dark', description: 'Easy on the eyes in low light' },
  { id: 'blue', name: 'Blue', description: 'Professional blue accent theme' },
  { id: 'neon', name: 'Neon', description: 'High-contrast cyberpunk aesthetic' },
  { id: 'pink', name: 'Pink', description: 'Modern gradient pink theme' }
];

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('light');

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('omnivox_theme') as Theme;
    if (savedTheme && THEME_OPTIONS.some(t => t.id === savedTheme)) {
      setThemeState(savedTheme);
      applyTheme(savedTheme);
    } else {
      // Default to dark theme for professional look
      setThemeState('dark');
      applyTheme('dark');
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('omnivox_theme', newTheme);
    applyTheme(newTheme);
    
    console.log(`🎨 Theme changed to: ${newTheme}`);
  };

  const applyTheme = (selectedTheme: Theme) => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('theme-light', 'theme-dark', 'theme-blue', 'theme-neon', 'theme-pink');
    
    // Add the selected theme class
    root.classList.add(`theme-${selectedTheme}`);
    
    // Set CSS custom properties based on theme
    switch (selectedTheme) {
      case 'light':
        root.style.setProperty('--theme-primary', '59 130 246'); // blue-500
        root.style.setProperty('--theme-secondary', '148 163 184'); // slate-400
        root.style.setProperty('--theme-accent', '34 197 94'); // green-500
        root.style.setProperty('--theme-bg', '255 255 255'); // white
        root.style.setProperty('--theme-surface', '248 250 252'); // slate-50
        break;
      case 'dark':
        root.style.setProperty('--theme-primary', '99 102 241'); // indigo-500
        root.style.setProperty('--theme-secondary', '148 163 184'); // slate-400
        root.style.setProperty('--theme-accent', '34 197 94'); // green-500
        root.style.setProperty('--theme-bg', '15 23 42'); // slate-900
        root.style.setProperty('--theme-surface', '30 41 59'); // slate-800
        break;
      case 'blue':
        root.style.setProperty('--theme-primary', '37 99 235'); // blue-600
        root.style.setProperty('--theme-secondary', '59 130 246'); // blue-500
        root.style.setProperty('--theme-accent', '14 165 233'); // sky-500
        root.style.setProperty('--theme-bg', '239 246 255'); // blue-50
        root.style.setProperty('--theme-surface', '219 234 254'); // blue-100
        break;
      case 'neon':
        root.style.setProperty('--theme-primary', '20 184 166'); // teal-500
        root.style.setProperty('--theme-secondary', '6 182 212'); // cyan-500
        root.style.setProperty('--theme-accent', '34 197 94'); // green-500
        root.style.setProperty('--theme-bg', '3 7 18'); // slate-950
        root.style.setProperty('--theme-surface', '15 23 42'); // slate-900
        break;
      case 'pink':
        root.style.setProperty('--theme-primary', '236 72 153'); // pink-500
        root.style.setProperty('--theme-secondary', '251 113 133'); // rose-400
        root.style.setProperty('--theme-accent', '168 85 247'); // purple-500
        root.style.setProperty('--theme-bg', '253 244 255'); // purple-50
        root.style.setProperty('--theme-surface', '250 232 255'); // purple-100
        break;
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEME_OPTIONS }}>
      {children}
    </ThemeContext.Provider>
  );
};