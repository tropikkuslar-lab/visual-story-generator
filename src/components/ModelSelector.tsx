/**
 * Model Selector Component
 * AI model se\u00e7imi - SD 1.5, 2.1, SDXL
 */

import React, { useState, useEffect } from 'react';
import { Cpu, Zap, Star, Check, Loader2, AlertTriangle, Info } from 'lucide-react';
import { AnimatedCard } from './ui/AnimatedCard';

interface Model {
  id: string;
  name: string;
  description: string;
  minVram: number;
  quality: 'standard' | 'high' | 'ultra';
  speed: 'fast' | 'medium' | 'slow';
  available: boolean;
  recommended?: boolean;
  features: string[];
  license: string;
}

const MODELS: Model[] = [
  {
    id: 'sd15',
    name: 'Stable Diffusion 1.5',
    description: 'Klasik model, geni\u015f uyumluluk',
    minVram: 4,
    quality: 'standard',
    speed: 'fast',
    available: true,
    features: ['D\u00fc\u015f\u00fck VRAM', 'H\u0131zl\u0131 \u00fcretim', 'Geni\u015f model deste\u011fi'],
    license: 'CreativeML Open RAIL-M'
  },
  {
    id: 'sd21',
    name: 'Stable Diffusion 2.1',
    description: 'Geli\u015fmi\u015f kalite ve detay',
    minVram: 6,
    quality: 'high',
    speed: 'medium',
    available: true,
    features: ['Daha iyi detaylar', 'Geli\u015fmi\u015f y\u00fczler', 'Daha az artifacts'],
    license: 'CreativeML Open RAIL-M'
  },
  {
    id: 'sdxl',
    name: 'SDXL 1.0',
    description: 'En y\u00fcksek kalite, 1024px native',
    minVram: 8,
    quality: 'ultra',
    speed: 'medium',
    available: true,
    recommended: true,
    features: ['1024px native', 'En iyi kalite', 'Refiner deste\u011fi'],
    license: 'Stability AI License'
  },
  {
    id: 'sdxl_turbo',
    name: 'SDXL Turbo',
    description: 'Ultra h\u0131zl\u0131, 4 ad\u0131mda \u00fcretim',
    minVram: 8,
    quality: 'high',
    speed: 'fast',
    available: true,
    features: ['4 ad\u0131m', 'Real-time', 'Anl\u0131k \u00f6nizleme'],
    license: 'Stability AI License'
  },
  {
    id: 'sdxl_lightning',
    name: 'SDXL Lightning',
    description: 'ByteDance, \u00e7ok h\u0131zl\u0131',
    minVram: 8,
    quality: 'high',
    speed: 'fast',
    available: true,
    features: ['4 ad\u0131m', 'SDXL kalitesi', 'LoRA tabanl\u0131'],
    license: 'Apache 2.0'
  }
];

interface ModelSelectorProps {
  selectedModel: string;
  onSelect: (modelId: string) => void;
  vramAvailable?: number;
  isLoading?: boolean;
  currentlyLoaded?: string;
  onLoad?: (modelId: string) => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  onSelect,
  vramAvailable = 8,
  isLoading = false,
  currentlyLoaded,
  onLoad
}) => {
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'ultra': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
      case 'high': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30';
      default: return 'text-green-400 bg-green-500/10 border-green-500/30';
    }
  };

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case 'fast': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      default: return 'text-red-400';
    }
  };

  const isModelAvailable = (model: Model) => {
    return vramAvailable >= model.minVram;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white">AI Model Se\u00e7imi</h3>
          <p className="text-sm text-gray-400">Kullanmak istedi\u011finiz modeli se\u00e7in</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/50">
          <Cpu className="w-4 h-4 text-purple-400" />
          <span className="text-sm text-gray-300">{vramAvailable}GB VRAM</span>
        </div>
      </div>

      {/* Model grid */}
      <div className="grid gap-3">
        {MODELS.map((model, index) => {
          const available = isModelAvailable(model);
          const isSelected = selectedModel === model.id;
          const isLoaded = currentlyLoaded === model.id;
          const isExpanded = expandedModel === model.id;

          return (
            <AnimatedCard
              key={model.id}
              delay={index * 50}
              hoverEffect={available ? 'glow' : 'none'}
              onClick={() => available && onSelect(model.id)}
              className={`
                relative overflow-hidden
                ${isSelected ? 'ring-2 ring-purple-500 ring-offset-2 ring-offset-gray-900' : ''}
                ${!available ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {/* Selection indicator */}
                    <div className={`
                      w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5
                      flex items-center justify-center
                      transition-all duration-200
                      ${isSelected
                        ? 'border-purple-500 bg-purple-500'
                        : 'border-gray-600 hover:border-gray-500'
                      }
                    `}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-white">{model.name}</h4>
                        {model.recommended && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            \u00d6nerilen
                          </span>
                        )}
                        {isLoaded && (
                          <span className="px-1.5 py-0.5 text-xs rounded bg-green-500/20 text-green-300 border border-green-500/30 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Y\u00fckl\u00fc
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 mt-0.5">{model.description}</p>

                      {/* Quick stats */}
                      <div className="flex items-center gap-4 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getQualityColor(model.quality)}`}>
                          {model.quality === 'ultra' ? 'Ultra' : model.quality === 'high' ? 'Y\u00fcksek' : 'Standart'}
                        </span>
                        <span className={`text-xs flex items-center gap-1 ${getSpeedColor(model.speed)}`}>
                          <Zap className="w-3 h-3" />
                          {model.speed === 'fast' ? 'H\u0131zl\u0131' : model.speed === 'medium' ? 'Orta' : 'Yava\u015f'}
                        </span>
                        <span className="text-xs text-gray-500">
                          Min {model.minVram}GB VRAM
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expand button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedModel(isExpanded ? null : model.id);
                    }}
                    className="p-1.5 rounded-lg hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-700/50 animate-fadeIn">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-xs font-medium text-gray-400 mb-2">\u00d6zellikler</h5>
                        <ul className="space-y-1">
                          {model.features.map((feature, i) => (
                            <li key={i} className="text-sm text-gray-300 flex items-center gap-2">
                              <Star className="w-3 h-3 text-purple-400" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h5 className="text-xs font-medium text-gray-400 mb-2">Lisans</h5>
                        <p className="text-sm text-gray-300">{model.license}</p>
                        <p className="text-xs text-green-400 mt-1">\u2713 Ticari kullan\u0131ma uygun</p>
                      </div>
                    </div>

                    {/* Load button */}
                    {onLoad && isSelected && !isLoaded && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLoad(model.id);
                        }}
                        disabled={isLoading}
                        className="
                          mt-4 w-full py-2 px-4 rounded-lg
                          bg-purple-500 hover:bg-purple-400
                          text-white font-medium text-sm
                          flex items-center justify-center gap-2
                          transition-colors
                          disabled:opacity-50 disabled:cursor-not-allowed
                        "
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Model Y\u00fckleniyor...
                          </>
                        ) : (
                          <>
                            <Zap className="w-4 h-4" />
                            Modeli Y\u00fckle
                          </>
                        )}
                      </button>
                    )}
                  </div>
                )}

                {/* Unavailable overlay */}
                {!available && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
                    <div className="text-center">
                      <AlertTriangle className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-300">Yetersiz VRAM</p>
                      <p className="text-xs text-gray-500">Min {model.minVram}GB gerekli</p>
                    </div>
                  </div>
                )}
              </div>
            </AnimatedCard>
          );
        })}
      </div>

      {/* Info box */}
      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-300 font-medium">Model Hakk\u0131nda</p>
            <p className="text-xs text-gray-400 mt-1">
              T\u00fcm modeller \u00fccretsiz, s\u0131n\u0131rs\u0131z ve ticari kullan\u0131ma uygundur.
              Daha y\u00fcksek kaliteli modeller daha fazla VRAM ve i\u015flem s\u00fcresi gerektirir.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelSelector;
