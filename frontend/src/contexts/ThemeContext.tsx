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
      // Default to light theme for cleaner, user-friendly experience
      setThemeState('light');
      applyTheme('light');
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
    
    // Set data-theme attribute for CSS targeting
    root.setAttribute('data-theme', selectedTheme);
    
    console.log(`🎨 Applied theme: ${selectedTheme} to document element`);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEME_OPTIONS }}>
      {children}
    </ThemeContext.Provider>
  );
};