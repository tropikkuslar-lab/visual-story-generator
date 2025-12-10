"""
Dinamik Prompt Ağırlıklandırma ve Sahne Kompozisyon Analizi
- Stable Diffusion attention weighting syntax
- Öğrenilmiş optimal ağırlıklar
- Kompozisyon önerileri
- Görsel denge analizi
"""

from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Optional
from enum import Enum
import re
import math


class CompositionRule(str, Enum):
    """Kompozisyon kuralları"""
    RULE_OF_THIRDS = "rule_of_thirds"
    GOLDEN_RATIO = "golden_ratio"
    SYMMETRY = "symmetry"
    LEADING_LINES = "leading_lines"
    FRAME_WITHIN_FRAME = "frame_within_frame"
    NEGATIVE_SPACE = "negative_space"
    DIAGONAL = "diagonal"
    CENTERED = "centered"


class FocusType(str, Enum):
    """Odak türleri"""
    CHARACTER = "character"
    ACTION = "action"
    ENVIRONMENT = "environment"
    EMOTION = "emotion"
    OBJECT = "object"
    ATMOSPHERE = "atmosphere"


@dataclass
class PromptElement:
    """Prompt elemanı"""
    text: str
    weight: float = 1.0
    category: str = "general"
    importance: float = 0.5  # 0-1 arası önem
    learned_adjustment: float = 0.0  # Öğrenilmiş ayarlama


@dataclass
class CompositionSuggestion:
    """Kompozisyon önerisi"""
    rule: CompositionRule
    description: str
    camera_angle: str
    framing: str
    focal_point: str
    depth_of_field: str
    score: float = 0.0


@dataclass
class WeightedPrompt:
    """Ağırlıklı prompt"""
    elements: List[PromptElement] = field(default_factory=list)
    total_weight: float = 0.0
    primary_focus: Optional[FocusType] = None
    composition: Optional[CompositionSuggestion] = None

    def to_sd_prompt(self) -> str:
        """Stable Diffusion prompt formatına çevir"""
        parts = []

        for elem in sorted(self.elements, key=lambda x: x.importance, reverse=True):
            final_weight = elem.weight + elem.learned_adjustment

            if abs(final_weight - 1.0) < 0.05:
                # Ağırlık ~1.0 ise parantez kullanma
                parts.append(elem.text)
            elif final_weight > 1.0:
                # Artırılmış ağırlık: (text:weight) veya ((text))
                if final_weight > 1.5:
                    parts.append(f"(({elem.text}))")
                else:
                    parts.append(f"({elem.text}:{final_weight:.2f})")
            else:
                # Azaltılmış ağırlık: [text] veya (text:0.x)
                if final_weight < 0.5:
                    parts.append(f"[{elem.text}]")
                else:
                    parts.append(f"({elem.text}:{final_weight:.2f})")

        return ", ".join(parts)


class PromptWeightCalculator:
    """Prompt ağırlık hesaplayıcı"""

    # Kategori bazlı temel ağırlıklar
    BASE_WEIGHTS = {
        'subject': 1.3,         # Ana özne/karakter
        'action': 1.2,          # Eylem
        'emotion': 1.15,        # Duygu
        'environment': 1.0,     # Çevre
        'lighting': 1.1,        # Işıklandırma
        'atmosphere': 1.05,     # Atmosfer
        'style': 1.0,           # Stil
        'quality': 0.9,         # Kalite terimleri
        'negative_prevention': 0.8,  # Negatif önleme
        'detail': 0.85,         # Detay
        'color': 0.9,           # Renk
        'composition': 0.95,    # Kompozisyon
    }

    # Duygu yoğunluğuna göre ağırlık çarpanı
    EMOTION_INTENSITY_MULTIPLIER = {
        (0, 3): 0.9,    # Düşük yoğunluk
        (3, 6): 1.0,    # Orta yoğunluk
        (6, 8): 1.15,   # Yüksek yoğunluk
        (8, 10): 1.3,   # Çok yüksek yoğunluk
    }

    # Tema bazlı ağırlık ayarlamaları
    THEME_ADJUSTMENTS = {
        'horror': {
            'atmosphere': 1.4,
            'lighting': 1.3,
            'emotion': 1.2,
        },
        'romance': {
            'emotion': 1.4,
            'lighting': 1.2,
            'color': 1.1,
        },
        'action': {
            'action': 1.4,
            'subject': 1.3,
            'composition': 1.2,
        },
        'mystery': {
            'atmosphere': 1.4,
            'lighting': 1.3,
            'negative_prevention': 1.1,
        },
        'epic': {
            'environment': 1.4,
            'composition': 1.3,
            'lighting': 1.2,
        },
    }

    # Öğrenilmiş ayarlamalar (feedback'ten)
    learned_adjustments: Dict[str, float] = {}

    @classmethod
    def calculate_weights(
        cls,
        elements: List[Dict],
        theme: Optional[str] = None,
        emotion_intensity: float = 5.0,
        focus_type: FocusType = FocusType.CHARACTER
    ) -> WeightedPrompt:
        """Prompt elemanları için ağırlıkları hesapla"""

        weighted_elements = []

        for elem in elements:
            text = elem.get('text', '')
            category = elem.get('category', 'general')

            # Temel ağırlık
            base_weight = cls.BASE_WEIGHTS.get(category, 1.0)

            # Tema ayarlaması
            if theme and theme in cls.THEME_ADJUSTMENTS:
                theme_adj = cls.THEME_ADJUSTMENTS[theme].get(category, 1.0)
                base_weight *= theme_adj

            # Duygu yoğunluğu ayarlaması
            if category == 'emotion':
                for (low, high), multiplier in cls.EMOTION_INTENSITY_MULTIPLIER.items():
                    if low <= emotion_intensity < high:
                        base_weight *= multiplier
                        break

            # Odak türü ayarlaması
            if focus_type == FocusType.CHARACTER and category == 'subject':
                base_weight *= 1.2
            elif focus_type == FocusType.ENVIRONMENT and category == 'environment':
                base_weight *= 1.2
            elif focus_type == FocusType.EMOTION and category == 'emotion':
                base_weight *= 1.2

            # Öğrenilmiş ayarlama
            learned_adj = cls.learned_adjustments.get(f"{category}:{text}", 0.0)

            # Önem skoru (ağırlığa dayalı)
            importance = min(base_weight / 1.5, 1.0)

            weighted_elements.append(PromptElement(
                text=text,
                weight=base_weight,
                category=category,
                importance=importance,
                learned_adjustment=learned_adj
            ))

        # Toplam ağırlığı hesapla
        total_weight = sum(e.weight + e.learned_adjustment for e in weighted_elements)

        return WeightedPrompt(
            elements=weighted_elements,
            total_weight=total_weight,
            primary_focus=focus_type
        )

    @classmethod
    def apply_feedback_learning(cls, category: str, text: str, adjustment: float):
        """Feedback'ten öğrenilen ayarlamayı kaydet"""
        key = f"{category}:{text}"
        current = cls.learned_adjustments.get(key, 0.0)
        # Yavaş öğrenme oranı (0.1)
        cls.learned_adjustments[key] = current + (adjustment - current) * 0.1


class SceneCompositionAnalyzer:
    """Sahne kompozisyon analizi"""

    # Sahne türü -> kompozisyon önerileri
    SCENE_COMPOSITIONS = {
        'dialogue': {
            'rules': [CompositionRule.RULE_OF_THIRDS, CompositionRule.FRAME_WITHIN_FRAME],
            'camera': 'medium shot, eye level',
            'framing': 'two-shot or over-the-shoulder',
            'focal_point': 'faces and expressions',
            'dof': 'shallow depth of field, background blur'
        },
        'action': {
            'rules': [CompositionRule.DIAGONAL, CompositionRule.LEADING_LINES],
            'camera': 'dynamic angle, dutch angle, low angle',
            'framing': 'wide to capture movement',
            'focal_point': 'point of action',
            'dof': 'deep focus for context'
        },
        'landscape': {
            'rules': [CompositionRule.RULE_OF_THIRDS, CompositionRule.GOLDEN_RATIO],
            'camera': 'wide establishing shot, panoramic',
            'framing': 'layered foreground, midground, background',
            'focal_point': 'horizon or central landmark',
            'dof': 'maximum depth of field'
        },
        'portrait': {
            'rules': [CompositionRule.CENTERED, CompositionRule.NEGATIVE_SPACE],
            'camera': 'close-up or medium close-up',
            'framing': 'head and shoulders or full face',
            'focal_point': 'eyes',
            'dof': 'very shallow, background bokeh'
        },
        'emotional': {
            'rules': [CompositionRule.NEGATIVE_SPACE, CompositionRule.SYMMETRY],
            'camera': 'intimate close-up or wide isolation shot',
            'framing': 'character isolated in frame',
            'focal_point': 'emotional expression',
            'dof': 'selective focus on subject'
        },
        'mystery': {
            'rules': [CompositionRule.FRAME_WITHIN_FRAME, CompositionRule.NEGATIVE_SPACE],
            'camera': 'obscured view, partial reveal',
            'framing': 'shadow framing, doorway shots',
            'focal_point': 'partially hidden subject',
            'dof': 'selective focus, dark shadows'
        },
        'epic': {
            'rules': [CompositionRule.GOLDEN_RATIO, CompositionRule.LEADING_LINES],
            'camera': 'sweeping crane, god\'s eye view',
            'framing': 'grand scale, tiny figures in vast landscape',
            'focal_point': 'central heroic figure or structure',
            'dof': 'deep focus for majesty'
        },
        'horror': {
            'rules': [CompositionRule.DIAGONAL, CompositionRule.FRAME_WITHIN_FRAME],
            'camera': 'canted angle, extreme close-up',
            'framing': 'cramped, claustrophobic',
            'focal_point': 'threat or victim reaction',
            'dof': 'shallow with dark backgrounds'
        }
    }

    # Karakter sayısı -> kompozisyon
    CHARACTER_COUNT_COMPOSITIONS = {
        0: {
            'framing': 'environmental shot, no characters',
            'focal_point': 'landscape or object'
        },
        1: {
            'framing': 'single subject composition',
            'focal_point': 'centered or rule of thirds placement'
        },
        2: {
            'framing': 'two-shot, facing or side by side',
            'focal_point': 'interaction point between subjects'
        },
        3: {
            'framing': 'triangle composition',
            'focal_point': 'central figure or interaction point'
        },
    }

    @classmethod
    def analyze(
        cls,
        scene_type: str,
        character_count: int = 1,
        mood: str = 'neutral',
        action_intensity: float = 0.5
    ) -> CompositionSuggestion:
        """Sahne için kompozisyon öner"""

        # Sahne türüne göre temel kompozisyon
        scene_comp = cls.SCENE_COMPOSITIONS.get(
            scene_type,
            cls.SCENE_COMPOSITIONS['dialogue']
        )

        # Karakter sayısına göre ayarlama
        char_comp = cls.CHARACTER_COUNT_COMPOSITIONS.get(
            min(character_count, 3),
            cls.CHARACTER_COUNT_COMPOSITIONS[3]
        )

        # Birincil kompozisyon kuralı
        primary_rule = scene_comp['rules'][0] if scene_comp['rules'] else CompositionRule.RULE_OF_THIRDS

        # Kamera açısı (aksiyon yoğunluğuna göre)
        camera = scene_comp['camera']
        if action_intensity > 0.7:
            camera = 'dynamic angle, motion blur, ' + camera

        # Framing
        framing = char_comp.get('framing', scene_comp['framing'])

        # Focal point
        focal_point = scene_comp['focal_point']

        # Depth of field
        dof = scene_comp['dof']

        # Skor hesapla (ne kadar güçlü bir kompozisyon önerisi)
        score = 0.5 + (0.1 if character_count > 0 else 0) + (0.1 if action_intensity > 0.5 else 0)

        return CompositionSuggestion(
            rule=primary_rule,
            description=f"{primary_rule.value} composition",
            camera_angle=camera,
            framing=framing,
            focal_point=focal_point,
            depth_of_field=dof,
            score=score
        )

    @classmethod
    def get_composition_prompt(cls, suggestion: CompositionSuggestion) -> str:
        """Kompozisyon önerisini prompt'a çevir"""
        parts = [
            f"{suggestion.camera_angle}",
            f"{suggestion.framing}",
            f"focus on {suggestion.focal_point}",
            f"{suggestion.depth_of_field}"
        ]

        return ", ".join(parts)


class VisualBalanceAnalyzer:
    """Görsel denge analizi"""

    @classmethod
    def analyze_text_for_balance(cls, text: str, elements: List[str]) -> Dict[str, float]:
        """Metin ve öğelerden görsel denge öner"""

        balance = {
            'left_right': 0.5,  # 0 = sol ağırlıklı, 1 = sağ ağırlıklı
            'top_bottom': 0.5,  # 0 = üst ağırlıklı, 1 = alt ağırlıklı
            'foreground_background': 0.5,  # 0 = ön plan, 1 = arka plan
            'light_dark': 0.5,  # 0 = karanlık, 1 = aydınlık
            'complexity': 0.5,  # 0 = minimal, 1 = karmaşık
        }

        text_lower = text.lower()

        # Işık analizi
        light_words = ['aydınlık', 'parlak', 'güneş', 'ışık', 'beyaz', 'altın']
        dark_words = ['karanlık', 'gece', 'gölge', 'siyah', 'loş', 'kasvet']

        light_score = sum(1 for w in light_words if w in text_lower)
        dark_score = sum(1 for w in dark_words if w in text_lower)

        if light_score + dark_score > 0:
            balance['light_dark'] = light_score / (light_score + dark_score)

        # Karmaşıklık analizi
        complexity_indicators = ['kalabalık', 'dolu', 'detaylı', 'karmaşık', 'çok']
        minimal_indicators = ['boş', 'yalnız', 'tek', 'sade', 'minimal']

        complexity_score = sum(1 for w in complexity_indicators if w in text_lower)
        minimal_score = sum(1 for w in minimal_indicators if w in text_lower)

        if complexity_score + minimal_score > 0:
            balance['complexity'] = complexity_score / (complexity_score + minimal_score)

        # Ön plan/arka plan analizi
        foreground_words = ['yakın', 'önde', 'yüz', 'el', 'detay']
        background_words = ['uzak', 'arkada', 'manzara', 'ufuk', 'gökyüzü']

        fg_score = sum(1 for w in foreground_words if w in text_lower)
        bg_score = sum(1 for w in background_words if w in text_lower)

        if fg_score + bg_score > 0:
            balance['foreground_background'] = bg_score / (fg_score + bg_score)

        return balance

    @classmethod
    def get_balance_prompt(cls, balance: Dict[str, float]) -> str:
        """Denge analizinden prompt oluştur"""
        parts = []

        # Işık dengesi
        if balance['light_dark'] < 0.3:
            parts.append("dark moody lighting, deep shadows")
        elif balance['light_dark'] > 0.7:
            parts.append("bright well-lit scene, natural daylight")

        # Karmaşıklık
        if balance['complexity'] < 0.3:
            parts.append("minimalist composition, negative space")
        elif balance['complexity'] > 0.7:
            parts.append("detailed complex scene, many elements")

        # Ön plan/arka plan
        if balance['foreground_background'] < 0.3:
            parts.append("close-up, foreground emphasis")
        elif balance['foreground_background'] > 0.7:
            parts.append("wide shot, background emphasis, environmental")

        return ", ".join(parts) if parts else ""


class DynamicPromptBuilder:
    """Dinamik prompt oluşturucu"""

    @classmethod
    def build(
        cls,
        subject: str,
        action: str = "",
        environment: str = "",
        mood: str = "",
        style: str = "cinematic",
        theme: Optional[str] = None,
        emotion_intensity: float = 5.0,
        scene_type: str = "general",
        character_count: int = 1,
        learned_patterns: Optional[Dict] = None
    ) -> Dict[str, str]:
        """Tam dinamik prompt oluştur"""

        # Elemanları kategorize et
        elements = []

        if subject:
            elements.append({'text': subject, 'category': 'subject'})

        if action:
            elements.append({'text': action, 'category': 'action'})

        if environment:
            elements.append({'text': environment, 'category': 'environment'})

        if mood:
            elements.append({'text': f"{mood} mood", 'category': 'emotion'})

        # Stil elemanları
        style_elements = cls._get_style_elements(style)
        elements.extend(style_elements)

        # Ağırlıkları hesapla
        weighted = PromptWeightCalculator.calculate_weights(
            elements=elements,
            theme=theme,
            emotion_intensity=emotion_intensity,
            focus_type=cls._determine_focus_type(scene_type)
        )

        # Kompozisyon analizi
        composition = SceneCompositionAnalyzer.analyze(
            scene_type=scene_type,
            character_count=character_count,
            mood=mood,
            action_intensity=emotion_intensity / 10
        )
        weighted.composition = composition

        # Görsel denge
        all_text = f"{subject} {action} {environment} {mood}"
        balance = VisualBalanceAnalyzer.analyze_text_for_balance(all_text, [subject, action, environment])

        # Promptları oluştur
        main_prompt = weighted.to_sd_prompt()

        # Kompozisyon ekleri
        comp_prompt = SceneCompositionAnalyzer.get_composition_prompt(composition)

        # Denge ekleri
        balance_prompt = VisualBalanceAnalyzer.get_balance_prompt(balance)

        # Öğrenilmiş eklemeler
        learned_additions = ""
        if learned_patterns:
            if learned_patterns.get('best_prompt_additions'):
                learned_additions = learned_patterns['best_prompt_additions']

        # Final prompt
        final_prompt = ", ".join(filter(None, [
            main_prompt,
            comp_prompt,
            balance_prompt,
            learned_additions
        ]))

        # Negatif prompt
        negative_prompt = cls._build_negative_prompt(style, theme, learned_patterns)

        return {
            'prompt': final_prompt,
            'negative_prompt': negative_prompt,
            'composition': composition.description,
            'camera': composition.camera_angle,
            'focus': weighted.primary_focus.value if weighted.primary_focus else 'general',
            'total_weight': weighted.total_weight,
            'element_count': len(weighted.elements)
        }

    @classmethod
    def _get_style_elements(cls, style: str) -> List[Dict]:
        """Stil elemanlarını getir"""
        style_configs = {
            'cinematic': [
                {'text': 'cinematic lighting', 'category': 'lighting'},
                {'text': 'film grain', 'category': 'style'},
                {'text': 'anamorphic lens', 'category': 'style'},
                {'text': 'movie still', 'category': 'quality'},
            ],
            'anime': [
                {'text': 'anime style', 'category': 'style'},
                {'text': 'cel shading', 'category': 'style'},
                {'text': 'vibrant colors', 'category': 'color'},
                {'text': 'studio quality', 'category': 'quality'},
            ],
            'digital': [
                {'text': 'digital art', 'category': 'style'},
                {'text': 'concept art', 'category': 'style'},
                {'text': 'highly detailed illustration', 'category': 'quality'},
                {'text': 'artstation trending', 'category': 'quality'},
            ],
            'oil': [
                {'text': 'oil painting', 'category': 'style'},
                {'text': 'brush strokes visible', 'category': 'style'},
                {'text': 'classical art', 'category': 'style'},
                {'text': 'museum quality', 'category': 'quality'},
            ],
            'watercolor': [
                {'text': 'watercolor painting', 'category': 'style'},
                {'text': 'soft washes', 'category': 'style'},
                {'text': 'delicate', 'category': 'style'},
                {'text': 'artistic', 'category': 'quality'},
            ],
        }

        return style_configs.get(style, [
            {'text': 'high quality', 'category': 'quality'},
            {'text': 'detailed', 'category': 'detail'},
        ])

    @classmethod
    def _determine_focus_type(cls, scene_type: str) -> FocusType:
        """Sahne türünden odak türünü belirle"""
        focus_map = {
            'portrait': FocusType.CHARACTER,
            'dialogue': FocusType.CHARACTER,
            'action': FocusType.ACTION,
            'landscape': FocusType.ENVIRONMENT,
            'emotional': FocusType.EMOTION,
            'epic': FocusType.ENVIRONMENT,
            'mystery': FocusType.ATMOSPHERE,
            'horror': FocusType.ATMOSPHERE,
        }
        return focus_map.get(scene_type, FocusType.CHARACTER)

    @classmethod
    def _build_negative_prompt(
        cls,
        style: str,
        theme: Optional[str],
        learned_patterns: Optional[Dict]
    ) -> str:
        """Negatif prompt oluştur"""

        base_negative = [
            "low quality", "worst quality", "blurry",
            "bad anatomy", "bad hands", "extra fingers",
            "deformed", "ugly", "duplicate",
            "watermark", "signature", "text"
        ]

        # Stil bazlı negatifler
        style_negatives = {
            'cinematic': ['cartoon', 'anime', 'illustration'],
            'anime': ['photorealistic', 'photograph', '3d render'],
            'digital': ['photograph', 'film grain'],
            'oil': ['digital art', 'smooth rendering'],
            'watercolor': ['sharp edges', 'digital'],
        }

        if style in style_negatives:
            base_negative.extend(style_negatives[style])

        # Öğrenilmiş negatifler
        if learned_patterns and learned_patterns.get('best_negative_additions'):
            learned_neg = learned_patterns['best_negative_additions'].split(', ')
            base_negative.extend(learned_neg)

        return ", ".join(base_negative)
