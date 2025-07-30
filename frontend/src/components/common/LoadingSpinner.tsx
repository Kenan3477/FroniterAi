// 🚀 Loading Spinner Component - Created by Advanced Evolution System
// ✨ Features: Multiple sizes, smooth animations, accessibility support

import React, { memo } from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'accent';
  className?: string;
  label?: string;
}

const LoadingSpinner = memo<LoadingSpinnerProps>(({ 
  size = 'medium', 
  color = 'primary',
  className = '',
  label = 'Loading...'
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'text-blue-600 dark:text-blue-400',
    secondary: 'text-purple-600 dark:text-purple-400',
    accent: 'text-emerald-600 dark:text-emerald-400'
  };

  const containerSizeClasses = {
    small: 'p-2',
    medium: 'p-4',
    large: 'p-6'
  };

  return (
    <div 
      className={`flex flex-col items-center justify-center ${containerSizeClasses[size]} ${className}`}
      role="status"
      aria-label={label}
    >
      {/* Main spinner */}
      <div className="relative">
        {/* Outer ring */}
        <div 
          className={`${sizeClasses[size]} border-4 border-gray-200 dark:border-gray-700 rounded-full animate-spin`}
          style={{
            borderTopColor: 'transparent',
            borderRightColor: 'transparent',
            animation: 'spin 1s linear infinite'
          }}
        />
        
        {/* Inner spinning dot */}
        <div 
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${
            size === 'small' ? 'w-1 h-1' : size === 'medium' ? 'w-2 h-2' : 'w-3 h-3'
          } ${colorClasses[color]} rounded-full animate-pulse`}
        />
      </div>
      
      {/* Advanced gradient spinner (for large size) */}
      {size === 'large' && (
        <div className="absolute">
          <div 
            className="w-12 h-12 rounded-full animate-spin"
            style={{
              background: `conic-gradient(from 0deg, transparent, ${
                color === 'primary' ? '#3b82f6' : 
                color === 'secondary' ? '#8b5cf6' : '#10b981'
              })`,
              animation: 'spin 1.5s linear infinite reverse'
            }}
          />
        </div>
      )}
      
      {/* Loading text */}
      <div className={`mt-3 text-center ${
        size === 'small' ? 'text-xs' : size === 'medium' ? 'text-sm' : 'text-base'
      } font-medium ${colorClasses[color]} animate-pulse`}>
        {label}
      </div>
      
      {/* Accessibility text */}
      <span className="sr-only">{label}</span>
      
      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

export default LoadingSpinner;
