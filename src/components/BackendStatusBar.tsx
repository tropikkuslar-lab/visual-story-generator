import { Wifi, WifiOff, Cpu, Zap, Loader2, RefreshCw } from 'lucide-react';
import type { BackendStatus } from '../types';

interface BackendStatusBarProps {
  status: BackendStatus | null;
  checking: boolean;
  onRefresh: () => void;
  onLoadModel: () => void;
}

export function BackendStatusBar({
  status,
  checking,
  onRefresh,
  onLoadModel
}: BackendStatusBarProps) {
  const isOnline = status?.online ?? false;
  const isModelLoaded = status?.model.loaded ?? false;
  const isModelLoading = status?.model.loading ?? false;

  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {checking ? (
              <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
            ) : isOnline ? (
              <Wifi className="w-4 h-4 text-green-400" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-sm ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
              {checking ? 'Kontrol ediliyor...' : isOnline ? 'Bağlı' : 'Bağlantı yok'}
            </span>
          </div>

          {/* Device Info */}
          {isOnline && status?.device && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <Cpu className="w-4 h-4" />
              <span>{status.device.gpu_info || status.device.device}</span>
              {status.device.vram_gb > 0 && (
                <span className="text-xs">({status.device.vram_gb.toFixed(1)} GB)</span>
              )}
            </div>
          )}

          {/* Model Status */}
          {isOnline && (
            <div className="flex items-center gap-2">
              {isModelLoading ? (
                <>
                  <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />
                  <span className="text-sm text-yellow-400">Model yükleniyor...</span>
                </>
              ) : isModelLoaded ? (
                <>
                  <Zap className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-400">Model hazır</span>
                </>
              ) : (
                <button
                  onClick={onLoadModel}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors"
                >
                  Modeli Yükle
                </button>
              )}
            </div>
          )}

          {/* Queue Info */}
          {isOnline && status?.queue && status.queue.queue_size > 0 && (
            <div className="text-sm text-gray-400">
              Kuyruk: {status.queue.pending} bekliyor, {status.queue.processing} işleniyor
            </div>
          )}
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={checking}
          className="p-1 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
          title="Durumu yenile"
        >
          <RefreshCw className={`w-4 h-4 ${checking ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}
