import type { StyleOption, ColorPalette, Resolution, QualityPreset } from './types';

// Backend API configuration
export const BACKEND_URL = 'http://localhost:8765';

// Style options
export const STYLES: StyleOption[] = [
  { id: 'cinematic', name: 'Sinematik Gerçekçi', desc: 'Film kalitesi, fotorealistik' },
  { id: 'anime', name: 'Anime / Manga', desc: 'Japon animasyon tarzı' },
  { id: 'comic', name: 'Çizgi Roman', desc: 'Comic book, bold lines' },
  { id: 'digital', name: 'Dijital İllüstrasyon', desc: 'Modern dijital sanat' },
  { id: 'oil', name: 'Yağlı Boya', desc: 'Klasik resim tarzı' },
  { id: 'watercolor', name: 'Suluboya', desc: 'Soft, akışkan' },
  { id: 'minimal', name: 'Minimal', desc: 'Sade, temiz çizgiler' },
  { id: 'custom', name: 'Özel', desc: 'Kendi stilini tanımla' },
];

// Color palettes
export const COLOR_PALETTES: ColorPalette[] = [
  { id: 'warm', name: 'Sıcak Tonlar', colors: ['#FF6B35', '#F7931E', '#FFD700'] },
  { id: 'cool', name: 'Soğuk Tonlar', colors: ['#4A90D9', '#5B5EA6', '#9B4DCA'] },
  { id: 'pastel', name: 'Pastel', colors: ['#FFB5BA', '#B5D8FF', '#C8FFB5'] },
  { id: 'dark', name: 'Karanlık / Noir', colors: ['#1a1a2e', '#16213e', '#0f3460'] },
  { id: 'vibrant', name: 'Canlı / Yüksek Kontrast', colors: ['#FF0080', '#00FF80', '#0080FF'] },
  { id: 'earthy', name: 'Toprak Tonları', colors: ['#8B7355', '#C4A77D', '#556B2F'] },
  { id: 'monochrome', name: 'Monokrom', colors: ['#2d2d2d', '#5c5c5c', '#8c8c8c'] },
];

// Compositions
export const COMPOSITIONS: StyleOption[] = [
  { id: 'wide', name: 'Geniş Açı', desc: 'Establishing shot, manzara' },
  { id: 'medium', name: 'Orta Plan', desc: 'Karakter ve çevre dengeli' },
  { id: 'closeup', name: 'Yakın Plan', desc: 'Yüz, detay, duygu' },
  { id: 'extreme-closeup', name: 'Aşırı Yakın', desc: 'Göz, el, obje detayı' },
  { id: 'overhead', name: 'Kuşbakışı', desc: 'Üstten görünüm' },
  { id: 'lowangle', name: 'Alt Açı', desc: 'Güç, ihtişam hissi' },
  { id: 'dutch', name: 'Dutch Angle', desc: 'Eğik, gerilim' },
  { id: 'auto', name: 'Otomatik', desc: 'Sahneye göre seç' },
];

// Format options
export const FORMATS: StyleOption[] = [
  { id: '16:9', name: '16:9', desc: 'Sinematik yatay' },
  { id: '9:16', name: '9:16', desc: 'Dikey / Mobil' },
  { id: '1:1', name: '1:1', desc: 'Kare' },
  { id: '4:3', name: '4:3', desc: 'Klasik' },
  { id: '21:9', name: '21:9', desc: 'Ultra geniş' },
];

// Resolution options
export const RESOLUTIONS: Resolution[] = [
  { id: '360p', name: '360p', width: 640, height: 360, desc: 'Düşük kalite, hızlı', vram: '2GB', time: '~5s', quality: 'draft' },
  { id: '480p', name: '480p', width: 854, height: 480, desc: 'SD kalite', vram: '3GB', time: '~8s', quality: 'draft' },
  { id: '720p', name: '720p (HD)', width: 1280, height: 720, desc: 'HD kalite', vram: '4GB', time: '~15s', quality: 'standard' },
  { id: '1080p', name: '1080p (Full HD)', width: 1920, height: 1080, desc: 'Full HD kalite', vram: '6GB', time: '~30s', quality: 'standard' },
  { id: '1440p', name: '1440p (2K)', width: 2560, height: 1440, desc: '2K kalite', vram: '8GB', time: '~60s', quality: 'high' },
  { id: '2160p', name: '2160p (4K)', width: 3840, height: 2160, desc: '4K Ultra HD', vram: '12GB+', time: '~120s', quality: 'ultra' },
];

// Quality presets
export const QUALITY_PRESETS: QualityPreset[] = [
  { id: 'draft', name: 'Taslak', icon: '⚡', desc: 'Hızlı önizleme için', resolutions: ['360p', '480p'], color: 'yellow' },
  { id: 'standard', name: 'Standart', icon: '✓', desc: 'Günlük kullanım için ideal', resolutions: ['720p', '1080p'], color: 'green' },
  { id: 'high', name: 'Yüksek', icon: '★', desc: 'Profesyonel kalite', resolutions: ['1440p'], color: 'blue' },
  { id: 'ultra', name: 'Ultra', icon: '♦', desc: 'Maksimum kalite, yavaş', resolutions: ['2160p'], color: 'purple' },
];

// Content warning keywords
export const CONTENT_WARNING_KEYWORDS = [
  'şiddet', 'violence', 'kan', 'blood', 'öldür', 'kill', 'silah', 'weapon',
  'çıplak', 'nude', 'cinsel', 'sexual', 'erotik', 'erotic',
  'uyuşturucu', 'drug', 'intihar', 'suicide', 'işkence', 'torture'
];

// Aspect ratios for format calculations
export const ASPECT_RATIOS: Record<string, number> = {
  '16:9': 16/9,
  '9:16': 9/16,
  '1:1': 1,
  '4:3': 4/3,
  '21:9': 21/9,
};
