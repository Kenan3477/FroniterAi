// 🚀 Animated Background Component - Created by Advanced Evolution System
// ✨ Features: Particle system, gradient animations, performance optimized

import React, { memo, useEffect, useRef, useMemo } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

interface AnimatedBackgroundProps {
  particleCount?: number;
  enableParticles?: boolean;
  enableGradient?: boolean;
  className?: string;
}

const AnimatedBackground = memo<AnimatedBackgroundProps>(({
  particleCount = 50,
  enableParticles = true,
  enableGradient = true,
  className = ''
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);

  // Memoized particle colors for performance
  const particleColors = useMemo(() => [
    'rgba(59, 130, 246, 0.1)',   // Blue
    'rgba(139, 92, 246, 0.1)',   // Purple
    'rgba(16, 185, 129, 0.1)',   // Emerald
    'rgba(245, 158, 11, 0.1)',   // Amber
    'rgba(239, 68, 68, 0.1)',    // Red
  ], []);

  // Initialize particles
  useEffect(() => {
    if (!enableParticles) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const initParticles = () => {
      const particles: Particle[] = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 3 + 1,
          opacity: Math.random() * 0.5 + 0.1,
          color: particleColors[Math.floor(Math.random() * particleColors.length)]
        });
      }
      particlesRef.current = particles;
    };

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [particleCount, enableParticles, particleColors]);

  // Animation loop
  useEffect(() => {
    if (!enableParticles) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particlesRef.current.forEach((particle, index) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off edges
        if (particle.x <= 0 || particle.x >= canvas.width) {
          particle.vx *= -1;
        }
        if (particle.y <= 0 || particle.y >= canvas.height) {
          particle.vy *= -1;
        }

        // Keep particles in bounds
        particle.x = Math.max(0, Math.min(canvas.width, particle.x));
        particle.y = Math.max(0, Math.min(canvas.height, particle.y));

        // Pulsing opacity
        particle.opacity += Math.sin(Date.now() * 0.001 + index) * 0.01;
        particle.opacity = Math.max(0.05, Math.min(0.4, particle.opacity));

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color.replace(/[\d.]+\)$/g, `${particle.opacity})`);
        ctx.fill();

        // Connect nearby particles
        particlesRef.current.forEach((otherParticle, otherIndex) => {
          if (index !== otherIndex) {
            const dx = particle.x - otherParticle.x;
            const dy = particle.y - otherParticle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < 100) {
              ctx.beginPath();
              ctx.moveTo(particle.x, particle.y);
              ctx.lineTo(otherParticle.x, otherParticle.y);
              ctx.strokeStyle = `rgba(59, 130, 246, ${0.1 * (1 - distance / 100)})`;
              ctx.lineWidth = 0.5;
              ctx.stroke();
            }
          }
        });
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [enableParticles]);

  return (
    <div className={`fixed inset-0 -z-10 overflow-hidden ${className}`}>
      {/* Animated gradient background */}
      {enableGradient && (
        <div 
          className="absolute inset-0 opacity-30 dark:opacity-20"
          style={{
            background: `
              radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.3) 0%, transparent 50%),
              radial-gradient(circle at 40% 80%, rgba(16, 185, 129, 0.2) 0%, transparent 50%),
              linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)
            `,
            animation: 'gradient-shift 20s ease infinite'
          }}
        />
      )}

      {/* Particle canvas */}
      {enableParticles && (
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          style={{ mixBlendMode: 'screen' }}
        />
      )}

      {/* CSS animations */}
      <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% {
            transform: scale(1) rotate(0deg);
            filter: hue-rotate(0deg);
          }
          25% {
            transform: scale(1.1) rotate(90deg);
            filter: hue-rotate(90deg);
          }
          50% {
            transform: scale(1) rotate(180deg);
            filter: hue-rotate(180deg);
          }
          75% {
            transform: scale(1.1) rotate(270deg);
            filter: hue-rotate(270deg);
          }
        }
      `}</style>
    </div>
  );
});

AnimatedBackground.displayName = 'AnimatedBackground';

export default AnimatedBackground;
