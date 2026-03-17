'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface OutcomesData {
  positive: number;
  neutral: number;
  negative: number;
}

interface InteractionOutcomesCardProps {
  outcomes: OutcomesData;
}

const InteractionOutcomesCard = ({ outcomes }: InteractionOutcomesCardProps) => {
  const data = [
    { name: 'Positive', value: outcomes.positive, color: '#10B981' },
    { name: 'Neutral', value: outcomes.neutral, color: '#6B7280' },
    { name: 'Negative', value: outcomes.negative, color: '#EF4444' }
  ];

  const total = outcomes.positive + outcomes.neutral + outcomes.negative;

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-sm font-medium text-gray-600 mb-4">Interaction Outcomes</h3>
      
      <div className="flex items-center justify-between">
        <div className="w-24 h-24">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={35}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        <div className="flex-1 ml-6 space-y-2">
          {data.map((item) => (
            <div key={item.name} className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
              <span className="text-sm font-medium text-gray-900">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InteractionOutcomesCard;