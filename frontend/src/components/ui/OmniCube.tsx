'use client';

import React, { useEffect, useRef } from 'react';
import { 
  PhoneIcon,
  ChatBubbleLeftIcon,
  ChartBarIcon,
  UsersIcon,
  CogIcon,
  BellIcon
} from '@heroicons/react/24/outline';

export default function OmniCube() {
  const cubeRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cube = cubeRef.current;
    const orbit = orbitRef.current;
    
    if (!cube || !orbit) return;

    let rotationX = 0;
    let rotationY = 0;
    let orbitRotation = 0;

    const animate = () => {
      rotationX += 0.5;
      rotationY += 0.7;
      orbitRotation += 0.3;

      cube.style.transform = `
        perspective(1000px) 
        rotateX(${rotationX}deg) 
        rotateY(${rotationY}deg)
        rotateZ(${rotationX * 0.5}deg)
      `;

      orbit.style.transform = `rotateZ(${orbitRotation}deg)`;

      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  const CubeFace = ({ children, className }: { children: React.ReactNode; className: string }) => (
    <div className={`absolute w-28 h-28 ${className} flex items-center justify-center`}>
      {children}
    </div>
  );

  const FloatingIcon = ({ icon: Icon, className, delay }: { 
    icon: any; 
    className: string; 
    delay: number;
  }) => (
    <div 
      className={`absolute ${className}`}
      style={{
        animation: `float 6s ease-in-out infinite ${delay}s, pulse 4s ease-in-out infinite ${delay * 0.5}s`,
      }}
    >
      <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 shadow-2xl">
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  );

  return (
    <div className="relative w-80 h-80 flex items-center justify-center">
      {/* Background geometric patterns */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating geometric shapes */}
        <div className="absolute top-16 left-8 w-4 h-4 border border-white/20 transform rotate-45 animate-pulse"></div>
        <div className="absolute bottom-20 right-12 w-6 h-6 border border-white/15 transform rotate-12 animate-bounce"></div>
        <div className="absolute top-32 right-16 w-3 h-3 bg-white/20 transform rotate-45 animate-ping"></div>
        <div className="absolute bottom-32 left-20 w-8 h-8 border border-white/10 transform rotate-45"></div>
      </div>

      {/* Orbiting elements */}
      <div ref={orbitRef} className="absolute w-64 h-64">
        <FloatingIcon 
          icon={PhoneIcon} 
          className="top-2 left-1/2 transform -translate-x-1/2"
          delay={0}
        />
        <FloatingIcon 
          icon={ChatBubbleLeftIcon} 
          className="top-1/2 right-2 transform -translate-y-1/2"
          delay={1}
        />
        <FloatingIcon 
          icon={ChartBarIcon} 
          className="bottom-2 left-1/2 transform -translate-x-1/2"
          delay={2}
        />
        <FloatingIcon 
          icon={UsersIcon} 
          className="top-1/2 left-2 transform -translate-y-1/2"
          delay={3}
        />
        <FloatingIcon 
          icon={CogIcon} 
          className="top-8 right-8"
          delay={4}
        />
        <FloatingIcon 
          icon={BellIcon} 
          className="bottom-8 left-8"
          delay={5}
        />
      </div>

      {/* Main 3D Cube - Slightly Smaller */}
      <div 
        ref={cubeRef}
        className="preserve-3d relative w-28 h-28"
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Front Face */}
        <CubeFace className="bg-gradient-to-br from-white/25 to-white/15 backdrop-blur-sm border border-white/40 rounded-2xl shadow-2xl translate-z-16">
          <div className="text-3xl font-bold text-white">O</div>
        </CubeFace>

        {/* Back Face */}
        <CubeFace className="bg-gradient-to-br from-slate-400/30 to-slate-600/20 backdrop-blur-sm border border-white/30 rounded-2xl shadow-2xl rotate-y-180">
          <PhoneIcon className="w-10 h-10 text-white" />
        </CubeFace>

        {/* Right Face */}
        <CubeFace className="bg-gradient-to-br from-blue-400/30 to-blue-600/20 backdrop-blur-sm border border-white/30 rounded-2xl shadow-2xl rotate-y-90">
          <ChatBubbleLeftIcon className="w-10 h-10 text-white" />
        </CubeFace>

        {/* Left Face */}
        <CubeFace className="bg-gradient-to-br from-blue-400/30 to-blue-600/20 backdrop-blur-sm border border-white/30 rounded-2xl shadow-2xl rotate-y-[-90deg]">
          <ChartBarIcon className="w-10 h-10 text-white" />
        </CubeFace>

        {/* Top Face */}
        <CubeFace className="bg-gradient-to-br from-purple-400/30 to-purple-600/20 backdrop-blur-sm border border-white/30 rounded-2xl shadow-2xl rotate-x-90">
          <UsersIcon className="w-10 h-10 text-white" />
        </CubeFace>

        {/* Bottom Face */}
        <CubeFace className="bg-gradient-to-br from-pink-400/30 to-pink-600/20 backdrop-blur-sm border border-white/30 rounded-2xl shadow-2xl rotate-x-[-90deg]">
          <CogIcon className="w-10 h-10 text-white" />
        </CubeFace>
      </div>

      {/* Central glow effect */}
      <div className="absolute w-32 h-32 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
      
      {/* Particle effects */}
      <div className="absolute inset-0">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-white/40 rounded-full animate-ping"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${20 + Math.random() * 60}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      <style jsx>{`
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .translate-z-16 {
          transform: translateZ(64px);
        }
        .rotate-y-180 {
          transform: rotateY(180deg) translateZ(64px);
        }
        .rotate-y-90 {
          transform: rotateY(90deg) translateZ(64px);
        }
        .rotate-y-[-90deg] {
          transform: rotateY(-90deg) translateZ(64px);
        }
        .rotate-x-90 {
          transform: rotateX(90deg) translateZ(64px);
        }
        .rotate-x-[-90deg] {
          transform: rotateX(-90deg) translateZ(64px);
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) scale(1); }
          25% { transform: translateY(-10px) scale(1.05); }
          50% { transform: translateY(-5px) scale(1.1); }
          75% { transform: translateY(-15px) scale(1.05); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.6; box-shadow: 0 0 20px rgba(255,255,255,0.3); }
          50% { opacity: 1; box-shadow: 0 0 40px rgba(255,255,255,0.6); }
        }
      `}</style>
    </div>
  );
}