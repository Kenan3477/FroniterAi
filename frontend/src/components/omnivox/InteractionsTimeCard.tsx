'use client';

import React from 'react';

interface InteractionsTimeCardProps {
  totalSeconds: number;
}

const InteractionsTimeCard = ({ totalSeconds }: InteractionsTimeCardProps) => {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  // Generate a simple line chart using CSS
  const points = [20, 35, 25, 45, 30, 60, 40, 55, 35, 50];

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-sm font-medium text-gray-600 mb-4">Interactions Time</h3>
      
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold text-gray-900">{formatTime(totalSeconds)}</div>
        </div>
        
        {/* Simple line chart using SVG */}
        <div className="w-32 h-16">
          <svg width="100%" height="100%" viewBox="0 0 120 60">
            <polyline
              fill="none"
              stroke="#3B82F6"
              strokeWidth="2"
              points={points.map((point, index) => `${index * 12},${60 - point}`).join(' ')}
            />
            <circle cx={points.length * 12 - 12} cy={60 - points[points.length - 1]} r="3" fill="#3B82F6" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default InteractionsTimeCard;