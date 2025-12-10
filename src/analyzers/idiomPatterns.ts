// Türkçe deyimler ve mecazlar -> görsel karşılıkları

export interface IdiomPattern {
  patterns: string[];
  visual: string;
  mood: string;
  lighting: string;
}

export const idiomPatterns: Record<string, IdiomPattern> = {
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
  // ===== BEDEN VE FİZİKSEL =====
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
  // ===== DOĞA METAFORLARı =====
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
  // ===== RUHSAL VE MİSTİK =====
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
  // ===== SOSYAL VE İLİŞKİSEL =====
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
  // ===== YAŞAM YOLCULUĞU =====
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
  // ===== DÜŞÜNCE VE ALGI =====
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

/**
 * Detect idioms and metaphors in Turkish text
 */
export function detectIdiomsAndMetaphors(text: string): {
  idioms: Array<{ id: string; visual: string; mood: string; lighting: string }>;
  metaphors: Array<{ concept: string; visual: string }>;
} {
  const lowerText = text.toLowerCase();
  const foundIdioms: Array<{ id: string; visual: string; mood: string; lighting: string }> = [];
  const foundMetaphors: Array<{ concept: string; visual: string }> = [];

  // Check idiom patterns
  for (const [id, pattern] of Object.entries(idiomPatterns)) {
    for (const p of pattern.patterns) {
      if (lowerText.includes(p)) {
        foundIdioms.push({
          id,
          visual: pattern.visual,
          mood: pattern.mood,
          lighting: pattern.lighting
        });
        break;
      }
    }
  }

  return { idioms: foundIdioms, metaphors: foundMetaphors };
}
