import React, { useState } from 'react';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const LABELS = {
  1: 'Cok Kotu',
  2: 'Kotu',
  3: 'Orta',
  4: 'Iyi',
  5: 'Mukemmel'
};

export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  disabled = false,
  size = 'md',
  showLabel = true
}) => {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue ?? value;

  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-7 w-7',
    lg: 'h-9 w-9'
  };

  const getStarColor = (index: number) => {
    if (index <= displayValue) {
      if (displayValue <= 2) return 'text-red-400';
      if (displayValue === 3) return 'text-yellow-400';
      return 'text-green-400';
    }
    return 'text-gray-300 dark:text-gray-600';
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(star)}
            onMouseEnter={() => !disabled && setHoverValue(star)}
            onMouseLeave={() => setHoverValue(null)}
            className={`
              ${sizeClasses[size]}
              transition-all duration-150
              ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:scale-110'}
              ${getStarColor(star)}
            `}
          >
            <svg
              fill={star <= displayValue ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
              />
            </svg>
          </button>
        ))}
      </div>

      {showLabel && displayValue > 0 && (
        <span className={`
          text-sm font-medium
          ${displayValue <= 2 ? 'text-red-500' : displayValue === 3 ? 'text-yellow-500' : 'text-green-500'}
        `}>
          {LABELS[displayValue as keyof typeof LABELS]}
        </span>
      )}

      {showLabel && value <= 3 && value > 0 && (
        <p className="text-xs text-red-500 mt-1">
          Dusuk puan verdiniz. Lutfen nedenini belirtin.
        </p>
      )}
    </div>
  );
};

export default StarRating;
