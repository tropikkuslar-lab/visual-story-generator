import React, { useState, useEffect } from 'react';
import { getLowScoreReasons } from '../api';
import type { LowScoreReason } from '../types';

interface LowScoreModalProps {
  isOpen: boolean;
  score: number;
  onSubmit: (reasons: string[], details: string) => void;
  onClose: () => void;
}

export const LowScoreModal: React.FC<LowScoreModalProps> = ({
  isOpen,
  score,
  onSubmit,
  onClose
}) => {
  const [reasons, setReasons] = useState<LowScoreReason[]>([]);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadReasons();
    }
  }, [isOpen]);

  const loadReasons = async () => {
    setLoading(true);
    const data = await getLowScoreReasons();
    if (data) {
      setReasons(data.reasons);
    }
    setLoading(false);
  };

  const toggleReason = (id: string) => {
    setSelectedReasons(prev =>
      prev.includes(id)
        ? prev.filter(r => r !== id)
        : [...prev, id]
    );
  };

  const handleSubmit = () => {
    if (selectedReasons.length === 0) {
      alert('Lutfen en az bir neden secin.');
      return;
    }
    onSubmit(selectedReasons, details);
    setSelectedReasons([]);
    setDetails('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-red-500 text-white px-6 py-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Dusuk Puan: {score}/5
          </h3>
          <p className="text-sm text-red-100 mt-1">
            Geri bildiriminiz iyilestirmeler icin onemli!
          </p>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <svg className="animate-spin h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Neden dusuk puan verdiniz? (Birden fazla secebilirsiniz)
              </p>

              <div className="space-y-2">
                {reasons.map((reason) => (
                  <label
                    key={reason.id}
                    className={`
                      flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                      ${selectedReasons.includes(reason.id)
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <input
                      type="checkbox"
                      checked={selectedReasons.includes(reason.id)}
                      onChange={() => toggleReason(reason.id)}
                      className="h-4 w-4 text-red-500 rounded focus:ring-red-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {reason.tr}
                    </span>
                  </label>
                ))}
              </div>

              {/* Details textarea - show if "other" is selected or always */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Detayli aciklama (istege bagli)
                </label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Sorunu detayli aciklayabilirsiniz..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                           focus:ring-2 focus:ring-red-500 focus:border-transparent
                           placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            Iptal
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedReasons.length === 0}
            className={`
              px-4 py-2 text-sm text-white rounded-lg transition-colors
              ${selectedReasons.length > 0
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-gray-400 cursor-not-allowed'
              }
            `}
          >
            Gonder
          </button>
        </div>
      </div>
    </div>
  );
};

export default LowScoreModal;
