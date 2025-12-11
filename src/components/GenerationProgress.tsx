import React from 'react';

interface GenerationProgressProps {
  progress: number;  // 0-100
  message: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  onCancel?: () => void;
  canCancel?: boolean;
}

export const GenerationProgress: React.FC<GenerationProgressProps> = ({
  progress,
  message,
  status,
  onCancel,
  canCancel = true
}) => {
  const isActive = status === 'pending' || status === 'processing';

  // Durum renklerini belirle
  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  const getStatusBgColor = () => {
    switch (status) {
      case 'completed': return 'bg-green-100 dark:bg-green-900/30';
      case 'failed': return 'bg-red-100 dark:bg-red-900/30';
      case 'cancelled': return 'bg-yellow-100 dark:bg-yellow-900/30';
      default: return 'bg-blue-100 dark:bg-blue-900/30';
    }
  };

  return (
    <div className={`rounded-lg p-4 ${getStatusBgColor()}`}>
      {/* Progress Bar */}
      <div className="relative h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
        <div
          className={`absolute h-full transition-all duration-300 ${getStatusColor()} ${isActive ? 'animate-pulse' : ''}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Status Info */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Spinner for active status */}
          {isActive && (
            <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}

          {/* Check icon for completed */}
          {status === 'completed' && (
            <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}

          {/* X icon for failed/cancelled */}
          {(status === 'failed' || status === 'cancelled') && (
            <svg className="h-4 w-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}

          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {message}
          </span>
          <span className="text-sm text-gray-500">
            {progress}%
          </span>
        </div>

        {/* Cancel Button */}
        {isActive && canCancel && onCancel && (
          <button
            onClick={onCancel}
            className="px-3 py-1 text-sm bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors flex items-center gap-1"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Durdur
          </button>
        )}
      </div>

      {/* Warning for cancellation */}
      {isActive && canCancel && (
        <p className="text-xs text-gray-500 mt-2">
          Durdurursanız resmi değerlendiremezsiniz.
        </p>
      )}
    </div>
  );
};

export default GenerationProgress;
