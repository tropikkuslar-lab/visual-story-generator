"""
Bağlam Farkındalığı (Context-Aware) Modülü
- Cümle arası ilişki analizi
- Zamir çözümleme (co-reference resolution)
- Önceki sahne bağlamı
- Karakter tutarlılığı
- Hikaye akışı takibi
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Set
from enum import Enum
import re
from collections import defaultdict


class ReferenceType(str, Enum):
    """Gönderim türleri"""
    PRONOUN = "pronoun"         # Zamir
    DEMONSTRATIVE = "demonstrative"  # İşaret sıfatı
    DEFINITE = "definite"       # Belirli isim
    ZERO = "zero"               # Düşük özne


@dataclass
class Reference:
    """Bir gönderim (referans)"""
    text: str
    ref_type: ReferenceType
    position: int  # Metin içindeki konum
    resolved_to: Optional[str] = None  # Çözümlenmiş referans
    confidence: float = 0.0


@dataclass
class CharacterState:
    """Karakter durumu"""
    name: str
    aliases: Set[str] = field(default_factory=set)
    last_action: Optional[str] = None
    last_location: Optional[str] = None
    emotional_state: Optional[str] = None
    relationships: Dict[str, str] = field(default_factory=dict)
    appearance: List[str] = field(default_factory=list)
    mentions: int = 0


@dataclass
class SceneContext:
    """Sahne bağlamı"""
    scene_id: int
    text: str
    location: Optional[str] = None
    time: Optional[str] = None
    mood: Optional[str] = None
    characters_present: List[str] = field(default_factory=list)
    key_events: List[str] = field(default_factory=list)
    continuation_from: Optional[int] = None  # Önceki sahne bağlantısı


@dataclass
class StoryContext:
    """Hikaye bağlamı"""
    scenes: List[SceneContext] = field(default_factory=list)
    characters: Dict[str, CharacterState] = field(default_factory=dict)
    current_location: Optional[str] = None
    current_time: Optional[str] = None
    narrative_tense: Optional[str] = None  # Anlatı zamanı
    narrative_perspective: Optional[str] = None  # Bakış açısı (1. şahıs, 3. şahıs)
    themes: List[str] = field(default_factory=list)
    tone: Optional[str] = None
    unresolved_plot_points: List[str] = field(default_factory=list)


class PronounResolver:
    """Zamir çözümleyici"""

    # Türkçe zamirler
    PRONOUNS = {
        # Kişi zamirleri
        'ben': {'person': 1, 'number': 'singular', 'gender': None},
        'sen': {'person': 2, 'number': 'singular', 'gender': None},
        'o': {'person': 3, 'number': 'singular', 'gender': None},
        'biz': {'person': 1, 'number': 'plural', 'gender': None},
        'siz': {'person': 2, 'number': 'plural', 'gender': None},
        'onlar': {'person': 3, 'number': 'plural', 'gender': None},

        # Hal ekli formlar
        'beni': {'person': 1, 'number': 'singular', 'case': 'accusative'},
        'seni': {'person': 2, 'number': 'singular', 'case': 'accusative'},
        'onu': {'person': 3, 'number': 'singular', 'case': 'accusative'},
        'bana': {'person': 1, 'number': 'singular', 'case': 'dative'},
        'sana': {'person': 2, 'number': 'singular', 'case': 'dative'},
        'ona': {'person': 3, 'number': 'singular', 'case': 'dative'},
        'bende': {'person': 1, 'number': 'singular', 'case': 'locative'},
        'sende': {'person': 2, 'number': 'singular', 'case': 'locative'},
        'onda': {'person': 3, 'number': 'singular', 'case': 'locative'},
        'benden': {'person': 1, 'number': 'singular', 'case': 'ablative'},
        'senden': {'person': 2, 'number': 'singular', 'case': 'ablative'},
        'ondan': {'person': 3, 'number': 'singular', 'case': 'ablative'},

        # İyelik zamirleri
        'benim': {'person': 1, 'number': 'singular', 'case': 'genitive'},
        'senin': {'person': 2, 'number': 'singular', 'case': 'genitive'},
        'onun': {'person': 3, 'number': 'singular', 'case': 'genitive'},
        'bizim': {'person': 1, 'number': 'plural', 'case': 'genitive'},
        'sizin': {'person': 2, 'number': 'plural', 'case': 'genitive'},
        'onların': {'person': 3, 'number': 'plural', 'case': 'genitive'},

        # Dönüşlü zamir
        'kendi': {'person': None, 'reflexive': True},
        'kendisi': {'person': 3, 'reflexive': True},
        'kendim': {'person': 1, 'reflexive': True},
        'kendin': {'person': 2, 'reflexive': True},
    }

    # İşaret sıfatları ve zamirleri
    DEMONSTRATIVES = {
        'bu': 'proximal',    # Yakın
        'şu': 'medial',      # Orta
        'o': 'distal',       # Uzak
        'bunlar': 'proximal_plural',
        'şunlar': 'medial_plural',
        'onlar': 'distal_plural',
        'burası': 'proximal_place',
        'şurası': 'medial_place',
        'orası': 'distal_place',
    }

    @classmethod
    def find_references(cls, text: str) -> List[Reference]:
        """Metindeki tüm göndermeleri bul"""
        references = []
        words = text.lower().split()

        for i, word in enumerate(words):
            word_clean = re.sub(r'[^\wğüşıöç]', '', word)

            # Zamir kontrolü
            if word_clean in cls.PRONOUNS:
                references.append(Reference(
                    text=word_clean,
                    ref_type=ReferenceType.PRONOUN,
                    position=i,
                    confidence=0.8
                ))

            # İşaret zamiri kontrolü
            elif word_clean in cls.DEMONSTRATIVES:
                references.append(Reference(
                    text=word_clean,
                    ref_type=ReferenceType.DEMONSTRATIVE,
                    position=i,
                    confidence=0.7
                ))

        return references

    @classmethod
    def resolve_references(cls, text: str, context: StoryContext) -> List[Reference]:
        """Zamirleri çözümle"""
        references = cls.find_references(text)

        for ref in references:
            if ref.ref_type == ReferenceType.PRONOUN:
                ref.resolved_to = cls._resolve_pronoun(ref, context)
            elif ref.ref_type == ReferenceType.DEMONSTRATIVE:
                ref.resolved_to = cls._resolve_demonstrative(ref, text, context)

        return references

    @classmethod
    def _resolve_pronoun(cls, ref: Reference, context: StoryContext) -> Optional[str]:
        """Zamiri çözümle"""
        pronoun_info = cls.PRONOUNS.get(ref.text, {})

        # 3. şahıs zamirleri -> son bahsedilen karakter
        if pronoun_info.get('person') == 3:
            # En çok bahsedilen karakteri bul
            if context.characters:
                sorted_chars = sorted(
                    context.characters.values(),
                    key=lambda c: c.mentions,
                    reverse=True
                )
                if sorted_chars:
                    return sorted_chars[0].name

        # 1. şahıs -> protagonist/narrator
        elif pronoun_info.get('person') == 1:
            return "protagonist"

        return None

    @classmethod
    def _resolve_demonstrative(cls, ref: Reference, text: str, context: StoryContext) -> Optional[str]:
        """İşaret zamirini çözümle"""
        demo_type = cls.DEMONSTRATIVES.get(ref.text)

        if demo_type and 'place' in demo_type:
            # Yer işareti -> mevcut konum
            return context.current_location

        if demo_type == 'proximal':
            # "Bu" -> en yakın nesne/kişi
            words = text.split()
            pos = ref.position
            if pos + 1 < len(words):
                return words[pos + 1]

        return None


class ContextTracker:
    """Bağlam takipçisi"""

    # Sahne geçiş belirteçleri
    SCENE_TRANSITION_MARKERS = [
        # Zaman geçişleri
        r'bir süre sonra', r'ertesi gün', r'o gece', r'sabah olduğunda',
        r'birkaç saat sonra', r'akşam olurken', r'gece yarısı',

        # Mekan geçişleri
        r'bu sırada', r'öte yandan', r'bir başka yerde',
        r'eve döndüğünde', r'dışarı çıktığında',

        # Anlatı geçişleri
        r'flashback', r'geçmişe dönersek', r'hatırladı',
        r'rüyasında', r'hayal etti'
    ]

    # Zaman akışı belirteçleri
    TIME_FLOW_MARKERS = {
        'forward': [
            'sonra', 'ardından', 'akabinde', 'müteakiben', 'bunun üzerine',
            'derken', 'o anda', 'tam o sırada', 'hemen', 'bir anda'
        ],
        'backward': [
            'önce', 'daha önce', 'evvelce', 'geçmişte', 'eskiden',
            'o zamanlar', 'bir zamanlar', 'çocukken'
        ],
        'simultaneous': [
            'aynı anda', 'bu sırada', 'o esnada', 'tam da o sırada',
            'bir yandan', 'diğer taraftan'
        ],
        'static': [
            'her zaman', 'daima', 'sürekli', 'hep', 'genellikle'
        ]
    }

    def __init__(self):
        self.story_context = StoryContext()
        self.current_scene_id = 0

    def process_text(self, text: str) -> StoryContext:
        """Metni işle ve bağlamı güncelle"""
        sentences = self._split_sentences(text)

        for sentence in sentences:
            self._update_context(sentence)

        return self.story_context

    def process_scene(self, scene_text: str) -> SceneContext:
        """Yeni bir sahneyi işle"""
        self.current_scene_id += 1

        scene = SceneContext(
            scene_id=self.current_scene_id,
            text=scene_text
        )

        # Sahne önceki sahneyle bağlantılı mı?
        if self._is_continuation(scene_text):
            scene.continuation_from = self.current_scene_id - 1

        # Sahne öğelerini çıkar
        scene.location = self._extract_location(scene_text)
        scene.time = self._extract_time(scene_text)
        scene.mood = self._extract_mood(scene_text)
        scene.characters_present = self._extract_characters(scene_text)
        scene.key_events = self._extract_events(scene_text)

        # Global bağlamı güncelle
        if scene.location:
            self.story_context.current_location = scene.location
        if scene.time:
            self.story_context.current_time = scene.time

        self.story_context.scenes.append(scene)

        return scene

    def get_character_context(self, character_name: str) -> Optional[CharacterState]:
        """Karakter bağlamını getir"""
        return self.story_context.characters.get(character_name.lower())

    def update_character(self, name: str, **updates) -> CharacterState:
        """Karakter bilgisini güncelle"""
        name_lower = name.lower()

        if name_lower not in self.story_context.characters:
            self.story_context.characters[name_lower] = CharacterState(name=name)

        char = self.story_context.characters[name_lower]

        if 'action' in updates:
            char.last_action = updates['action']
        if 'location' in updates:
            char.last_location = updates['location']
        if 'emotion' in updates:
            char.emotional_state = updates['emotion']
        if 'appearance' in updates:
            char.appearance.append(updates['appearance'])
        if 'alias' in updates:
            char.aliases.add(updates['alias'])

        char.mentions += 1

        return char

    def _split_sentences(self, text: str) -> List[str]:
        """Metni cümlelere ayır"""
        sentences = re.split(r'[.!?]+', text)
        return [s.strip() for s in sentences if s.strip()]

    def _update_context(self, sentence: str):
        """Cümleden bağlamı güncelle"""
        sentence_lower = sentence.lower()

        # Anlatı perspektifini tespit et
        if any(p in sentence_lower for p in ['dedim', 'düşündüm', 'gördüm', 'baktım']):
            self.story_context.narrative_perspective = 'first_person'
        elif any(p in sentence_lower for p in ['dedi', 'düşündü', 'gördü', 'baktı']):
            self.story_context.narrative_perspective = 'third_person'

        # Anlatı zamanını tespit et
        if any(t in sentence_lower for t in ['dı', 'di', 'du', 'dü', 'tı', 'ti', 'tu', 'tü']):
            self.story_context.narrative_tense = 'past'
        elif 'yor' in sentence_lower:
            self.story_context.narrative_tense = 'present'

    def _is_continuation(self, text: str) -> bool:
        """Metnin önceki sahnenin devamı olup olmadığını kontrol et"""
        text_lower = text.lower()

        # Bağlaç kontrolü
        continuation_markers = ['ve', 'sonra', 'ardından', 'bunun üzerine', 'derken']
        if text_lower.strip().startswith(tuple(continuation_markers)):
            return True

        # Aynı karakterler
        if self.story_context.scenes:
            last_scene = self.story_context.scenes[-1]
            current_chars = self._extract_characters(text)
            if set(current_chars) & set(last_scene.characters_present):
                return True

        return False

    def _extract_location(self, text: str) -> Optional[str]:
        """Konumu çıkar"""
        location_patterns = [
            (r'(?:evde|evinde|eve)', 'home'),
            (r'(?:sokakta|sokağında|caddede)', 'street'),
            (r'(?:ormanda|ormanın)', 'forest'),
            (r'(?:denizde|deniz kenarında|sahilde)', 'seaside'),
            (r'(?:dağda|dağın tepesinde)', 'mountain'),
            (r'(?:şehirde|şehrin)', 'city'),
            (r'(?:köyde|köyün)', 'village'),
            (r'(?:sarayda|sarayın)', 'palace'),
            (r'(?:kalede|kalenin)', 'castle'),
            (r'(?:mağarada|mağaranın)', 'cave'),
            (r'(?:odada|odanın|salonda)', 'room'),
            (r'(?:bahçede|bahçenin)', 'garden'),
            (r'(?:parkta|parkın)', 'park'),
        ]

        text_lower = text.lower()
        for pattern, location in location_patterns:
            if re.search(pattern, text_lower):
                return location

        return self.story_context.current_location  # Değişmediyse mevcut konum

    def _extract_time(self, text: str) -> Optional[str]:
        """Zamanı çıkar"""
        time_patterns = [
            (r'sabah(?:leyin)?', 'morning'),
            (r'öğle(?:n|yin)?', 'noon'),
            (r'akşam(?:üstü|leyin)?', 'evening'),
            (r'gece(?:leyin)?', 'night'),
            (r'gün doğarken|şafak', 'dawn'),
            (r'gün batarken|alacakaranlık', 'dusk'),
            (r'gece yarısı', 'midnight'),
        ]

        text_lower = text.lower()
        for pattern, time in time_patterns:
            if re.search(pattern, text_lower):
                return time

        return self.story_context.current_time

    def _extract_mood(self, text: str) -> Optional[str]:
        """Mood'u çıkar"""
        mood_keywords = {
            'tense': ['gerilim', 'tehlike', 'korku', 'endişe', 'panik'],
            'romantic': ['aşk', 'romantik', 'sevgi', 'tutku', 'öpücük'],
            'sad': ['üzgün', 'hüzün', 'gözyaşı', 'ağla', 'keder'],
            'happy': ['mutlu', 'sevinç', 'neşe', 'gül', 'kahkaha'],
            'mysterious': ['gizemli', 'sır', 'karanlık', 'belirsiz'],
            'action': ['koş', 'kaç', 'savaş', 'vur', 'patlama'],
        }

        text_lower = text.lower()
        for mood, keywords in mood_keywords.items():
            if any(kw in text_lower for kw in keywords):
                return mood

        return None

    def _extract_characters(self, text: str) -> List[str]:
        """Karakterleri çıkar"""
        characters = []

        # Büyük harfle başlayan kelimeler (isimler)
        words = text.split()
        for i, word in enumerate(words):
            if word[0].isupper() and i > 0:  # Cümle başı değil
                clean_word = re.sub(r'[^\w]', '', word)
                if len(clean_word) > 1:
                    characters.append(clean_word)

        # Mevcut karakterleri kontrol et
        text_lower = text.lower()
        for char_name in self.story_context.characters.keys():
            if char_name in text_lower:
                characters.append(self.story_context.characters[char_name].name)

        return list(set(characters))

    def _extract_events(self, text: str) -> List[str]:
        """Anahtar olayları çıkar"""
        events = []

        # Fiil tabanlı olay tespiti
        event_verbs = [
            'öldü', 'doğdu', 'evlendi', 'ayrıldı', 'kavuştu',
            'buldu', 'kaybetti', 'kazandı', 'yendi', 'yenildi',
            'geldi', 'gitti', 'döndü', 'kaçtı', 'yakalandı',
            'söyledi', 'itiraf etti', 'keşfetti', 'anladı'
        ]

        text_lower = text.lower()
        for verb in event_verbs:
            if verb in text_lower:
                # Fiili içeren cümleyi bul
                sentences = text.split('.')
                for sent in sentences:
                    if verb in sent.lower():
                        events.append(sent.strip())
                        break

        return events[:3]  # Max 3 olay


class SceneConsistencyChecker:
    """Sahne tutarlılık kontrolcüsü"""

    @classmethod
    def check_character_consistency(cls, scene: SceneContext, context: StoryContext) -> List[str]:
        """Karakter tutarlılığını kontrol et"""
        issues = []

        for char_name in scene.characters_present:
            char = context.characters.get(char_name.lower())
            if char:
                # Konum tutarlılığı
                if char.last_location and scene.location:
                    if char.last_location != scene.location:
                        # Geçiş mantıklı mı?
                        if not cls._is_valid_location_transition(char.last_location, scene.location):
                            issues.append(f"{char_name} beklenmedik bir yerde görünüyor")

        return issues

    @classmethod
    def check_time_consistency(cls, scene: SceneContext, context: StoryContext) -> List[str]:
        """Zaman tutarlılığını kontrol et"""
        issues = []

        if context.scenes and scene.time:
            prev_scene = context.scenes[-1]
            if prev_scene.time:
                if not cls._is_valid_time_progression(prev_scene.time, scene.time):
                    issues.append(f"Zaman akışı tutarsız: {prev_scene.time} -> {scene.time}")

        return issues

    @classmethod
    def _is_valid_location_transition(cls, from_loc: str, to_loc: str) -> bool:
        """Konum geçişinin mantıklı olup olmadığını kontrol et"""
        # Aynı yer
        if from_loc == to_loc:
            return True

        # Mantıklı geçişler
        valid_transitions = {
            'home': ['street', 'garden', 'city'],
            'street': ['home', 'park', 'city', 'shop'],
            'forest': ['mountain', 'cave', 'village'],
            'city': ['street', 'home', 'park', 'shop'],
            'castle': ['garden', 'dungeon', 'throne_room'],
        }

        if from_loc in valid_transitions:
            return to_loc in valid_transitions[from_loc]

        return True  # Bilinmeyen geçişlere izin ver

    @classmethod
    def _is_valid_time_progression(cls, from_time: str, to_time: str) -> bool:
        """Zaman ilerlemesinin mantıklı olup olmadığını kontrol et"""
        time_order = ['dawn', 'morning', 'noon', 'afternoon', 'evening', 'dusk', 'night', 'midnight']

        if from_time in time_order and to_time in time_order:
            from_idx = time_order.index(from_time)
            to_idx = time_order.index(to_time)

            # Aynı veya ileri zaman
            if to_idx >= from_idx:
                return True

            # Gece yarısından sonra sabaha geçiş
            if from_time in ['night', 'midnight'] and to_time in ['dawn', 'morning']:
                return True

        return False


class ContextAwarePromptEnhancer:
    """Bağlam farkındalıklı prompt geliştirici"""

    @classmethod
    def enhance_prompt(cls, base_prompt: str, context: StoryContext, scene: SceneContext) -> str:
        """Promptu bağlamla zenginleştir"""
        enhancements = []

        # Karakter tutarlılığı
        for char_name in scene.characters_present:
            char = context.characters.get(char_name.lower())
            if char and char.appearance:
                enhancements.append(f"{char_name} with {', '.join(char.appearance[:2])}")

        # Mood tutarlılığı
        if context.tone:
            enhancements.append(f"{context.tone} atmosphere")

        # Mekan detayları
        if scene.location == context.current_location and context.scenes:
            # Aynı mekanda devam - tutarlılık ekle
            enhancements.append("consistent environment, same location")

        # Zaman tutarlılığı
        if scene.time:
            time_lighting = {
                'morning': 'soft morning light, golden hour',
                'noon': 'bright midday sun, harsh shadows',
                'evening': 'warm sunset glow, orange sky',
                'night': 'moonlight, dark atmosphere, night scene',
                'dawn': 'first light of dawn, pink sky',
                'dusk': 'twilight, blue hour, fading light'
            }
            if scene.time in time_lighting:
                enhancements.append(time_lighting[scene.time])

        # Hikaye perspektifi
        if context.narrative_perspective == 'first_person':
            enhancements.append("POV shot, first person perspective")

        # Önceki sahneyle bağlantı
        if scene.continuation_from and context.scenes:
            prev_scene = context.scenes[scene.continuation_from - 1]
            if prev_scene.mood:
                enhancements.append(f"continuing {prev_scene.mood} mood")

        if enhancements:
            return f"{base_prompt}, {', '.join(enhancements)}"

        return base_prompt

    @classmethod
    def get_scene_relationship_prompt(cls, scene: SceneContext, context: StoryContext) -> str:
        """Sahne ilişki promptu oluştur"""
        if not scene.continuation_from or not context.scenes:
            return ""

        prev_scene = context.scenes[scene.continuation_from - 1]

        relationship_prompts = []

        # Aynı karakterler
        shared_chars = set(scene.characters_present) & set(prev_scene.characters_present)
        if shared_chars:
            relationship_prompts.append(f"same characters: {', '.join(shared_chars)}")

        # Aynı mekan
        if scene.location == prev_scene.location:
            relationship_prompts.append("same location, consistent environment")

        # Mood değişimi
        if scene.mood and prev_scene.mood and scene.mood != prev_scene.mood:
            relationship_prompts.append(f"mood shift from {prev_scene.mood} to {scene.mood}")

        return ", ".join(relationship_prompts)
