/**
 * Animated Card Component
 * Geli\u015fmi\u015f animasyon ve hover efektleri
 */

import React, { useState, useRef, useEffect } from 'react';

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  hoverEffect?: 'lift' | 'glow' | 'scale' | 'tilt' | 'none';
  clickEffect?: 'ripple' | 'pulse' | 'none';
  gradient?: boolean;
  animated?: boolean;
  delay?: number;
  onClick?: () => void;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  children,
  className = '',
  hoverEffect = 'lift',
  clickEffect = 'ripple',
  gradient = false,
  animated = true,
  delay = 0,
  onClick
}) => {
  const [isVisible, setIsVisible] = useState(!animated);
  const [ripple, setRipple] = useState<{ x: number; y: number } | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for entrance animation
  useEffect(() => {
    if (!animated) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => setIsVisible(true), delay);
          }
        });
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [animated, delay]);

  // Handle click ripple
  const handleClick = (e: React.MouseEvent) => {
    if (clickEffect === 'ripple' && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setRipple({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setTimeout(() => setRipple(null), 600);
    }
    onClick?.();
  };

  // Handle mouse move for tilt effect
  const handleMouseMove = (e: React.MouseEvent) => {
    if (hoverEffect !== 'tilt' || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0.5, y: 0.5 });
  };

  // Generate hover classes
  const getHoverClasses = () => {
    switch (hoverEffect) {
      case 'lift':
        return 'hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/10';
      case 'glow':
        return 'hover:shadow-lg hover:shadow-purple-500/30 hover:border-purple-500/50';
      case 'scale':
        return 'hover:scale-[1.02]';
      case 'tilt':
        return '';
      default:
        return '';
    }
  };

  // Calculate tilt transform
  const getTiltStyle = () => {
    if (hoverEffect !== 'tilt') return {};
    const rotateX = (mousePos.y - 0.5) * -10;
    const rotateY = (mousePos.x - 0.5) * 10;
    return {
      transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      transition: 'transform 0.1s ease-out'
    };
  };

  return (
    <div
      ref={cardRef}
      onClick={handleClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`
        relative overflow-hidden rounded-xl
        bg-gray-800/50 backdrop-blur-sm border border-gray-700/50
        transition-all duration-300 ease-out
        ${getHoverClasses()}
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={getTiltStyle()}
    >
      {/* Gradient overlay */}
      {gradient && (
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
      )}

      {/* Ripple effect */}
      {ripple && (
        <span
          className="absolute bg-white/20 rounded-full animate-ping pointer-events-none"
          style={{
            left: ripple.x - 50,
            top: ripple.y - 50,
            width: 100,
            height: 100,
            animationDuration: '0.6s'
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>

      {/* Shine effect on hover */}
      {hoverEffect !== 'none' && (
        <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000" />
        </div>
      )}
    </div>
  );
};

export default AnimatedCard;
