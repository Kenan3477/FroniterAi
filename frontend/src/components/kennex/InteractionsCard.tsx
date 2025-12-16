'use client';

import React from 'react';

interface InteractionsCardProps {
  count: number;
  changePercent: number;
  sparklineData?: number[];
}

const InteractionsCard = ({ count, changePercent, sparklineData = [] }: InteractionsCardProps) => {
  const isPositive = changePercent >= 0;

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Interactions</h3>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-bold text-gray-900">{count.toLocaleString()}</span>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              isPositive 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {isPositive ? '+' : ''}{changePercent}%
            </span>
          </div>
          <span className="text-xs text-gray-500">Today</span>
        </div>
        
        {/* Mini sparkline chart */}
        <div className="flex items-end space-x-1">
          {[4, 8, 6, 10, 7, 12, 9, 15].map((height, index) => (
            <div
              key={index}
              className="bg-blue-200 rounded-t"
              style={{ width: '3px', height: `${height}px` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default InteractionsCard;