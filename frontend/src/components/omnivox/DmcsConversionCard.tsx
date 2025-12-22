'use client';

import React from 'react';

interface DmcsConversionCardProps {
  dmcs: number;
  conversionRate: number;
}

const DmcsConversionCard = ({ dmcs, conversionRate }: DmcsConversionCardProps) => {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">DMC's</h3>
          <div className="text-3xl font-bold text-gray-900">{dmcs.toLocaleString()}</div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Conversion</h3>
          <div className="text-3xl font-bold text-gray-900">{conversionRate}%</div>
        </div>
      </div>
    </div>
  );
};

export default DmcsConversionCard;