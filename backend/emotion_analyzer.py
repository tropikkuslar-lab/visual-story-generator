"""
Emotion Analyzer - Gelişmiş Duygu Analizi
==========================================
Duygu sınıfı + yoğunluk (1-10) sistemi
Bağlam farkındalığı ve Türkçe desteği
"""

import re
from dataclasses import dataclass
from typing import List, Tuple, Dict, Optional
from enum import Enum

class EmotionClass(str, Enum):
    """Ana duygu sınıfları"""
    JOY = "joy"              # Mutluluk, sevinç
    SADNESS = "sadness"      # Üzüntü, hüzün
    ANGER = "anger"          # Öfke, kızgınlık
    FEAR = "fear"            # Korku, endişe
    SURPRISE = "surprise"    # Şaşkınlık
    DISGUST = "disgust"      # Tiksinme, iğrenme
    LOVE = "love"            # Aşk, sevgi
    HOPE = "hope"            # Umut
    TENSION = "tension"      # Gerilim, stres
    PEACE = "peace"          # Huzur, sükunet
    MYSTERY = "mystery"      # Gizem
    NOSTALGIA = "nostalgia"  # Nostalji
    NEUTRAL = "neutral"      # Nötr

@dataclass
class EmotionResult:
    """Duygu analizi sonucu"""
    primary_emotion: EmotionClass
    intensity: int  # 1-10
    secondary_emotions: List[Tuple[EmotionClass, int]]  # [(emotion, intensity), ...]
    confidence: float  # 0.0 - 1.0
    context_notes: List[str]
    visual_cues: Dict[str, str]  # Görsel ipuçları

class EmotionAnalyzer:
    """
    Gelişmiş duygu analizi sistemi.

    Özellikler:
    - Bağlam farkındalığı (negasyon, ironi tespiti)
    - Yoğunluk ölçümü (1-10)
    - Çoklu duygu tespiti
    - Türkçe ve İngilizce destek
    - Görsel ipucu üretimi
    """

    # Duygu kelimeleri ve temel yoğunlukları
    EMOTION_PATTERNS = {
        EmotionClass.JOY: {
            'keywords': {
                # Türkçe
                'mutlu': 6, 'sevinç': 7, 'neşe': 6, 'keyif': 5, 'huzur': 4,
                'coşku': 8, 'sevin': 6, 'güldü': 5, 'gülümse': 4, 'kahkaha': 8,
                'mutluluk': 7, 'eğlen': 6, 'şen': 5, 'neşeli': 6, 'ferah': 4,
                'bayram': 7, 'kutla': 6, 'zafer': 8,
                # İngilizce
                'happy': 6, 'joy': 7, 'cheerful': 5, 'delighted': 7,
                'ecstatic': 9, 'thrilled': 8, 'pleased': 4, 'content': 4
            },
            'intensifiers': ['çok', 'aşırı', 'son derece', 'inanılmaz', 'delicesine'],
            'visual': {
                'colors': 'warm golden tones, bright yellows, soft oranges',
                'lighting': 'bright natural light, sun rays, warm glow',
                'atmosphere': 'cheerful, uplifting, celebratory'
            }
        },
        EmotionClass.SADNESS: {
            'keywords': {
                'üzgün': 6, 'hüzün': 7, 'keder': 7, 'ağla': 7, 'gözyaş': 8,
                'acı': 7, 'yas': 8, 'kayıp': 7, 'yalnız': 6, 'boşluk': 5,
                'melankolik': 6, 'buruk': 5, 'dertli': 6, 'mahzun': 6,
                'sad': 6, 'sorrow': 7, 'grief': 8, 'tears': 7, 'crying': 7,
                'mourning': 8, 'heartbroken': 9, 'melancholy': 6
            },
            'intensifiers': ['derin', 'ağır', 'yoğun', 'dayanılmaz'],
            'visual': {
                'colors': 'muted blues, grays, desaturated tones',
                'lighting': 'overcast, dim, soft shadows, blue hour',
                'atmosphere': 'melancholic, somber, contemplative'
            }
        },
        EmotionClass.ANGER: {
            'keywords': {
                'kızgın': 6, 'öfke': 7, 'sinir': 6, 'hiddet': 8, 'kin': 7,
                'nefret': 8, 'kudur': 9, 'çılgın': 7, 'delir': 8, 'patlama': 7,
                'angry': 6, 'rage': 8, 'fury': 9, 'furious': 8, 'enraged': 9,
                'irritated': 4, 'annoyed': 4, 'hostile': 6
            },
            'intensifiers': ['küplere binen', 'çılgınca', 'kontrolsüz'],
            'visual': {
                'colors': 'intense reds, dark oranges, harsh contrasts',
                'lighting': 'dramatic harsh lighting, fire glow',
                'atmosphere': 'tense, aggressive, explosive'
            }
        },
        EmotionClass.FEAR: {
            'keywords': {
                'korku': 7, 'dehşet': 9, 'panik': 8, 'endişe': 5, 'kaygı': 5,
                'tedirgin': 4, 'ürk': 6, 'çekin': 4, 'tir tir': 7, 'titreme': 6,
                'fear': 7, 'terror': 9, 'scared': 6, 'frightened': 7,
                'anxious': 5, 'worried': 4, 'dread': 8, 'horror': 9
            },
            'intensifiers': ['ödü kopan', 'can havliyle', 'donduran'],
            'visual': {
                'colors': 'dark shadows, cold blues, sickly greens',
                'lighting': 'low key, harsh shadows, flickering',
                'atmosphere': 'ominous, threatening, claustrophobic'
            }
        },
        EmotionClass.SURPRISE: {
            'keywords': {
                'şaşır': 6, 'hayret': 7, 'şok': 8, 'beklenmedik': 6,
                'inanamadı': 7, 'ağzı açık': 6, 'sersem': 5,
                'surprised': 6, 'amazed': 7, 'astonished': 8, 'shocked': 8,
                'stunned': 7, 'unexpected': 6
            },
            'intensifiers': ['tamamen', 'büsbütün'],
            'visual': {
                'colors': 'bright highlights, contrasting tones',
                'lighting': 'sudden bright flash, dramatic reveal',
                'atmosphere': 'dynamic, striking, impactful'
            }
        },
        EmotionClass.LOVE: {
            'keywords': {
                'aşk': 8, 'sev': 7, 'tutku': 8, 'özlem': 6, 'hasret': 7,
                'romantik': 6, 'aşık': 8, 'gönül': 6, 'kalp': 5, 'sevgili': 7,
                'love': 8, 'passion': 8, 'romantic': 6, 'desire': 7,
                'adore': 8, 'cherish': 6, 'devoted': 7
            },
            'intensifiers': ['deli gibi', 'çılgınca', 'tutkulu'],
            'visual': {
                'colors': 'warm pinks, soft reds, golden tones',
                'lighting': 'soft romantic glow, golden hour, candlelight',
                'atmosphere': 'intimate, tender, passionate'
            }
        },
        EmotionClass.HOPE: {
            'keywords': {
                'umut': 7, 'ümit': 7, 'beklenti': 5, 'yarın': 5, 'gelecek': 5,
                'ışık': 6, 'şans': 5, 'fırsat': 5, 'inanç': 6,
                'hope': 7, 'hopeful': 6, 'optimistic': 5, 'promising': 5,
                'bright future': 7, 'possibility': 5
            },
            'intensifiers': ['güçlü', 'sarsılmaz'],
            'visual': {
                'colors': 'bright whites, soft yellows, dawn colors',
                'lighting': 'light breaking through darkness, sunrise',
                'atmosphere': 'uplifting, promising, ethereal'
            }
        },
        EmotionClass.TENSION: {
            'keywords': {
                'gerilim': 7, 'stres': 6, 'baskı': 6, 'sıkıntı': 5,
                'bunalım': 7, 'gergin': 6, 'kasılmış': 5, 'bekleyiş': 5,
                'tense': 7, 'stressed': 6, 'pressure': 6, 'suspense': 7,
                'anxious': 5, 'uneasy': 5
            },
            'intensifiers': ['had safhada', 'dayanılmaz'],
            'visual': {
                'colors': 'muted tones with sharp accents',
                'lighting': 'harsh directional light, stark shadows',
                'atmosphere': 'suspenseful, uneasy, charged'
            }
        },
        EmotionClass.PEACE: {
            'keywords': {
                'huzur': 7, 'sükunet': 7, 'sakin': 6, 'dingin': 6,
                'rahat': 5, 'ferah': 5, 'sessiz': 5, 'barış': 7,
                'peaceful': 7, 'calm': 6, 'serene': 7, 'tranquil': 7,
                'relaxed': 5, 'quiet': 5
            },
            'intensifiers': ['derin', 'tam', 'mutlak'],
            'visual': {
                'colors': 'soft pastels, gentle blues, natural greens',
                'lighting': 'soft diffused light, gentle shadows',
                'atmosphere': 'serene, harmonious, meditative'
            }
        },
        EmotionClass.MYSTERY: {
            'keywords': {
                'gizem': 7, 'sır': 7, 'bilinmeyen': 6, 'esrar': 7,
                'karanlık': 5, 'belirsiz': 5, 'şüphe': 5, 'merak': 5,
                'mystery': 7, 'mysterious': 7, 'secret': 6, 'unknown': 6,
                'enigma': 8, 'cryptic': 7
            },
            'intensifiers': ['derin', 'gizemli'],
            'visual': {
                'colors': 'deep purples, dark blues, shadowy tones',
                'lighting': 'low key, fog, obscured sources',
                'atmosphere': 'enigmatic, intriguing, hidden'
            }
        },
        EmotionClass.NOSTALGIA: {
            'keywords': {
                'nostalji': 7, 'özlem': 6, 'anı': 5, 'geçmiş': 5,
                'hatıra': 6, 'eskiden': 5, 'çocukluk': 6, 'zamanlar': 5,
                'nostalgic': 7, 'reminisce': 6, 'memories': 6, 'past': 5,
                'remember': 5, 'yesteryear': 7
            },
            'intensifiers': ['derin', 'acı tatlı'],
            'visual': {
                'colors': 'sepia tones, faded colors, warm vintage',
                'lighting': 'soft warm glow, diffused, dreamlike',
                'atmosphere': 'wistful, bittersweet, dreamy'
            }
        }
    }

    # Negasyon kalıpları
    NEGATION_PATTERNS = [
        r'(?:değil|yok|olmayan|hiç|asla|artık\s+değil|never|not|no|without|isn\'t|wasn\'t|don\'t|doesn\'t)\s+(\w+)',
        r'(\w+)\s+(?:değil|yok|olmadı|kalmadı|isn\'t|wasn\'t)',
        r'(?:sanki|gibi\s+görün|gibi\s+davran|fake|pretend|as\s+if)\s+(\w+)',  # İroni/sahtelik
    ]

    # Yoğunluk artırıcılar
    INTENSITY_BOOSTERS = {
        'çok': 2, 'aşırı': 3, 'son derece': 3, 'inanılmaz': 4,
        'delicesine': 4, 'had safhada': 4, 'müthiş': 3, 'korkunç': 3,
        'very': 2, 'extremely': 3, 'incredibly': 4, 'absolutely': 3,
        'deeply': 3, 'intensely': 3, 'overwhelmingly': 4
    }

    # Yoğunluk azaltıcılar
    INTENSITY_REDUCERS = {
        'biraz': -2, 'hafif': -2, 'az': -2, 'azıcık': -3, 'birazcık': -3,
        'slightly': -2, 'somewhat': -2, 'a bit': -2, 'a little': -2,
        'barely': -3, 'hardly': -3
    }

    @classmethod
    def analyze(cls, text: str) -> EmotionResult:
        """Metni analiz et ve duygu sonucu döndür"""
        lower_text = text.lower()

        # Tüm duyguları ve skorlarını hesapla
        emotion_scores: Dict[EmotionClass, Tuple[int, int]] = {}  # emotion -> (total_score, count)

        for emotion, data in cls.EMOTION_PATTERNS.items():
            total_score = 0
            count = 0

            for keyword, base_intensity in data['keywords'].items():
                if keyword in lower_text:
                    # Negasyon kontrolü
                    if cls._is_negated(lower_text, keyword):
                        continue

                    # Yoğunluk ayarlaması
                    intensity = base_intensity
                    intensity += cls._get_intensity_modifier(lower_text, keyword)

                    # Sınırla
                    intensity = max(1, min(10, intensity))

                    total_score += intensity
                    count += 1

            if count > 0:
                emotion_scores[emotion] = (total_score, count)

        # En güçlü duyguyu bul
        if not emotion_scores:
            return EmotionResult(
                primary_emotion=EmotionClass.NEUTRAL,
                intensity=5,
                secondary_emotions=[],
                confidence=0.5,
                context_notes=["Belirgin duygu tespit edilemedi"],
                visual_cues={
                    'colors': 'neutral tones, balanced palette',
                    'lighting': 'natural, even lighting',
                    'atmosphere': 'neutral, observational'
                }
            )

        # Ortalama yoğunluğa göre sırala
        sorted_emotions = sorted(
            emotion_scores.items(),
            key=lambda x: x[1][0] / x[1][1],  # ortalama yoğunluk
            reverse=True
        )

        primary = sorted_emotions[0][0]
        primary_avg = sorted_emotions[0][1][0] / sorted_emotions[0][1][1]
        primary_intensity = round(primary_avg)

        # İkincil duygular
        secondary = [
            (e, round(s[0] / s[1]))
            for e, s in sorted_emotions[1:4]
        ]

        # Güven hesapla
        total_keywords = sum(s[1] for s in emotion_scores.values())
        confidence = min(1.0, total_keywords / 5)  # 5 keyword = max confidence

        # Bağlam notları
        context_notes = []
        if cls._has_negation(lower_text):
            context_notes.append("Negasyon tespit edildi - duygu yorumu dikkatli yapıldı")
        if cls._has_irony_markers(lower_text):
            context_notes.append("Olası ironi/alay işaretleri tespit edildi")
        if len(secondary) > 1:
            context_notes.append("Karmaşık/çoklu duygu durumu")

        # Görsel ipuçları
        visual_cues = cls.EMOTION_PATTERNS[primary]['visual']

        return EmotionResult(
            primary_emotion=primary,
            intensity=primary_intensity,
            secondary_emotions=secondary,
            confidence=round(confidence, 2),
            context_notes=context_notes,
            visual_cues=visual_cues
        )

    @classmethod
    def _is_negated(cls, text: str, keyword: str) -> bool:
        """Kelimenin negatif bağlamda kullanılıp kullanılmadığını kontrol et"""
        for pattern in cls.NEGATION_PATTERNS:
            match = re.search(pattern, text, re.IGNORECASE)
            if match and keyword in match.group(0):
                return True
        return False

    @classmethod
    def _has_negation(cls, text: str) -> bool:
        """Metinde negasyon var mı"""
        negation_words = ['değil', 'yok', 'olmayan', 'hiç', 'asla', 'not', 'never', "n't"]
        return any(w in text for w in negation_words)

    @classmethod
    def _has_irony_markers(cls, text: str) -> bool:
        """Metinde ironi işaretleri var mı"""
        irony_markers = ['sanki', 'güya', 'sözde', 'tabii ki', 'evet evet',
                        'as if', 'yeah right', 'sure', 'of course']
        return any(m in text for m in irony_markers)

    @classmethod
    def _get_intensity_modifier(cls, text: str, keyword: str) -> int:
        """Yoğunluk değiştiricilerini hesapla"""
        modifier = 0

        # Keyword etrafındaki metni al
        keyword_idx = text.find(keyword)
        if keyword_idx == -1:
            return 0

        context = text[max(0, keyword_idx-30):keyword_idx+len(keyword)+30]

        # Artırıcıları kontrol et
        for booster, value in cls.INTENSITY_BOOSTERS.items():
            if booster in context:
                modifier += value

        # Azaltıcıları kontrol et
        for reducer, value in cls.INTENSITY_REDUCERS.items():
            if reducer in context:
                modifier += value

        return modifier

    @classmethod
    def get_visual_prompt(cls, emotion_result: EmotionResult) -> str:
        """Duygu sonucuna göre görsel prompt parçası oluştur"""
        parts = []

        # Ana duygunun görsel ipuçları
        visual = emotion_result.visual_cues
        parts.append(visual.get('atmosphere', ''))
        parts.append(visual.get('lighting', ''))
        parts.append(visual.get('colors', ''))

        # Yoğunluğa göre ek
        if emotion_result.intensity >= 8:
            parts.append('intense emotional impact')
        elif emotion_result.intensity >= 6:
            parts.append('clear emotional expression')
        elif emotion_result.intensity <= 3:
            parts.append('subtle emotional undertone')

        return ', '.join(filter(None, parts))

    @classmethod
    def get_mood_string(cls, emotion_result: EmotionResult) -> str:
        """Duygu sonucunu Türkçe mood string'e çevir"""
        mood_map = {
            EmotionClass.JOY: 'Mutlu',
            EmotionClass.SADNESS: 'Hüzünlü',
            EmotionClass.ANGER: 'Öfkeli',
            EmotionClass.FEAR: 'Korku',
            EmotionClass.SURPRISE: 'Şaşkın',
            EmotionClass.DISGUST: 'Tiksinme',
            EmotionClass.LOVE: 'Romantik',
            EmotionClass.HOPE: 'Umutlu',
            EmotionClass.TENSION: 'Gerilimli',
            EmotionClass.PEACE: 'Huzurlu',
            EmotionClass.MYSTERY: 'Gizemli',
            EmotionClass.NOSTALGIA: 'Nostaljik',
            EmotionClass.NEUTRAL: 'Nötr'
        }

        mood = mood_map.get(emotion_result.primary_emotion, 'Nötr')

        # Yoğunluk ekle
        if emotion_result.intensity >= 8:
            return f"Çok {mood}"
        elif emotion_result.intensity <= 3:
            return f"Hafif {mood}"

        return mood


# Singleton instance
emotion_analyzer = EmotionAnalyzer()
