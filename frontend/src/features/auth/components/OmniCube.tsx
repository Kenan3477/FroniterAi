'use client';

import { useEffect, useRef } from 'react';

export default function OmniCube() {
  const cubeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add rotation animation
    const cube = cubeRef.current;
    if (cube) {
      cube.style.animation = 'spin 20s linear infinite';
    }
  }, []);

  return (
    <div className="perspective-1000">
      <div
        ref={cubeRef}
        className="relative w-64 h-64 transform-style-preserve-3d"
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Cube faces */}
        <div className="absolute inset-0 w-64 h-64 bg-gradient-to-br from-kennex-400 to-kennex-600 transform translate-z-32 rounded-lg shadow-lg flex items-center justify-center">
          <div className="text-white text-6xl font-bold">O</div>
        </div>
        <div className="absolute inset-0 w-64 h-64 bg-gradient-to-br from-primary-400 to-primary-600 transform rotate-y-90 translate-z-32 rounded-lg shadow-lg flex items-center justify-center">
          <div className="text-white text-6xl font-bold">M</div>
        </div>
        <div className="absolute inset-0 w-64 h-64 bg-gradient-to-br from-kennex-500 to-primary-500 transform rotate-y-180 translate-z-32 rounded-lg shadow-lg flex items-center justify-center">
          <div className="text-white text-6xl font-bold">N</div>
        </div>
        <div className="absolute inset-0 w-64 h-64 bg-gradient-to-br from-primary-400 to-kennex-400 transform rotate-y-270 translate-z-32 rounded-lg shadow-lg flex items-center justify-center">
          <div className="text-white text-6xl font-bold">I</div>
        </div>
        <div className="absolute inset-0 w-64 h-64 bg-gradient-to-br from-kennex-600 to-primary-600 transform rotate-x-90 translate-z-32 rounded-lg shadow-lg">
          {/* Top face with AI icons */}
          <div className="w-full h-full flex items-center justify-center space-x-4">
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
            </div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        <div className="absolute inset-0 w-64 h-64 bg-gradient-to-br from-primary-600 to-kennex-600 transform rotate-x-270 translate-z-32 rounded-lg shadow-lg">
          {/* Bottom face with workflow icons */}
          <div className="w-full h-full flex items-center justify-center">
            <div className="grid grid-cols-2 gap-2">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded"></div>
              <div className="w-8 h-8 bg-white bg-opacity-30 rounded"></div>
              <div className="w-8 h-8 bg-white bg-opacity-30 rounded"></div>
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded"></div>
            </div>
          </div>
        </div>

        {/* Floating icons around the cube */}
        <div className="absolute -top-8 -left-8 w-8 h-8 bg-white bg-opacity-20 rounded-lg animate-pulse"></div>
        <div className="absolute -top-4 -right-12 w-6 h-6 bg-white bg-opacity-30 rounded-lg animate-pulse delay-1000"></div>
        <div className="absolute -bottom-6 -left-12 w-10 h-10 bg-white bg-opacity-15 rounded-lg animate-pulse delay-2000"></div>
        <div className="absolute -bottom-8 -right-8 w-8 h-8 bg-white bg-opacity-25 rounded-lg animate-pulse delay-500"></div>
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
        .translate-z-32 {
          transform: translateZ(128px);
        }
        .rotate-y-90 {
          transform: rotateY(90deg) translateZ(128px);
        }
        .rotate-y-180 {
          transform: rotateY(180deg) translateZ(128px);
        }
        .rotate-y-270 {
          transform: rotateY(270deg) translateZ(128px);
        }
        .rotate-x-90 {
          transform: rotateX(90deg) translateZ(128px);
        }
        .rotate-x-270 {
          transform: rotateX(-90deg) translateZ(128px);
        }
        @keyframes spin {
          from { transform: rotateX(0deg) rotateY(0deg); }
          to { transform: rotateX(360deg) rotateY(360deg); }
        }
      `}</style>
    </div>
  );
}