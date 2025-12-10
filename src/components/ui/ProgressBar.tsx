/**
 * Advanced Progress Bar Component
 * Animasyonlu ilerleme \u00e7ubu\u011fu
 */

import React, { useEffect, useState } from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  variant?: 'default' | 'gradient' | 'striped' | 'glow';
  size?: 'sm' | 'md' | 'lg';
  color?: 'purple' | 'blue' | 'green' | 'yellow' | 'red' | 'rainbow';
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  indeterminate?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  variant = 'default',
  size = 'md',
  color = 'purple',
  showLabel = false,
  label,
  animated = true,
  indeterminate = false
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);

  // Smooth animation
  useEffect(() => {
    if (indeterminate) return;

    const duration = 500;
    const steps = 20;
    const stepDuration = duration / steps;
    const increment = (progress - displayProgress) / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      setDisplayProgress(prev => {
        const next = prev + increment;
        if (currentStep >= steps) {
          clearInterval(timer);
          return progress;
        }
        return next;
      });
    }, stepDuration);

    return () => clearInterval(timer);
  }, [progress]);

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const colorClasses = {
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
    rainbow: 'bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500'
  };

  const glowColors = {
    purple: 'shadow-purple-500/50',
    blue: 'shadow-blue-500/50',
    green: 'shadow-green-500/50',
    yellow: 'shadow-yellow-500/50',
    red: 'shadow-red-500/50',
    rainbow: 'shadow-purple-500/50'
  };

  const getBarStyles = () => {
    const baseClasses = `
      ${sizeClasses[size]}
      rounded-full
      transition-all duration-300 ease-out
    `;

    switch (variant) {
      case 'gradient':
        return `${baseClasses} bg-gradient-to-r from-purple-600 via-purple-500 to-cyan-400`;
      case 'striped':
        return `
          ${baseClasses}
          ${colorClasses[color]}
          bg-[length:1rem_1rem]
          bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)]
          ${animated ? 'animate-[progress-stripes_1s_linear_infinite]' : ''}
        `;
      case 'glow':
        return `${baseClasses} ${colorClasses[color]} shadow-lg ${glowColors[color]}`;
      default:
        return `${baseClasses} ${colorClasses[color]}`;
    }
  };

  return (
    <div className="w-full">
      {/* Label */}
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-400">{label || 'Progress'}</span>
          {showLabel && !indeterminate && (
            <span className="text-sm font-medium text-white">
              {Math.round(displayProgress)}%
            </span>
          )}
        </div>
      )}

      {/* Progress track */}
      <div className={`
        w-full ${sizeClasses[size]} rounded-full
        bg-gray-700/50 overflow-hidden
        backdrop-blur-sm
      `}>
        {indeterminate ? (
          /* Indeterminate animation */
          <div className={`
            h-full w-1/3 rounded-full
            ${colorClasses[color]}
            animate-[indeterminate_1.5s_ease-in-out_infinite]
          `} />
        ) : (
          /* Normal progress */
          <div
            className={getBarStyles()}
            style={{ width: `${displayProgress}%` }}
          >
            {/* Shimmer effect */}
            {animated && variant !== 'striped' && (
              <div className="absolute inset-0 overflow-hidden rounded-full">
                <div className="
                  absolute inset-0
                  bg-gradient-to-r from-transparent via-white/20 to-transparent
                  -translate-x-full
                  animate-[shimmer_2s_infinite]
                " />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Multi-step progress
interface StepProgressProps {
  steps: string[];
  currentStep: number;
  variant?: 'dots' | 'numbers' | 'icons';
}

export const StepProgress: React.FC<StepProgressProps> = ({
  steps,
  currentStep,
  variant = 'dots'
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            {/* Step indicator */}
            <div className="flex flex-col items-center">
              <div className={`
                w-8 h-8 rounded-full flex items-center justify-center
                transition-all duration-300
                ${index < currentStep
                  ? 'bg-purple-500 text-white'
                  : index === currentStep
                  ? 'bg-purple-500/20 border-2 border-purple-500 text-purple-400'
                  : 'bg-gray-700 text-gray-500'
                }
              `}>
                {variant === 'numbers' && (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
                {variant === 'dots' && (
                  <div className={`
                    w-2 h-2 rounded-full
                    ${index <= currentStep ? 'bg-white' : 'bg-gray-500'}
                  `} />
                )}
              </div>
              <span className={`
                mt-2 text-xs
                ${index <= currentStep ? 'text-gray-300' : 'text-gray-500'}
              `}>
                {step}
              </span>
            </div>

            {/* Connector line */}
            {index < steps.length - 1 && (
              <div className={`
                flex-1 h-0.5 mx-2
                transition-all duration-300
                ${index < currentStep ? 'bg-purple-500' : 'bg-gray-700'}
              `} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// Circular progress
interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  showLabel?: boolean;
  color?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 60,
  strokeWidth = 4,
  showLabel = true,
  color = '#A855F7'
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {showLabel && (
        <span className="absolute text-sm font-medium text-white">
          {Math.round(progress)}%
        </span>
      )}
    </div>
  );
};

export default ProgressBar;
