/**
 * Loading Spinner Component
 * Animasyonlu y\u00fckleme g\u00f6stergeleri
 */

import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'dots' | 'pulse' | 'bars' | 'ring';
  color?: string;
  text?: string;
  fullScreen?: boolean;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'spinner',
  color = 'purple',
  text,
  fullScreen = false
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const colorClasses = {
    purple: 'border-purple-500',
    blue: 'border-blue-500',
    green: 'border-green-500',
    red: 'border-red-500',
    white: 'border-white'
  };

  const Spinner = () => (
    <div className={`${sizeClasses[size]} border-4 ${colorClasses[color as keyof typeof colorClasses] || colorClasses.purple} border-t-transparent rounded-full animate-spin`} />
  );

  const Dots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${size === 'sm' ? 'w-2 h-2' : size === 'md' ? 'w-3 h-3' : 'w-4 h-4'} bg-purple-500 rounded-full animate-bounce`}
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );

  const Pulse = () => (
    <div className="relative">
      <div className={`${sizeClasses[size]} bg-purple-500/30 rounded-full animate-ping absolute`} />
      <div className={`${sizeClasses[size]} bg-purple-500 rounded-full relative`} />
    </div>
  );

  const Bars = () => (
    <div className="flex items-end space-x-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`${size === 'sm' ? 'w-1' : 'w-1.5'} bg-purple-500 rounded-t animate-pulse`}
          style={{
            height: `${(i % 3 + 1) * (size === 'sm' ? 8 : 12)}px`,
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.8s'
          }}
        />
      ))}
    </div>
  );

  const Ring = () => (
    <div className={`${sizeClasses[size]} relative`}>
      <div className="absolute inset-0 border-4 border-purple-200 rounded-full" />
      <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const spinnerComponents = {
    spinner: Spinner,
    dots: Dots,
    pulse: Pulse,
    bars: Bars,
    ring: Ring
  };

  const SpinnerComponent = spinnerComponents[variant];

  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <SpinnerComponent />
      {text && (
        <p className={`text-gray-400 ${size === 'sm' ? 'text-xs' : 'text-sm'} animate-pulse`}>
          {text}
        </p>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;
