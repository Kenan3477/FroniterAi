import React, { useState } from 'react';
import { useTheme, Theme } from '../../contexts/ThemeContext';

const ThemeSelector: React.FC = () => {
  const { theme, setTheme, themes } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  const getThemeIcon = (themeId: Theme) => {
    switch (themeId) {
      case 'light': return '☀️';
      case 'dark': return '🌙';
      case 'blue': return '💙';
      case 'neon': return '⚡';
      case 'pink': return '💖';
      default: return '🎨';
    }
  };

  const getThemePreview = (themeId: Theme) => {
    switch (themeId) {
      case 'light':
        return 'bg-gradient-to-r from-white to-slate-100 border-slate-200';
      case 'dark':
        return 'bg-gradient-to-r from-slate-900 to-slate-800 border-slate-700';
      case 'blue':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 border-blue-400';
      case 'neon':
        return 'bg-gradient-to-r from-teal-500 to-cyan-500 border-teal-400';
      case 'pink':
        return 'bg-gradient-to-r from-pink-500 to-purple-500 border-pink-400';
      default:
        return 'bg-gradient-to-r from-gray-400 to-gray-500 border-gray-300';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        aria-label="Change theme"
      >
        <span className="text-lg">{getThemeIcon(theme)}</span>
        <span className="hidden sm:inline">Theme</span>
        <svg 
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Theme Dropdown */}
          <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-20">
            <div className="p-4">
              <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-3">
                Choose Theme
              </h3>
              
              <div className="space-y-2">
                {themes.map((themeOption: { id: Theme; name: string; description: string }) => (
                  <button
                    key={themeOption.id}
                    onClick={() => handleThemeChange(themeOption.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-all duration-200 ${
                      theme === themeOption.id
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-700 border-2 border-transparent'
                    }`}
                  >
                    {/* Theme Preview */}
                    <div className={`w-8 h-8 rounded-full ${getThemePreview(themeOption.id)} flex items-center justify-center`}>
                      <span className="text-white text-sm">{getThemeIcon(themeOption.id)}</span>
                    </div>
                    
                    {/* Theme Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          {themeOption.name}
                        </span>
                        {theme === themeOption.id && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full" />
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {themeOption.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Theme preferences are saved automatically
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ThemeSelector;