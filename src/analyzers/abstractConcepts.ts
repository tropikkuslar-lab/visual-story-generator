// Soyut kavramlar -> görsel temsiller

export interface AbstractConceptPattern {
  keywords: string[];
  visual: string;
}

export const abstractConcepts: Record<string, AbstractConceptPattern> = {
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
  // ===== İNSAN DURUMLARI =====
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
  // ===== FELSEFİ =====
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
  // ===== DOĞA VE EVREN =====
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
  // ===== DUYGUSAL DURUMLAR =====
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
  // ===== SOSYAL =====
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

/**
 * Detect abstract concepts in Turkish text
 */
export function detectAbstractConcepts(text: string): Array<{ concept: string; visual: string }> {
  const lowerText = text.toLowerCase();
  const found: Array<{ concept: string; visual: string }> = [];

  for (const [concept, pattern] of Object.entries(abstractConcepts)) {
    for (const keyword of pattern.keywords) {
      if (lowerText.includes(keyword)) {
        found.push({
          concept,
          visual: pattern.visual
        });
        break;
      }
    }
  }

  return found;
}
