/**
 * useMobileDetection Hook
 * Detects mobile devices and viewport changes
 */

'use client';

import { useState, useEffect } from 'react';

export const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 });
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const checkDevice = () => {
      if (typeof window !== 'undefined') {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        setScreenSize({ width, height });
        setIsMobile(width <= 768);
        setIsTablet(width > 768 && width <= 1024);
        setOrientation(width > height ? 'landscape' : 'portrait');
      }
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);

    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  const isTouch = () => {
    return typeof window !== 'undefined' && 'ontouchstart' in window;
  };

  return {
    isMobile,
    isTablet,
    isDesktop: !isMobile && !isTablet,
    screenSize,
    orientation,
    isTouch: isTouch(),
    deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
  };
};