"""
Learning Manager - Öğrenme ve Optimizasyon Sistemi
===================================================
Feedback'lerden öğrenerek prompt ve ayarları optimize eder.
"""

import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from database import db, Generation, Feedback, LearnedPattern

logger = logging.getLogger(__name__)

@dataclass
class OptimizationResult:
    """Optimizasyon sonucu"""
    prompt_additions: List[str]
    negative_additions: List[str]
    steps_adjustment: int  # -10 to +10
    cfg_adjustment: float  # -2.0 to +2.0
    confidence: float  # 0.0 to 1.0
    reasoning: List[str]

class LearningManager:
    """
    Feedback'lerden öğrenerek prompt ve ayarları optimize eder.

    Öğrenme Stratejisi:
    1. Yüksek puanlı üretimlerin ortak özelliklerini bul
    2. Hata türlerine göre otomatik düzeltmeler uygula
    3. Scene type + mood + genre kombinasyonları için en iyi ayarları kaydet
    """

    # Hata türlerine göre otomatik düzeltmeler
    ISSUE_CORRECTIONS = {
        'hands': {
            'negative_add': ['bad hands', 'malformed hands', 'extra fingers', 'missing fingers', 'fused fingers', 'mutated hands'],
            'prompt_add': ['detailed hands', 'anatomically correct hands', 'five fingers'],
            'steps_add': 5,
            'cfg_add': 0.5
        },
        'faces': {
            'negative_add': ['bad face', 'deformed face', 'ugly face', 'asymmetrical face', 'blurry face'],
            'prompt_add': ['detailed face', 'symmetrical face', 'clear facial features'],
            'steps_add': 5,
            'cfg_add': 0.3
        },
        'blur': {
            'negative_add': ['blurry', 'out of focus', 'soft focus', 'motion blur', 'unfocused'],
            'prompt_add': ['sharp focus', 'crisp details', 'high sharpness', '8k uhd'],
            'steps_add': 10,
            'cfg_add': 0.5
        },
        'text': {
            'negative_add': ['text', 'watermark', 'signature', 'logo', 'username', 'words', 'letters'],
            'prompt_add': [],
            'steps_add': 0,
            'cfg_add': 0
        },
        'composition': {
            'negative_add': ['bad composition', 'cropped', 'cut off', 'out of frame'],
            'prompt_add': ['well composed', 'rule of thirds', 'balanced composition', 'professional framing'],
            'steps_add': 3,
            'cfg_add': 0.2
        },
        'anatomy': {
            'negative_add': ['bad anatomy', 'deformed', 'mutated', 'disfigured', 'extra limbs', 'missing limbs'],
            'prompt_add': ['anatomically correct', 'proper proportions', 'natural pose'],
            'steps_add': 5,
            'cfg_add': 0.5
        }
    }

    # Duygu-görsel eşleştirme öğrenmeleri
    MOOD_LEARNINGS = {
        'happy': {
            'prompt_add': ['bright colors', 'warm lighting', 'joyful atmosphere'],
            'negative_add': ['dark', 'gloomy', 'sad']
        },
        'sad': {
            'prompt_add': ['muted colors', 'blue tones', 'melancholic atmosphere', 'soft shadows'],
            'negative_add': ['bright', 'cheerful', 'vibrant']
        },
        'tense': {
            'prompt_add': ['high contrast', 'dramatic shadows', 'intense lighting'],
            'negative_add': ['peaceful', 'calm', 'serene']
        },
        'peaceful': {
            'prompt_add': ['soft lighting', 'pastel colors', 'serene atmosphere', 'gentle tones'],
            'negative_add': ['harsh', 'dramatic', 'intense']
        },
        'mysterious': {
            'prompt_add': ['fog', 'shadows', 'low key lighting', 'enigmatic atmosphere'],
            'negative_add': ['clear', 'bright', 'obvious']
        },
        'romantic': {
            'prompt_add': ['warm tones', 'soft focus background', 'golden hour', 'intimate atmosphere'],
            'negative_add': ['cold', 'harsh', 'clinical']
        }
    }

    def __init__(self):
        self.min_samples_for_learning = 5  # En az bu kadar örnek olmalı

    def record_generation(self, job_id: str, prompt: str, enhanced_prompt: str,
                         negative_prompt: str, scene_type: str, mood: str,
                         genre: str, style: str, width: int, height: int,
                         steps: int, cfg_scale: float, seed: int, model: str,
                         generation_time: float, image_path: str) -> int:
        """Yeni üretimi kaydet"""
        gen = Generation(
            job_id=job_id,
            prompt=prompt,
            enhanced_prompt=enhanced_prompt,
            negative_prompt=negative_prompt,
            scene_type=scene_type,
            mood=mood,
            genre=genre,
            style=style,
            width=width,
            height=height,
            steps=steps,
            cfg_scale=cfg_scale,
            seed=seed,
            model=model,
            generation_time=generation_time,
            image_path=image_path
        )
        return db.save_generation(gen)

    def record_feedback(self, generation_id: int, overall_score: int,
                       prompt_accuracy: int = 3, emotion_accuracy: int = 3,
                       composition_score: int = 3, issues: Dict[str, bool] = None,
                       preferred_over_id: int = None, notes: str = "") -> int:
        """Feedback kaydet ve öğrenmeyi tetikle"""
        issues = issues or {}

        feedback = Feedback(
            generation_id=generation_id,
            overall_score=overall_score,
            prompt_accuracy=prompt_accuracy,
            emotion_accuracy=emotion_accuracy,
            composition_score=composition_score,
            has_hand_issues=issues.get('hands', False),
            has_face_issues=issues.get('faces', False),
            has_blur_issues=issues.get('blur', False),
            has_text_artifacts=issues.get('text', False),
            has_composition_issues=issues.get('composition', False),
            has_anatomy_issues=issues.get('anatomy', False),
            preferred_over_id=preferred_over_id,
            notes=notes
        )

        feedback_id = db.save_feedback(feedback)

        # Öğrenme sürecini tetikle
        self._update_learning(generation_id)

        return feedback_id

    def _update_learning(self, generation_id: int):
        """Yeni feedback'e göre öğrenmeyi güncelle"""
        # Generation bilgisini al
        conn = db._get_conn()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM generations WHERE id = ?', (generation_id,))
        gen_row = cursor.fetchone()

        if not gen_row:
            return

        gen = dict(gen_row)
        scene_type = gen.get('scene_type', '')
        mood = gen.get('mood', '')
        genre = gen.get('genre', '')

        # Feedback istatistiklerini al
        stats = db.get_feedback_stats(scene_type, mood, genre)

        if not stats or stats.get('total_count', 0) < self.min_samples_for_learning:
            return

        # En iyi üretimleri al
        best_gens = db.get_best_generations(scene_type, mood, min_score=4, limit=10)

        if not best_gens:
            return

        # Ortak özellikleri çıkar
        avg_steps = sum(g.get('steps', 25) for g in best_gens) / len(best_gens)
        avg_cfg = sum(g.get('cfg_scale', 7.5) for g in best_gens) / len(best_gens)

        # Yaygın hataları al
        issues = db.get_common_issues(scene_type)

        # Hata bazlı düzeltmeleri hesapla
        negative_additions = []
        prompt_additions = []

        for issue_type, count in issues.items():
            if count > stats['total_count'] * 0.3:  # %30'dan fazla hata varsa
                corrections = self.ISSUE_CORRECTIONS.get(issue_type, {})
                negative_additions.extend(corrections.get('negative_add', []))
                prompt_additions.extend(corrections.get('prompt_add', []))

        # Pattern'i kaydet
        pattern = LearnedPattern(
            scene_type=scene_type,
            mood=mood,
            genre=genre,
            best_prompt_additions=', '.join(set(prompt_additions)),
            best_negative_additions=', '.join(set(negative_additions)),
            optimal_steps=int(avg_steps),
            optimal_cfg=round(avg_cfg, 1),
            sample_count=stats['total_count'],
            avg_score=round(stats.get('avg_score', 3.0), 2),
            success_rate=round(len([g for g in best_gens if g.get('overall_score', 0) >= 4]) / len(best_gens), 2)
        )

        db.save_learned_pattern(pattern)
        logger.info(f"Öğrenme güncellendi: {scene_type}/{mood}/{genre} - avg_score: {pattern.avg_score}")

    def get_optimized_settings(self, scene_type: str, mood: str = "",
                               genre: str = "", base_steps: int = 25,
                               base_cfg: float = 7.5) -> OptimizationResult:
        """Öğrenilmiş pattern'lere göre optimize edilmiş ayarları döndür"""

        prompt_additions = []
        negative_additions = []
        steps_adj = 0
        cfg_adj = 0.0
        confidence = 0.0
        reasoning = []

        # Öğrenilmiş pattern'i kontrol et
        pattern = db.get_learned_pattern(scene_type, mood, genre)

        if pattern and pattern.sample_count >= self.min_samples_for_learning:
            confidence = min(pattern.sample_count / 20, 1.0)  # 20 örnekte max güven

            if pattern.best_prompt_additions:
                prompt_additions.extend(pattern.best_prompt_additions.split(', '))
                reasoning.append(f"Learned prompt additions from {pattern.sample_count} samples")

            if pattern.best_negative_additions:
                negative_additions.extend(pattern.best_negative_additions.split(', '))
                reasoning.append(f"Learned negative additions from {pattern.sample_count} samples")

            steps_adj = pattern.optimal_steps - base_steps
            cfg_adj = pattern.optimal_cfg - base_cfg

            reasoning.append(f"Optimal steps: {pattern.optimal_steps}, CFG: {pattern.optimal_cfg}")
            reasoning.append(f"Success rate: {pattern.success_rate*100:.0f}%")

        # Mood bazlı öğrenmeler
        mood_key = mood.lower() if mood else ""
        if mood_key in self.MOOD_LEARNINGS:
            mood_data = self.MOOD_LEARNINGS[mood_key]
            prompt_additions.extend(mood_data.get('prompt_add', []))
            negative_additions.extend(mood_data.get('negative_add', []))
            reasoning.append(f"Applied mood-based optimizations for '{mood}'")

        # Yaygın hataları kontrol et ve düzelt
        issues = db.get_common_issues(scene_type)
        total_gens = sum(issues.values()) / 6 if issues else 0  # 6 hata tipi var

        if total_gens > 0:
            for issue_type, count in issues.items():
                if count > total_gens * 0.25:  # %25'ten fazla hata
                    corrections = self.ISSUE_CORRECTIONS.get(issue_type, {})
                    negative_additions.extend(corrections.get('negative_add', []))
                    prompt_additions.extend(corrections.get('prompt_add', []))
                    steps_adj += corrections.get('steps_add', 0)
                    cfg_adj += corrections.get('cfg_add', 0)
                    reasoning.append(f"Correcting common issue: {issue_type} ({count} occurrences)")

        # Sınırları uygula
        steps_adj = max(-10, min(15, steps_adj))
        cfg_adj = max(-2.0, min(3.0, cfg_adj))

        return OptimizationResult(
            prompt_additions=list(set(prompt_additions)),
            negative_additions=list(set(negative_additions)),
            steps_adjustment=steps_adj,
            cfg_adjustment=round(cfg_adj, 1),
            confidence=round(confidence, 2),
            reasoning=reasoning
        )

    def get_learning_stats(self) -> Dict[str, Any]:
        """Öğrenme istatistiklerini döndür"""
        conn = db._get_conn()
        cursor = conn.cursor()

        # Toplam üretim sayısı
        cursor.execute('SELECT COUNT(*) FROM generations')
        total_generations = cursor.fetchone()[0]

        # Toplam feedback sayısı
        cursor.execute('SELECT COUNT(*) FROM feedback')
        total_feedback = cursor.fetchone()[0]

        # Öğrenilmiş pattern sayısı
        cursor.execute('SELECT COUNT(*) FROM learned_patterns WHERE sample_count >= ?',
                      (self.min_samples_for_learning,))
        learned_patterns = cursor.fetchone()[0]

        # Ortalama puan
        cursor.execute('SELECT AVG(overall_score) FROM feedback')
        avg_score = cursor.fetchone()[0] or 0

        # En yaygın hatalar
        issues = db.get_common_issues()

        # En başarılı scene types
        cursor.execute('''
            SELECT g.scene_type, AVG(f.overall_score) as avg, COUNT(*) as cnt
            FROM feedback f
            JOIN generations g ON f.generation_id = g.id
            GROUP BY g.scene_type
            HAVING cnt >= 3
            ORDER BY avg DESC
            LIMIT 5
        ''')
        top_scene_types = [{'type': row[0], 'avg_score': round(row[1], 2), 'count': row[2]}
                          for row in cursor.fetchall()]

        return {
            'total_generations': total_generations,
            'total_feedback': total_feedback,
            'learned_patterns': learned_patterns,
            'average_score': round(avg_score, 2),
            'common_issues': issues,
            'top_scene_types': top_scene_types,
            'learning_threshold': self.min_samples_for_learning
        }

    def compare_generations(self, gen_id_a: int, gen_id_b: int, winner_id: int) -> bool:
        """A/B karşılaştırma sonucunu kaydet"""
        loser_id = gen_id_b if winner_id == gen_id_a else gen_id_a

        # Winner'a yüksek puan
        self.record_feedback(
            generation_id=winner_id,
            overall_score=5,
            preferred_over_id=loser_id
        )

        # Loser'a düşük puan
        self.record_feedback(
            generation_id=loser_id,
            overall_score=2
        )

        return True


# Singleton instance
learning_manager = LearningManager()
