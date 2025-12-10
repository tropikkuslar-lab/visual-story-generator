/**
 * Scene Card Component
 * Sahne kartı - Geli\u015fmi\u015f UI/UX ile
 */

import React, { useState, memo, useCallback } from 'react';
import {
  Wand2, Copy, Check, Image, Loader2,
  ChevronDown, ChevronUp, Sparkles, AlertCircle,
  Download, Trash2, RefreshCw, Eye, EyeOff,
  Maximize2, ZoomIn
} from 'lucide-react';
import { AnimatedCard } from './ui/AnimatedCard';
import { ProgressBar, CircularProgress } from './ui/ProgressBar';

interface Scene {
  id: string;
  title: string;
  description: string;
  objects: string[];
  mood: string;
  lighting: string;
  environment: string;
  importantDetails: string[];
  faithfulPrompt: string;
  creativePrompt: string;
  negativePrompt: string;
  resolution: { id: string; width: number; height: number };
  generatingFaithful?: boolean;
  generatingCreative?: boolean;
  faithfulImageUrl?: string;
  creativeImageUrl?: string;
  generationError?: string;
  generationProgress?: number;
}

interface SceneCardProps {
  scene: Scene;
  index: number;
  onGenerate: (sceneId: string, type: 'faithful' | 'creative') => void;
  onDelete?: (sceneId: string) => void;
  onUpdate?: (sceneId: string, updates: Partial<Scene>) => void;
  backendOnline?: boolean;
  isExpanded?: boolean;
}

export const SceneCard: React.FC<SceneCardProps> = memo(({
  scene,
  index,
  onGenerate,
  onDelete,
  onUpdate,
  backendOnline = false,
  isExpanded: initialExpanded = false
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);
  const [copiedPrompt, setCopiedPrompt] = useState<'faithful' | 'creative' | null>(null);
  const [activeTab, setActiveTab] = useState<'faithful' | 'creative'>('faithful');
  const [showFullImage, setShowFullImage] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleCopy = useCallback(async (text: string, type: 'faithful' | 'creative') => {
    await navigator.clipboard.writeText(text);
    setCopiedPrompt(type);
    setTimeout(() => setCopiedPrompt(null), 2000);
  }, []);

  const handleGenerate = useCallback((type: 'faithful' | 'creative') => {
    if (!backendOnline) return;
    onGenerate(scene.id, type);
  }, [backendOnline, onGenerate, scene.id]);

  const currentPrompt = activeTab === 'faithful' ? scene.faithfulPrompt : scene.creativePrompt;
  const currentImage = activeTab === 'faithful' ? scene.faithfulImageUrl : scene.creativeImageUrl;
  const isGenerating = activeTab === 'faithful' ? scene.generatingFaithful : scene.generatingCreative;

  return (
    <AnimatedCard
      hoverEffect="glow"
      gradient
      delay={index * 100}
      className="group"
    >
      {/* Header */}
      <div
        className="p-4 cursor-pointer select-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Scene number badge */}
            <div className="
              w-10 h-10 rounded-lg
              bg-gradient-to-br from-purple-500/20 to-cyan-500/20
              border border-purple-500/30
              flex items-center justify-center
              group-hover:border-purple-400/50 transition-colors
            ">
              <span className="text-lg font-bold text-purple-400">{index + 1}</span>
            </div>

            <div>
              <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                {scene.title}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-500">{scene.mood}</span>
                <span className="text-gray-600">\u2022</span>
                <span className="text-xs text-gray-500">{scene.lighting}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Generation status indicators */}
            {(scene.faithfulImageUrl || scene.creativeImageUrl) && (
              <div className="flex gap-1">
                {scene.faithfulImageUrl && (
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Sadık g\u00f6rsel haz\u0131r" />
                )}
                {scene.creativeImageUrl && (
                  <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse" title="Yarat\u0131c\u0131 g\u00f6rsel haz\u0131r" />
                )}
              </div>
            )}

            {/* Expand/collapse button */}
            <button className="
              p-2 rounded-lg
              text-gray-400 hover:text-white
              hover:bg-gray-700/50
              transition-all duration-200
            ">
              {isExpanded ? (
                <ChevronUp className="w-5 h-5" />
              ) : (
                <ChevronDown className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Description preview */}
        {!isExpanded && (
          <p className="mt-2 text-sm text-gray-400 line-clamp-2">
            {scene.description}
          </p>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4 animate-fadeIn">
          {/* Description */}
          <div className="p-3 rounded-lg bg-gray-900/50 border border-gray-700/50">
            <p className="text-sm text-gray-300 leading-relaxed">
              {scene.description}
            </p>
          </div>

          {/* Scene details grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <DetailChip label="Mood" value={scene.mood} icon="mood" />
            <DetailChip label="I\u015f\u0131k" value={scene.lighting} icon="lighting" />
            <DetailChip label="Ortam" value={scene.environment} icon="environment" />
            <DetailChip label="\u00c7\u00f6z\u00fcn\u00fcrl\u00fck" value={scene.resolution.id} icon="resolution" />
          </div>

          {/* Objects */}
          {scene.objects.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {scene.objects.map((obj, i) => (
                <span
                  key={i}
                  className="px-2 py-1 text-xs rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20"
                >
                  {obj}
                </span>
              ))}
            </div>
          )}

          {/* Prompt tabs */}
          <div className="flex gap-2 p-1 rounded-lg bg-gray-900/50">
            <button
              onClick={() => setActiveTab('faithful')}
              className={`
                flex-1 py-2 px-4 rounded-md text-sm font-medium
                transition-all duration-200
                ${activeTab === 'faithful'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }
              `}
            >
              <span className="flex items-center justify-center gap-2">
                <Eye className="w-4 h-4" />
                Sad\u0131k Prompt
              </span>
            </button>
            <button
              onClick={() => setActiveTab('creative')}
              className={`
                flex-1 py-2 px-4 rounded-md text-sm font-medium
                transition-all duration-200
                ${activeTab === 'creative'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }
              `}
            >
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4" />
                Yarat\u0131c\u0131 Prompt
              </span>
            </button>
          </div>

          {/* Active prompt */}
          <div className="relative group/prompt">
            <div className="
              p-4 rounded-lg
              bg-gray-900/50 border border-gray-700/50
              hover:border-gray-600/50 transition-colors
              max-h-32 overflow-y-auto
            ">
              <p className="text-sm text-gray-300 font-mono leading-relaxed">
                {currentPrompt}
              </p>
            </div>

            {/* Copy button */}
            <button
              onClick={() => handleCopy(currentPrompt, activeTab)}
              className="
                absolute top-2 right-2
                p-2 rounded-lg
                bg-gray-800/80 backdrop-blur-sm
                text-gray-400 hover:text-white
                opacity-0 group-hover/prompt:opacity-100
                transition-all duration-200
              "
            >
              {copiedPrompt === activeTab ? (
                <Check className="w-4 h-4 text-green-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Generated image */}
          {currentImage && (
            <div className="relative rounded-lg overflow-hidden group/image">
              <img
                src={currentImage}
                alt={scene.title}
                className={`
                  w-full h-auto rounded-lg
                  transition-all duration-300
                  ${imageLoading ? 'opacity-0' : 'opacity-100'}
                `}
                onLoad={() => setImageLoading(false)}
              />

              {imageLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                  <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
              )}

              {/* Image overlay actions */}
              <div className="
                absolute inset-0
                bg-gradient-to-t from-black/60 via-transparent to-transparent
                opacity-0 group-hover/image:opacity-100
                transition-opacity duration-200
                flex items-end justify-center pb-4
              ">
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowFullImage(true)}
                    className="p-2 rounded-lg bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
                  >
                    <ZoomIn className="w-5 h-5 text-white" />
                  </button>
                  <a
                    href={currentImage}
                    download
                    className="p-2 rounded-lg bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-colors"
                  >
                    <Download className="w-5 h-5 text-white" />
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Generation progress */}
          {isGenerating && (
            <div className="p-4 rounded-lg bg-gray-900/50 border border-purple-500/30">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <CircularProgress
                    progress={scene.generationProgress || 0}
                    size={48}
                    strokeWidth={3}
                  />
                  <Sparkles className="absolute inset-0 m-auto w-4 h-4 text-purple-400 animate-pulse" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">G\u00f6rsel \u00fcretiliyor...</p>
                  <p className="text-xs text-gray-400">L\u00fctfen bekleyin</p>
                </div>
              </div>
            </div>
          )}

          {/* Error message */}
          {scene.generationError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-400" />
              <p className="text-sm text-red-300">{scene.generationError}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => handleGenerate(activeTab)}
              disabled={!backendOnline || isGenerating}
              className={`
                flex-1 py-3 px-4 rounded-lg
                font-medium text-sm
                flex items-center justify-center gap-2
                transition-all duration-200
                ${backendOnline && !isGenerating
                  ? activeTab === 'faithful'
                    ? 'bg-purple-500 hover:bg-purple-400 text-white shadow-lg shadow-purple-500/25'
                    : 'bg-cyan-500 hover:bg-cyan-400 text-white shadow-lg shadow-cyan-500/25'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                }
              `}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  \u00dcretiliyor...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  G\u00f6rsel \u00dcret
                </>
              )}
            </button>

            {onDelete && (
              <button
                onClick={() => onDelete(scene.id)}
                className="
                  p-3 rounded-lg
                  bg-gray-700/50 hover:bg-red-500/20
                  text-gray-400 hover:text-red-400
                  border border-gray-600/50 hover:border-red-500/30
                  transition-all duration-200
                "
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Full image modal */}
      {showFullImage && currentImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <img
            src={currentImage}
            alt={scene.title}
            className="max-w-full max-h-full object-contain rounded-lg"
          />
          <button
            onClick={() => setShowFullImage(false)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
          >
            <EyeOff className="w-6 h-6 text-white" />
          </button>
        </div>
      )}
    </AnimatedCard>
  );
});

// Detail chip component
const DetailChip: React.FC<{
  label: string;
  value: string;
  icon?: string;
}> = ({ label, value }) => (
  <div className="p-2 rounded-lg bg-gray-900/30 border border-gray-700/30">
    <p className="text-xs text-gray-500 mb-0.5">{label}</p>
    <p className="text-sm text-gray-300 font-medium truncate">{value}</p>
  </div>
);

SceneCard.displayName = 'SceneCard';

export default SceneCard;
