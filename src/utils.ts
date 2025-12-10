import { RESOLUTIONS, ASPECT_RATIOS, CONTENT_WARNING_KEYWORDS } from './constants';

/**
 * Calculate resolution for a given format
 */
export function calculateResolutionForFormat(
  baseResolution: string,
  format: string
): { width: number; height: number } {
  const baseRes = RESOLUTIONS.find(r => r.id === baseResolution) || RESOLUTIONS[3];
  const baseHeight = baseRes.height;
  const ratio = ASPECT_RATIOS[format] || 16/9;

  const width = Math.round(baseHeight * ratio);
  return { width, height: baseHeight };
}

/**
 * Check for content warnings in text
 */
export function checkContentWarnings(text: string): string | null {
  const lowerText = text.toLowerCase();
  const found = CONTENT_WARNING_KEYWORDS.filter(kw => lowerText.includes(kw));

  if (found.length > 0) {
    return `Dikkat: İçerik uyarısı - "${found.join(', ')}" içeren metin tespit edildi.`;
  }
  return null;
}

/**
 * Split text into scenes
 */
export function splitIntoScenes(text: string): string[] {
  const trimmedText = text.trim();
  if (!trimmedText) return [];

  // Scene splitting patterns
  const scenePatterns = [
    /(?:^|\n)(?:sahne|bölüm|kısım|chapter|scene)\s*[:\-]?\s*\d*/gi,
    /\n---+\n/g,
    /\n\*\*\*+\n/g,
    /(?:^|\n)#{1,3}\s+/g,
  ];

  let scenes: string[] = [trimmedText];

  for (const pattern of scenePatterns) {
    const newScenes: string[] = [];
    for (const scene of scenes) {
      const parts = scene.split(pattern).filter(p => p.trim());
      newScenes.push(...parts);
    }
    if (newScenes.length > scenes.length) {
      scenes = newScenes;
      break;
    }
  }

  // If no scene markers, split by paragraphs
  if (scenes.length === 1) {
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    if (paragraphs.length > 1) {
      // Group small paragraphs
      const grouped: string[] = [];
      let current = '';
      for (const p of paragraphs) {
        if (current.length + p.length < 500) {
          current += (current ? '\n\n' : '') + p;
        } else {
          if (current) grouped.push(current);
          current = p;
        }
      }
      if (current) grouped.push(current);
      scenes = grouped;
    }
  }

  return scenes.filter(s => s.trim().length > 10);
}

/**
 * Check if a keyword is negated in text
 */
export function isNegated(text: string, keyword: string): boolean {
  const lowerText = text.toLowerCase();
  const idx = lowerText.indexOf(keyword);
  if (idx === -1) return false;

  const before = lowerText.slice(Math.max(0, idx - 20), idx);
  const negations = ['değil', 'yok', 'asla', 'hiç', 'olmadan', 'dışında', '-ma', '-me', 'maz', 'mez'];

  return negations.some(neg => before.includes(neg));
}

/**
 * Find word with Turkish suffixes
 */
export function findWithSuffixes(text: string, root: string): boolean {
  const suffixPattern = new RegExp(`${root}[a-zığüşöçıİĞÜŞÖÇ]{0,6}`, 'gi');
  return suffixPattern.test(text);
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

/**
 * Delay utility
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Capitalize first letter
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}
