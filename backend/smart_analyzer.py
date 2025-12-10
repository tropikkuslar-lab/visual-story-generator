"""
Akıllı Analiz Entegrasyon Modülü
- Tüm analiz modüllerini birleştirir
- Feedback-based öğrenme entegrasyonu
- Unified API
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
import json
import os

# Modüller
from turkish_nlp import TurkishTextAnalyzer, SmartPromptGenerator, AnalysisResult
from context_analyzer import ContextTracker, SceneContext, StoryContext, ContextAwarePromptEnhancer
from prompt_weighting import DynamicPromptBuilder, SceneCompositionAnalyzer, CompositionSuggestion
from emotion_analyzer import EmotionAnalyzer, EmotionResult
from learning_manager import LearningManager
from database import DatabaseManager


@dataclass
class SceneAnalysisResult:
    """Sahne analizi sonucu"""
    scene_id: int
    text: str

    # NLP Analizi
    nlp_analysis: Optional[AnalysisResult] = None

    # Duygu Analizi
    emotion: Optional[EmotionResult] = None

    # Bağlam
    scene_context: Optional[SceneContext] = None

    # Kompozisyon
    composition: Optional[CompositionSuggestion] = None

    # Üretilen Promptlar
    faithful_prompt: str = ""
    creative_prompt: str = ""
    negative_prompt: str = ""

    # Metadata
    detected_themes: List[str] = field(default_factory=list)
    detected_mood: str = "neutral"
    mood_intensity: float = 0.5
    scene_type: str = "general"
    character_count: int = 0

    # Öğrenilmiş ayarlamalar
    learned_settings: Dict = field(default_factory=dict)

    # Kalite metrikleri
    analysis_confidence: float = 0.0
    prompt_quality_score: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        """Dict'e çevir"""
        return {
            'scene_id': self.scene_id,
            'text': self.text[:200] + '...' if len(self.text) > 200 else self.text,
            'mood': self.detected_mood,
            'mood_intensity': self.mood_intensity,
            'themes': self.detected_themes,
            'scene_type': self.scene_type,
            'character_count': self.character_count,
            'faithful_prompt': self.faithful_prompt,
            'creative_prompt': self.creative_prompt,
            'negative_prompt': self.negative_prompt,
            'composition': self.composition.description if self.composition else None,
            'camera': self.composition.camera_angle if self.composition else None,
            'analysis_confidence': self.analysis_confidence,
            'learned_settings': self.learned_settings
        }


class SmartAnalyzer:
    """Akıllı analiz motoru"""

    def __init__(self):
        self.context_tracker = ContextTracker()
        self.learning_manager = LearningManager()
        self.db = DatabaseManager()

    def analyze_text(self, text: str, style: str = "cinematic") -> List[SceneAnalysisResult]:
        """Metni analiz et ve sahnelere ayır"""
        results = []

        # Sahnelere ayır
        scenes = self._split_into_scenes(text)

        for i, scene_text in enumerate(scenes):
            result = self.analyze_scene(scene_text, i + 1, style)
            results.append(result)

        return results

    def analyze_scene(
        self,
        text: str,
        scene_id: int = 1,
        style: str = "cinematic"
    ) -> SceneAnalysisResult:
        """Tek bir sahneyi analiz et"""

        result = SceneAnalysisResult(
            scene_id=scene_id,
            text=text
        )

        # 1. Türkçe NLP Analizi
        nlp_analysis = TurkishTextAnalyzer.analyze(text)
        result.nlp_analysis = nlp_analysis
        result.detected_themes = nlp_analysis.themes
        result.detected_mood = nlp_analysis.mood
        result.mood_intensity = nlp_analysis.mood_intensity

        # 2. Duygu Analizi (detaylı)
        emotion_result = EmotionAnalyzer.analyze(text)
        result.emotion = emotion_result

        # Duygu sonuçlarını entegre et
        if emotion_result.intensity > result.mood_intensity * 10:
            result.mood_intensity = emotion_result.intensity / 10
            result.detected_mood = emotion_result.primary_emotion.value

        # 3. Bağlam Analizi
        scene_context = self.context_tracker.process_scene(text)
        result.scene_context = scene_context
        result.character_count = len(scene_context.characters_present)

        # 4. Sahne türünü belirle
        result.scene_type = self._determine_scene_type(nlp_analysis, scene_context)

        # 5. Öğrenilmiş ayarlamaları al
        learned = self.learning_manager.get_optimized_settings(
            scene_type=result.scene_type,
            mood=result.detected_mood,
            genre=result.detected_themes[0] if result.detected_themes else 'general'
        )
        result.learned_settings = {
            'prompt_additions': learned.prompt_additions,
            'negative_additions': learned.negative_additions,
            'steps': learned.steps,
            'cfg': learned.cfg_scale
        }

        # 6. Kompozisyon Analizi
        composition = SceneCompositionAnalyzer.analyze(
            scene_type=result.scene_type,
            character_count=result.character_count,
            mood=result.detected_mood,
            action_intensity=result.mood_intensity
        )
        result.composition = composition

        # 7. Prompt Üretimi
        prompts = self._generate_prompts(result, style)
        result.faithful_prompt = prompts['faithful']
        result.creative_prompt = prompts['creative']
        result.negative_prompt = prompts['negative']

        # 8. Kalite skorlarını hesapla
        result.analysis_confidence = nlp_analysis.confidence
        result.prompt_quality_score = self._calculate_prompt_quality(result)

        return result

    def _split_into_scenes(self, text: str) -> List[str]:
        """Metni sahnelere ayır"""
        import re

        # Sahne ayırıcı patternler
        scene_markers = [
            r'(?:^|\n)(?:sahne|bölüm|kısım)\s*[:\-]?\s*\d*',
            r'\n---+\n',
            r'\n\*\*\*+\n',
            r'(?:^|\n)#{1,3}\s+',
        ]

        scenes = [text]

        for pattern in scene_markers:
            new_scenes = []
            for scene in scenes:
                parts = re.split(pattern, scene, flags=re.IGNORECASE)
                parts = [p.strip() for p in parts if p.strip()]
                new_scenes.extend(parts)
            if len(new_scenes) > len(scenes):
                scenes = new_scenes
                break

        # Hala tek sahne ise, paragraflara göre ayır
        if len(scenes) == 1:
            paragraphs = text.split('\n\n')
            if len(paragraphs) > 1:
                # Paragraları grupla (max 500 karakter per sahne)
                grouped = []
                current = ""
                for p in paragraphs:
                    if len(current) + len(p) < 500:
                        current += ('\n\n' if current else '') + p
                    else:
                        if current:
                            grouped.append(current)
                        current = p
                if current:
                    grouped.append(current)
                scenes = grouped

        # Çok kısa sahneleri filtrele
        return [s for s in scenes if len(s) > 20]

    def _determine_scene_type(
        self,
        nlp_analysis: AnalysisResult,
        scene_context: SceneContext
    ) -> str:
        """Sahne türünü belirle"""

        # Aksiyon sayısı
        action_count = len(nlp_analysis.actions)

        # Karakter sayısı
        char_count = len(scene_context.characters_present)

        # Mood
        mood = nlp_analysis.mood

        # Tema
        themes = nlp_analysis.themes

        # Karar mantığı
        if mood in ['tense', 'dark']:
            if 'horror' in themes:
                return 'horror'
            return 'mystery'

        if mood == 'romantic':
            return 'emotional'

        if action_count > 3:
            return 'action'

        if action_count == 0 and nlp_analysis.location_setting:
            return 'landscape'

        if char_count == 1:
            if mood in ['melancholic', 'peaceful']:
                return 'emotional'
            return 'portrait'

        if char_count >= 2:
            if action_count > 0:
                return 'dialogue'
            return 'portrait'

        if 'epic' in themes or mood == 'epic':
            return 'epic'

        return 'general'

    def _generate_prompts(
        self,
        result: SceneAnalysisResult,
        style: str
    ) -> Dict[str, str]:
        """Prompt üret"""

        nlp = result.nlp_analysis
        emotion = result.emotion
        learned = result.learned_settings

        # Subject oluştur
        subject_parts = []
        if nlp and nlp.characters:
            for char in nlp.characters[:2]:
                if char.get('name'):
                    subject_parts.append(char['name'])
                elif char.get('type'):
                    type_map = {
                        'female': 'a woman',
                        'male': 'a man',
                        'child': 'a child',
                        'protagonist': 'the protagonist'
                    }
                    subject_parts.append(type_map.get(char['type'], 'a person'))

        subject = ", ".join(subject_parts) if subject_parts else "a scene"

        # Action
        action = ""
        if nlp and nlp.actions:
            action = nlp.actions[0].get('verb', '')

        # Environment
        environment = ""
        if result.scene_context and result.scene_context.location:
            location_map = {
                'home': 'inside a cozy home',
                'street': 'on city streets',
                'forest': 'in a mystical forest',
                'seaside': 'at the seaside',
                'mountain': 'on a mountain',
                'city': 'in a bustling city',
                'palace': 'in a grand palace',
                'castle': 'in an ancient castle',
            }
            environment = location_map.get(
                result.scene_context.location,
                f"in {result.scene_context.location}"
            )

        # Duygu görsel ipuçları
        emotion_visual = ""
        if emotion and emotion.visual_cues:
            cues = emotion.visual_cues
            emotion_visual = f"{cues.get('atmosphere', '')}, {cues.get('lighting', '')}, {cues.get('color_palette', '')}"

        # Dinamik prompt oluştur
        dynamic_result = DynamicPromptBuilder.build(
            subject=subject,
            action=action,
            environment=environment,
            mood=result.detected_mood,
            style=style,
            theme=result.detected_themes[0] if result.detected_themes else None,
            emotion_intensity=result.mood_intensity * 10,
            scene_type=result.scene_type,
            character_count=result.character_count,
            learned_patterns=learned
        )

        # Sadık prompt (metne yakın)
        faithful = dynamic_result['prompt']

        # Yaratıcı prompt (artistik)
        creative_additions = [
            "masterpiece", "best quality", "highly detailed", "8k resolution",
            emotion_visual
        ]
        creative = f"{faithful}, {', '.join(filter(None, creative_additions))}"

        # Bağlam geliştirmesi
        if result.scene_context:
            context_enhancement = ContextAwarePromptEnhancer.enhance_prompt(
                creative,
                self.context_tracker.story_context,
                result.scene_context
            )
            creative = context_enhancement

        # Negatif prompt
        negative = dynamic_result['negative_prompt']

        # Öğrenilmiş negatif eklemeler
        if learned.get('negative_additions'):
            negative += f", {learned['negative_additions']}"

        return {
            'faithful': faithful,
            'creative': creative,
            'negative': negative
        }

    def _calculate_prompt_quality(self, result: SceneAnalysisResult) -> float:
        """Prompt kalite skoru hesapla"""
        score = 0.0

        # Analiz güveni
        score += result.analysis_confidence * 0.3

        # Duygu tespiti
        if result.emotion and result.emotion.confidence > 0.5:
            score += 0.2

        # Tema tespiti
        if result.detected_themes:
            score += 0.1 * min(len(result.detected_themes), 3)

        # Kompozisyon
        if result.composition and result.composition.score > 0.5:
            score += 0.15

        # Öğrenilmiş ayarlamalar
        if result.learned_settings.get('prompt_additions'):
            score += 0.15

        return min(score, 1.0)

    def record_feedback(
        self,
        job_id: str,
        scene_result: SceneAnalysisResult,
        feedback: Dict
    ):
        """Feedback kaydet ve öğren"""
        self.learning_manager.record_feedback(
            job_id=job_id,
            overall_score=feedback.get('overall_score', 3),
            prompt_accuracy=feedback.get('prompt_accuracy', 3),
            emotion_accuracy=feedback.get('emotion_accuracy', 3),
            has_hand_issues=feedback.get('has_hand_issues', False),
            has_face_issues=feedback.get('has_face_issues', False),
            has_blur_issues=feedback.get('has_blur_issues', False),
            has_text_issues=feedback.get('has_text_issues', False),
            has_composition_issues=feedback.get('has_composition_issues', False),
            has_anatomy_issues=feedback.get('has_anatomy_issues', False),
            user_comment=feedback.get('user_comment', '')
        )

    def get_statistics(self) -> Dict[str, Any]:
        """İstatistikleri getir"""
        learning_stats = self.learning_manager.get_learning_stats()

        return {
            'learning': learning_stats,
            'context': {
                'total_scenes': len(self.context_tracker.story_context.scenes),
                'total_characters': len(self.context_tracker.story_context.characters),
                'themes': self.context_tracker.story_context.themes
            }
        }


# API için basit fonksiyonlar
_analyzer = None

def get_analyzer() -> SmartAnalyzer:
    """Singleton analyzer"""
    global _analyzer
    if _analyzer is None:
        _analyzer = SmartAnalyzer()
    return _analyzer


def analyze_text_api(text: str, style: str = "cinematic") -> List[Dict]:
    """API için metin analizi"""
    analyzer = get_analyzer()
    results = analyzer.analyze_text(text, style)
    return [r.to_dict() for r in results]


def analyze_scene_api(text: str, style: str = "cinematic") -> Dict:
    """API için sahne analizi"""
    analyzer = get_analyzer()
    result = analyzer.analyze_scene(text, 1, style)
    return result.to_dict()
