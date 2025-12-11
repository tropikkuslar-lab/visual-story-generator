import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Layers,
  Palette,
  Users,
  Wand2,
  Download,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  Check,
  Sparkles,
  BookOpen,
  Image,
  Loader2,
  Wifi,
  WifiOff,
  Cpu,
  Zap,
  AlertCircle,
  RefreshCw
} from 'lucide-react';

// Backend API configuration
const BACKEND_URL = 'http://localhost:8765';

// Backend status interface
interface BackendStatus {
  online: boolean;
  device: {
    mode: string;
    device: string;
    gpu_info: string | null;
    vram_gb: number;
  };
  model: {
    loaded: boolean;
    loading: boolean;
    name: string | null;
  };
  queue: {
    queue_size: number;
    pending: number;
    processing: number;
  };
  recommended_settings: {
    steps: number;
    width: number;
    height: number;
    estimated_time: string;
  };
}

// Generation job interface
interface GenerationJob {
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result_path?: string;
  image_url?: string;
  error?: string;
}

// Types
interface Character {
  id: string;
  name: string;
  appearance: string;
  clothing: string;
  traits: string;
}

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
  // Generation state
  generatingFaithful?: boolean;
  generatingCreative?: boolean;
  faithfulJobId?: string;
  creativeJobId?: string;
  faithfulImageUrl?: string;
  creativeImageUrl?: string;
  generationError?: string;
}

interface StyleSettings {
  style: string;
  colorPalette: string;
  composition: string;
  format: string;
  resolution: string;
  customStyle: string;
}

// Style options
const STYLES = [
  { id: 'cinematic', name: 'Sinematik Gerçekçi', desc: 'Film kalitesi, fotorealistik' },
  { id: 'anime', name: 'Anime / Manga', desc: 'Japon animasyon tarzı' },
  { id: 'comic', name: 'Çizgi Roman', desc: 'Comic book, bold lines' },
  { id: 'digital', name: 'Dijital İllüstrasyon', desc: 'Modern dijital sanat' },
  { id: 'oil', name: 'Yağlı Boya', desc: 'Klasik resim tarzı' },
  { id: 'watercolor', name: 'Suluboya', desc: 'Soft, akışkan' },
  { id: 'minimal', name: 'Minimal', desc: 'Sade, temiz çizgiler' },
  { id: 'custom', name: 'Özel', desc: 'Kendi stilini tanımla' },
];

const COLOR_PALETTES = [
  { id: 'warm', name: 'Sıcak Tonlar', colors: ['#FF6B35', '#F7931E', '#FFD700'] },
  { id: 'cool', name: 'Soğuk Tonlar', colors: ['#4A90D9', '#5B5EA6', '#9B4DCA'] },
  { id: 'pastel', name: 'Pastel', colors: ['#FFB5BA', '#B5D8FF', '#C8FFB5'] },
  { id: 'dark', name: 'Karanlık / Noir', colors: ['#1a1a2e', '#16213e', '#0f3460'] },
  { id: 'vibrant', name: 'Canlı / Yüksek Kontrast', colors: ['#FF0080', '#00FF80', '#0080FF'] },
  { id: 'earthy', name: 'Toprak Tonları', colors: ['#8B7355', '#C4A77D', '#556B2F'] },
  { id: 'monochrome', name: 'Monokrom', colors: ['#2d2d2d', '#5c5c5c', '#8c8c8c'] },
];

const COMPOSITIONS = [
  { id: 'wide', name: 'Geniş Açı', desc: 'Establishing shot, manzara' },
  { id: 'medium', name: 'Orta Plan', desc: 'Karakter ve çevre dengeli' },
  { id: 'closeup', name: 'Yakın Plan', desc: 'Yüz, detay, duygu' },
  { id: 'extreme-closeup', name: 'Aşırı Yakın', desc: 'Göz, el, obje detayı' },
  { id: 'overhead', name: 'Kuşbakışı', desc: 'Üstten görünüm' },
  { id: 'lowangle', name: 'Alt Açı', desc: 'Güç, ihtişam hissi' },
  { id: 'dutch', name: 'Dutch Angle', desc: 'Eğik, gerilim' },
  { id: 'auto', name: 'Otomatik', desc: 'Sahneye göre seç' },
];

const FORMATS = [
  { id: '16:9', name: '16:9', desc: 'Sinematik yatay' },
  { id: '9:16', name: '9:16', desc: 'Dikey / Mobil' },
  { id: '1:1', name: '1:1', desc: 'Kare' },
  { id: '4:3', name: '4:3', desc: 'Klasik' },
  { id: '21:9', name: '21:9', desc: 'Ultra geniş' },
];

const RESOLUTIONS = [
  { id: '360p', name: '360p', width: 640, height: 360, desc: 'Düşük kalite, hızlı', vram: '2GB', time: '~5s', quality: 'draft' },
  { id: '480p', name: '480p', width: 854, height: 480, desc: 'SD kalite', vram: '3GB', time: '~8s', quality: 'draft' },
  { id: '720p', name: '720p (HD)', width: 1280, height: 720, desc: 'HD kalite', vram: '4GB', time: '~15s', quality: 'standard' },
  { id: '1080p', name: '1080p (Full HD)', width: 1920, height: 1080, desc: 'Full HD kalite', vram: '6GB', time: '~30s', quality: 'standard' },
  { id: '1440p', name: '1440p (2K)', width: 2560, height: 1440, desc: '2K kalite', vram: '8GB', time: '~60s', quality: 'high' },
  { id: '2160p', name: '2160p (4K)', width: 3840, height: 2160, desc: '4K Ultra HD', vram: '12GB+', time: '~120s', quality: 'ultra' },
];

// Kalite presetleri
const QUALITY_PRESETS = [
  { id: 'draft', name: 'Taslak', icon: '⚡', desc: 'Hızlı önizleme için', resolutions: ['360p', '480p'], color: 'yellow' },
  { id: 'standard', name: 'Standart', icon: '✓', desc: 'Günlük kullanım için ideal', resolutions: ['720p', '1080p'], color: 'green' },
  { id: 'high', name: 'Yüksek', icon: '★', desc: 'Profesyonel kalite', resolutions: ['1440p'], color: 'blue' },
  { id: 'ultra', name: 'Ultra', icon: '♦', desc: 'Maksimum kalite, yavaş', resolutions: ['2160p'], color: 'purple' },
];

// Format bazlı çözünürlük hesaplama
const calculateResolutionForFormat = (baseResolution: string, format: string): { width: number, height: number } => {
  const baseRes = RESOLUTIONS.find(r => r.id === baseResolution) || RESOLUTIONS[3];
  const baseHeight = baseRes.height;

  // Format'a göre genişlik hesapla
  const aspectRatios: Record<string, number> = {
    '16:9': 16/9,
    '9:16': 9/16,
    '1:1': 1,
    '4:3': 4/3,
    '21:9': 21/9,
  };

  const ratio = aspectRatios[format] || 16/9;

  if (format === '9:16') {
    // Dikey format için height'ı base, width'i hesapla
    const width = Math.round(baseHeight * ratio);
    return { width, height: baseHeight };
  } else {
    // Yatay ve kare formatlar için height'ı base al
    const width = Math.round(baseHeight * ratio);
    return { width, height: baseHeight };
  }
};

// Content warning keywords
const CONTENT_WARNING_KEYWORDS = [
  'şiddet', 'violence', 'kan', 'blood', 'öldür', 'kill', 'silah', 'weapon',
  'çıplak', 'nude', 'cinsel', 'sexual', 'erotik', 'erotic',
  'uyuşturucu', 'drug', 'intihar', 'suicide', 'işkence', 'torture'
];

function App() {
  // State
  const [activeTab, setActiveTab] = useState<'input' | 'characters' | 'style' | 'scenes' | 'export'>('input');
  const [inputText, setInputText] = useState('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [styleSettings, setStyleSettings] = useState<StyleSettings>({
    style: 'cinematic',
    colorPalette: 'warm',
    composition: 'auto',
    format: '16:9',
    resolution: '1080p',
    customStyle: '',
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [contentWarning, setContentWarning] = useState<string | null>(null);

  // Backend state
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
  const [checkingBackend, setCheckingBackend] = useState(false);

  // Check backend status
  const checkBackendStatus = useCallback(async () => {
    setCheckingBackend(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      if (response.ok) {
        const data = await response.json();
        setBackendStatus({ ...data, online: true });
      } else {
        setBackendStatus(null);
      }
    } catch {
      setBackendStatus(null);
    } finally {
      setCheckingBackend(false);
    }
  }, []);

  // Load model
  const loadModel = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/load-model`, { method: 'POST' });
      // Poll for status
      const pollStatus = setInterval(async () => {
        await checkBackendStatus();
        if (backendStatus?.model.loaded) {
          clearInterval(pollStatus);
        }
      }, 2000);
    } catch (e) {
      console.error('Model yükleme hatası:', e);
    }
  };

  // Generate image for a scene
  const generateImage = async (sceneId: string, promptType: 'faithful' | 'creative') => {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene || !backendStatus?.online) return;

    const prompt = promptType === 'faithful' ? scene.faithfulPrompt : scene.creativePrompt;

    // Update scene state
    setScenes(prev => prev.map(s => {
      if (s.id === sceneId) {
        return {
          ...s,
          [promptType === 'faithful' ? 'generatingFaithful' : 'generatingCreative']: true,
          generationError: undefined
        };
      }
      return s;
    }));

    try {
      // Submit job
      const response = await fetch(`${BACKEND_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          negative_prompt: 'blurry, bad quality, distorted, ugly, deformed',
          aspect_ratio: styleSettings.format,
          steps: backendStatus.recommended_settings?.steps || 25
        })
      });

      if (!response.ok) {
        throw new Error('İş kuyruğa eklenemedi');
      }

      const jobData = await response.json();
      const jobId = jobData.job_id;

      // Update scene with job ID
      setScenes(prev => prev.map(s => {
        if (s.id === sceneId) {
          return {
            ...s,
            [promptType === 'faithful' ? 'faithfulJobId' : 'creativeJobId']: jobId
          };
        }
        return s;
      }));

      // Poll for completion
      const pollJob = async () => {
        try {
          const statusResponse = await fetch(`${BACKEND_URL}/api/job/${jobId}`);
          const jobStatus: GenerationJob = await statusResponse.json();

          if (jobStatus.status === 'completed' && jobStatus.image_url) {
            setScenes(prev => prev.map(s => {
              if (s.id === sceneId) {
                return {
                  ...s,
                  [promptType === 'faithful' ? 'generatingFaithful' : 'generatingCreative']: false,
                  [promptType === 'faithful' ? 'faithfulImageUrl' : 'creativeImageUrl']:
                    `${BACKEND_URL}${jobStatus.image_url}`
                };
              }
              return s;
            }));
          } else if (jobStatus.status === 'failed') {
            setScenes(prev => prev.map(s => {
              if (s.id === sceneId) {
                return {
                  ...s,
                  [promptType === 'faithful' ? 'generatingFaithful' : 'generatingCreative']: false,
                  generationError: jobStatus.error || 'Görsel üretilemedi'
                };
              }
              return s;
            }));
          } else {
            // Still processing, poll again
            setTimeout(pollJob, 2000);
          }
        } catch (e) {
          console.error('Durum sorgulama hatası:', e);
        }
      };

      // Start polling
      setTimeout(pollJob, 1000);

    } catch (e) {
      setScenes(prev => prev.map(s => {
        if (s.id === sceneId) {
          return {
            ...s,
            [promptType === 'faithful' ? 'generatingFaithful' : 'generatingCreative']: false,
            generationError: e instanceof Error ? e.message : 'Bilinmeyen hata'
          };
        }
        return s;
      }));
    }
  };

  // Check backend on mount
  useEffect(() => {
    checkBackendStatus();
    // Poll every 10 seconds
    const interval = setInterval(checkBackendStatus, 10000);
    return () => clearInterval(interval);
  }, [checkBackendStatus]);

  // Check for sensitive content
  const checkContentWarnings = (text: string): string | null => {
    const lowerText = text.toLowerCase();
    const found = CONTENT_WARNING_KEYWORDS.filter(kw => lowerText.includes(kw));
    if (found.length > 0) {
      return `Dikkat: Metinde hassas içerik tespit edildi (${found.slice(0, 3).join(', ')}). Görsel üretim araçları bu tür içerikleri reddedebilir.`;
    }
    return null;
  };

  // Add character
  const addCharacter = () => {
    const newChar: Character = {
      id: Date.now().toString(),
      name: '',
      appearance: '',
      clothing: '',
      traits: '',
    };
    setCharacters([...characters, newChar]);
  };

  const updateCharacter = (id: string, field: keyof Character, value: string) => {
    setCharacters(characters.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const removeCharacter = (id: string) => {
    setCharacters(characters.filter(c => c.id !== id));
  };

  // Smart scene splitting - handles dialogue, chapters, scene breaks
  const splitIntoScenes = (text: string): string[] => {
    const trimmedText = text.trim();

    // Eğer metin çok kısaysa, tamamını tek sahne olarak döndür
    if (trimmedText.length < 50) {
      return trimmedText.length > 0 ? [trimmedText] : [];
    }

    // Scene break patterns: ---, ***, ===, [Scene], Chapter, Bölüm
    const sceneBreakPattern = /\n[-*=]{3,}\n|\n\[.+?\]\n|\nChapter\s*\d*|\nBölüm\s*\d*|\nSahne\s*\d*/gi;

    // First try scene breaks
    let scenes = text.split(sceneBreakPattern).filter(s => s.trim().length > 30);

    // If no scene breaks, split by double newlines but merge short paragraphs
    if (scenes.length <= 1) {
      const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
      scenes = [];
      let currentScene = '';

      for (const para of paragraphs) {
        currentScene += (currentScene ? '\n\n' : '') + para;
        // Create new scene if paragraph is long enough or contains dialogue end
        if (currentScene.length > 300 || para.endsWith('"') || para.endsWith("'")) {
          scenes.push(currentScene);
          currentScene = '';
        }
      }
      if (currentScene) scenes.push(currentScene);
    }

    // Minimum filtreleme - çok kısa olmayanları al
    const filteredScenes = scenes.filter(s => s.trim().length > 10);

    // Eğer hala boşsa, tüm metni tek sahne olarak döndür
    return filteredScenes.length > 0 ? filteredScenes : [trimmedText];
  };

  // Analyze text and generate scenes (chunked processing to prevent UI freeze)
  const analyzeText = async () => {
    if (!inputText.trim()) return;

    try {
      // Check for content warnings
      const warning = checkContentWarnings(inputText);
      setContentWarning(warning);

      setIsAnalyzing(true);

      // Önce sahnelere ayır
      const sceneTexts = splitIntoScenes(inputText);
      console.log('Sahne sayısı:', sceneTexts.length);

      if (sceneTexts.length === 0) {
        console.warn('Sahne bulunamadı, tüm metni tek sahne olarak kullan');
        setScenes([analyzeScene(inputText.trim(), 1)]);
        setIsAnalyzing(false);
        setActiveTab('scenes');
        return;
      }

      // Her sahneyi analiz et
      const results: Scene[] = [];
      for (let i = 0; i < sceneTexts.length; i++) {
        try {
          const scene = analyzeScene(sceneTexts[i], i + 1);
          results.push(scene);
        } catch (sceneError) {
          console.error(`Sahne ${i + 1} analiz hatası:`, sceneError);
          // Hata olsa bile basit bir sahne oluştur
          results.push({
            id: Date.now().toString() + i,
            title: `Sahne ${i + 1}`,
            description: sceneTexts[i].slice(0, 300),
            objects: ['unspecified'],
            mood: 'Nötr',
            lighting: 'Doğal',
            environment: 'Belirsiz',
            importantDetails: ['Analiz hatası oluştu'],
            faithfulPrompt: sceneTexts[i],
            creativePrompt: sceneTexts[i],
            negativePrompt: 'blurry, low quality, bad anatomy, bad hands, text, error',
            resolution: { id: styleSettings.resolution, width: 1920, height: 1080 },
          });
        }
      }

      setScenes(results);
      setIsAnalyzing(false);
      setActiveTab('scenes');
    } catch (error) {
      console.error('Analiz hatası:', error);
      setIsAnalyzing(false);
      // Hata durumunda bile basit bir sahne oluştur
      setScenes([{
        id: Date.now().toString(),
        title: 'Sahne 1',
        description: inputText.slice(0, 300),
        objects: ['unspecified'],
        mood: 'Nötr',
        lighting: 'Doğal',
        environment: 'Belirsiz',
        importantDetails: ['Analiz sırasında hata oluştu, lütfen tekrar deneyin'],
        faithfulPrompt: inputText,
        creativePrompt: inputText,
        negativePrompt: 'blurry, low quality, bad anatomy, bad hands, text, error',
        resolution: { id: styleSettings.resolution, width: 1920, height: 1080 },
      }]);
      setActiveTab('scenes');
    }
  };

  // Helper: Check if keyword is negated ("mutlu değil", "not happy")
  const isNegated = (text: string, keyword: string): boolean => {
    const lowerText = text.toLowerCase();
    const idx = lowerText.indexOf(keyword);
    if (idx === -1) return false;

    // Check for negation words before or after the keyword
    const negationPatterns = [
      new RegExp(`(değil|yok|olmayan|hiç|asla|never|not|no|without)\\s+\\w*${keyword}`, 'i'),
      new RegExp(`${keyword}\\w*\\s+(değil|yok|olmadı|kalmadı)`, 'i'),
    ];
    return negationPatterns.some(p => p.test(lowerText));
  };

  // Helper: Find keyword with Turkish suffix variations
  const findWithSuffixes = (text: string, root: string): boolean => {
    const suffixPattern = new RegExp(`${root}[a-zığüşöçıİĞÜŞÖÇ]{0,6}`, 'gi');
    return suffixPattern.test(text);
  };

  // ============== ADVANCED SCENE ANALYSIS ==============

  // ============== MECAZ, DEYİM VE SOYUT KAVRAM ANALİZİ ==============

  // Türkçe deyimler ve mecazlar -> görsel karşılıkları (GENİŞLETİLMİŞ)
  const idiomPatterns: Record<string, { patterns: string[], visual: string, mood: string, lighting: string }> = {
    // ===== DUYGUSAL DEYİMLER =====
    'heartbroken': {
      patterns: ['kalbi kırık', 'kalbi parça', 'yüreği sızla', 'içi kan ağla', 'yüreği yana', 'kalbi ezil', 'gönlü yaralı', 'aşk acısı', 'kalp yarası'],
      visual: 'person with broken heart symbolism, shattered glass effect around chest, tears streaming, emotional devastation visible, cracked heart imagery',
      mood: 'devastating sadness',
      lighting: 'dark moody lighting with cold blue tones, rain effect'
    },
    'burning_anger': {
      patterns: ['ateş püskür', 'küplere bin', 'kan beyin', 'öfkeden kudur', 'gözü dön', 'sinirden çıldır', 'deliye dön', 'çılgına dön', 'tepesi at', 'köpür', 'kudur'],
      visual: 'person surrounded by flames and smoke, intense red aura emanating, fierce expression with veins visible, clenched fists, burning environment',
      mood: 'explosive rage',
      lighting: 'dramatic red and orange lighting, high contrast, flames illuminating'
    },
    'deep_fear': {
      patterns: ['can boğaz', 'yüreği ağzına gel', 'tüyleri diken', 'kanı don', 'beti benzi at', 'ödü kopuk', 'ödü pat', 'korku sal', 'dehşet düş', 'donup kal', 'taş kesil'],
      visual: 'terrified person with wide eyes and dilated pupils, pale ghostly face, shadows creeping from all sides, horror atmosphere, trembling hands',
      mood: 'primal terror',
      lighting: 'harsh shadows, flickering unstable light, darkness closing in'
    },
    'overwhelming_joy': {
      patterns: ['sevinçten uç', 'havalara uç', 'mutluluktan öl', 'dünyalar benim', 'göklere çık', 'zıplayıp dur', 'çocuk gibi sevin', 'bayram et', 'coş'],
      visual: 'person floating or leaping with pure joy, golden light rays emanating, flowers blooming around, confetti and celebration atmosphere, wide genuine smile',
      mood: 'ecstatic happiness',
      lighting: 'bright golden sunshine, lens flares, warm glowing light everywhere'
    },
    'deep_loneliness': {
      patterns: ['yapayalnız', 'tek başına', 'kimsesiz', 'terk edil', 'yalnızlık çök', 'boşlukta kaybol', 'yalnız kal', 'dört duvar', 'garip gureba', 'öksüz'],
      visual: 'solitary small figure in vast empty space, isolated on bench, tiny person in enormous desolate landscape, melancholic posture, empty streets',
      mood: 'profound isolation',
      lighting: 'cold blue ambient light, fog obscuring distance, empty negative space'
    },
    'falling_in_love': {
      patterns: ['aşık ol', 'gönül ver', 'kalbi çarp', 'kelebek uç', 'başı dön', 'tutku yak', 'vur', 'yürek çarp', 'sev', 'aşk', 'gönül düş'],
      visual: 'couple with floating hearts, butterflies surrounding, romantic soft glow, dreamy atmosphere with bokeh, gentle touch, longing gaze',
      mood: 'passionate romance',
      lighting: 'warm sunset glow, soft diffused pink and orange light, golden hour'
    },
    'betrayal': {
      patterns: ['sırtından bıçak', 'ihanet', 'arkadan vur', 'güveni kır', 'kandır', 'aldatıl', 'satıl', 'hainlik', 'dönek', 'yüzüne gül arkadan vur'],
      visual: 'knife in back symbolism, broken trust imagery with cracked glass, dark silhouette lurking behind, shattered mirror reflection, two-faced imagery',
      mood: 'dark betrayal',
      lighting: 'harsh dramatic noir shadows, stark contrast, cold harsh light'
    },
    'hope_rising': {
      patterns: ['umut doğ', 'ışık görün', 'tünel sonu', 'yeni başlangıç', 'şafak sök', 'gün doğ', 'yarın var', 'umut ışığı', 'ışık hüzme'],
      visual: 'light breaking through dark storm clouds, golden sunrise on horizon, person looking ahead with hope, new dawn breaking, crack of light in darkness',
      mood: 'hopeful anticipation',
      lighting: 'dawn light breaking through darkness, golden hour rays of hope penetrating'
    },
    'inner_peace': {
      patterns: ['iç huzur', 'ruhun dinlen', 'meditasyon', 'kendini bul', 'zen', 'sessizlik', 'huzur bul', 'dingin', 'sakin', 'ferah'],
      visual: 'peaceful meditation pose in nature, zen garden with raked sand, calm mirror-like water reflection, serene mountain temple, lotus flower',
      mood: 'transcendent peace',
      lighting: 'soft diffused natural light, gentle warm glow, dappled sunlight'
    },
    'power_dominance': {
      patterns: ['güç elde', 'hükmet', 'kontrol al', 'efen', 'hakim ol', 'taht', 'saltanat', 'imparator', 'kral', 'hükümdar', 'otorite'],
      visual: 'powerful imposing figure on ornate throne, golden crown with gems, commanding regal pose, subjects bowing in reverence, vast empire behind',
      mood: 'authoritative power',
      lighting: 'dramatic spotlight from above, god rays through windows, royal gold tones'
    },
    'freedom': {
      patterns: ['özgürlük', 'kanatlan', 'zincir kır', 'serbest kal', 'uç', 'bağımsız', 'hür', 'özgür', 'kurtul', 'serbest bırak'],
      visual: 'person with arms spread wide on cliff edge, birds soaring in flight, broken chains falling away, endless open sky, wind in flowing hair',
      mood: 'liberating freedom',
      lighting: 'bright open sky backlight, sun behind subject creating silhouette, vast horizon'
    },
    'mystery_intrigue': {
      patterns: ['gizemli', 'sır sakla', 'bilinmeyen', 'karanlık güç', 'esrar', 'gölgeler', 'muamma', 'sır', 'meçhul', 'belirsiz'],
      visual: 'mysterious hooded figure in fog, hidden faces in shadow, cryptic ancient symbols glowing, secret passage with candlelight, masked stranger',
      mood: 'enigmatic mystery',
      lighting: 'chiaroscuro with deep shadows, mysterious single light source, fog diffusion'
    },
    'time_passing': {
      patterns: ['zaman geç', 'yıllar akıp', 'eskiden', 'bir zamanlar', 'hatırla', 'nostalji', 'eski günler', 'geçmiş', 'anı'],
      visual: 'antique clock with flowing sand, old sepia photographs, faded memories transitioning, time lapse aging effect, vintage objects',
      mood: 'nostalgic melancholy',
      lighting: 'soft vintage sepia tones, warm faded nostalgic light, dust particles in light'
    },
    'transformation': {
      patterns: ['dönüşüm', 'değişim', 'evril', 'metamorfoz', 'başka biri ol', 'yeniden doğ', 'dönüş', 'farklılaş', 'evrimleş'],
      visual: 'butterfly emerging from cocoon, phoenix rising from ashes, person mid-transformation with magical particles, caterpillar to butterfly sequence',
      mood: 'magical transformation',
      lighting: 'ethereal glowing light, magical sparkles and particles, aurora effects'
    },
    'nightmare': {
      patterns: ['kabus', 'kötü rüya', 'karanlık düş', 'kabuslar', 'korkunç rüya', 'uyku kaç', 'terler içinde uyan'],
      visual: 'distorted surreal reality, twisted impossible shapes, grotesque monster shadows on wall, person sweating in bed, sleep paralysis demon',
      mood: 'nightmarish horror',
      lighting: 'surreal distorted unnatural lighting, blood red accents, oppressive darkness'
    },
    'epic_battle': {
      patterns: ['destansı savaş', 'büyük mücadele', 'son savaş', 'ölüm kalım', 'kahramanca', 'destan', 'savaş meydan', 'harp'],
      visual: 'massive epic battle scene with armies clashing, dramatic stormy sky with lightning, lone hero standing in center, flags waving, weapons clashing',
      mood: 'epic grandeur',
      lighting: 'dramatic stormy sky with lightning strikes, fire glow on faces, dust and smoke'
    },
    // ===== YENİ DEYİMLER - BEDEN VE FİZİKSEL =====
    'exhaustion': {
      patterns: ['bitkin düş', 'tükenmişlik', 'ayakta dur', 'enerji kal', 'yorgunluk çök', 'halsiz', 'mecal kal'],
      visual: 'person collapsed on floor, heavy eyelids, drained posture, scattered papers, coffee cups, dark circles under eyes',
      mood: 'complete exhaustion',
      lighting: 'dim tired lighting, fluorescent office lights, late night atmosphere'
    },
    'nervous_tension': {
      patterns: ['gerilim', 'stres', 'sinir', 'baskı altında', 'bunalım', 'patlama noktası', 'asabi'],
      visual: 'person with tense shoulders and clenched jaw, breaking pencil, veins showing, pressure cooker imagery, cracking surface',
      mood: 'intense stress',
      lighting: 'harsh overhead lighting, pressure cooker steam, tight framing'
    },
    'stomach_churning': {
      patterns: ['midesi bulan', 'içi kalk', 'mide bulantı', 'tiksinti', 'iğren', 'kusas'],
      visual: 'person with hand on stomach, green-tinged face, wavy distorted vision, queasy expression, swirling background',
      mood: 'physical revulsion',
      lighting: 'sickly green tint, nauseating swirl effects'
    },
    // ===== YENİ DEYİMLER - DOĞA METAFORLARı =====
    'storm_brewing': {
      patterns: ['fırtına yaklaş', 'bulutlar top', 'kara bulut', 'fırtına öncesi sessizlik', 'gök gürle'],
      visual: 'massive dark storm clouds gathering on horizon, lightning in distance, ominous calm before storm, wind starting to pick up',
      mood: 'impending danger',
      lighting: 'pre-storm dramatic lighting, dark clouds with bright horizon'
    },
    'spring_awakening': {
      patterns: ['bahar gel', 'çiçek aç', 'tabiat uyan', 'tomurcuk pat', 'yeşer', 'canlan'],
      visual: 'flowers bursting into bloom, ice melting to reveal green, birds returning, streams flowing, new life everywhere',
      mood: 'renewal and rebirth',
      lighting: 'fresh spring sunlight, soft green tones, dewy morning light'
    },
    'autumn_melancholy': {
      patterns: ['yaprak dök', 'sonbahar', 'solgun', 'kuruyup git', 'hüzünlü son'],
      visual: 'falling golden and red leaves, bare tree branches, misty park, person walking alone on leaf-covered path, geese flying south',
      mood: 'bittersweet ending',
      lighting: 'golden autumn afternoon, soft melancholic amber tones'
    },
    'frozen_stillness': {
      patterns: ['buz kes', 'donuk', 'soğuk', 'kış uykusu', 'hiç hareket yok', 'kıpırdama'],
      visual: 'frozen lake surface, ice crystals on window, snow-covered landscape, frosted trees, breath visible in cold air',
      mood: 'suspended animation',
      lighting: 'cold blue-white winter light, crisp sharp shadows'
    },
    // ===== YENİ DEYİMLER - RUHSAL VE MİSTİK =====
    'spiritual_awakening': {
      patterns: ['ruh uyan', 'aydınlan', 'farkındalık', 'üçüncü göz', 'nirvana', 'erişim'],
      visual: 'person meditating with cosmic energy around, third eye opening, chakras glowing, universe expanding from mind, enlightenment rays',
      mood: 'transcendent awareness',
      lighting: 'divine light from above, cosmic purple and gold, ethereal glow'
    },
    'dark_magic': {
      patterns: ['kara büyü', 'lanet', 'bedduva', 'kötü göz', 'nazar', 'karanlık güç'],
      visual: 'dark ritual circle, black candles, swirling dark energy, evil eye imagery, cursed objects, shadowy summoning',
      mood: 'malevolent darkness',
      lighting: 'sickly green and purple, candlelight in darkness, ominous glow'
    },
    'divine_intervention': {
      patterns: ['ilahi yardım', 'tanrı elini uzat', 'mucize', 'gökten ışık', 'melek gel'],
      visual: 'rays of divine light breaking through, angelic figure descending, miracle happening, hands reaching from sky, sacred golden glow',
      mood: 'divine grace',
      lighting: 'heavenly bright light from above, sacred golden rays, lens flares'
    },
    // ===== YENİ DEYİMLER - SOSYAL VE İLİŞKİSEL =====
    'crowd_pressure': {
      patterns: ['kalabalık', 'sürü', 'herkes gibi', 'baskı hisset', 'farklı olma'],
      visual: 'lone person standing against crowd of identical figures, pressure from all sides, conformity imagery, being crushed by masses',
      mood: 'social suffocation',
      lighting: 'overwhelming harsh light, crowd creating shadows, claustrophobic'
    },
    'secret_meeting': {
      patterns: ['gizli buluş', 'karanlıkta buluş', 'kimse görme', 'sır paylaş', 'fısıldaş'],
      visual: 'two figures meeting in shadows, whispered conversation, hidden corner of city, spy thriller atmosphere, coats and hats',
      mood: 'clandestine intrigue',
      lighting: 'noir street lamp, shadows hiding faces, limited visibility'
    },
    'public_shame': {
      patterns: ['utanç', 'rezil ol', 'yerin dibine gir', 'herkes gör', 'mahcup', 'yüzü kızar'],
      visual: 'person in spotlight with crowd pointing and laughing, face burning red, wanting to disappear, ground opening up beneath',
      mood: 'crushing embarrassment',
      lighting: 'harsh unflattering spotlight, everyone else in shadow'
    },
    // ===== YENİ DEYİMLER - YAŞAM YOLCULUĞU =====
    'crossroads': {
      patterns: ['yol ayrımı', 'karar ver', 'iki yol', 'tercih yap', 'hayatım değiş'],
      visual: 'person standing at literal crossroads, two paths diverging in forest, signposts pointing different directions, fork in the road',
      mood: 'decisive moment',
      lighting: 'one path in light, one in shadow, dramatic choice lighting'
    },
    'climbing_mountain': {
      patterns: ['zirve', 'tırman', 'hedefe ulaş', 'başarı yolu', 'tepe noktası'],
      visual: 'person climbing steep mountain, summit visible above, determination in pose, challenging terrain, flag at peak',
      mood: 'ambitious struggle',
      lighting: 'sunrise at mountain peak, challenging shadows, goal lit up'
    },
    'sinking_ship': {
      patterns: ['bat', 'batar', 'batık gemi', 'çökme', 'son bul', 'felaket'],
      visual: 'ship sinking in stormy sea, people abandoning ship, water rushing in, tilted deck, desperate situation',
      mood: 'catastrophic failure',
      lighting: 'stormy dark sky, lightning flashes, dramatic waves'
    },
    'phoenix_rise': {
      patterns: ['küllerinden doğ', 'yeniden ayağa kalk', 'baştan başla', 'yıkılıp yeniden yap', 'anka kuşu'],
      visual: 'magnificent phoenix bird rising from flames and ashes, rebirth symbolism, wings spreading, fire becoming new life',
      mood: 'triumphant rebirth',
      lighting: 'fiery orange and gold, rising flames becoming light, majestic glow'
    },
    // ===== YENİ DEYİMLER - DÜŞÜNCE VE ALGI =====
    'mind_blown': {
      patterns: ['kafası pat', 'akıl almaz', 'inanamadı', 'şok', 'aklı git', 'donup kal', 'ağzı açık'],
      visual: 'person with exploding mind imagery, cosmic explosion from head, shocked wide eyes, brain fireworks, reality shattering',
      mood: 'utter astonishment',
      lighting: 'explosive bright light, cosmic effects, electric energy'
    },
    'crystal_clear': {
      patterns: ['kristal net', 'ap açık', 'belli', 'anla', 'kavra', 'sır çöz'],
      visual: 'fog clearing to reveal crystal landscape, puzzle pieces fitting together, lightbulb moment, clear water revealing truth',
      mood: 'perfect clarity',
      lighting: 'pure clean light, no shadows, pristine clarity'
    },
    'lost_in_thoughts': {
      patterns: ['dalgın', 'düşünceli', 'derin düşünce', 'kaybol', 'hayal kur', 'dalıp git'],
      visual: 'person staring into distance with dreamy expression, thought bubbles floating, abstract patterns emerging from head',
      mood: 'deep contemplation',
      lighting: 'soft unfocused background, spotlight on thinker, ethereal atmosphere'
    }
  };

  // Soyut kavramlar -> görsel temsiller (GENİŞLETİLMİŞ)
  const abstractConcepts: Record<string, { keywords: string[], visual: string }> = {
    // ===== TEMEL SOYUT KAVRAMLAR =====
    'time': {
      keywords: ['zaman', 'saat', 'dakika', 'saniye', 'geçmiş', 'gelecek', 'şimdi', 'an', 'süre', 'dönem', 'çağ', 'devir'],
      visual: 'flowing hourglass sand, intricate clock gears turning, time spiral vortex, aging face sequence, melting clocks like Dali'
    },
    'death': {
      keywords: ['ölüm', 'son', 'veda', 'kayıp', 'yitir', 'bitti', 'gitti', 'öldü', 'ölü', 'cenaze', 'mezar', 'son nefes'],
      visual: 'wilting black roses, autumn leaves falling into void, setting sun below horizon, empty chair with ghost outline, fading translucent figure'
    },
    'life': {
      keywords: ['hayat', 'yaşam', 'canlılık', 'nefes', 'doğum', 'başlangıç', 'var', 'yaşa', 'canlı', 'diri'],
      visual: 'blooming colorful flowers in timelapse, rising golden sun, growing tree with deep roots, newborn hands, spring awakening with butterflies'
    },
    'love': {
      keywords: ['aşk', 'sevgi', 'tutku', 'bağlılık', 'sadakat', 'özlem', 'sev', 'sevgili', 'aşık', 'gönül', 'kalp'],
      visual: 'intertwined hands of lovers, glowing hearts, warm tender embrace, couple silhouette at sunset, red roses with dew drops'
    },
    'hate': {
      keywords: ['nefret', 'kin', 'düşmanlık', 'öfke', 'tiksin', 'intikam', 'kin güt', 'lanetle'],
      visual: 'dark malevolent aura emanating, clenched white-knuckled fists, fire burning in eyes, cracked poisoned ground, venomous snake imagery'
    },
    'wisdom': {
      keywords: ['bilgelik', 'akıl', 'tecrübe', 'öğren', 'bilgi', 'anlayış', 'zeka', 'felsefe', 'ders', 'hikmet'],
      visual: 'ancient sage surrounded by floating books, wise owl on branch, glowing ancient scrolls, light of knowledge beam, enlightened buddha figure'
    },
    'chaos': {
      keywords: ['kaos', 'karmaşa', 'düzensizlik', 'kargaşa', 'çalkantı', 'karışık', 'allak bullak', 'darmadağın'],
      visual: 'swirling destructive vortex, scattered broken objects flying, shattered order, storm of conflicting elements, entropy visualization'
    },
    'order': {
      keywords: ['düzen', 'tertip', 'sıra', 'organizasyon', 'sistem', 'kural', 'disiplin', 'yapı'],
      visual: 'perfect geometric sacred patterns, precisely aligned objects, clean minimalist lines, balanced symmetrical composition, crystal lattice'
    },
    'destiny': {
      keywords: ['kader', 'yazgı', 'alınyazısı', 'mukadder', 'kaçınılmaz', 'kısmet', 'nasip', 'fal'],
      visual: 'red thread of fate connecting souls, cosmic star patterns, celestial bodies aligning, golden path leading to bright light, tarot cards'
    },
    'dream': {
      keywords: ['hayal', 'rüya', 'düş', 'fantezi', 'ütopya', 'hayal kur', 'düşle', 'kurgu'],
      visual: 'floating impossible elements, surreal Escher landscape, clouds forming ground, dreamlike soft distortion, sleeping figure with vision bubbles'
    },
    'reality': {
      keywords: ['gerçek', 'hakikat', 'somut', 'var olan', 'reel', 'maddi', 'elle tutulur'],
      visual: 'sharp hyper-focused photograph, mundane everyday objects, ordinary street scene, raw unfiltered truth, mirror reflection'
    },
    'infinity': {
      keywords: ['sonsuz', 'ebedi', 'sonsuza', 'bitmez', 'ölümsüz', 'sınırsız', 'uçsuz bucaksız'],
      visual: 'glowing infinity symbol, endless mirror corridor, deep space nebula, eternal flame that never dies, recursive fractal patterns'
    },
    'darkness': {
      keywords: ['karanlık', 'zifiri', 'kör', 'siyah', 'gölge', 'koyu', 'karartı', 'kasvet'],
      visual: 'deep impenetrable shadows, endless void, silhouettes lost in darkness, single candle struggling against black, abyss staring back'
    },
    'light': {
      keywords: ['ışık', 'aydınlık', 'parlak', 'nurlu', 'pırıl', 'parla', 'ışıl ışıl', 'aydınlat'],
      visual: 'radiant sun beams breaking through, glowing ethereal orbs, divine golden light rays, illuminated figure with halo, bioluminescence'
    },
    'war': {
      keywords: ['savaş', 'çatışma', 'harp', 'mücadele', 'kavga', 'savaşan', 'düşman', 'ordu'],
      visual: 'epic battlefield with armies, explosions and smoke, torn bloodied flags, weapons clashing, soldiers charging'
    },
    'peace': {
      keywords: ['barış', 'sulh', 'uzlaşma', 'huzur', 'sessizlik', 'sakin', 'uyum', 'denge'],
      visual: 'white dove carrying olive branch, calm still waters reflecting sky, warm handshake, serene meadow landscape, yin yang balance'
    },
    'wealth': {
      keywords: ['zengin', 'servet', 'para', 'altın', 'hazine', 'lüks', 'varlık', 'bolluk'],
      visual: 'overflowing gold coins and jewels, treasure chest bursting, luxurious palatial interior, diamond chandelier, opulent feast'
    },
    'poverty': {
      keywords: ['fakir', 'yoksul', 'sefalet', 'açlık', 'muhtaç', 'fukara', 'dilenci', 'yokluk'],
      visual: 'empty cupped hands begging, worn tattered clothes, simple crumbling shelter, hungry hollow eyes, barren cracked landscape'
    },
    // ===== YENİ SOYUT KAVRAMLAR - İNSAN DURUMLARI =====
    'loneliness': {
      keywords: ['yalnızlık', 'yalnız', 'tek', 'issız', 'terkedilmiş', 'kimsesiz', 'garip'],
      visual: 'single figure on empty bench, one person in vast crowd all backs turned, empty room with single chair, isolated island, rain on window alone'
    },
    'connection': {
      keywords: ['bağ', 'bağlantı', 'ilişki', 'birlik', 'beraberlik', 'ortaklık', 'dostluk'],
      visual: 'hands reaching and touching, network of glowing threads connecting people, bridge between two cliffs, puzzle pieces joining, roots intertwined'
    },
    'innocence': {
      keywords: ['masumiyet', 'masum', 'saf', 'temiz', 'arı', 'günahsız', 'çocuksu'],
      visual: 'child playing in sunlit meadow, white lamb, dewdrop on flower petal, curious wide eyes, untouched snow field, butterfly on finger'
    },
    'guilt': {
      keywords: ['suçluluk', 'suç', 'vicdan', 'pişmanlık', 'günah', 'utanç', 'mahcubiyet'],
      visual: 'heavy chains on shoulders, dark shadow following person, bloodstains that won\'t wash, haunted eyes in mirror, weight pressing down'
    },
    'redemption': {
      keywords: ['kurtuluş', 'kefaret', 'arınma', 'affedil', 'temizlen', 'bağışlan'],
      visual: 'figure rising from darkness into light, chains breaking and falling, washing in pure waterfall, phoenix rebirth, burden lifting from shoulders'
    },
    'memory': {
      keywords: ['anı', 'hatıra', 'geçmiş', 'hatırla', 'anımsa', 'nostalji', 'eskiden'],
      visual: 'faded sepia photographs floating, ghostly figures from past, childhood home imagery, memory fragments like broken glass, old diary pages'
    },
    'ambition': {
      keywords: ['hırs', 'tutku', 'hedef', 'amaç', 'istek', 'azim', 'kararlılık', 'başarı'],
      visual: 'person climbing endless staircase to stars, reaching hand toward distant peak, eagle soaring above clouds, arrow aimed at target, fire in eyes'
    },
    'regret': {
      keywords: ['pişmanlık', 'keşke', 'yazık', 'ah keşke', 'vicdan azabı', 'üzüntü'],
      visual: 'figure looking back at fork in road not taken, tears on old photograph, missed train departing, wilted flower in hand, could-have-been scenes fading'
    },
    // ===== YENİ SOYUT KAVRAMLAR - FELSEFİ =====
    'truth': {
      keywords: ['gerçek', 'doğru', 'hakikat', 'sahici', 'dürüst', 'içten', 'samimi'],
      visual: 'veil being lifted to reveal light, mirror showing true reflection, blindfold being removed, scales of justice balanced, crystal clear water'
    },
    'lie': {
      keywords: ['yalan', 'aldatma', 'hile', 'düzen', 'kandırma', 'sahte', 'uydurma'],
      visual: 'snake with forked tongue, mask hiding true face, puppet strings controlling, house of cards, smoke and mirrors, cracked facade'
    },
    'justice': {
      keywords: ['adalet', 'hak', 'hukuk', 'eşitlik', 'denge', 'ceza', 'ödül'],
      visual: 'balanced golden scales, blindfolded lady justice statue, gavel striking, equal portions being distributed, broken chains of oppression'
    },
    'injustice': {
      keywords: ['adaletsizlik', 'haksızlık', 'zulüm', 'eşitsizlik', 'ayrımcılık'],
      visual: 'broken unbalanced scales, chains on innocent, powerful stepping on weak, bars imprisoning wrongly, weighted dice, crooked scales'
    },
    'faith': {
      keywords: ['inanç', 'iman', 'güven', 'itikat', 'din', 'maneviyat', 'ruhaniyet'],
      visual: 'person praying with light descending, candle in darkness, hands reaching to sky, dove descending, rosary beads, spiritual aura, temple interior'
    },
    'doubt': {
      keywords: ['şüphe', 'tereddüt', 'kuşku', 'belirsizlik', 'kararsızlık', 'soru'],
      visual: 'forked path with question marks, person looking at two doors, fog obscuring path ahead, maze without clear exit, fractured reflection'
    },
    'courage': {
      keywords: ['cesaret', 'yürek', 'gözüpek', 'korkusuz', 'mert', 'yiğit', 'kahraman'],
      visual: 'small figure facing giant monster, standing alone against army, lion heart imagery, firefighter running into flames, first step off cliff'
    },
    'cowardice': {
      keywords: ['korkaklık', 'korkak', 'ürkek', 'pısırık', 'yılgın', 'kaçak'],
      visual: 'person cowering in shadow, running away from small challenge, hiding behind others, trembling hands, avoiding gaze, shrinking figure'
    },
    // ===== YENİ SOYUT KAVRAMLAR - DOĞA VE EVREN =====
    'nature': {
      keywords: ['doğa', 'tabiat', 'yeryüzü', 'çevre', 'ekosistem', 'vahşi'],
      visual: 'lush forest ecosystem teeming with life, waterfall in jungle, diverse wildlife harmony, earth from space showing blue and green, roots and branches'
    },
    'cosmos': {
      keywords: ['evren', 'kozmos', 'uzay', 'galaksi', 'yıldız', 'gezegen', 'nebula'],
      visual: 'vast spiral galaxy, nebula birth of stars, planets in orbit, astronaut floating in space, cosmic web of universe, meteor shower'
    },
    'creation': {
      keywords: ['yaratılış', 'oluşum', 'başlangıç', 'genesis', 'köken', 'kaynak'],
      visual: 'big bang explosion of light, hands sculpting from clay, artist at canvas, seed sprouting from earth, spark of life moment, first light'
    },
    'destruction': {
      keywords: ['yıkım', 'tahribat', 'harap', 'yok oluş', 'felaket', 'çöküş'],
      visual: 'crumbling ancient ruins, explosion destroying building, earthquake splitting ground, empire falling, ash and debris, entropy decay'
    },
    'cycle': {
      keywords: ['döngü', 'tekrar', 'çark', 'devir', 'sonsuz döngü', 'ouroboros'],
      visual: 'ouroboros snake eating tail, seasons wheel turning, moon phases circle, life cycle from birth to death, water cycle, eternal return'
    },
    // ===== YENİ SOYUT KAVRAMLAR - DUYGUSAL DURUMLAR =====
    'nostalgia': {
      keywords: ['özlem', 'hasret', 'sıla', 'vatan', 'aile', 'eski günler'],
      visual: 'sepia-toned childhood home, old toy forgotten in attic, faded family photograph, hometown skyline at sunset, grandmother\'s kitchen'
    },
    'melancholy': {
      keywords: ['hüzün', 'keder', 'elem', 'dert', 'tasa', 'gamlı', 'mahzun'],
      visual: 'rain on window with figure watching, willow tree by still pond, blue hour lonely scene, teardrop on cheek, gray autumn day'
    },
    'ecstasy': {
      keywords: ['vecd', 'kendinden geçme', 'coşku', 'esrime', 'zevk', 'sarhoşluk'],
      visual: 'person in rapture arms raised, transcendent dance, explosion of colors from figure, eyes rolled back in bliss, energy emanating'
    },
    'serenity': {
      keywords: ['sükunet', 'durgunluk', 'huzur', 'dinginlik', 'sükun', 'rahat'],
      visual: 'still lake at dawn, zen rock garden, sleeping baby, meditation lotus position, gentle stream, Buddha smile, mountain at peace'
    },
    'anxiety': {
      keywords: ['kaygı', 'endişe', 'tedirgin', 'gergin', 'panik', 'telaş'],
      visual: 'tangled threads around figure, clock hands spinning fast, person in corner with shadows closing in, heart racing imagery, maze with no exit'
    },
    'despair': {
      keywords: ['umutsuzluk', 'çaresizlik', 'karanlık', 'yeis', 'ümitsiz'],
      visual: 'figure collapsed at bottom of pit, endless dark tunnel with no light, reaching hand finding nothing, storm with no shelter, sinking'
    },
    // ===== YENİ SOYUT KAVRAMLAR - SOSYAL =====
    'revolution': {
      keywords: ['devrim', 'isyan', 'ayaklanma', 'başkaldırı', 'reform', 'değişim'],
      visual: 'raised fist breaking chains, crowd storming gates, old order crumbling, phoenix rising from ash, red flags waving, statue toppling'
    },
    'tradition': {
      keywords: ['gelenek', 'görenek', 'adet', 'töre', 'miras', 'kültür'],
      visual: 'elder passing scroll to young, ancient ceremony, ancestral home, family gathering around table, heritage artifacts, ritual performance'
    },
    'progress': {
      keywords: ['ilerleme', 'gelişme', 'modernleşme', 'yenilik', 'atılım'],
      visual: 'arrow pointing upward, rocket launch, evolution sequence, old to new transition, building rising, innovation sparks, technology advance'
    },
    'identity': {
      keywords: ['kimlik', 'benlik', 'özlük', 'karakter', 'kişilik', 'ben'],
      visual: 'mirror showing multiple reflections, mask being removed, fingerprint close-up, DNA helix, person looking at childhood photo of self'
    }
  };

  // Karmaşık cümle yapılarını analiz et
  const analyzeComplexSentence = (text: string): {
    subjects: string[],
    actions: string[],
    objects: string[],
    modifiers: string[],
    relationships: string[]
  } => {
    const lowerText = text.toLowerCase();

    // Özne kalıpları (kim/ne)
    const subjectPatterns = [
      /(?:bir\s+)?([a-zğüşöçı]+)\s+(?:idi|oldu|vardı|geldi|gitti|baktı|gördü|dedi)/gi,
      /([a-zğüşöçı]+)\s+(?:onun|onların|bunun)/gi,
      /^([a-zğüşöçı]+),?\s+/gim
    ];

    // Eylem kalıpları
    const actionPatterns = [
      /\s([a-zğüşöçı]+(?:dı|di|du|dü|tı|ti|tu|tü|yor|mak|mek|ecek|acak))\b/gi,
      /\s([a-zğüşöçı]+(?:arak|erek|ınca|ince|unca|ünce))\b/gi
    ];

    // Nesne kalıpları (neyi/kimi)
    const objectPatterns = [
      /([a-zğüşöçı]+)(?:ı|i|u|ü|yı|yi|yu|yü)\s+(?:gör|al|tut|bırak|at|koy)/gi,
      /\s([a-zğüşöçı]+)(?:a|e|ya|ye)\s+(?:bak|git|gel|dön)/gi
    ];

    // İlişki kalıpları
    const relationshipPatterns = [
      /([a-zğüşöçı]+)\s+ile\s+([a-zğüşöçı]+)/gi,
      /([a-zğüşöçı]+)\s+ve\s+([a-zğüşöçı]+)/gi,
      /([a-zğüşöçı]+)(?:\'nın|\'nin|\'nun|\'nün)\s+([a-zğüşöçı]+)/gi
    ];

    const subjects: string[] = [];
    const actions: string[] = [];
    const objects: string[] = [];
    const modifiers: string[] = [];
    const relationships: string[] = [];

    // Özne çıkar
    for (const pattern of subjectPatterns) {
      let match;
      while ((match = pattern.exec(lowerText)) !== null) {
        if (match[1] && match[1].length > 2) subjects.push(match[1]);
      }
    }

    // Sıfatları çıkar (renk, boyut, şekil)
    const modifierKeywords = [
      'büyük', 'küçük', 'uzun', 'kısa', 'geniş', 'dar', 'kalın', 'ince',
      'güzel', 'çirkin', 'yaşlı', 'genç', 'eski', 'yeni', 'hızlı', 'yavaş',
      'sıcak', 'soğuk', 'yumuşak', 'sert', 'parlak', 'mat', 'koyu', 'açık'
    ];
    for (const mod of modifierKeywords) {
      if (lowerText.includes(mod)) modifiers.push(mod);
    }

    return { subjects, actions, objects, modifiers, relationships };
  };

  // GELİŞMİŞ Deyim ve mecaz algılama - TÜM deyimleri algılar ve birleştirir
  const detectIdiomsAndMetaphors = (text: string): {
    idiom: string | null,
    visual: string,
    mood: string,
    lighting: string
  } => {
    const lowerText = text.toLowerCase();
    const allDetected: Array<{ key: string, visual: string, mood: string, lighting: string, priority: number }> = [];

    // Öncelik sıralaması için pattern uzunluğuna göre sırala
    for (const [idiomKey, { patterns, visual, mood, lighting }] of Object.entries(idiomPatterns)) {
      for (const pattern of patterns) {
        if (lowerText.includes(pattern)) {
          allDetected.push({
            key: idiomKey,
            visual,
            mood,
            lighting,
            priority: pattern.length // Uzun pattern = daha spesifik = daha yüksek öncelik
          });
          break; // Bu deyim için bir pattern bulundu, diğerlerine geç
        }
      }
    }

    if (allDetected.length === 0) {
      return { idiom: null, visual: '', mood: '', lighting: '' };
    }

    // Önceliğe göre sırala
    allDetected.sort((a, b) => b.priority - a.priority);

    // Birden fazla deyim varsa birleştir
    if (allDetected.length > 1) {
      const combinedVisuals = allDetected.slice(0, 3).map(d => d.visual).join(', blending with ');
      const primaryMood = allDetected[0].mood;
      const secondaryMood = allDetected.length > 1 ? ` transitioning to ${allDetected[1].mood}` : '';

      return {
        idiom: allDetected.map(d => d.key).join(' + '),
        visual: combinedVisuals,
        mood: primaryMood + secondaryMood,
        lighting: allDetected[0].lighting
      };
    }

    return {
      idiom: allDetected[0].key,
      visual: allDetected[0].visual,
      mood: allDetected[0].mood,
      lighting: allDetected[0].lighting
    };
  };

  // GELİŞMİŞ Çoklu deyim algılama - Detaylı liste döndürür
  const detectAllIdioms = (text: string): Array<{
    key: string,
    visual: string,
    mood: string,
    lighting: string
  }> => {
    const lowerText = text.toLowerCase();
    const detected: Array<{ key: string, visual: string, mood: string, lighting: string }> = [];

    for (const [idiomKey, { patterns, visual, mood, lighting }] of Object.entries(idiomPatterns)) {
      for (const pattern of patterns) {
        if (lowerText.includes(pattern)) {
          detected.push({ key: idiomKey, visual, mood, lighting });
          break;
        }
      }
    }

    return detected;
  };

  // GELİŞMİŞ Soyut kavram algılama - Kavram adı ve görselini döndürür
  const detectAbstractConcepts = (text: string): string[] => {
    const lowerText = text.toLowerCase();
    const detectedConcepts: string[] = [];

    for (const [concept, { keywords, visual }] of Object.entries(abstractConcepts)) {
      for (const keyword of keywords) {
        if (findWithSuffixes(lowerText, keyword)) {
          detectedConcepts.push(visual);
          break;
        }
      }
    }

    return detectedConcepts;
  };

  // GELİŞMİŞ Kavram detayı döndürme
  const detectAbstractConceptsDetailed = (text: string): Array<{ concept: string, visual: string }> => {
    const lowerText = text.toLowerCase();
    const detected: Array<{ concept: string, visual: string }> = [];

    for (const [concept, { keywords, visual }] of Object.entries(abstractConcepts)) {
      for (const keyword of keywords) {
        if (findWithSuffixes(lowerText, keyword)) {
          detected.push({ concept, visual });
          break;
        }
      }
    }

    return detected;
  };

  // ===== BAĞLAMSAL İLİŞKİ ALGILAMA =====
  // Karşıt kavramları algıla (örn: "ışık ve karanlık", "sevgi ve nefret")
  const detectContrastingConcepts = (text: string): { hasContrast: boolean, visual: string } => {
    const lowerText = text.toLowerCase();

    const contrasts = [
      { pair: ['ışık', 'karanlık'], visual: 'stark contrast between light and shadow, yin yang duality, half illuminated half dark' },
      { pair: ['sevgi', 'nefret'], visual: 'love hate duality, rose with thorns, beautiful yet dangerous' },
      { pair: ['hayat', 'ölüm'], visual: 'life death cycle, skeleton and newborn, withering and blooming simultaneously' },
      { pair: ['geçmiş', 'gelecek'], visual: 'past meets future, old and new juxtaposed, time bridge' },
      { pair: ['umut', 'umutsuzluk'], visual: 'hope amidst despair, single flower in wasteland, light crack in darkness' },
      { pair: ['savaş', 'barış'], visual: 'war and peace imagery, dove on cannon, soldiers embracing' },
      { pair: ['zengin', 'fakir'], visual: 'wealth poverty contrast, divided world, mansion next to slum' },
      { pair: ['gerçek', 'hayal'], visual: 'reality dream blur, surreal transition, waking dreaming merge' },
      { pair: ['düzen', 'kaos'], visual: 'order chaos boundary, organized mess, entropy edge' },
      { pair: ['cesaret', 'korku'], visual: 'courage fear duality, brave heart trembling hands, facing fear' },
    ];

    for (const { pair, visual } of contrasts) {
      const hasFirst = pair[0].split(' ').some(w => lowerText.includes(w));
      const hasSecond = pair[1].split(' ').some(w => lowerText.includes(w));
      if (hasFirst && hasSecond) {
        return { hasContrast: true, visual };
      }
    }

    return { hasContrast: false, visual: '' };
  };

  // Metaforik renk algılama
  const detectMetaphoricColors = (text: string): { color: string | null, meaning: string, visual: string } => {
    const lowerText = text.toLowerCase();

    const colorMetaphors = [
      { patterns: ['siyah gün', 'kara gün', 'kara haber'], color: 'black', meaning: 'tragedy', visual: 'dark ominous atmosphere, black clouds, mourning imagery' },
      { patterns: ['beyaz sayfa', 'temiz sayfa', 'ak pak'], color: 'white', meaning: 'purity', visual: 'pristine white environment, clean slate, innocent light' },
      { patterns: ['kırmızı görmek', 'kan kırmızı', 'al kan'], color: 'red', meaning: 'anger/passion', visual: 'intense red tones, blood red accents, passionate fire' },
      { patterns: ['maviye boyamak', 'mavi ruh', 'hüzün mavisi'], color: 'blue', meaning: 'sadness', visual: 'melancholic blue tones, sad blue hour, blue tears' },
      { patterns: ['yeşil gözlü', 'kıskanç'], color: 'green', meaning: 'jealousy', visual: 'envious green aura, jealousy imagery, green-eyed monster' },
      { patterns: ['altın değer', 'altın kalp', 'altın gibi'], color: 'gold', meaning: 'precious', visual: 'golden glow, precious golden light, treasure imagery' },
      { patterns: ['gri bölge', 'belirsiz', 'ne siyah ne beyaz'], color: 'gray', meaning: 'ambiguity', visual: 'gray ambiguous atmosphere, fog of uncertainty, muted tones' },
      { patterns: ['mor hayaller', 'hayal dünyası'], color: 'purple', meaning: 'imagination', visual: 'dreamy purple haze, imaginative purple clouds, fantasy purple' },
    ];

    for (const { patterns, color, meaning, visual } of colorMetaphors) {
      if (patterns.some(p => lowerText.includes(p))) {
        return { color, meaning, visual };
      }
    }

    return { color: null, meaning: '', visual: '' };
  };

  // ===== KARMAŞIK İSTEK ANALİZİ =====

  // 1. Niyet/İstek algılama - kullanıcının ne istediğini anla
  const detectIntentAndDesire = (text: string): {
    hasIntent: boolean,
    intentType: string,
    visual: string,
    mood: string
  } => {
    const lowerText = text.toLowerCase();

    const intentPatterns = [
      // İstek/Arzu
      { patterns: ['istiyorum', 'istiyor', 'istedim', 'ister', 'arzul', 'dilek', 'temenni', 'umut ed'],
        type: 'desire', visual: 'yearning expression, reaching hands, hopeful gaze toward goal, desire symbolism', mood: 'longing' },
      // Kaçınma/Korku
      { patterns: ['istemiy', 'korkuyor', 'kaçın', 'uzak dur', 'reddet', 'çekin'],
        type: 'avoidance', visual: 'backing away, defensive posture, fear in eyes, protective gesture', mood: 'fearful avoidance' },
      // Arayış/Keşif
      { patterns: ['arıyor', 'arıyorum', 'aradım', 'bul', 'keşfet', 'merak', 'sorgula'],
        type: 'seeking', visual: 'searching gaze, exploring posture, discovery moment, curiosity expression', mood: 'curious exploration' },
      // Bekleme/Sabır
      { patterns: ['bekliyor', 'bekliyorum', 'sabır', 'süre', 'umut'],
        type: 'waiting', visual: 'patient waiting posture, looking at horizon, time passing imagery', mood: 'patient anticipation' },
      // Hatırlama/Nostalji
      { patterns: ['hatırl', 'anımsa', 'geçmiş', 'eskiden', 'zamanlar'],
        type: 'remembering', visual: 'distant gaze, sepia memory overlay, past scenes fading in background', mood: 'nostalgic remembrance' },
      // Karar verme
      { patterns: ['karar ver', 'seçmek', 'tercih', 'iki yol', 'ya da'],
        type: 'deciding', visual: 'crossroads imagery, forked path, weighing options, contemplative stance', mood: 'decisive moment' },
      // Hayal kurma
      { patterns: ['hayal', 'düşle', 'fantezi', 'rüya gör', 'imgele'],
        type: 'dreaming', visual: 'dream bubbles, fantasy clouds, surreal floating elements, soft focus', mood: 'dreamy fantasy' },
      // Mücadele/Çaba
      { patterns: ['mücadele', 'çabal', 'uğraş', 'savaş', 'direniş', 'hayatta kal'],
        type: 'struggling', visual: 'struggling against obstacles, determination in face, fighting spirit', mood: 'determined struggle' },
    ];

    for (const { patterns, type, visual, mood } of intentPatterns) {
      if (patterns.some(p => lowerText.includes(p))) {
        return { hasIntent: true, intentType: type, visual, mood };
      }
    }

    return { hasIntent: false, intentType: '', visual: '', mood: '' };
  };

  // 2. Koşullu/Varsayımsal durum algılama
  const detectConditionalMood = (text: string): {
    isConditional: boolean,
    conditionType: string,
    visual: string,
    atmosphere: string
  } => {
    const lowerText = text.toLowerCase();

    const conditionalPatterns = [
      // Keşke - pişmanlık/özlem
      { patterns: ['keşke', 'keşki', 'ah keşke', 'bir bilseydi'],
        type: 'regret_wish', visual: 'ghost of alternate reality, faded what-could-have-been scene, melancholic longing', atmosphere: 'bittersweet regret' },
      // Sanki - benzetme/hayal
      { patterns: ['sanki', 'güya', 'adeta', 'tıpkı', 'gibi görün'],
        type: 'as_if', visual: 'reality bending, dreamlike quality, surreal comparison overlay', atmosphere: 'surreal dreamscape' },
      // Eğer - koşul
      { patterns: ['eğer', 'şayet', 'olsa', 'olsaydı', 'varsayalım'],
        type: 'conditional', visual: 'two parallel realities, split scene, branching paths', atmosphere: 'uncertain possibility' },
      // Belki - olasılık
      { patterns: ['belki', 'muhtemelen', 'olabilir', 'ihtimal', 'şans'],
        type: 'possibility', visual: 'probability visualization, dice rolling, uncertain fog edges', atmosphere: 'uncertain potential' },
      // Imkansız
      { patterns: ['imkansız', 'olamaz', 'asla', 'hiçbir zaman', 'mümkün değil'],
        type: 'impossible', visual: 'shattered impossible scene, breaking reality, forbidden imagery', atmosphere: 'absolute impossibility' },
    ];

    for (const { patterns, type, visual, atmosphere } of conditionalPatterns) {
      if (patterns.some(p => lowerText.includes(p))) {
        return { isConditional: true, conditionType: type, visual, atmosphere };
      }
    }

    return { isConditional: false, conditionType: '', visual: '', atmosphere: '' };
  };

  // 3. Zamansal ifade algılama
  const detectTemporalExpressions = (text: string): {
    hasTemporal: boolean,
    temporalType: string,
    visual: string,
    pacing: string
  } => {
    const lowerText = text.toLowerCase();

    const temporalPatterns = [
      // Ani/Hızlı
      { patterns: ['aniden', 'birden', 'birdenbire', 'ansızın', 'pat diye', 'şak diye'],
        type: 'sudden', visual: 'motion blur, freeze frame at impact moment, sudden action capture', pacing: 'explosive instant' },
      // Yavaş/Ağır
      { patterns: ['yavaşça', 'ağır ağır', 'yavaş yavaş', 'usul usul', 'süzül'],
        type: 'slow', visual: 'slow motion effect, graceful flowing movement, time stretched', pacing: 'slow contemplative' },
      // Devamlı/Sürekli
      { patterns: ['hep', 'sürekli', 'durmadan', 'devamlı', 'boyunca', 'kesintisiz'],
        type: 'continuous', visual: 'ongoing action, loop imagery, persistent movement', pacing: 'continuous flow' },
      // Sonra/Ardından
      { patterns: ['sonra', 'ardından', 'akabinde', 'bunun üzerine', 'peşinden'],
        type: 'sequence', visual: 'sequential panels, before-after composition, time progression', pacing: 'sequential narrative' },
      // Önce/Evvel
      { patterns: ['önce', 'evvel', 'önceden', 'daha önce', 'başlangıçta'],
        type: 'before', visual: 'flashback vignette, faded earlier scene, origin moment', pacing: 'backstory reveal' },
      // Şimdi/An
      { patterns: ['şimdi', 'şu an', 'tam o anda', 'bu dakika', 'işte'],
        type: 'present', visual: 'crystal clear present moment, sharp focus, immediate action', pacing: 'immediate now' },
      // Geleceğe dönük
      { patterns: ['yakında', 'birazdan', 'ileride', 'gelecekte', 'bir gün'],
        type: 'future', visual: 'hazy future vision, prophetic glimpse, coming events silhouette', pacing: 'anticipated future' },
    ];

    for (const { patterns, type, visual, pacing } of temporalPatterns) {
      if (patterns.some(p => lowerText.includes(p))) {
        return { hasTemporal: true, temporalType: type, visual, pacing };
      }
    }

    return { hasTemporal: false, temporalType: '', visual: '', pacing: '' };
  };

  // 4. Çoklu karakter etkileşimi algılama
  const detectCharacterInteraction = (text: string): {
    hasInteraction: boolean,
    interactionType: string,
    visual: string,
    dynamicPose: string
  } => {
    const lowerText = text.toLowerCase();

    const interactionPatterns = [
      // Diyalog/Konuşma
      { patterns: ['konuştu', 'dedi', 'sordu', 'cevapladı', 'söyledi', 'bağırdı', 'fısıldadı'],
        type: 'dialogue', visual: 'two characters facing each other, conversation poses, speech dynamics', dynamicPose: 'conversational stance' },
      // Fiziksel temas
      { patterns: ['dokundu', 'tuttu', 'sarıldı', 'öptü', 'kucakladı', 'elini uzattı', 'omzuna'],
        type: 'physical_contact', visual: 'intimate touch moment, connected poses, physical closeness', dynamicPose: 'touching embrace' },
      // Çatışma/Kavga
      { patterns: ['vurdu', 'saldırdı', 'kavga', 'dövüştü', 'itişti', 'kapıştı'],
        type: 'conflict', visual: 'fighting poses, combat dynamics, aggressive confrontation', dynamicPose: 'combat stance' },
      // Takip/Kovalama
      { patterns: ['kovaladı', 'takip', 'peşinden', 'arkasından', 'kaçtı'],
        type: 'chase', visual: 'pursuit scene, running chase, hunter and hunted dynamic', dynamicPose: 'chase motion' },
      // Birlikte hareket
      { patterns: ['birlikte', 'beraber', 'yanyana', 'el ele', 'omuz omuza'],
        type: 'together', visual: 'unified movement, side by side, synchronized action', dynamicPose: 'unified stance' },
      // Karşılaşma/Buluşma
      { patterns: ['karşılaştı', 'rastladı', 'buluştu', 'gördü', 'tanıdı'],
        type: 'encounter', visual: 'meeting moment, recognition scene, encounter composition', dynamicPose: 'meeting pose' },
      // Vedalaşma/Ayrılık
      { patterns: ['veda', 'ayrıl', 'hoşça kal', 'gitti', 'terk', 'bıraktı'],
        type: 'farewell', visual: 'parting scene, waving goodbye, separated figures, growing distance', dynamicPose: 'farewell gesture' },
      // Koruma/Savunma
      { patterns: ['korudu', 'savundu', 'kalkan oldu', 'önüne geçti', 'siper'],
        type: 'protection', visual: 'protective stance, shielding pose, guardian position', dynamicPose: 'protective shield' },
    ];

    for (const { patterns, type, visual, dynamicPose } of interactionPatterns) {
      if (patterns.some(p => lowerText.includes(p))) {
        return { hasInteraction: true, interactionType: type, visual, dynamicPose };
      }
    }

    return { hasInteraction: false, interactionType: '', visual: '', dynamicPose: '' };
  };

  // 5. Anlatım perspektifi algılama
  const detectNarrativePerspective = (text: string): {
    perspective: string,
    visual: string,
    cameraApproach: string
  } => {
    const lowerText = text.toLowerCase();

    // Birinci tekil şahıs (Ben)
    const firstPersonSingular = ['ben ', 'benim', 'bana', 'beni', 'benimle', '-dim', '-dım', '-düm', '-dum', 'gördüm', 'hissettim', 'düşündüm'];
    // Birinci çoğul şahıs (Biz)
    const firstPersonPlural = ['biz ', 'bizim', 'bize', 'bizi', '-dik', '-dık', '-dük', '-duk'];
    // İkinci şahıs (Sen)
    const secondPerson = ['sen ', 'senin', 'sana', 'seni', '-din', '-dın', '-dün', '-dun'];
    // Üçüncü şahıs (O)
    const thirdPerson = ['o ', 'onun', 'ona', 'onu', 'onlar', '-di', '-dı', '-dü', '-du'];

    let firstSingularCount = firstPersonSingular.filter(p => lowerText.includes(p)).length;
    let firstPluralCount = firstPersonPlural.filter(p => lowerText.includes(p)).length;
    let secondCount = secondPerson.filter(p => lowerText.includes(p)).length;
    let thirdCount = thirdPerson.filter(p => lowerText.includes(p)).length;

    // En yüksek sayıya göre perspektif belirle
    const max = Math.max(firstSingularCount, firstPluralCount, secondCount, thirdCount);

    if (max === 0 || thirdCount >= max) {
      return {
        perspective: 'third_person',
        visual: 'objective observer view, character from outside, omniscient framing',
        cameraApproach: 'third person cinematic, external observer angle'
      };
    }
    if (firstSingularCount >= max) {
      return {
        perspective: 'first_person',
        visual: 'subjective POV elements, personal intimate view, internal experience',
        cameraApproach: 'first person POV shot, subjective camera angle'
      };
    }
    if (firstPluralCount >= max) {
      return {
        perspective: 'first_person_plural',
        visual: 'group perspective, collective experience, shared viewpoint',
        cameraApproach: 'group shot, inclusive framing, we-perspective'
      };
    }
    if (secondCount >= max) {
      return {
        perspective: 'second_person',
        visual: 'direct address composition, viewer involvement, you-are-there feeling',
        cameraApproach: 'direct address angle, immersive second person view'
      };
    }

    return {
      perspective: 'third_person',
      visual: 'objective observer view',
      cameraApproach: 'third person cinematic'
    };
  };

  // 6. Sembolik nesne algılama
  const detectSymbolicObjects = (text: string): Array<{
    object: string,
    symbolism: string,
    visual: string
  }> => {
    const lowerText = text.toLowerCase();

    const symbolicObjects = [
      // Doğa sembolleri
      { patterns: ['gül', 'güller'], object: 'rose', symbolism: 'love, passion, beauty', visual: 'symbolic red rose, romantic flower imagery' },
      { patterns: ['dikenli', 'diken'], object: 'thorns', symbolism: 'pain, protection, sacrifice', visual: 'sharp thorns, painful beauty contrast' },
      { patterns: ['kelebek'], object: 'butterfly', symbolism: 'transformation, freedom, soul', visual: 'butterfly metamorphosis, delicate wings, transformation symbol' },
      { patterns: ['kuş', 'serçe', 'güvercin'], object: 'bird', symbolism: 'freedom, spirit, hope', visual: 'bird in flight, freedom wings, soaring spirit' },
      { patterns: ['ağaç', 'meşe', 'çınar'], object: 'tree', symbolism: 'life, growth, ancestry', visual: 'majestic tree, roots and branches, tree of life' },
      { patterns: ['su', 'nehir', 'dere'], object: 'water', symbolism: 'emotion, purification, flow', visual: 'flowing water, emotional currents, cleansing stream' },
      { patterns: ['ateş', 'alev', 'yangın'], object: 'fire', symbolism: 'passion, destruction, rebirth', visual: 'flames dancing, passionate fire, transformative blaze' },
      // İnsan yapımı semboller
      { patterns: ['ayna'], object: 'mirror', symbolism: 'self-reflection, truth, duality', visual: 'mirror reflection, self-examination, truth revealed' },
      { patterns: ['kapı'], object: 'door', symbolism: 'opportunity, transition, mystery', visual: 'doorway to unknown, threshold moment, portal imagery' },
      { patterns: ['pencere'], object: 'window', symbolism: 'hope, perspective, longing', visual: 'window looking out, hopeful gaze, framed view' },
      { patterns: ['köprü'], object: 'bridge', symbolism: 'connection, transition, overcoming', visual: 'bridge spanning gap, connection across divide, crossing threshold' },
      { patterns: ['merdiven'], object: 'stairs', symbolism: 'progress, journey, spiritual ascent', visual: 'ascending staircase, upward journey, spiritual climb' },
      { patterns: ['saat'], object: 'clock', symbolism: 'mortality, urgency, passing time', visual: 'clock ticking, time pressure, mortality reminder' },
      { patterns: ['zincir'], object: 'chain', symbolism: 'bondage, connection, restriction', visual: 'chains binding, connection links, restriction imagery' },
      { patterns: ['anahtar'], object: 'key', symbolism: 'access, secrets, solutions', visual: 'golden key, unlocking secrets, solution symbol' },
      { patterns: ['maske'], object: 'mask', symbolism: 'deception, hidden identity, performance', visual: 'mask concealing, hidden face, performance persona' },
      // Fantastik/Mitolojik
      { patterns: ['taç', 'kron'], object: 'crown', symbolism: 'power, authority, achievement', visual: 'royal crown, authority symbol, achievement crown' },
      { patterns: ['kılıç'], object: 'sword', symbolism: 'justice, courage, conflict', visual: 'gleaming sword, justice blade, warrior courage' },
      { patterns: ['kalkan'], object: 'shield', symbolism: 'protection, defense, faith', visual: 'protective shield, defensive stance, faith shield' },
    ];

    const detected: Array<{ object: string, symbolism: string, visual: string }> = [];

    for (const { patterns, object, symbolism, visual } of symbolicObjects) {
      if (patterns.some(p => lowerText.includes(p))) {
        detected.push({ object, symbolism, visual });
      }
    }

    return detected.slice(0, 5); // En fazla 5 sembol
  };

  // 7. Duyusal detay algılama (sesler, kokular, dokular)
  const detectSensoryDetails = (text: string): {
    sounds: string[],
    smells: string[],
    textures: string[],
    tastes: string[],
    visual: string
  } => {
    const lowerText = text.toLowerCase();

    // Ses kalıpları
    const soundPatterns = [
      { patterns: ['sessiz', 'sessizlik', 'sükut'], sound: 'complete silence, soundless void' },
      { patterns: ['gürültü', 'gürült', 'patırtı'], sound: 'loud noise, chaotic sounds' },
      { patterns: ['fısıltı', 'fısılda'], sound: 'soft whispers, quiet murmurs' },
      { patterns: ['çığlık', 'bağır', 'haykır'], sound: 'screaming, loud cry' },
      { patterns: ['müzik', 'melodi', 'şarkı'], sound: 'music playing, melodic atmosphere' },
      { patterns: ['rüzgar sesi', 'rüzgar', 'uğultu'], sound: 'wind howling, breeze sounds' },
      { patterns: ['yağmur sesi', 'damla'], sound: 'rain drops, water sounds' },
      { patterns: ['gök gürültüsü', 'şimşek'], sound: 'thunder rumbling, storm sounds' },
      { patterns: ['kuş sesi', 'cıvıltı', 'ötüş'], sound: 'birdsong, chirping' },
      { patterns: ['ayak sesi', 'adım'], sound: 'footsteps echoing' },
    ];

    // Koku kalıpları
    const smellPatterns = [
      { patterns: ['çiçek kokusu', 'gül kokusu', 'parfüm'], smell: 'floral fragrance, sweet scent' },
      { patterns: ['yemek kokusu', 'lezzetli koku'], smell: 'delicious food aroma' },
      { patterns: ['duman kokusu', 'yanık'], smell: 'smoke smell, burning scent' },
      { patterns: ['yağmur kokusu', 'toprak kokusu', 'ıslak'], smell: 'petrichor, rain on earth' },
      { patterns: ['deniz kokusu', 'tuzlu'], smell: 'ocean salt, sea breeze' },
      { patterns: ['orman', 'çam', 'ağaç kokusu'], smell: 'forest pine, woody scent' },
      { patterns: ['pis koku', 'leş', 'çürük'], smell: 'foul stench, decay' },
    ];

    // Doku kalıpları
    const texturePatterns = [
      { patterns: ['yumuşak', 'kadife', 'ipek'], texture: 'soft silky texture' },
      { patterns: ['sert', 'kaba', 'pürüzlü'], texture: 'rough hard texture' },
      { patterns: ['ıslak', 'nemli', 'kaygan'], texture: 'wet slippery surface' },
      { patterns: ['kuru', 'çatlamış', 'kurak'], texture: 'dry cracked texture' },
      { patterns: ['sıcak', 'ılık', 'yakıcı'], texture: 'warm hot surface' },
      { patterns: ['soğuk', 'buz gibi', 'dondurucu'], texture: 'cold icy touch' },
      { patterns: ['tüylü', 'kürk'], texture: 'furry soft fur' },
      { patterns: ['metalik', 'metal'], texture: 'cold metallic surface' },
    ];

    // Tat kalıpları
    const tastePatterns = [
      { patterns: ['tatlı', 'şeker'], taste: 'sweet flavor' },
      { patterns: ['acı', 'ekşi'], taste: 'bitter sour taste' },
      { patterns: ['tuzlu'], taste: 'salty taste' },
      { patterns: ['baharatlı', 'acılı'], taste: 'spicy hot flavor' },
    ];

    const sounds: string[] = [];
    const smells: string[] = [];
    const textures: string[] = [];
    const tastes: string[] = [];

    for (const { patterns, sound } of soundPatterns) {
      if (patterns.some(p => lowerText.includes(p))) sounds.push(sound);
    }
    for (const { patterns, smell } of smellPatterns) {
      if (patterns.some(p => lowerText.includes(p))) smells.push(smell);
    }
    for (const { patterns, texture } of texturePatterns) {
      if (patterns.some(p => lowerText.includes(p))) textures.push(texture);
    }
    for (const { patterns, taste } of tastePatterns) {
      if (patterns.some(p => lowerText.includes(p))) tastes.push(taste);
    }

    // Görsel birleştirme
    let visual = '';
    if (sounds.length > 0) visual += `auditory atmosphere: ${sounds.join(', ')}`;
    if (smells.length > 0) visual += visual ? `, olfactory hint: ${smells.join(', ')}` : `atmospheric scent: ${smells.join(', ')}`;
    if (textures.length > 0) visual += visual ? `, tactile quality: ${textures.join(', ')}` : `surface detail: ${textures.join(', ')}`;

    return { sounds, smells, textures, tastes, visual };
  };

  // 8. Mekansal ilişki algılama
  const detectSpatialRelations = (text: string): {
    hasSpatial: boolean,
    spatial: string,
    composition: string
  } => {
    const lowerText = text.toLowerCase();

    const spatialPatterns = [
      { patterns: ['yukarıda', 'üstünde', 'tepesinde', 'gökte'], spatial: 'above', composition: 'subject positioned above, looking up composition' },
      { patterns: ['aşağıda', 'altında', 'dipte', 'yerde'], spatial: 'below', composition: 'subject below, looking down angle' },
      { patterns: ['arkasında', 'gerisinde', 'ötesinde'], spatial: 'behind', composition: 'depth layering, background emphasis' },
      { patterns: ['önünde', 'karşısında', 'yüzünde'], spatial: 'in_front', composition: 'foreground focus, direct facing' },
      { patterns: ['yanında', 'bitişiğinde', 'yakınında'], spatial: 'beside', composition: 'side by side composition, horizontal balance' },
      { patterns: ['içinde', 'ortasında', 'merkezinde'], spatial: 'inside', composition: 'enclosed space, interior framing, central focus' },
      { patterns: ['dışında', 'uzağında', 'ötede'], spatial: 'outside', composition: 'exterior view, distance emphasized' },
      { patterns: ['etrafında', 'çevresinde', 'kuşatarak'], spatial: 'around', composition: 'surrounding elements, circular composition' },
      { patterns: ['arasında', 'ortasında'], spatial: 'between', composition: 'positioned between elements, transitional space' },
    ];

    for (const { patterns, spatial, composition } of spatialPatterns) {
      if (patterns.some(p => lowerText.includes(p))) {
        return { hasSpatial: true, spatial, composition };
      }
    }

    return { hasSpatial: false, spatial: '', composition: '' };
  };

  // 9. Karmaşık cümle analizi - Birden fazla olay/durum
  const analyzeComplexNarrative = (text: string): {
    hasMultipleEvents: boolean,
    events: string[],
    narrative: string
  } => {
    const lowerText = text.toLowerCase();

    // Birden fazla olay göstergeleri
    const multiEventIndicators = [
      'aynı anda', 've', 'hem...hem', 'iken', 'sırada', 'bir yandan', 'öte yandan',
      'fakat', 'ama', 'ancak', 'lakin', 'oysa', 'rağmen', 'karşın'
    ];

    const hasMultiple = multiEventIndicators.filter(i => lowerText.includes(i)).length >= 2;

    if (!hasMultiple) {
      return { hasMultipleEvents: false, events: [], narrative: 'single focused scene' };
    }

    // Olayları ayırmaya çalış
    const eventSeparators = /(?:ve|ama|fakat|ancak|iken|sırada)\s+/gi;
    const eventParts = text.split(eventSeparators).filter(p => p.trim().length > 10);

    return {
      hasMultipleEvents: true,
      events: eventParts.slice(0, 3), // En fazla 3 olay
      narrative: 'multi-layered scene, split composition showing simultaneous events'
    };
  };

  // 10. Tür/Genre algılama
  const detectGenre = (text: string): { genre: string, visual: string, atmosphere: string, colorScheme: string } => {
    const lowerText = text.toLowerCase();
    const genrePatterns = [
      { patterns: ['korku', 'dehşet', 'kabus', 'hayalet', 'lanet', 'ürperti', 'vampir', 'zombi', 'canavar', 'cehennem', 'şeytan'],
        genre: 'horror', visual: 'horror movie aesthetic, terrifying atmosphere', atmosphere: 'dread and terror', colorScheme: 'dark desaturated with blood red' },
      { patterns: ['aşk', 'sevgi', 'tutku', 'öpücük', 'sarıl', 'kalp', 'romantik', 'sevgili', 'flört', 'çift', 'evlilik', 'düğün'],
        genre: 'romance', visual: 'romantic movie aesthetic, soft focus, dreamy', atmosphere: 'warm and intimate', colorScheme: 'warm pinks, soft reds, golden hour' },
      { patterns: ['uzay', 'galaksi', 'robot', 'yapay zeka', 'gelecek', 'teknoloji', 'lazer', 'uzay gemisi', 'hologram', 'siber'],
        genre: 'sci-fi', visual: 'science fiction aesthetic, futuristic technology', atmosphere: 'technological wonder', colorScheme: 'cool blues, neon accents' },
      { patterns: ['büyü', 'sihir', 'ejderha', 'peri', 'elf', 'krallık', 'kılıç', 'büyücü', 'efsane', 'mitoloji', 'destan'],
        genre: 'fantasy', visual: 'high fantasy aesthetic, magical elements', atmosphere: 'magical and wondrous', colorScheme: 'rich purples, mystical greens' },
      { patterns: ['savaş', 'kavga', 'patlama', 'kaçış', 'takip', 'tehlike', 'macera', 'keşif', 'hazine', 'kahraman'],
        genre: 'action', visual: 'action movie aesthetic, dynamic movement', atmosphere: 'adrenaline-pumping', colorScheme: 'high contrast, explosive oranges' },
      { patterns: ['gerilim', 'şüphe', 'gizem', 'cinayet', 'dedektif', 'suç', 'hırsız', 'komplo', 'ihanet'],
        genre: 'thriller', visual: 'thriller aesthetic, tension-filled, noir', atmosphere: 'suspenseful', colorScheme: 'dark noir, harsh shadows' },
      { patterns: ['acı', 'kayıp', 'ölüm', 'veda', 'hüzün', 'gözyaşı', 'pişmanlık', 'vicdan', 'ayrılık'],
        genre: 'drama', visual: 'dramatic movie aesthetic, emotional depth', atmosphere: 'emotionally heavy', colorScheme: 'muted tones, melancholic blues' },
      { patterns: ['osmanlı', 'roma', 'yunan', 'mısır', 'ortaçağ', 'antik', 'imparatorluk', 'sultan', 'padişah'],
        genre: 'historical', visual: 'period drama aesthetic, historically accurate', atmosphere: 'epic historical', colorScheme: 'earthy period-accurate colors' },
    ];
    for (const { patterns, genre, visual, atmosphere, colorScheme } of genrePatterns) {
      const matchCount = patterns.filter(p => lowerText.includes(p)).length;
      if (matchCount >= 2) return { genre, visual, atmosphere, colorScheme };
    }
    for (const { patterns, genre, visual, atmosphere, colorScheme } of genrePatterns) {
      if (patterns.some(p => lowerText.includes(p))) return { genre, visual, atmosphere, colorScheme };
    }
    return { genre: 'general', visual: '', atmosphere: '', colorScheme: '' };
  };

  // 11. Diyalog tonu algılama
  const detectDialogueTone = (text: string): { hasTone: boolean, tone: string, visual: string, characterExpression: string } => {
    const lowerText = text.toLowerCase();
    const tonePatterns = [
      { patterns: ['bağırdı', 'haykırdı', 'kükredi', 'çığlık attı', 'gürledi'], tone: 'shouting',
        visual: 'intense shouting expression', characterExpression: 'screaming face, wide open mouth, intense anger' },
      { patterns: ['fısıldadı', 'usulca', 'gizlice', 'kulağına eğildi', 'alçak sesle'], tone: 'whisper',
        visual: 'intimate whispering, close proximity', characterExpression: 'leaning close, conspiratorial look' },
      { patterns: ['hıçkırdı', 'ağlayarak', 'gözyaşları', 'titrek sesle', 'boğuk sesle'], tone: 'crying',
        visual: 'tearful speaking, emotional breakdown', characterExpression: 'tears streaming, trembling lips' },
      { patterns: ['gülerek', 'kahkahayla', 'neşeyle', 'şakacı', 'eğlenerek'], tone: 'laughing',
        visual: 'joyful laughter, bright expression', characterExpression: 'laughing face, crinkled eyes, genuine joy' },
      { patterns: ['tehdit etti', 'dişlerini sıkarak', 'sert bir şekilde', 'soğuk bir sesle'], tone: 'threatening',
        visual: 'menacing demeanor, cold threatening presence', characterExpression: 'cold stare, clenched jaw' },
      { patterns: ['yalvardı', 'rica etti', 'lütfen dedi', 'diz çöktü', 'aman dedi'], tone: 'pleading',
        visual: 'desperate pleading, vulnerable posture', characterExpression: 'pleading eyes, clasped hands' },
    ];
    for (const { patterns, tone, visual, characterExpression } of tonePatterns) {
      if (patterns.some(p => lowerText.includes(p))) return { hasTone: true, tone, visual, characterExpression };
    }
    return { hasTone: false, tone: '', visual: '', characterExpression: '' };
  };

  // 12. İlişki dinamikleri algılama
  const detectRelationshipDynamics = (text: string): { hasRelationship: boolean, relationshipType: string, visual: string, dynamicPose: string } => {
    const lowerText = text.toLowerCase();
    const relationshipPatterns = [
      { patterns: ['anne', 'baba', 'oğul', 'kız', 'kardeş', 'aile', 'evlat', 'torun', 'dede', 'nine'],
        type: 'family', visual: 'family bond imagery, generational connection', dynamicPose: 'familial embrace, protective stance' },
      { patterns: ['sevgili', 'eş', 'karı', 'koca', 'nişanlı', 'partner', 'aşık', 'çift'],
        type: 'romantic', visual: 'romantic couple dynamic, intimate connection', dynamicPose: 'couple pose, intertwined hands' },
      { patterns: ['düşman', 'rakip', 'hasım', 'karşıt', 'ezeli düşman', 'intikam'],
        type: 'enemies', visual: 'hostile confrontation, opposing forces', dynamicPose: 'face-off stance, aggressive opposition' },
      { patterns: ['arkadaş', 'dost', 'yoldaş', 'kafadar', 'ahbap', 'birader'],
        type: 'friends', visual: 'friendly camaraderie, loyal friendship', dynamicPose: 'friendly arm around shoulder, laughing together' },
      { patterns: ['öğretmen', 'usta', 'çırak', 'öğrenci', 'mentor', 'hoca'],
        type: 'mentor', visual: 'wisdom passing, teaching moment', dynamicPose: 'master teaching apprentice, guidance gesture' },
    ];
    for (const { patterns, type, visual, dynamicPose } of relationshipPatterns) {
      if (patterns.some(p => lowerText.includes(p))) return { hasRelationship: true, relationshipType: type, visual, dynamicPose };
    }
    return { hasRelationship: false, relationshipType: '', visual: '', dynamicPose: '' };
  };

  // 13. Aksiyon yoğunluğu ölçekleme
  const detectActionIntensity = (text: string): { intensity: number, level: string, visual: string, cameraEffect: string } => {
    const lowerText = text.toLowerCase();
    const lowIntensity = ['yürüdü', 'oturdu', 'baktı', 'durdu', 'bekledi', 'dinledi'];
    const mediumIntensity = ['koştu', 'atladı', 'tuttu', 'itti', 'çekti', 'yakaladı', 'kovaladı'];
    const highIntensity = ['saldırdı', 'vurdu', 'patlattı', 'parçaladı', 'yıktı', 'ezdi', 'öldürdü'];
    const extremeIntensity = ['katliam', 'kıyamet', 'yok etti', 'mahvetti', 'havaya uçurdu'];
    const intensifiers = ['aniden', 'şiddetle', 'delicesine', 'vahşice', 'acımasızca'];
    const hasIntensifier = intensifiers.some(i => lowerText.includes(i));
    let intensity = 3, level = 'low', visual = 'calm subtle motion', cameraEffect = 'steady stable shot';
    if (extremeIntensity.some(a => lowerText.includes(a))) { intensity = 10; level = 'extreme'; visual = 'catastrophic destruction, explosive chaos'; cameraEffect = 'shaky cam, rapid cuts, extreme angles'; }
    else if (highIntensity.some(a => lowerText.includes(a))) { intensity = 8; level = 'high'; visual = 'violent impact, aggressive action'; cameraEffect = 'dynamic action camera, motion blur'; }
    else if (mediumIntensity.some(a => lowerText.includes(a))) { intensity = 5; level = 'medium'; visual = 'active movement, athletic action'; cameraEffect = 'tracking shot, following action'; }
    else if (lowIntensity.some(a => lowerText.includes(a))) { intensity = 2; level = 'low'; visual = 'subtle movement, gentle action'; cameraEffect = 'steady contemplative shot'; }
    if (hasIntensifier && intensity < 10) intensity = Math.min(10, intensity + 2);
    return { intensity, level, visual, cameraEffect };
  };

  // 14. Kültürel/Tarihsel dönem algılama
  const detectHistoricalPeriod = (text: string): { hasPeriod: boolean, period: string, visual: string, props: string } => {
    const lowerText = text.toLowerCase();
    const periodPatterns = [
      { patterns: ['antik', 'roma', 'yunan', 'mısır', 'firavun', 'piramit', 'gladyatör'], period: 'ancient',
        visual: 'ancient civilization aesthetic, classical architecture', props: 'togas, sandals, marble columns, ancient weapons' },
      { patterns: ['ortaçağ', 'şövalye', 'kral', 'kraliçe', 'kale', 'şato', 'feodal'], period: 'medieval',
        visual: 'medieval setting, castle architecture', props: 'armor, swords, crowns, castle interiors, torches' },
      { patterns: ['osmanlı', 'sultan', 'padişah', 'harem', 'vezir', 'yeniçeri', 'cami'], period: 'ottoman',
        visual: 'Ottoman empire aesthetic, Islamic architecture', props: 'turbans, kaftans, kilims, arabesque patterns' },
      { patterns: ['viktorya', 'ingiliz', 'londra', 'beyefendi', 'hanım', 'aristokrat'], period: 'victorian',
        visual: 'Victorian era aesthetic, refined elegance', props: 'top hats, corsets, gas lamps, horse carriages' },
      { patterns: ['gelecek', 'ütopya', 'distopya', 'siber', 'yapay zeka', '2100'], period: 'future',
        visual: 'futuristic setting, advanced technology', props: 'holograms, robots, neon lights, sleek surfaces' },
    ];
    for (const { patterns, period, visual, props } of periodPatterns) {
      if (patterns.some(p => lowerText.includes(p))) return { hasPeriod: true, period, visual, props };
    }
    return { hasPeriod: false, period: '', visual: '', props: '' };
  };

  // 15. Dinamik negatif prompt oluşturma
  const generateDynamicNegativePrompt = (genre: string): string => {
    const baseNegative = 'blurry, low quality, bad anatomy, bad hands, text, error, missing fingers, cropped, worst quality, jpeg artifacts, watermark, deformed';
    const genreNegatives: Record<string, string> = {
      'horror': 'bright colors, happy expressions, cartoon style, cute, kawaii',
      'romance': 'gore, violence, scary, horror elements, dark and gloomy',
      'sci-fi': 'medieval, ancient, old technology, rustic, vintage',
      'fantasy': 'modern technology, realistic mundane, urban contemporary',
      'action': 'static pose, boring composition, calm peaceful',
      'drama': 'cartoon style, exaggerated comedy, bright cheerful',
      'historical': 'modern elements, anachronistic objects, futuristic',
    };
    let negative = baseNegative;
    if (genreNegatives[genre]) negative += ', ' + genreNegatives[genre];
    return negative;
  };

  // ============== KALİTE VE ÇEŞİTLİLİK ARTTIRICI FONKSİYONLAR ==============

  // 16. Gelişmiş kalite etiketleri oluşturma
  const generateQualityTags = (styleType: string, isCreative: boolean): string => {
    const baseQuality = [
      'masterpiece', 'best quality', 'highly detailed', 'ultra-detailed',
      'sharp focus', '8k uhd', 'high resolution', 'professional'
    ];

    const creativeBoosts = [
      'award winning', 'stunning', 'breathtaking', 'gorgeous',
      'intricate details', 'exceptional quality', 'trending on artstation'
    ];

    const styleQuality: Record<string, string[]> = {
      'cinematic': ['cinematic color grading', 'film grain', 'anamorphic lens', 'movie still', 'cinematography'],
      'photorealistic': ['hyperrealistic', 'photorealism', 'RAW photo', 'DSLR quality', '35mm film'],
      'digital_art': ['digital painting', 'concept art', 'artstation quality', 'vibrant colors'],
      'oil_painting': ['oil painting', 'brush strokes visible', 'museum quality', 'classical art'],
      'watercolor': ['watercolor painting', 'soft edges', 'artistic', 'delicate washes'],
      'anime': ['anime style', 'detailed anime', 'studio quality anime', 'vibrant anime colors'],
      'fantasy_art': ['fantasy illustration', 'epic fantasy art', 'magical atmosphere', 'otherworldly']
    };

    let tags = [...baseQuality];
    if (isCreative) tags = [...tags, ...creativeBoosts.slice(0, 4)];
    if (styleQuality[styleType]) tags = [...tags, ...styleQuality[styleType]];

    return tags.join(', ');
  };

  // 17. Çeşitli kamera açıları ve kompozisyonlar
  const generateCameraVariety = (sceneType: string, mood: string): { camera: string, composition: string, depth: string } => {
    const cameraAngles: Record<string, string[]> = {
      'action': [
        'dutch angle, dynamic perspective',
        'low angle hero shot',
        'overhead action view',
        'tracking shot motion',
        'extreme close-up impact moment'
      ],
      'dialogue': [
        'over the shoulder shot',
        'medium two-shot',
        'close-up conversation',
        'profile view dialogue',
        'symmetrical framing'
      ],
      'introspection': [
        'extreme close-up eyes',
        'soft focus portrait',
        'silhouette against light',
        'reflection shot',
        'isolated figure wide shot'
      ],
      'description': [
        'establishing wide shot',
        'panoramic vista',
        'birds eye view',
        'atmospheric long shot',
        'layered depth composition'
      ],
      'general': [
        'rule of thirds composition',
        'centered subject',
        'golden ratio framing',
        'diagonal composition',
        'symmetrical balance'
      ]
    };

    const compositions: Record<string, string[]> = {
      'dramatic': ['high contrast lighting', 'chiaroscuro', 'rim lighting', 'dramatic shadows'],
      'peaceful': ['soft natural light', 'even lighting', 'gentle shadows', 'warm ambient'],
      'mysterious': ['low key lighting', 'silhouette', 'fog atmosphere', 'partial illumination'],
      'romantic': ['golden hour glow', 'soft bokeh', 'warm tones', 'intimate lighting'],
      'tense': ['harsh shadows', 'stark contrast', 'cold lighting', 'angular shadows']
    };

    const depthEffects = [
      'shallow depth of field, bokeh background',
      'deep focus, everything sharp',
      'selective focus on subject',
      'atmospheric perspective, hazy distance',
      'tilt-shift miniature effect'
    ];

    const angles = cameraAngles[sceneType] || cameraAngles['general'];
    const comps = compositions[mood] || compositions['dramatic'];

    return {
      camera: angles[Math.floor(Math.random() * angles.length)],
      composition: comps[Math.floor(Math.random() * comps.length)],
      depth: depthEffects[Math.floor(Math.random() * depthEffects.length)]
    };
  };

  // 18. Işık çeşitliliği ve atmosfer presetleri
  const generateLightingVariety = (timeOfDay: string, mood: string, genre: string): { lighting: string, atmosphere: string, colorGrade: string } => {
    const lightingPresets: Record<string, string[]> = {
      'gündüz': [
        'bright natural daylight, sun high',
        'soft overcast lighting, diffused',
        'harsh midday sun, strong shadows',
        'golden morning light, warm rays',
        'blue sky ambient, outdoor natural'
      ],
      'gece': [
        'moonlit night, silver glow',
        'city lights at night, neon reflections',
        'starlit darkness, cosmic ambient',
        'candlelit interior, warm flicker',
        'street lamp pools of light, noir'
      ],
      'akşam': [
        'golden hour sunset, warm orange',
        'magic hour, pink and purple sky',
        'twilight blue, fading light',
        'dramatic sunset silhouette',
        'dusk ambient, soft transition'
      ],
      'sabah': [
        'dawn breaking, soft pink light',
        'early morning mist, ethereal',
        'sunrise golden rays, hope',
        'blue hour, pre-dawn calm',
        'morning dew, fresh light'
      ]
    };

    const atmospherePresets: Record<string, string[]> = {
      'horror': ['eerie mist, unsettling', 'ominous shadows lurking', 'sickly green undertones', 'oppressive darkness'],
      'romance': ['dreamy soft glow', 'intimate warmth', 'rose-tinted atmosphere', 'magical sparkles'],
      'sci-fi': ['neon-lit cyberpunk', 'sterile white technology', 'holographic ambient', 'space nebula colors'],
      'fantasy': ['magical particle effects', 'ethereal glow', 'enchanted forest mist', 'mystical aurora'],
      'action': ['dust particles in light', 'smoke and debris', 'dynamic lighting', 'high energy atmosphere'],
      'drama': ['moody atmospheric', 'emotionally charged lighting', 'subtle shadows', 'naturalistic'],
      'general': ['balanced natural', 'cinematic atmosphere', 'professional lighting setup', 'studio quality']
    };

    const colorGrades: Record<string, string[]> = {
      'horror': ['desaturated cold', 'sickly green tint', 'blood red accents', 'muted with dark contrast'],
      'romance': ['warm peachy tones', 'soft pink palette', 'golden warm filter', 'dreamy pastel'],
      'sci-fi': ['cyan and magenta', 'cool blue technology', 'neon accent colors', 'futuristic chrome'],
      'fantasy': ['rich saturated colors', 'magical purple and gold', 'enchanted greens and blues', 'mystical color palette'],
      'action': ['high contrast punchy', 'teal and orange', 'desaturated with color pop', 'gritty realistic'],
      'drama': ['muted earth tones', 'subtle color grading', 'naturalistic palette', 'emotional color story'],
      'general': ['balanced color', 'cinematic LUT', 'natural vibrant', 'professional color grade']
    };

    const timeKey = timeOfDay.includes('gece') ? 'gece' :
                    timeOfDay.includes('akşam') ? 'akşam' :
                    timeOfDay.includes('sabah') ? 'sabah' : 'gündüz';

    const lights = lightingPresets[timeKey] || lightingPresets['gündüz'];
    const atmos = atmospherePresets[genre] || atmospherePresets['general'];
    const colors = colorGrades[genre] || colorGrades['general'];

    return {
      lighting: lights[Math.floor(Math.random() * lights.length)],
      atmosphere: atmos[Math.floor(Math.random() * atmos.length)],
      colorGrade: colors[Math.floor(Math.random() * colors.length)]
    };
  };

  // 19. Sanatçı stil referansları
  const generateArtistStyle = (genre: string, styleType: string): string => {
    const artistStyles: Record<string, string[]> = {
      'cinematic': [
        'in the style of Roger Deakins cinematography',
        'Ridley Scott visual aesthetic',
        'Christopher Nolan atmospheric',
        'Denis Villeneuve visual storytelling',
        'Emmanuel Lubezki natural lighting'
      ],
      'fantasy_art': [
        'in the style of Frank Frazetta',
        'Boris Vallejo fantasy art',
        'Alan Lee illustration style',
        'John Howe middle-earth aesthetic',
        'Brom dark fantasy style'
      ],
      'digital_art': [
        'in the style of Craig Mullins',
        'Maciej Kuciara concept art',
        'Sparth digital painting',
        'Jaime Jones illustration',
        'Wojtek Fus atmosphere'
      ],
      'anime': [
        'Studio Ghibli style',
        'Makoto Shinkai visual quality',
        'Ufotable animation quality',
        'MAPPA studio aesthetic',
        'Kyoto Animation detail'
      ],
      'photorealistic': [
        'Peter Lindbergh photography',
        'Annie Leibovitz portrait style',
        'National Geographic quality',
        'Steve McCurry color',
        'documentary photography style'
      ],
      'oil_painting': [
        'Rembrandt lighting and style',
        'Caravaggio chiaroscuro',
        'John Singer Sargent brushwork',
        'Joaquin Sorolla light',
        'Anders Zorn technique'
      ],
      'horror': [
        'H.R. Giger biomechanical',
        'Zdzisław Beksiński nightmarish',
        'Junji Ito horror manga',
        'Wayne Barlowe dark vision',
        'Clive Barker imagination'
      ],
      'romance': [
        'Thomas Kinkade warmth',
        'Alphonse Mucha art nouveau',
        'J.C. Leyendecker romantic',
        'Pre-Raphaelite beauty',
        'romantic impressionism'
      ]
    };

    // Genre veya style'a göre uygun sanatçı stili seç
    const key = artistStyles[genre] ? genre : (artistStyles[styleType] ? styleType : 'cinematic');
    const styles = artistStyles[key];

    return styles[Math.floor(Math.random() * styles.length)];
  };

  // 20. Gelişmiş negatif prompt oluşturma
  const generateAdvancedNegativePrompt = (genre: string, styleType: string, isPortrait: boolean): string => {
    const coreNegative = [
      'worst quality', 'low quality', 'blurry', 'pixelated', 'jpeg artifacts',
      'compression artifacts', 'watermark', 'signature', 'text', 'logo',
      'username', 'artist name', 'title', 'frame', 'border'
    ];

    const anatomyNegative = [
      'bad anatomy', 'bad proportions', 'deformed', 'disfigured', 'mutated',
      'extra limbs', 'missing limbs', 'floating limbs', 'disconnected limbs',
      'malformed', 'ugly', 'poorly drawn'
    ];

    const handsFaceNegative = [
      'bad hands', 'missing fingers', 'extra fingers', 'fused fingers',
      'too many fingers', 'mutated hands', 'poorly drawn hands',
      'bad face', 'ugly face', 'deformed face', 'asymmetric face'
    ];

    const styleNegative: Record<string, string[]> = {
      'photorealistic': ['cartoon', 'anime', 'illustration', 'painting', 'drawing', '3d render', 'cgi'],
      'anime': ['realistic', 'photorealistic', 'photograph', '3d', 'western cartoon'],
      'digital_art': ['photo', 'photograph', 'realistic skin', 'pores'],
      'oil_painting': ['digital art', 'photograph', 'anime', 'sharp edges', 'clean lines'],
      'cinematic': ['amateur', 'home video', 'low budget', 'indie film look']
    };

    const genreNegative: Record<string, string[]> = {
      'horror': ['bright', 'cheerful', 'happy', 'cute', 'kawaii', 'colorful', 'rainbow'],
      'romance': ['gore', 'blood', 'violence', 'scary', 'dark', 'gloomy', 'depressing'],
      'sci-fi': ['medieval', 'ancient', 'rustic', 'old fashioned', 'primitive'],
      'fantasy': ['modern', 'contemporary', 'urban', 'technology', 'industrial'],
      'action': ['static', 'boring', 'calm', 'peaceful', 'slow', 'still'],
      'drama': ['cartoon', 'exaggerated', 'silly', 'comedic', 'unrealistic']
    };

    let negatives = [...coreNegative];

    if (isPortrait) {
      negatives = [...negatives, ...anatomyNegative, ...handsFaceNegative];
    } else {
      negatives = [...negatives, ...anatomyNegative.slice(0, 5)];
    }

    if (styleNegative[styleType]) {
      negatives = [...negatives, ...styleNegative[styleType]];
    }

    if (genreNegative[genre]) {
      negatives = [...negatives, ...genreNegative[genre]];
    }

    // Fazla uzun olmaması için sınırla
    return negatives.slice(0, 35).join(', ');
  };

  // 21. Detay zenginliği artırıcı
  const generateDetailEnhancer = (sceneType: string, hasCharacters: boolean): string => {
    const sceneDetails: Record<string, string[]> = {
      'action': [
        'motion lines', 'dynamic energy', 'impact effects',
        'debris flying', 'speed blur trails', 'action poses'
      ],
      'dialogue': [
        'expressive faces', 'hand gestures', 'eye contact',
        'body language', 'subtle expressions', 'conversation atmosphere'
      ],
      'introspection': [
        'thoughtful expression', 'contemplative pose',
        'internal emotion visible', 'subtle facial details', 'soul visible in eyes'
      ],
      'description': [
        'environmental storytelling', 'rich background details',
        'textures visible', 'atmospheric elements', 'layered scene depth'
      ],
      'general': [
        'fine details', 'intricate elements',
        'rich textures', 'careful composition', 'balanced elements'
      ]
    };

    const characterDetails = [
      'detailed clothing', 'fabric textures', 'hair strands visible',
      'skin pores', 'realistic eyes', 'natural pose'
    ];

    const environmentDetails = [
      'atmospheric perspective', 'environmental textures',
      'natural elements', 'architectural details', 'material surfaces'
    ];

    let details = sceneDetails[sceneType] || sceneDetails['general'];

    if (hasCharacters) {
      details = [...details, ...characterDetails.slice(0, 3)];
    } else {
      details = [...details, ...environmentDetails.slice(0, 3)];
    }

    return details.join(', ');
  };

  // Sahne tipi belirleme (aksiyon, diyalog, betimleme, iç monolog)
  const detectSceneType = (text: string): { type: string, cameraStyle: string } => {
    const lowerText = text.toLowerCase();

    // Diyalog kontrolü
    const dialogueMarkers = ['"', "'", 'dedi', 'sordu', 'cevapladı', 'bağırdı', 'fısıldadı', 'söyledi'];
    const hasDialogue = dialogueMarkers.some(m => lowerText.includes(m));

    // Aksiyon kontrolü
    const actionMarkers = ['koştu', 'atladı', 'vurdu', 'kaçtı', 'saldırdı', 'patladı', 'düştü', 'yakaladı', 'kovaladı'];
    const hasAction = actionMarkers.some(m => lowerText.includes(m));

    // İç monolog kontrolü
    const innerMarkers = ['düşündü', 'hissetti', 'merak etti', 'aklından geçirdi', 'içinden', 'kendi kendine'];
    const hasInner = innerMarkers.some(m => lowerText.includes(m));

    // Betimleme kontrolü
    const descMarkers = ['vardı', 'uzanıyordu', 'görünüyordu', 'bulunuyordu', 'duruyordu', 'yayılıyordu'];
    const hasDescription = descMarkers.some(m => lowerText.includes(m));

    if (hasAction) {
      return { type: 'action', cameraStyle: 'dynamic action camera, motion blur, dramatic angles, fast pacing' };
    }
    if (hasDialogue) {
      return { type: 'dialogue', cameraStyle: 'shot-reverse-shot, medium close-up, conversation framing' };
    }
    if (hasInner) {
      return { type: 'introspection', cameraStyle: 'close-up on face, shallow depth of field, contemplative framing' };
    }
    if (hasDescription) {
      return { type: 'description', cameraStyle: 'establishing shot, wide angle, atmospheric composition' };
    }

    return { type: 'general', cameraStyle: 'cinematic medium shot, balanced composition' };
  };

  // Karakter duygu yoğunluğu analizi (1-10 skalası)
  const analyzeEmotionIntensity = (text: string): { emotion: string, intensity: number, visualIntensity: string } => {
    const lowerText = text.toLowerCase();

    // Yoğunlaştırıcılar
    const intensifiers = {
      extreme: ['çok', 'aşırı', 'son derece', 'inanılmaz', 'delicesine', 'müthiş', 'korkunç', 'berbat'],
      high: ['oldukça', 'epey', 'bayağı', 'hayli', 'fazla', 'büyük'],
      moderate: ['biraz', 'hafif', 'az', 'azıcık', 'ufak'],
      low: ['pek', 'hiç', 'asla', 'zerre', 'katiyen']
    };

    let intensity = 5; // Varsayılan orta seviye

    for (const word of intensifiers.extreme) {
      if (lowerText.includes(word)) { intensity = 10; break; }
    }
    for (const word of intensifiers.high) {
      if (lowerText.includes(word) && intensity < 8) { intensity = 8; }
    }
    for (const word of intensifiers.moderate) {
      if (lowerText.includes(word) && intensity > 3) { intensity = 4; }
    }
    for (const word of intensifiers.low) {
      if (lowerText.includes(word)) { intensity = 2; }
    }

    // Görsel yoğunluk karşılığı
    let visualIntensity = 'balanced composition';
    if (intensity >= 9) visualIntensity = 'overwhelming dramatic impact, extreme emotions visible, powerful composition';
    else if (intensity >= 7) visualIntensity = 'strong emotional presence, expressive, impactful';
    else if (intensity >= 5) visualIntensity = 'moderate emotional expression, balanced';
    else if (intensity >= 3) visualIntensity = 'subtle emotional hints, understated';
    else visualIntensity = 'minimal expression, neutral, calm';

    return { emotion: 'detected', intensity, visualIntensity };
  };

  // Türkçe -> İngilizce çeviri sözlüğü (genişletilmiş)
  const translationDict: Record<string, string> = {
    // Nesneler
    'ev': 'house', 'oda': 'room', 'masa': 'table', 'pencere': 'window', 'kapı': 'door',
    'ağaç': 'tree', 'araba': 'car', 'yol': 'road', 'gökyüzü': 'sky', 'deniz': 'sea',
    'dağ': 'mountain', 'orman': 'forest', 'şehir': 'city', 'sokak': 'street', 'kitap': 'book',
    'sandalye': 'chair', 'lamba': 'lamp', 'ayna': 'mirror', 'duvar': 'wall', 'bahçe': 'garden',
    'köprü': 'bridge', 'nehir': 'river', 'göl': 'lake', 'kale': 'castle', 'saray': 'palace',
    'kulübe': 'cabin', 'mağara': 'cave', 'tepe': 'hill', 'vadi': 'valley', 'bulut': 'cloud',
    'yağmur': 'rain', 'kar': 'snow', 'güneş': 'sun', 'ay': 'moon', 'yıldız': 'stars',
    'çiçek': 'flower', 'çimen': 'grass', 'taş': 'stone', 'kaya': 'rock', 'kum': 'sand',
    // İnsan/Karakter
    'adam': 'man', 'kadın': 'woman', 'çocuk': 'child', 'bebek': 'baby', 'yaşlı': 'elderly',
    'genç': 'young', 'kız': 'girl', 'oğlan': 'boy', 'anne': 'mother', 'baba': 'father',
    'kardeş': 'sibling', 'arkadaş': 'friend', 'düşman': 'enemy', 'sevgili': 'lover',
    'kahraman': 'hero', 'kötü': 'villain', 'savaşçı': 'warrior', 'büyücü': 'wizard',
    // Renkler
    'kırmızı': 'red', 'mavi': 'blue', 'yeşil': 'green', 'sarı': 'yellow', 'siyah': 'black',
    'beyaz': 'white', 'mor': 'purple', 'turuncu': 'orange', 'pembe': 'pink', 'gri': 'gray',
    'kahverengi': 'brown', 'altın': 'golden', 'gümüş': 'silver', 'lacivert': 'navy blue',
    // Eylemler
    'yürü': 'walking', 'koş': 'running', 'otur': 'sitting', 'bak': 'looking', 'düşün': 'thinking',
    'gülümse': 'smiling', 'ağla': 'crying', 'konuş': 'talking', 'dinle': 'listening',
    'uyu': 'sleeping', 'uyan': 'waking', 'bekle': 'waiting', 'ara': 'searching',
    'saklan': 'hiding', 'kaç': 'fleeing', 'savaş': 'fighting', 'dans': 'dancing',
    'atla': 'jumping', 'uç': 'flying', 'yüz': 'swimming', 'tırman': 'climbing',
    // Duygular
    'mutlu': 'happy', 'üzgün': 'sad', 'kızgın': 'angry', 'korku': 'fearful', 'şaşkın': 'surprised',
    'heyecan': 'excited', 'endişe': 'worried', 'sakin': 'calm', 'yorgun': 'tired',
    'umutsuz': 'hopeless', 'umutlu': 'hopeful', 'cesur': 'brave', 'korkak': 'cowardly',
    // Hava/Atmosfer
    'fırtına': 'storm', 'sis': 'fog', 'duman': 'smoke', 'alev': 'flame', 'buz': 'ice',
    'pus': 'mist', 'toz': 'dust', 'rüzgar': 'wind', 'sel': 'flood', 'deprem': 'earthquake',
    // Fantastik öğeler
    'ejderha': 'dragon', 'peri': 'fairy', 'cin': 'genie', 'canavar': 'monster', 'hayalet': 'ghost',
    'vampir': 'vampire', 'kurt adam': 'werewolf', 'melek': 'angel', 'iblis': 'demon',
    'büyü': 'magic', 'sihir': 'spell', 'lanet': 'curse', 'tılsım': 'amulet'
  };

  // Eylem algılama
  const detectActions = (text: string): string[] => {
    const lowerText = text.toLowerCase();
    const actionPatterns: Record<string, { tr: string[], en: string }> = {
      'walking': { tr: ['yürü', 'adım', 'ilerle', 'gezin'], en: 'walking slowly' },
      'running': { tr: ['koş', 'kaç', 'hızla', 'acele'], en: 'running fast' },
      'sitting': { tr: ['otur', 'çökme', 'yaslan'], en: 'sitting down' },
      'standing': { tr: ['ayakta', 'dikil', 'kalk'], en: 'standing upright' },
      'looking': { tr: ['bak', 'izle', 'gör', 'seyre'], en: 'looking intently' },
      'talking': { tr: ['konuş', 'söyle', 'anlat', 'fısılda'], en: 'talking' },
      'crying': { tr: ['ağla', 'gözyaş', 'hıçkır'], en: 'crying with tears' },
      'smiling': { tr: ['gülümse', 'gül', 'kahkaha'], en: 'smiling warmly' },
      'fighting': { tr: ['savaş', 'dövüş', 'vur', 'saldır'], en: 'fighting intensely' },
      'sleeping': { tr: ['uyu', 'uyukla', 'rüya'], en: 'sleeping peacefully' },
      'thinking': { tr: ['düşün', 'hayal', 'merak', 'kafas'], en: 'deep in thought' },
      'reading': { tr: ['oku', 'kitap', 'gazete'], en: 'reading carefully' },
      'writing': { tr: ['yaz', 'çiz', 'kalem'], en: 'writing' },
      'eating': { tr: ['ye', 'yemek', 'içme'], en: 'eating' },
      'dancing': { tr: ['dans', 'oyna', 'rakset'], en: 'dancing gracefully' },
      'embracing': { tr: ['sarıl', 'kucak', 'tutun'], en: 'embracing lovingly' },
    };

    const detectedActions: string[] = [];
    for (const [action, { tr, en }] of Object.entries(actionPatterns)) {
      if (tr.some(kw => findWithSuffixes(lowerText, kw) && !isNegated(text, kw))) {
        detectedActions.push(en);
      }
    }
    return detectedActions.slice(0, 3); // En fazla 3 eylem
  };

  // Hava durumu algılama
  const detectWeather = (text: string): string => {
    const lowerText = text.toLowerCase();
    const weatherPatterns: Record<string, { tr: string[], en: string }> = {
      'rainy': { tr: ['yağmur', 'yağ', 'ısla', 'sağanak'], en: 'rainy weather, raindrops' },
      'snowy': { tr: ['kar', 'tipi', 'beyaz örtü', 'buz'], en: 'snowy weather, snowflakes falling' },
      'sunny': { tr: ['güneş', 'sıcak', 'parlak', 'açık hava'], en: 'bright sunny day, clear sky' },
      'cloudy': { tr: ['bulut', 'kapalı', 'gri gökyüzü'], en: 'overcast cloudy sky' },
      'foggy': { tr: ['sis', 'pus', 'buğu', 'duman'], en: 'thick fog, misty atmosphere' },
      'stormy': { tr: ['fırtına', 'şimşek', 'yıldırım', 'gök gürültü'], en: 'dramatic storm, lightning' },
      'windy': { tr: ['rüzgar', 'esinti', 'dalga'], en: 'windy, hair blowing' },
    };

    for (const [weather, { tr, en }] of Object.entries(weatherPatterns)) {
      if (tr.some(kw => findWithSuffixes(lowerText, kw))) {
        return en;
      }
    }
    return '';
  };

  // Zaman dilimi algılama
  const detectTimeOfDay = (text: string): { tr: string, en: string } => {
    const lowerText = text.toLowerCase();
    const timePatterns: Record<string, { tr: string[], result: { tr: string, en: string } }> = {
      'dawn': { tr: ['şafak', 'tan', 'gün ağar'], result: { tr: 'Şafak', en: 'dawn, early morning light, pink and orange sky' } },
      'morning': { tr: ['sabah', 'erken', 'kahvaltı'], result: { tr: 'Sabah', en: 'morning light, soft golden sun' } },
      'noon': { tr: ['öğle', 'öğlen', 'gün ortası'], result: { tr: 'Öğle', en: 'midday sun, bright overhead lighting' } },
      'afternoon': { tr: ['öğleden sonra', 'ikindi'], result: { tr: 'İkindi', en: 'afternoon light, warm tones' } },
      'sunset': { tr: ['gün batımı', 'akşam üzeri', 'batarken', 'alacakaranlık'], result: { tr: 'Gün batımı', en: 'golden hour, sunset, dramatic orange and purple sky' } },
      'evening': { tr: ['akşam', 'karanlık çök'], result: { tr: 'Akşam', en: 'evening atmosphere, dim ambient light' } },
      'night': { tr: ['gece', 'geceyarısı', 'karanlık', 'yıldız', 'ay ışığı'], result: { tr: 'Gece', en: 'night scene, moonlight, starry sky, dark atmosphere' } },
    };

    for (const [, { tr, result }] of Object.entries(timePatterns)) {
      if (tr.some(kw => lowerText.includes(kw))) {
        return result;
      }
    }
    return { tr: 'Belirsiz', en: 'natural lighting' };
  };

  // Kamera açısı önerisi
  const suggestCameraAngle = (text: string, actions: string[]): string => {
    const lowerText = text.toLowerCase();

    // Eylem bazlı kamera önerileri
    if (actions.includes('running fast') || actions.includes('fighting intensely')) {
      return 'dynamic action shot, motion blur, dramatic angle';
    }
    if (actions.includes('thinking') || actions.includes('crying with tears')) {
      return 'close-up portrait, emotional, shallow depth of field';
    }
    if (actions.includes('embracing lovingly')) {
      return 'intimate medium shot, soft focus background';
    }

    // Metin bazlı kamera önerileri
    if (lowerText.includes('manzara') || lowerText.includes('uzak') || lowerText.includes('ufuk')) {
      return 'wide establishing shot, panoramic view';
    }
    if (lowerText.includes('yüz') || lowerText.includes('göz') || lowerText.includes('bakış')) {
      return 'extreme close-up, detailed face, expressive eyes';
    }
    if (lowerText.includes('yukarıdan') || lowerText.includes('tepeden')) {
      return 'bird\'s eye view, overhead shot';
    }
    if (lowerText.includes('aşağıdan') || lowerText.includes('devasa') || lowerText.includes('koca')) {
      return 'low angle shot, imposing perspective';
    }

    return 'cinematic medium shot, balanced composition';
  };

  // Karakter pozu algılama
  const detectCharacterPose = (text: string): string => {
    const lowerText = text.toLowerCase();
    const posePatterns: Record<string, string[]> = {
      'standing confidently, hands on hips': ['kendinden emin', 'dik dur', 'kararlı'],
      'sitting relaxed, casual pose': ['rahat', 'gevşe', 'keyifli otur'],
      'leaning against wall, cool pose': ['yaslan', 'duvara', 'sırtını day'],
      'crouching down, defensive stance': ['çömel', 'eğil', 'saklan'],
      'arms crossed, stern expression': ['kollar', 'bağla', 'ciddi'],
      'reaching out, extending hand': ['uzan', 'elini uzat', 'dokun'],
      'looking over shoulder, mysterious': ['arkasına bak', 'omzunun üzerin'],
      'profile view, contemplative': ['profil', 'yandan', 'düşünceli'],
    };

    for (const [pose, keywords] of Object.entries(posePatterns)) {
      if (keywords.some(kw => lowerText.includes(kw))) {
        return pose;
      }
    }
    return 'natural pose';
  };

  // Metinden İngilizce anahtar kelimeler çıkar
  const extractEnglishKeywords = (text: string): string[] => {
    const lowerText = text.toLowerCase();
    const keywords: string[] = [];

    for (const [tr, en] of Object.entries(translationDict)) {
      if (findWithSuffixes(lowerText, tr)) {
        keywords.push(en);
      }
    }

    return [...new Set(keywords)]; // Tekrarları kaldır
  };

  // YENİ: Cümle yapısından konu-eylem-nesne çıkar (İÇERİK ÖNCELİĞİ)
  const extractCoreContent = (text: string): { subject: string, action: string, objects: string[], description: string } => {
    const lowerText = text.toLowerCase();

    // Konu algılama (kim/ne?)
    const subjectPatterns: Record<string, string> = {
      'adam': 'a man', 'kadın': 'a woman', 'çocuk': 'a child', 'kız': 'a girl', 'oğlan': 'a boy',
      'genç': 'a young person', 'yaşlı': 'an elderly person', 'anne': 'a mother', 'baba': 'a father',
      'asker': 'a soldier', 'prenses': 'a princess', 'kral': 'a king', 'kraliçe': 'a queen',
      'köylü': 'a villager', 'şövalye': 'a knight', 'büyücü': 'a wizard', 'cadı': 'a witch',
      'hayalet': 'a ghost', 'canavar': 'a monster', 'ejderha': 'a dragon', 'peri': 'a fairy',
      'kurt': 'a wolf', 'ayı': 'a bear', 'aslan': 'a lion', 'kartal': 'an eagle',
      'at': 'a horse', 'kedi': 'a cat', 'köpek': 'a dog', 'kuş': 'a bird',
      'denizci': 'a sailor', 'pilot': 'a pilot', 'doktor': 'a doctor', 'öğretmen': 'a teacher',
      'ressam': 'an artist', 'müzisyen': 'a musician', 'yazar': 'a writer', 'şair': 'a poet',
      'avcı': 'a hunter', 'balıkçı': 'a fisherman', 'çiftçi': 'a farmer', 'tüccar': 'a merchant',
      'hırsız': 'a thief', 'dedektif': 'a detective', 'polis': 'a police officer', 'ninja': 'a ninja',
      'samuray': 'a samurai', 'korsan': 'a pirate', 'robot': 'a robot', 'uzaylı': 'an alien',
      'melek': 'an angel', 'şeytan': 'a demon', 'vampir': 'a vampire', 'zombi': 'a zombie',
      'prens': 'a prince', 'kahraman': 'a hero', 'kötü adam': 'a villain', 'casus': 'a spy'
    };

    // Eylem algılama (ne yapıyor?)
    const actionPatterns: Record<string, string> = {
      'yürü': 'walking', 'koş': 'running', 'atla': 'jumping', 'uç': 'flying', 'yüz': 'swimming',
      'otur': 'sitting', 'yat': 'lying down', 'dur': 'standing', 'bekle': 'waiting',
      'bak': 'looking at', 'izle': 'watching', 'gör': 'seeing', 'seyre': 'observing',
      'tut': 'holding', 'al': 'taking', 'ver': 'giving', 'at': 'throwing', 'yakala': 'catching',
      'aç': 'opening', 'kapa': 'closing', 'kır': 'breaking', 'yap': 'making', 'çiz': 'drawing',
      'oku': 'reading', 'yaz': 'writing', 'dinle': 'listening', 'konuş': 'talking', 'bağır': 'shouting',
      'fısılda': 'whispering', 'ağla': 'crying', 'gül': 'laughing', 'gülümse': 'smiling',
      'savaş': 'fighting', 'vur': 'hitting', 'kes': 'cutting', 'öldür': 'killing', 'kurtar': 'saving',
      'kaç': 'escaping', 'saklan': 'hiding', 'ara': 'searching', 'bul': 'finding',
      'ye': 'eating', 'iç': 'drinking', 'pişir': 'cooking', 'uyu': 'sleeping', 'uyan': 'waking up',
      'git': 'going', 'gel': 'coming', 'dön': 'returning', 'kal': 'staying',
      'tırman': 'climbing', 'in': 'descending', 'düş': 'falling', 'kay': 'sliding',
      'öp': 'kissing', 'sarıl': 'hugging', 'dokun': 'touching', 'it': 'pushing', 'çek': 'pulling',
      'dans': 'dancing', 'şarkı söyle': 'singing', 'çal': 'playing music', 'oyna': 'playing'
    };

    // Nesne/Mekan algılama (nerede/neyi?)
    const objectPatterns: Record<string, string> = {
      'ev': 'house', 'oda': 'room', 'salon': 'living room', 'mutfak': 'kitchen', 'yatak odası': 'bedroom',
      'bahçe': 'garden', 'sokak': 'street', 'yol': 'road', 'köprü': 'bridge', 'merdiven': 'stairs',
      'orman': 'forest', 'ağaç': 'tree', 'çiçek': 'flower', 'çimen': 'grass', 'yaprak': 'leaves',
      'dağ': 'mountain', 'tepe': 'hill', 'vadi': 'valley', 'mağara': 'cave', 'uçurum': 'cliff',
      'deniz': 'sea', 'okyanus': 'ocean', 'göl': 'lake', 'nehir': 'river', 'şelale': 'waterfall',
      'plaj': 'beach', 'kum': 'sand', 'dalga': 'waves', 'kayık': 'boat', 'gemi': 'ship',
      'gökyüzü': 'sky', 'bulut': 'cloud', 'güneş': 'sun', 'ay': 'moon', 'yıldız': 'stars',
      'yağmur': 'rain', 'kar': 'snow', 'fırtına': 'storm', 'şimşek': 'lightning', 'gökkuşağı': 'rainbow',
      'kale': 'castle', 'saray': 'palace', 'kule': 'tower', 'köy': 'village', 'şehir': 'city',
      'kilise': 'church', 'cami': 'mosque', 'tapınak': 'temple', 'mezarlık': 'cemetery',
      'kılıç': 'sword', 'kalkan': 'shield', 'ok': 'arrow', 'yay': 'bow', 'mızrak': 'spear',
      'kitap': 'book', 'kalem': 'pen', 'kağıt': 'paper', 'mektup': 'letter', 'harita': 'map',
      'ayna': 'mirror', 'kapı': 'door', 'pencere': 'window', 'masa': 'table', 'sandalye': 'chair',
      'yatak': 'bed', 'perde': 'curtain', 'mum': 'candle', 'lamba': 'lamp', 'ateş': 'fire',
      'taç': 'crown', 'yüzük': 'ring', 'kolye': 'necklace', 'hazine': 'treasure', 'altın': 'gold',
      'araba': 'car', 'tren': 'train', 'uçak': 'airplane', 'bisiklet': 'bicycle', 'motosiklet': 'motorcycle'
    };

    let subject = '';
    let action = '';
    const objects: string[] = [];

    // Konu bul
    for (const [tr, en] of Object.entries(subjectPatterns)) {
      if (findWithSuffixes(lowerText, tr)) {
        subject = en;
        break;
      }
    }

    // Eylem bul
    for (const [tr, en] of Object.entries(actionPatterns)) {
      if (findWithSuffixes(lowerText, tr)) {
        action = en;
        break;
      }
    }

    // Nesneler bul
    for (const [tr, en] of Object.entries(objectPatterns)) {
      if (findWithSuffixes(lowerText, tr)) {
        objects.push(en);
      }
    }

    // Açıklayıcı cümle oluştur
    let description = '';
    if (subject && action) {
      description = `${subject} ${action}`;
      if (objects.length > 0) {
        description += ` near ${objects.slice(0, 3).join(', ')}`;
      }
    } else if (subject) {
      description = subject;
      if (objects.length > 0) {
        description += ` in a scene with ${objects.slice(0, 3).join(', ')}`;
      }
    } else if (objects.length > 0) {
      description = `scene featuring ${objects.slice(0, 4).join(', ')}`;
    }

    return { subject, action, objects: objects.slice(0, 5), description };
  };

  // Scene analysis logic - ADVANCED VERSION
  const analyzeScene = (text: string, sceneNum: number): Scene => {
    const lowerText = text.toLowerCase();

    // 1. Nesne algılama (genişletilmiş)
    const objectRoots = [
      'ev', 'oda', 'masa', 'pencere', 'kapı', 'ağaç', 'araba', 'yol', 'gökyüzü', 'deniz',
      'dağ', 'orman', 'şehir', 'sokak', 'kitap', 'sandalye', 'lamba', 'ayna', 'duvar', 'bahçe',
      'köprü', 'nehir', 'göl', 'kale', 'saray', 'kulübe', 'mağara', 'tepe', 'vadi', 'bulut',
      'yağmur', 'kar', 'güneş', 'ay', 'yıldız', 'çiçek', 'çimen', 'taş', 'kaya', 'kum',
      'gemi', 'tekne', 'uçak', 'tren', 'bisiklet', 'at', 'kuş', 'kedi', 'köpek', 'balık',
      'kılıç', 'kalkan', 'ok', 'yay', 'mızrak', 'zırh', 'taç', 'mücevher', 'hazine',
      'resim', 'heykel', 'müzik', 'şarkı', 'dans', 'ateş', 'alev', 'duman', 'su', 'buz'
    ];
    const foundObjects = objectRoots.filter(obj => findWithSuffixes(lowerText, obj));
    const englishObjects = foundObjects.map(obj => translationDict[obj] || obj);

    // 2. Eylem algılama
    const detectedActions = detectActions(text);

    // 3. Hava durumu
    const weather = detectWeather(text);

    // 4. Zaman dilimi
    const timeOfDay = detectTimeOfDay(text);

    // 5. Karakter pozu
    const characterPose = detectCharacterPose(text);

    // 6. Kamera açısı önerisi
    const cameraAngle = suggestCameraAngle(text, detectedActions);

    // 7. Mood algılama (genişletilmiş)
    const moodKeywords: Record<string, { keywords: string[], intensity: string[], en: string }> = {
      'Huzurlu': {
        keywords: ['sakin', 'huzur', 'sessiz', 'dingin', 'rahat', 'ferah'],
        intensity: ['çok sakin', 'son derece huzurlu'],
        en: 'peaceful, serene, tranquil atmosphere'
      },
      'Gerilimli': {
        keywords: ['korku', 'endişe', 'tedirgin', 'gölge', 'tehlike', 'gerilim', 'kabus'],
        intensity: ['çok korkutucu', 'dehşet verici'],
        en: 'tense, suspenseful, ominous atmosphere'
      },
      'Mutlu': {
        keywords: ['mutlu', 'neşe', 'gülümse', 'sevinç', 'kahkaha', 'keyif', 'eğlence'],
        intensity: ['aşırı mutlu', 'coşkulu'],
        en: 'joyful, cheerful, bright happy mood'
      },
      'Hüzünlü': {
        keywords: ['üzgün', 'gözyaşı', 'ağla', 'keder', 'yalnız', 'hüzün', 'acı', 'kayıp'],
        intensity: ['derin hüzün', 'yıkılmış'],
        en: 'melancholic, sorrowful, emotional sadness'
      },
      'Romantik': {
        keywords: ['aşk', 'sevgi', 'kalp', 'öpücük', 'sarıl', 'sevgili', 'tutku', 'arzu'],
        intensity: ['tutkulu', 'ateşli'],
        en: 'romantic, passionate, intimate love'
      },
      'Gizemli': {
        keywords: ['gizem', 'sır', 'bilinmeyen', 'tuhaf', 'garip', 'esrar', 'karanlık'],
        intensity: ['derin gizem', 'anlaşılmaz'],
        en: 'mysterious, enigmatic, secretive atmosphere'
      },
      'Epik': {
        keywords: ['savaş', 'kahraman', 'zafer', 'mücadele', 'güç', 'ordu', 'kılıç', 'destan'],
        intensity: ['destansı', 'efsanevi'],
        en: 'epic, heroic, grand battle atmosphere'
      },
      'Nostaljik': {
        keywords: ['geçmiş', 'anı', 'hatıra', 'eski', 'çocukluk', 'zamanda'],
        intensity: ['derin nostalji'],
        en: 'nostalgic, vintage, memory-like quality'
      },
      'Fantastik': {
        keywords: ['büyü', 'sihir', 'ejderha', 'peri', 'fantezi', 'mitoloji', 'efsane'],
        intensity: ['saf fantezi'],
        en: 'magical fantasy, mythical, enchanted'
      },
    };

    let detectedMood = 'Nötr';
    let moodEnglish = 'neutral atmosphere';
    let maxScore = 0;
    let isIntense = false;

    for (const [mood, { keywords, intensity, en }] of Object.entries(moodKeywords)) {
      let score = 0;
      for (const kw of keywords) {
        if (findWithSuffixes(lowerText, kw) && !isNegated(text, kw)) {
          score++;
        }
      }
      // Yoğunluk kontrolü
      for (const intenseKw of intensity) {
        if (lowerText.includes(intenseKw)) {
          score += 2;
          isIntense = true;
        }
      }
      if (score > maxScore) {
        maxScore = score;
        detectedMood = mood;
        moodEnglish = isIntense ? `intense ${en}` : en;
      }
    }

    // 8. Işık algılama (zaman ile birleşik)
    let detectedLighting = timeOfDay.tr;
    let lightingEnglish = timeOfDay.en;

    const lightingKeywords: Record<string, { keywords: string[], en: string }> = {
      'Dramatik': { keywords: ['gölge', 'ışık huzmesi', 'spot', 'kontrast', 'siluet'], en: 'dramatic lighting, high contrast, chiaroscuro' },
      'Yumuşak': { keywords: ['lamba', 'mum', 'şömine', 'avize', 'loş'], en: 'soft ambient lighting, warm glow' },
      'Neon': { keywords: ['neon', 'floresan', 'parlak ışık'], en: 'neon lights, cyberpunk lighting, vibrant colors' },
      'Doğal': { keywords: ['gün ışığı', 'pencereden', 'doğal ışık'], en: 'natural lighting, soft shadows' },
    };

    for (const [, { keywords, en }] of Object.entries(lightingKeywords)) {
      if (keywords.some(kw => findWithSuffixes(lowerText, kw))) {
        lightingEnglish = en;
        break;
      }
    }

    // 9. Ortam algılama (genişletilmiş)
    const envKeywords: Record<string, { keywords: string[], priority: number, en: string }> = {
      'Deniz kenarı': { keywords: ['deniz', 'kumsal', 'dalga', 'sahil', 'okyanus', 'plaj'], priority: 3, en: 'beach, ocean waves, sandy shore, coastal scenery' },
      'Dağ': { keywords: ['dağ', 'zirve', 'yamaç', 'kayalık', 'uçurum'], priority: 3, en: 'mountain landscape, rocky peaks, alpine scenery' },
      'Orman': { keywords: ['orman', 'ağaçlar', 'yaprak', 'çalılık', 'koruluk'], priority: 2, en: 'dense forest, tall trees, lush vegetation' },
      'Çöl': { keywords: ['çöl', 'kum tepesi', 'vaha', 'deve'], priority: 3, en: 'desert landscape, sand dunes, arid' },
      'Kar': { keywords: ['kar', 'buz', 'kış', 'soğuk', 'don'], priority: 2, en: 'snowy landscape, winter scenery, frozen' },
      'Şehir': { keywords: ['şehir', 'sokak', 'cadde', 'trafik', 'kaldırım', 'bina', 'gökdelen'], priority: 2, en: 'urban city, streets, buildings, metropolitan' },
      'Köy': { keywords: ['köy', 'kır', 'tarla', 'çiftlik', 'ahır'], priority: 2, en: 'rural village, countryside, farmland' },
      'Saray': { keywords: ['saray', 'kale', 'taht', 'krallık', 'şato'], priority: 3, en: 'grand palace, castle interior, royal architecture' },
      'Mağara': { keywords: ['mağara', 'yeraltı', 'tünel', 'karanlık delik'], priority: 3, en: 'dark cave, underground cavern, stalactites' },
      'Uzay': { keywords: ['uzay', 'galaksi', 'yıldız', 'gezegen', 'nebula'], priority: 3, en: 'outer space, galaxy, stars, cosmic scenery' },
      'Su altı': { keywords: ['su altı', 'denizaltı', 'mercan', 'balık sürüsü'], priority: 3, en: 'underwater scene, coral reef, marine life' },
      'İç mekan': { keywords: ['oda', 'salon', 'koridor', 'mutfak', 'yatak', 'içeri'], priority: 1, en: 'interior room, indoor setting' },
    };

    let detectedEnv = 'Belirsiz';
    let envEnglish = 'scenic background';
    let envScore = 0;
    for (const [env, { keywords, priority, en }] of Object.entries(envKeywords)) {
      const matches = keywords.filter(kw => findWithSuffixes(lowerText, kw)).length;
      const score = matches * priority;
      if (score > envScore) {
        envScore = score;
        detectedEnv = env;
        envEnglish = en;
      }
    }

    // 10. Stil ve kalite parametreleri
    const styleInfo = STYLES.find(s => s.id === styleSettings.style);
    const colorInfo = COLOR_PALETTES.find(c => c.id === styleSettings.colorPalette);

    // Stil bazlı İngilizce çeviriler
    const styleEnglish: Record<string, string> = {
      'cinematic': 'cinematic film still, movie scene, 35mm film, anamorphic lens, depth of field',
      'anime': 'anime style, studio ghibli inspired, vibrant colors, detailed illustration, cel shading',
      'comic': 'comic book art, bold outlines, halftone dots, dynamic composition, graphic novel style',
      'digital': 'digital art, trending on artstation, highly detailed, concept art, matte painting',
      'oil': 'oil painting, classical art, visible brushstrokes, renaissance style, museum quality',
      'watercolor': 'watercolor painting, soft edges, flowing colors, paper texture, delicate washes',
      'minimal': 'minimalist design, clean lines, simple shapes, flat design, modern aesthetic',
      'custom': styleSettings.customStyle || 'artistic style',
    };

    const colorEnglish: Record<string, string> = {
      'warm': 'warm color palette, orange and red tones, cozy atmosphere',
      'cool': 'cool color palette, blue and purple tones, calm atmosphere',
      'pastel': 'soft pastel colors, dreamy aesthetic, gentle tones',
      'dark': 'dark moody colors, noir aesthetic, shadows and contrast',
      'vibrant': 'vibrant saturated colors, high contrast, bold palette',
      'earthy': 'earth tones, natural browns and greens, organic feel',
      'monochrome': 'monochromatic, black and white, grayscale',
    };

    // 11. Karakter açıklamaları (İngilizce)
    const characterDescriptions = characters.map(c =>
      `${c.name} (${c.appearance}, ${c.clothing}${c.traits ? ', ' + c.traits : ''})`
    ).join(', ');

    // 12. Detay çıkarma
    const extractedKeywords = extractEnglishKeywords(text);

    // 13. YENİ: Temel içerik çıkarma (KONU-EYLEM-NESNE)
    const coreContent = extractCoreContent(text);

    // ============== GELİŞMİŞ ANALİZ ==============

    // Deyim ve mecaz algılama
    const idiomResult = detectIdiomsAndMetaphors(text);

    // Tüm deyimleri al (detaylı)
    const allIdioms = detectAllIdioms(text);

    // Soyut kavram algılama
    const abstractVisuals = detectAbstractConcepts(text);

    // Soyut kavramlar detaylı
    const abstractConceptsDetailed = detectAbstractConceptsDetailed(text);

    // Karşıt kavram algılama
    const contrastResult = detectContrastingConcepts(text);

    // Metaforik renk algılama
    const metaphoricColor = detectMetaphoricColors(text);

    // Sahne tipi ve kamera stili
    const sceneTypeResult = detectSceneType(text);

    // Duygu yoğunluğu analizi
    const emotionResult = analyzeEmotionIntensity(text);

    // ============== KARMAŞIK İSTEK ANALİZİ ==============

    // Niyet/İstek algılama
    const intentResult = detectIntentAndDesire(text);

    // Koşullu/Varsayımsal durum
    const conditionalResult = detectConditionalMood(text);

    // Zamansal ifadeler
    const temporalResult = detectTemporalExpressions(text);

    // Karakter etkileşimi
    const interactionResult = detectCharacterInteraction(text);

    // Anlatım perspektifi
    const perspectiveResult = detectNarrativePerspective(text);

    // Sembolik nesneler
    const symbolsResult = detectSymbolicObjects(text);

    // Duyusal detaylar
    const sensoryResult = detectSensoryDetails(text);

    // Mekansal ilişkiler
    const spatialResult = detectSpatialRelations(text);

    // Karmaşık anlatı analizi
    const narrativeResult = analyzeComplexNarrative(text);

    // Yeni gelişmiş analizler
    const genreResult = detectGenre(text);
    const dialogueToneResult = detectDialogueTone(text);
    const relationshipResult = detectRelationshipDynamics(text);
    const actionIntensityResult = detectActionIntensity(text);
    const historicalPeriodResult = detectHistoricalPeriod(text);

    // ============== PROMPT OLUŞTURMA ==============

    // Karakter var mı kontrol
    const hasCharacters = characterDescriptions.length > 0 ||
      text.match(/adam|kadın|çocuk|kız|oğlan|insan|karakter|kahraman|kişi/i) !== null;

    // Mevcut stil tipini belirle
    const currentStyleType = styleSettings.style === 'Sinematik' ? 'cinematic' :
      styleSettings.style === 'Anime' ? 'anime' :
      styleSettings.style === 'Yağlı Boya' ? 'oil_painting' :
      styleSettings.style === 'Suluboya' ? 'watercolor' :
      styleSettings.style === 'Dijital Sanat' ? 'digital_art' :
      styleSettings.style === 'Fantastik' ? 'fantasy_art' : 'photorealistic';

    // Gelişmiş kalite etiketleri
    const qualityTags = generateQualityTags(currentStyleType, false);
    const creativeQualityTags = generateQualityTags(currentStyleType, true);

    // Çeşitli kamera ve kompozisyon
    const cameraVariety = generateCameraVariety(sceneTypeResult.type, detectedMood);

    // Işık çeşitliliği
    const lightingVariety = generateLightingVariety(detectedLighting, detectedMood, genreResult.genre);

    // Sanatçı stil referansı
    const artistStyle = generateArtistStyle(genreResult.genre, currentStyleType);

    // Gelişmiş negatif prompt
    const advancedNegative = generateAdvancedNegativePrompt(genreResult.genre, currentStyleType, hasCharacters);

    // Detay zenginliği
    const detailEnhancer = generateDetailEnhancer(sceneTypeResult.type, hasCharacters);

    // Deyim görsellerini ekle
    const idiomVisuals = idiomResult.idiom ? idiomResult.visual : '';
    const idiomMood = idiomResult.idiom ? idiomResult.mood : '';
    const idiomLighting = idiomResult.idiom ? idiomResult.lighting : '';

    // Soyut kavram görsellerini birleştir
    const abstractVisualsStr = abstractVisuals.slice(0, 3).join(', ');

    // Karşıt kavram görseli
    const contrastVisual = contrastResult.hasContrast ? contrastResult.visual : '';

    // Metaforik renk görseli
    const colorMetaphorVisual = metaphoricColor.color ? metaphoricColor.visual : '';

    // Karmaşık istek görselleri
    const intentVisual = intentResult.hasIntent ? intentResult.visual : '';
    const conditionalVisual = conditionalResult.isConditional ? conditionalResult.visual : '';
    const temporalVisual = temporalResult.hasTemporal ? temporalResult.visual : '';
    const interactionVisual = interactionResult.hasInteraction ? interactionResult.visual : '';
    const perspectiveCamera = perspectiveResult.cameraApproach;
    const symbolsVisual = symbolsResult.length > 0 ? symbolsResult.map(s => s.visual).join(', ') : '';
    const sensoryVisual = sensoryResult.visual;
    const spatialComposition = spatialResult.hasSpatial ? spatialResult.composition : '';
    const narrativeStyle = narrativeResult.hasMultipleEvents ? narrativeResult.narrative : '';

    // Yeni gelişmiş görsel öğeleri
    const genreVisual = genreResult.visual;
    const genreColorScheme = genreResult.colorScheme;
    const genreAtmosphere = genreResult.atmosphere;
    const dialogueToneVisual = dialogueToneResult.hasTone ? dialogueToneResult.visual : '';
    const dialogueExpression = dialogueToneResult.hasTone ? dialogueToneResult.characterExpression : '';
    const relationshipVisual = relationshipResult.hasRelationship ? relationshipResult.visual : '';
    const relationshipPose = relationshipResult.hasRelationship ? relationshipResult.dynamicPose : '';
    const actionCameraEffect = actionIntensityResult.cameraEffect;
    const actionVisual = actionIntensityResult.visual;
    const historicalVisual = historicalPeriodResult.hasPeriod ? historicalPeriodResult.visual : '';
    const historicalProps = historicalPeriodResult.hasPeriod ? historicalPeriodResult.props : '';

    // Dinamik negatif prompt
    const dynamicNegativePrompt = generateDynamicNegativePrompt(genreResult.genre);

    // Sahne tipi kamera stilini kullan (daha spesifik)
    const enhancedCameraAngle = perspectiveCamera || sceneTypeResult.cameraStyle || cameraAngle;

    // =============================================================
    // YENİ BASİTLEŞTİRİLMİŞ PROMPT SİSTEMİ
    // Stable Diffusion sadece ilk ~77 token'a odaklanır
    // Bu yüzden prompt KISA ve ÖZ olmalı (max 50-60 kelime)
    // =============================================================

    // 1. ANA İÇERİK CÜMLESI (en kritik kısım - ilk 20-30 kelime)
    const buildCorePrompt = (): string => {
      const parts: string[] = [];

      // Konu + Eylem + Mekan (ana cümle)
      if (coreContent.subject && coreContent.action) {
        parts.push(`${coreContent.subject} ${coreContent.action}`);
      } else if (coreContent.subject) {
        parts.push(coreContent.subject);
      } else if (coreContent.description) {
        parts.push(coreContent.description);
      }

      // Mekan/Ortam (varsa)
      if (envEnglish && envEnglish !== 'scenic background') {
        parts.push(`in ${envEnglish}`);
      }

      // Nesneler (max 3)
      if (coreContent.objects.length > 0) {
        parts.push(`with ${coreContent.objects.slice(0, 3).join(' and ')}`);
      }

      return parts.join(' ');
    };

    // 2. DESTEKLEYICI ANAHTAR KELİMELER (sonraki 15-20 kelime)
    const buildSupportKeywords = (): string => {
      const keywords: string[] = [];

      // Hava durumu
      if (weather) keywords.push(weather);

      // Zaman dilimi ışığı
      if (lightingEnglish) keywords.push(lightingEnglish);

      // Ruh hali (varsa ve güçlüyse)
      if (emotionResult.intensity >= 5 && moodEnglish !== 'neutral atmosphere') {
        keywords.push(moodEnglish);
      }

      // Eylemler (max 2)
      if (detectedActions.length > 0) {
        keywords.push(...detectedActions.slice(0, 2));
      }

      // Önemli anahtar kelimeler (max 4)
      const importantKeywords = extractedKeywords.slice(0, 4);
      keywords.push(...importantKeywords);

      return keywords.slice(0, 8).join(', ');
    };

    // 3. MİNİMAL STİL ETİKETLERİ (son 10-15 kelime)
    const buildStyleTags = (): string => {
      const styleParts: string[] = [];

      // Temel stil
      const style = styleEnglish[styleSettings.style];
      if (style) {
        // Sadece ilk 3-4 kelimeyi al
        styleParts.push(style.split(',')[0].trim());
      }

      // Temel kalite (kısa)
      styleParts.push('highly detailed');
      styleParts.push('professional');

      // Kamera açısı (basit)
      if (enhancedCameraAngle && enhancedCameraAngle !== 'dynamic shot') {
        styleParts.push(enhancedCameraAngle.split(',')[0].trim());
      }

      return styleParts.slice(0, 4).join(', ');
    };

    // FINAL PROMPT: İçerik + Destek + Stil (max ~50 kelime)
    const faithfulParts = [
      buildCorePrompt(),      // "a man walking in forest with trees"
      buildSupportKeywords(), // "sunset, dramatic lighting, running"
      buildStyleTags(),       // "cinematic, highly detailed, medium shot"
    ].filter(Boolean).join(', ');

    // Yaratıcı (Creative) Prompt - Artistik yorumlama (yine basit ve öz)
    const buildCreativePrompt = (): string => {
      const parts: string[] = [];

      // Ana içerik (artistik versiyon)
      if (coreContent.subject && coreContent.action) {
        parts.push(`dramatic scene of ${coreContent.subject} ${coreContent.action}`);
      } else if (coreContent.description) {
        parts.push(`artistic ${coreContent.description}`);
      }

      // Mekan
      if (envEnglish && envEnglish !== 'scenic background') {
        parts.push(`in ${envEnglish}`);
      }

      return parts.join(' ');
    };

    const buildCreativeStyle = (): string => {
      const parts: string[] = [];

      // Atmosfer
      if (moodEnglish !== 'neutral atmosphere') {
        parts.push(moodEnglish);
      }

      // Işık
      if (lightingEnglish) {
        parts.push(lightingEnglish);
      }

      // Stil
      parts.push('masterpiece');
      parts.push('award winning');

      const style = styleEnglish[styleSettings.style];
      if (style) {
        parts.push(style.split(',')[0].trim());
      }

      return parts.slice(0, 5).join(', ');
    };

    const creativeParts = [
      buildCreativePrompt(),
      buildCreativeStyle(),
    ].filter(Boolean).join(', ');

    // Gelişmiş negatif prompt (tür ve stile göre optimize edilmiş)
    const negativePrompt = advancedNegative;

    return {
      id: Date.now().toString() + sceneNum,
      title: `Sahne ${sceneNum}`,
      description: text.slice(0, 300) + (text.length > 300 ? '...' : ''),
      objects: englishObjects.length > 0 ? englishObjects : ['unspecified'],
      mood: idiomMood ? `${idiomResult.idiom} - ${idiomMood}` : `${detectedMood} (${moodEnglish})`,
      lighting: idiomLighting ? idiomLighting : `${detectedLighting} (${lightingEnglish})`,
      environment: `${detectedEnv} (${envEnglish})`,
      importantDetails: [
        // Deyim/mecaz algılandıysa göster
        allIdioms.length > 0 ? `🎭 Deyim/Mecaz: ${allIdioms.map(i => `"${i.key}"`).join(', ')} algılandı` : '',
        // Çoklu deyim uyarısı
        allIdioms.length > 1 ? `✨ Karma duygu: ${allIdioms.length} farklı deyim birleştirildi` : '',
        // Karşıt kavramlar
        contrastResult.hasContrast ? `⚖️ Karşıt kavramlar algılandı` : '',
        // Metaforik renk
        metaphoricColor.color ? `🎨 Metaforik renk: ${metaphoricColor.color} (${metaphoricColor.meaning})` : '',
        // Soyut kavramlar detaylı
        abstractConceptsDetailed.length > 0 ? `💭 Soyut kavramlar: ${abstractConceptsDetailed.map(c => c.concept).join(', ')}` : '',
        // ===== YENİ ANALİZ ÖĞELERİ =====
        // Niyet/İstek
        intentResult.hasIntent ? `🎯 Niyet: ${intentResult.intentType === 'desire' ? 'Arzu/İstek' :
          intentResult.intentType === 'seeking' ? 'Arayış' :
          intentResult.intentType === 'waiting' ? 'Bekleme' :
          intentResult.intentType === 'remembering' ? 'Hatırlama' :
          intentResult.intentType === 'deciding' ? 'Karar' :
          intentResult.intentType === 'dreaming' ? 'Hayal' :
          intentResult.intentType === 'struggling' ? 'Mücadele' : intentResult.intentType} (${intentResult.mood})` : '',
        // Koşullu/Varsayımsal
        conditionalResult.isConditional ? `🌀 Varsayımsal: ${conditionalResult.conditionType === 'regret_wish' ? 'Keşke/Pişmanlık' :
          conditionalResult.conditionType === 'as_if' ? 'Sanki/Benzetme' :
          conditionalResult.conditionType === 'conditional' ? 'Eğer/Koşul' :
          conditionalResult.conditionType === 'possibility' ? 'Belki/Olasılık' :
          conditionalResult.conditionType === 'impossible' ? 'İmkansız' : conditionalResult.conditionType}` : '',
        // Zamansal ifade
        temporalResult.hasTemporal ? `⏱️ Zamanlama: ${temporalResult.temporalType === 'sudden' ? 'Ani' :
          temporalResult.temporalType === 'slow' ? 'Yavaş' :
          temporalResult.temporalType === 'continuous' ? 'Sürekli' :
          temporalResult.temporalType === 'sequence' ? 'Ardışık' :
          temporalResult.temporalType === 'before' ? 'Geçmiş' :
          temporalResult.temporalType === 'present' ? 'Şimdi' :
          temporalResult.temporalType === 'future' ? 'Gelecek' : temporalResult.temporalType} (${temporalResult.pacing})` : '',
        // Karakter etkileşimi
        interactionResult.hasInteraction ? `👥 Etkileşim: ${interactionResult.interactionType === 'dialogue' ? 'Diyalog' :
          interactionResult.interactionType === 'physical_contact' ? 'Fiziksel Temas' :
          interactionResult.interactionType === 'conflict' ? 'Çatışma' :
          interactionResult.interactionType === 'chase' ? 'Takip' :
          interactionResult.interactionType === 'together' ? 'Birlikte' :
          interactionResult.interactionType === 'encounter' ? 'Karşılaşma' :
          interactionResult.interactionType === 'farewell' ? 'Vedalaşma' :
          interactionResult.interactionType === 'protection' ? 'Koruma' : interactionResult.interactionType}` : '',
        // Anlatım perspektifi
        `👁️ Perspektif: ${perspectiveResult.perspective === 'first_person' ? 'Birinci şahıs (Ben)' :
          perspectiveResult.perspective === 'first_person_plural' ? 'Birinci çoğul (Biz)' :
          perspectiveResult.perspective === 'second_person' ? 'İkinci şahıs (Sen)' : 'Üçüncü şahıs (O)'}`,
        // Sembolik nesneler
        symbolsResult.length > 0 ? `🔮 Semboller: ${symbolsResult.map(s => `${s.object} (${s.symbolism})`).join(', ')}` : '',
        // Duyusal detaylar
        sensoryResult.sounds.length > 0 ? `🔊 Sesler: ${sensoryResult.sounds.join(', ')}` : '',
        sensoryResult.smells.length > 0 ? `👃 Kokular: ${sensoryResult.smells.join(', ')}` : '',
        sensoryResult.textures.length > 0 ? `✋ Dokular: ${sensoryResult.textures.join(', ')}` : '',
        // Mekansal ilişki
        spatialResult.hasSpatial ? `📍 Mekan: ${spatialResult.spatial === 'above' ? 'Yukarıda' :
          spatialResult.spatial === 'below' ? 'Aşağıda' :
          spatialResult.spatial === 'behind' ? 'Arkada' :
          spatialResult.spatial === 'in_front' ? 'Önde' :
          spatialResult.spatial === 'beside' ? 'Yanında' :
          spatialResult.spatial === 'inside' ? 'İçinde' :
          spatialResult.spatial === 'outside' ? 'Dışında' :
          spatialResult.spatial === 'around' ? 'Etrafında' : spatialResult.spatial}` : '',
        // Karmaşık anlatı
        narrativeResult.hasMultipleEvents ? `📚 Karmaşık anlatı: ${narrativeResult.events.length} farklı olay algılandı` : '',
        // Sahne tipi
        `📽️ Sahne tipi: ${sceneTypeResult.type === 'action' ? 'Aksiyon' :
          sceneTypeResult.type === 'dialogue' ? 'Diyalog' :
          sceneTypeResult.type === 'introspection' ? 'İç monolog' :
          sceneTypeResult.type === 'description' ? 'Betimleme' : 'Genel'}`,
        // Duygu yoğunluğu
        `🔥 Duygu yoğunluğu: ${emotionResult.intensity}/10`,
        // Eylemler
        detectedActions.length > 0 ? `⚡ Eylemler: ${detectedActions.join(', ')}` : '',
        weather ? `🌤️ Hava: ${weather}` : '',
        characterPose !== 'natural pose' ? `🧍 Poz: ${characterPose}` : '',
        // ===== YENİ GELİŞMİŞ ANALİZ ÖĞELERİ =====
        // Tür/Janra
        genreResult.genre !== 'general' ? `🎬 Tür: ${
          genreResult.genre === 'horror' ? 'Korku' :
          genreResult.genre === 'romance' ? 'Romantik' :
          genreResult.genre === 'sci-fi' ? 'Bilim Kurgu' :
          genreResult.genre === 'fantasy' ? 'Fantastik' :
          genreResult.genre === 'action' ? 'Aksiyon' :
          genreResult.genre === 'thriller' ? 'Gerilim' :
          genreResult.genre === 'drama' ? 'Dram' :
          genreResult.genre === 'historical' ? 'Tarihi' : genreResult.genre}` : '',
        // Diyalog tonu
        dialogueToneResult.hasTone ? `🗣️ Diyalog tonu: ${
          dialogueToneResult.tone === 'shouting' ? 'Bağırma' :
          dialogueToneResult.tone === 'whisper' ? 'Fısıltı' :
          dialogueToneResult.tone === 'crying' ? 'Ağlama' :
          dialogueToneResult.tone === 'laughing' ? 'Gülme' :
          dialogueToneResult.tone === 'threatening' ? 'Tehdit' :
          dialogueToneResult.tone === 'pleading' ? 'Yalvarma' : dialogueToneResult.tone}` : '',
        // İlişki dinamikleri
        relationshipResult.hasRelationship ? `❤️ İlişki: ${
          relationshipResult.relationshipType === 'family' ? 'Aile bağı' :
          relationshipResult.relationshipType === 'romantic' ? 'Romantik' :
          relationshipResult.relationshipType === 'enemies' ? 'Düşmanlık' :
          relationshipResult.relationshipType === 'friends' ? 'Dostluk' :
          relationshipResult.relationshipType === 'mentor' ? 'Mentor-öğrenci' : relationshipResult.relationshipType}` : '',
        // Aksiyon yoğunluğu
        actionIntensityResult.intensity > 3 ? `💥 Aksiyon yoğunluğu: ${actionIntensityResult.level} (${actionIntensityResult.intensity}/10)` : '',
        // Tarihi dönem
        historicalPeriodResult.hasPeriod ? `🏛️ Dönem: ${
          historicalPeriodResult.period === 'ancient' ? 'Antik çağ' :
          historicalPeriodResult.period === 'medieval' ? 'Ortaçağ' :
          historicalPeriodResult.period === 'ottoman' ? 'Osmanlı dönemi' :
          historicalPeriodResult.period === 'victorian' ? 'Viktorya dönemi' :
          historicalPeriodResult.period === 'future' ? 'Gelecek' : historicalPeriodResult.period}` : '',
        `📷 Kamera: ${enhancedCameraAngle}`,
        ...extractDetails(text),
      ].filter(Boolean),
      faithfulPrompt: faithfulParts,
      creativePrompt: creativeParts,
      negativePrompt: negativePrompt,
      resolution: (() => {
        const res = RESOLUTIONS.find(r => r.id === styleSettings.resolution) || RESOLUTIONS[3];
        const calculated = calculateResolutionForFormat(styleSettings.resolution, styleSettings.format);
        return { id: res.id, width: calculated.width, height: calculated.height };
      })(),
    };
  };

  const extractDetails = (text: string): string[] => {
    const details: string[] = [];
    // Look for quoted text
    const quotes = text.match(/"[^"]+"/g);
    if (quotes) details.push(...quotes.slice(0, 3));

    // Look for numbers/dates
    const numbers = text.match(/\d+/g);
    if (numbers) details.push(`Sayılar: ${numbers.slice(0, 3).join(', ')}`);

    // Look for color mentions
    const colors = ['kırmızı', 'mavi', 'yeşil', 'sarı', 'siyah', 'beyaz', 'mor', 'turuncu'];
    const foundColors = colors.filter(c => text.toLowerCase().includes(c));
    if (foundColors.length) details.push(`Renkler: ${foundColors.join(', ')}`);

    return details.length > 0 ? details : ['Özel detay bulunamadı'];
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportProject = () => {
    const projectData = {
      exportDate: new Date().toISOString(),
      styleSettings,
      characters,
      scenes: scenes.map(s => ({
        ...s,
        prompts: {
          faithful: s.faithfulPrompt,
          creative: s.creativePrompt,
        }
      })),
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `visual-story-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Tab navigation
  const tabs = [
    { id: 'input', icon: FileText, label: 'Metin Girişi' },
    { id: 'characters', icon: Users, label: 'Karakterler' },
    { id: 'style', icon: Palette, label: 'Stil Ayarları' },
    { id: 'scenes', icon: Layers, label: 'Sahneler' },
    { id: 'export', icon: Download, label: 'Dışa Aktar' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/20 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="p-1.5 sm:p-2 bg-purple-500/20 rounded-lg">
              <Wand2 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white">Görsel Hikaye Üretici</h1>
              <p className="text-xs sm:text-sm text-slate-400 hidden sm:block">Metinden görsel üretim sistemi</p>
            </div>
          </div>

          {/* Backend Status */}
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-end">
            {checkingBackend ? (
              <div className="flex items-center gap-2 text-slate-400 text-xs sm:text-sm">
                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 animate-spin" />
                <span className="hidden sm:inline">Bağlantı kontrol ediliyor...</span>
                <span className="sm:hidden">Kontrol...</span>
              </div>
            ) : backendStatus?.online ? (
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
                <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-green-500/20 border border-green-500/30 rounded-lg">
                  {backendStatus.device.mode === 'gpu' ? (
                    <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-green-400" />
                  ) : (
                    <Cpu className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-400" />
                  )}
                  <span className="text-xs sm:text-sm text-green-300">
                    {backendStatus.device.mode === 'gpu'
                      ? `GPU`
                      : 'CPU'}
                  </span>
                </div>
                {backendStatus.model.loaded ? (
                  <span className="text-xs text-slate-400 hidden lg:inline">
                    Model: {backendStatus.model.name}
                  </span>
                ) : backendStatus.model.loading ? (
                  <span className="text-xs text-yellow-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span className="hidden sm:inline">Model yükleniyor...</span>
                  </span>
                ) : (
                  <button
                    onClick={loadModel}
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    Modeli Yükle
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg">
                <WifiOff className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                <span className="text-xs sm:text-sm text-red-300">Çevrimdışı</span>
                <button
                  onClick={checkBackendStatus}
                  className="ml-1 sm:ml-2 p-1 hover:bg-white/10 rounded"
                  title="Yeniden Dene"
                >
                  <RefreshCw className="w-3 h-3 text-red-400" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Tab Bar */}
      <nav className="lg:hidden sticky top-[52px] sm:top-[60px] z-30 bg-black/40 backdrop-blur-md border-b border-white/10 overflow-x-auto">
        <div className="flex min-w-max px-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'text-purple-300 border-b-2 border-purple-400 bg-purple-500/10'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-4 sm:py-6 flex gap-4 lg:gap-6">
        {/* Sidebar - Desktop Only */}
        <nav className="hidden lg:block w-56 flex-shrink-0">
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden sticky top-24">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${
                  activeTab === tab.id
                    ? 'bg-purple-500/20 text-purple-300 border-l-2 border-purple-400'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white border-l-2 border-transparent'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
                {activeTab === tab.id && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            ))}

            {/* Quick stats */}
            <div className="mt-4 p-4 border-t border-white/10">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Proje Durumu</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Karakterler</span>
                  <span className="text-white font-medium">{characters.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sahneler</span>
                  <span className="text-white font-medium">{scenes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Promptlar</span>
                  <span className="text-white font-medium">{scenes.length * 2}</span>
                </div>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          {/* Input Tab */}
          {activeTab === 'input' && (
            <div className="bg-white/5 rounded-xl border border-white/10 p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                <h2 className="text-lg sm:text-xl font-semibold text-white">Metin Girişi</h2>
              </div>

              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Hikayenizi, notlarınızı veya fikirlerinizi buraya yapıştırın...

Örnek:
Güneş batarken, yaşlı adam sahilde yürüyordu. Elinde eski bir fotoğraf vardı."
                className="w-full h-48 sm:h-64 lg:h-80 bg-black/30 border border-white/10 rounded-lg p-3 sm:p-4 text-sm sm:text-base text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mt-4">
                <span className="text-xs sm:text-sm text-slate-500 order-2 sm:order-1">
                  {inputText.length} karakter | {inputText.split(/\n\n+/).filter(p => p.trim()).length} paragraf
                </span>
                <button
                  onClick={analyzeText}
                  disabled={!inputText.trim() || isAnalyzing}
                  className="w-full sm:w-auto order-1 sm:order-2 flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm sm:text-base font-medium rounded-lg transition-colors"
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span className="hidden sm:inline">Analiz ediliyor...</span>
                      <span className="sm:hidden">Analiz...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span className="hidden sm:inline">Analiz Et & Sahne Oluştur</span>
                      <span className="sm:hidden">Sahne Oluştur</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Characters Tab */}
          {activeTab === 'characters' && (
            <div className="bg-white/5 rounded-xl border border-white/10 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                  <h2 className="text-lg sm:text-xl font-semibold text-white">Karakter Tanımları</h2>
                </div>
                <button
                  onClick={addCharacter}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 text-sm sm:text-base rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Karakter Ekle
                </button>
              </div>

              <p className="text-slate-400 text-xs sm:text-sm mb-4 sm:mb-6">
                Tutarlı görseller için karakterlerinizi tanımlayın.
              </p>

              {characters.length === 0 ? (
                <div className="text-center py-8 sm:py-12 text-slate-500">
                  <Users className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm sm:text-base">Henüz karakter eklenmedi</p>
                  <button
                    onClick={addCharacter}
                    className="mt-4 text-purple-400 hover:text-purple-300 text-sm"
                  >
                    İlk karakteri ekle →
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {characters.map((char, index) => (
                    <div key={char.id} className="bg-black/30 rounded-lg p-3 sm:p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <span className="text-xs sm:text-sm text-slate-500">Karakter {index + 1}</span>
                        <button
                          onClick={() => removeCharacter(char.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <input
                          type="text"
                          value={char.name}
                          onChange={(e) => updateCharacter(char.id, 'name', e.target.value)}
                          placeholder="İsim (ör: Ahmet)"
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                        <input
                          type="text"
                          value={char.appearance}
                          onChange={(e) => updateCharacter(char.id, 'appearance', e.target.value)}
                          placeholder="Görünüm (ör: kısa siyah saç)"
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                        <input
                          type="text"
                          value={char.clothing}
                          onChange={(e) => updateCharacter(char.id, 'clothing', e.target.value)}
                          placeholder="Kıyafet (ör: mavi kazak)"
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                        <input
                          type="text"
                          value={char.traits}
                          onChange={(e) => updateCharacter(char.id, 'traits', e.target.value)}
                          placeholder="Özellikler (ör: gözlüklü)"
                          className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Style Tab */}
          {activeTab === 'style' && (
            <div className="bg-white/5 rounded-xl border border-white/10 p-4 sm:p-6">
              <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
                <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                <h2 className="text-lg sm:text-xl font-semibold text-white">Stil Ayarları</h2>
              </div>

              {/* Style Selection */}
              <div className="mb-6 sm:mb-8">
                <h3 className="text-xs sm:text-sm font-medium text-slate-400 mb-2 sm:mb-3">Görsel Stili</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setStyleSettings({ ...styleSettings, style: style.id })}
                      className={`p-2 sm:p-3 rounded-lg border text-left transition-all ${
                        styleSettings.style === style.id
                          ? 'bg-purple-500/20 border-purple-500 text-white'
                          : 'bg-black/20 border-white/10 text-slate-400 hover:border-white/30'
                      }`}
                    >
                      <div className="font-medium text-xs sm:text-sm">{style.name}</div>
                      <div className="text-xs opacity-70 mt-1 hidden sm:block">{style.desc}</div>
                    </button>
                  ))}
                </div>
                {styleSettings.style === 'custom' && (
                  <textarea
                    value={styleSettings.customStyle}
                    onChange={(e) => setStyleSettings({ ...styleSettings, customStyle: e.target.value })}
                    placeholder="Özel stil tanımı..."
                    className="w-full mt-3 bg-black/30 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    rows={2}
                  />
                )}
              </div>

              {/* Color Palette */}
              <div className="mb-6 sm:mb-8">
                <h3 className="text-xs sm:text-sm font-medium text-slate-400 mb-2 sm:mb-3">Renk Paleti</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {COLOR_PALETTES.map((palette) => (
                    <button
                      key={palette.id}
                      onClick={() => setStyleSettings({ ...styleSettings, colorPalette: palette.id })}
                      className={`p-2 sm:p-3 rounded-lg border transition-all ${
                        styleSettings.colorPalette === palette.id
                          ? 'bg-purple-500/20 border-purple-500'
                          : 'bg-black/20 border-white/10 hover:border-white/30'
                      }`}
                    >
                      <div className="flex gap-1 mb-2">
                        {palette.colors.map((color, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 sm:w-6 sm:h-6 rounded"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="text-xs sm:text-sm text-white">{palette.name}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Composition */}
              <div className="mb-6 sm:mb-8">
                <h3 className="text-xs sm:text-sm font-medium text-slate-400 mb-2 sm:mb-3">Kompozisyon</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {COMPOSITIONS.map((comp) => (
                    <button
                      key={comp.id}
                      onClick={() => setStyleSettings({ ...styleSettings, composition: comp.id })}
                      className={`p-2 sm:p-3 rounded-lg border text-left transition-all ${
                        styleSettings.composition === comp.id
                          ? 'bg-purple-500/20 border-purple-500 text-white'
                          : 'bg-black/20 border-white/10 text-slate-400 hover:border-white/30'
                      }`}
                    >
                      <div className="font-medium text-sm">{comp.name}</div>
                      <div className="text-xs opacity-70 mt-1">{comp.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Format */}
              <div className="mb-6 sm:mb-8">
                <h3 className="text-sm font-medium text-slate-400 mb-3">Format (En-Boy Oranı)</h3>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {FORMATS.map((format) => (
                    <button
                      key={format.id}
                      onClick={() => setStyleSettings({ ...styleSettings, format: format.id })}
                      className={`px-3 sm:px-4 py-2 rounded-lg border transition-all ${
                        styleSettings.format === format.id
                          ? 'bg-purple-500/20 border-purple-500 text-white'
                          : 'bg-black/20 border-white/10 text-slate-400 hover:border-white/30'
                      }`}
                    >
                      <div className="font-medium text-xs sm:text-sm">{format.name}</div>
                      <div className="text-xs opacity-70 hidden sm:block">{format.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-slate-400">Çözünürlük ve Kalite</h3>

                {/* Quality Presets */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {QUALITY_PRESETS.map((preset) => {
                    const isActive = preset.resolutions.includes(styleSettings.resolution);
                    const colorClasses: Record<string, string> = {
                      yellow: isActive ? 'from-yellow-500/30 to-orange-500/30 border-yellow-500' : 'hover:border-yellow-500/50',
                      green: isActive ? 'from-green-500/30 to-emerald-500/30 border-green-500' : 'hover:border-green-500/50',
                      blue: isActive ? 'from-blue-500/30 to-cyan-500/30 border-blue-500' : 'hover:border-blue-500/50',
                      purple: isActive ? 'from-purple-500/30 to-pink-500/30 border-purple-500' : 'hover:border-purple-500/50',
                    };
                    return (
                      <button
                        key={preset.id}
                        onClick={() => setStyleSettings({ ...styleSettings, resolution: preset.resolutions[preset.resolutions.length - 1] })}
                        className={`p-3 rounded-lg border transition-all text-left ${
                          isActive
                            ? `bg-gradient-to-br ${colorClasses[preset.color]} text-white`
                            : `bg-black/20 border-white/10 text-slate-400 ${colorClasses[preset.color]}`
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{preset.icon}</span>
                          <span className="font-bold text-sm">{preset.name}</span>
                        </div>
                        <div className="text-xs opacity-70">{preset.desc}</div>
                      </button>
                    );
                  })}
                </div>

                {/* Resolution Grid */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
                  {RESOLUTIONS.map((res) => {
                    const calculatedRes = calculateResolutionForFormat(res.id, styleSettings.format);
                    const isSelected = styleSettings.resolution === res.id;
                    return (
                      <button
                        key={res.id}
                        onClick={() => setStyleSettings({ ...styleSettings, resolution: res.id })}
                        className={`relative px-2 sm:px-3 py-2 sm:py-3 rounded-lg border transition-all ${
                          isSelected
                            ? 'bg-gradient-to-br from-purple-500/30 to-pink-500/30 border-purple-500 text-white ring-2 ring-purple-500/50'
                            : 'bg-black/20 border-white/10 text-slate-400 hover:border-white/30 hover:bg-white/5'
                        }`}
                      >
                        {/* Quality badge */}
                        <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${
                          res.quality === 'draft' ? 'bg-yellow-500' :
                          res.quality === 'standard' ? 'bg-green-500' :
                          res.quality === 'high' ? 'bg-blue-500' : 'bg-purple-500'
                        }`} />

                        <div className="font-bold text-xs sm:text-sm">{res.name}</div>
                        <div className="text-xs opacity-70 mt-0.5 hidden sm:block">
                          {calculatedRes.width}x{calculatedRes.height}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Selected Resolution Details */}
                {(() => {
                  const selectedRes = RESOLUTIONS.find(r => r.id === styleSettings.resolution) || RESOLUTIONS[3];
                  const calculatedRes = calculateResolutionForFormat(styleSettings.resolution, styleSettings.format);
                  return (
                    <div className="bg-gradient-to-r from-slate-800/50 to-slate-900/50 rounded-lg p-4 border border-white/10">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <div className="text-white font-semibold text-lg flex items-center gap-2">
                            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {selectedRes.name}
                            <span className="text-sm font-normal text-slate-400">({styleSettings.format})</span>
                          </div>
                          <div className="text-slate-400 text-sm mt-1">
                            {calculatedRes.width} x {calculatedRes.height} piksel
                          </div>
                        </div>
                        <div className="flex gap-4 text-xs">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                            </svg>
                            <span className="text-slate-300">VRAM: <span className="text-blue-400 font-medium">{selectedRes.vram}</span></span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-slate-300">Süre: <span className="text-green-400 font-medium">{selectedRes.time}</span></span>
                          </div>
                        </div>
                      </div>

                      {/* Progress bar style indicator */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-slate-500 mb-1">
                          <span>Hız</span>
                          <span>Kalite</span>
                        </div>
                        <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-yellow-500 via-green-500 to-purple-500 transition-all duration-300"
                            style={{
                              width: `${
                                styleSettings.resolution === '360p' ? 16 :
                                styleSettings.resolution === '480p' ? 33 :
                                styleSettings.resolution === '720p' ? 50 :
                                styleSettings.resolution === '1080p' ? 66 :
                                styleSettings.resolution === '1440p' ? 83 : 100
                              }%`
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Warning for high resolutions */}
                {['1440p', '2160p'].includes(styleSettings.resolution) && (
                  <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 rounded-lg p-3 border border-amber-500/20">
                    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>
                      <strong>{styleSettings.resolution}</strong> çözünürlüğü yüksek GPU belleği gerektirir.
                      Yetersiz VRAM durumunda hata alabilirsiniz.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Scenes Tab */}
          {activeTab === 'scenes' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Layers className="w-6 h-6 text-purple-400" />
                  <h2 className="text-xl font-semibold text-white">Üretilen Sahneler</h2>
                </div>
                {scenes.length > 0 && (
                  <span className="text-sm text-slate-400">{scenes.length} sahne</span>
                )}
              </div>

              {/* Content Warning Banner */}
              {contentWarning && (
                <div className="bg-amber-500/20 border border-amber-500/50 rounded-lg p-4 flex items-start gap-3">
                  <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-amber-200 text-sm font-medium">İçerik Uyarısı</p>
                    <p className="text-amber-300/80 text-xs mt-1">{contentWarning}</p>
                  </div>
                </div>
              )}

              {/* Info Banner */}
              {scenes.length > 0 && (
                <div className={`border rounded-lg p-3 text-xs ${
                  backendStatus?.online && backendStatus?.model?.loaded
                    ? 'bg-green-500/10 border-green-500/30 text-green-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}>
                  {backendStatus?.online && backendStatus?.model?.loaded ? (
                    <>
                      <strong>Yerel Görsel Üretimi Hazır:</strong> "{backendStatus.model.name}" modeli yüklü.
                      Her sahne için "Görsel Üret" butonuna tıklayarak görsel oluşturabilirsiniz.
                      Tahmini süre: {backendStatus.recommended_settings?.estimated_time || '15-30 saniye'}.
                    </>
                  ) : backendStatus?.online ? (
                    <>
                      <strong>Backend Bağlı:</strong> Görsel üretmek için önce modeli yükleyin (sağ üstte "Modeli Yükle" butonu).
                      İlk yüklemede model indirilecek (~5-7GB), sonra offline çalışır.
                    </>
                  ) : (
                    <>
                      <strong>Backend Çevrimdışı:</strong> Yerel görsel üretimi için backend'i başlatın:
                      <code className="ml-2 px-2 py-0.5 bg-black/30 rounded">cd backend && python server.py</code>
                    </>
                  )}
                </div>
              )}

              {scenes.length === 0 ? (
                <div className="bg-white/5 rounded-xl border border-white/10 p-6 sm:p-12 text-center">
                  <Layers className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-slate-600" />
                  <p className="text-slate-500 mb-4 text-sm sm:text-base">Henüz sahne üretilmedi</p>
                  <button
                    onClick={() => setActiveTab('input')}
                    className="text-purple-400 hover:text-purple-300"
                  >
                    Metin girişine git →
                  </button>
                </div>
              ) : (
                scenes.map((scene, index) => (
                  <div key={scene.id} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                    {/* Scene Header */}
                    <div className="bg-black/30 px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h3 className="text-base sm:text-lg font-semibold text-white">{scene.title}</h3>
                        <div className="flex gap-2 flex-wrap">
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded">
                            {scene.mood}
                          </span>
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded">
                            {scene.environment}
                          </span>
                        </div>
                      </div>
                      <p className="text-slate-400 text-xs sm:text-sm mt-2">{scene.description}</p>
                    </div>

                    {/* Scene Details */}
                    <div className="p-4 sm:p-6">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
                        <div>
                          <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Nesneler</h4>
                          <div className="flex flex-wrap gap-1">
                            {scene.objects.map((obj, i) => (
                              <span key={i} className="px-2 py-0.5 bg-white/10 text-slate-300 text-xs rounded">
                                {obj}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Işık</h4>
                          <span className="text-slate-300 text-sm">{scene.lighting}</span>
                        </div>
                        <div>
                          <h4 className="text-xs font-medium text-slate-500 uppercase mb-2">Önemli Detaylar</h4>
                          <div className="text-slate-300 text-sm">
                            {scene.importantDetails.map((d, i) => (
                              <div key={i} className="truncate">{d}</div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Prompts with Generation */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Faithful Prompt */}
                        <div className="bg-black/30 rounded-lg p-3 sm:p-4 border border-white/10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-green-400">Sadık Versiyon</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => copyToClipboard(scene.faithfulPrompt, `faithful-${scene.id}`)}
                                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                                title="Kopyala"
                              >
                                {copiedId === `faithful-${scene.id}` ? (
                                  <Check className="w-4 h-4 text-green-400" />
                                ) : (
                                  <Copy className="w-4 h-4 text-slate-400" />
                                )}
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed mb-3">{scene.faithfulPrompt}</p>

                          {/* Generated Image Display */}
                          {scene.faithfulImageUrl && (
                            <div className="mb-3 relative group">
                              <img
                                src={scene.faithfulImageUrl}
                                alt="Üretilen görsel"
                                className="w-full rounded-lg border border-green-500/30"
                              />
                              <a
                                href={scene.faithfulImageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute top-2 right-2 p-2 bg-black/70 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Tam boyut aç"
                              >
                                <Image className="w-4 h-4 text-white" />
                              </a>
                            </div>
                          )}

                          {/* Generation Button */}
                          <button
                            onClick={() => generateImage(scene.id, 'faithful')}
                            disabled={!backendStatus?.online || !backendStatus?.model?.loaded || scene.generatingFaithful}
                            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              scene.generatingFaithful
                                ? 'bg-green-500/30 text-green-300 cursor-wait'
                                : backendStatus?.online && backendStatus?.model?.loaded
                                  ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30'
                                  : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {scene.generatingFaithful ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Üretiliyor...
                              </>
                            ) : (
                              <>
                                <Wand2 className="w-4 h-4" />
                                {scene.faithfulImageUrl ? 'Yeniden Üret' : 'Görsel Üret'}
                              </>
                            )}
                          </button>

                          {/* Error Display */}
                          {scene.generationError && !scene.generatingFaithful && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-red-400">
                              <AlertCircle className="w-3 h-3" />
                              <span>{scene.generationError}</span>
                            </div>
                          )}
                        </div>

                        {/* Creative Prompt */}
                        <div className="bg-black/30 rounded-lg p-3 sm:p-4 border border-white/10">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-purple-400">Yaratıcı Versiyon</span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => copyToClipboard(scene.creativePrompt, `creative-${scene.id}`)}
                                className="p-1.5 hover:bg-white/10 rounded transition-colors"
                                title="Kopyala"
                              >
                                {copiedId === `creative-${scene.id}` ? (
                                  <Check className="w-4 h-4 text-green-400" />
                                ) : (
                                  <Copy className="w-4 h-4 text-slate-400" />
                                )}
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-slate-400 leading-relaxed mb-3">{scene.creativePrompt}</p>

                          {/* Generated Image Display */}
                          {scene.creativeImageUrl && (
                            <div className="mb-3 relative group">
                              <img
                                src={scene.creativeImageUrl}
                                alt="Üretilen görsel"
                                className="w-full rounded-lg border border-purple-500/30"
                              />
                              <a
                                href={scene.creativeImageUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute top-2 right-2 p-2 bg-black/70 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Tam boyut aç"
                              >
                                <Image className="w-4 h-4 text-white" />
                              </a>
                            </div>
                          )}

                          {/* Generation Button */}
                          <button
                            onClick={() => generateImage(scene.id, 'creative')}
                            disabled={!backendStatus?.online || !backendStatus?.model?.loaded || scene.generatingCreative}
                            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                              scene.generatingCreative
                                ? 'bg-purple-500/30 text-purple-300 cursor-wait'
                                : backendStatus?.online && backendStatus?.model?.loaded
                                  ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30'
                                  : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {scene.generatingCreative ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Üretiliyor...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                {scene.creativeImageUrl ? 'Yeniden Üret' : 'Görsel Üret'}
                              </>
                            )}
                          </button>

                          {/* Error Display */}
                          {scene.generationError && !scene.generatingCreative && (
                            <div className="mt-2 flex items-center gap-2 text-xs text-red-400">
                              <AlertCircle className="w-3 h-3" />
                              <span>{scene.generationError}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Resolution & Negative Prompt Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        {/* Resolution Info */}
                        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 rounded-lg p-3 border border-blue-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs font-medium text-blue-400">Çözünürlük</span>
                          </div>
                          <div className="text-sm text-white font-bold">
                            {scene.resolution?.id || '1080p'}
                            <span className="text-xs text-slate-400 font-normal ml-2">
                              ({scene.resolution?.width || 1920}x{scene.resolution?.height || 1080})
                            </span>
                          </div>
                        </div>

                        {/* Negative Prompt */}
                        <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-lg p-3 border border-red-500/20">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                              <span className="text-xs font-medium text-red-400">Negatif Prompt</span>
                            </div>
                            <button
                              onClick={() => copyToClipboard(scene.negativePrompt || '', `negative-${scene.id}`)}
                              className="p-1 hover:bg-white/10 rounded transition-colors"
                              title="Kopyala"
                            >
                              {copiedId === `negative-${scene.id}` ? (
                                <Check className="w-3 h-3 text-green-400" />
                              ) : (
                                <Copy className="w-3 h-3 text-slate-400" />
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                            {scene.negativePrompt || 'blurry, low quality, bad anatomy...'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Export Tab */}
          {activeTab === 'export' && (
            <div className="bg-white/5 rounded-xl border border-white/10 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <Download className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400" />
                <h2 className="text-lg sm:text-xl font-semibold text-white">Dışa Aktar</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                {/* JSON Export */}
                <div className="bg-black/30 rounded-lg p-4 sm:p-6 border border-white/10">
                  <h3 className="text-base sm:text-lg font-medium text-white mb-2">Proje Dosyası (JSON)</h3>
                  <p className="text-xs sm:text-sm text-slate-400 mb-4">
                    Tüm ayarlar, karakterler ve promptları içerir. Projeyi tekrar yüklemek için kullanılabilir.
                  </p>
                  <button
                    onClick={exportProject}
                    disabled={scenes.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    JSON İndir
                  </button>
                </div>

                {/* Prompt List */}
                <div className="bg-black/30 rounded-lg p-4 sm:p-6 border border-white/10">
                  <h3 className="text-base sm:text-lg font-medium text-white mb-2">Tüm Promptları Kopyala</h3>
                  <p className="text-xs sm:text-sm text-slate-400 mb-4">
                    Sadece promptları metin olarak kopyalar. Midjourney/DALL-E'ye yapıştırmak için ideal.
                  </p>
                  <button
                    onClick={() => {
                      const allPrompts = scenes.map((s, i) =>
                        `--- Sahne ${i + 1} ---\n\nSadık:\n${s.faithfulPrompt}\n\nYaratıcı:\n${s.creativePrompt}`
                      ).join('\n\n');
                      copyToClipboard(allPrompts, 'all-prompts');
                    }}
                    disabled={scenes.length === 0}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                  >
                    {copiedId === 'all-prompts' ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        Kopyalandı!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Promptları Kopyala
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Summary */}
              {scenes.length > 0 && (
                <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                  <h4 className="text-purple-300 font-medium mb-2">Proje Özeti</h4>
                  <div className="text-sm text-slate-400 space-y-1">
                    <p>Karakterler: {characters.length}</p>
                    <p>Sahneler: {scenes.length}</p>
                    <p>Promptlar: {scenes.length * 2} (sadık + yaratıcı)</p>
                    <p>Stil: {STYLES.find(s => s.id === styleSettings.style)?.name}</p>
                    <p>Format: {styleSettings.format}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
