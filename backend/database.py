"""
SQLite Database Manager - Öğrenme Sistemi için Veri Katmanı
============================================================
Generations, feedback, learned patterns tabloları
"""

import sqlite3
import json
from datetime import datetime
from pathlib import Path
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
import threading

DB_PATH = Path("./data/learning.db")

@dataclass
class Generation:
    id: Optional[int] = None
    job_id: str = ""
    prompt: str = ""
    enhanced_prompt: str = ""
    negative_prompt: str = ""
    scene_type: str = ""
    mood: str = ""
    genre: str = ""
    style: str = ""
    width: int = 512
    height: int = 512
    steps: int = 25
    cfg_scale: float = 7.5
    seed: int = 0
    model: str = ""
    generation_time: float = 0.0
    image_path: str = ""
    created_at: str = ""

@dataclass
class Feedback:
    id: Optional[int] = None
    generation_id: int = 0
    overall_score: int = 3  # 1-5
    prompt_accuracy: int = 3  # 1-5: Metne uygunluk
    emotion_accuracy: int = 3  # 1-5: Duygu doğruluğu
    composition_score: int = 3  # 1-5: Kompozisyon
    # Hata tipleri (boolean)
    has_hand_issues: bool = False
    has_face_issues: bool = False
    has_blur_issues: bool = False
    has_text_artifacts: bool = False
    has_composition_issues: bool = False
    has_anatomy_issues: bool = False
    # Tercih
    preferred_over_id: Optional[int] = None  # A/B karşılaştırma
    notes: str = ""
    created_at: str = ""

@dataclass
class LearnedPattern:
    id: Optional[int] = None
    scene_type: str = ""
    mood: str = ""
    genre: str = ""
    # Öğrenilen en iyi ayarlar
    best_prompt_additions: str = ""
    best_negative_additions: str = ""
    optimal_steps: int = 25
    optimal_cfg: float = 7.5
    # İstatistikler
    sample_count: int = 0
    avg_score: float = 0.0
    success_rate: float = 0.0
    updated_at: str = ""

class DatabaseManager:
    """Thread-safe SQLite database manager"""

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._local = threading.local()
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        if not hasattr(self._local, 'conn') or self._local.conn is None:
            DB_PATH.parent.mkdir(parents=True, exist_ok=True)
            self._local.conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
            self._local.conn.row_factory = sqlite3.Row
        return self._local.conn

    def _init_db(self):
        conn = self._get_conn()
        cursor = conn.cursor()

        # Generations tablosu
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS generations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                job_id TEXT UNIQUE NOT NULL,
                prompt TEXT NOT NULL,
                enhanced_prompt TEXT,
                negative_prompt TEXT,
                scene_type TEXT,
                mood TEXT,
                genre TEXT,
                style TEXT,
                width INTEGER,
                height INTEGER,
                steps INTEGER,
                cfg_scale REAL,
                seed INTEGER,
                model TEXT,
                generation_time REAL,
                image_path TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        # Feedback tablosu
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                generation_id INTEGER NOT NULL,
                overall_score INTEGER DEFAULT 3,
                prompt_accuracy INTEGER DEFAULT 3,
                emotion_accuracy INTEGER DEFAULT 3,
                composition_score INTEGER DEFAULT 3,
                has_hand_issues INTEGER DEFAULT 0,
                has_face_issues INTEGER DEFAULT 0,
                has_blur_issues INTEGER DEFAULT 0,
                has_text_artifacts INTEGER DEFAULT 0,
                has_composition_issues INTEGER DEFAULT 0,
                has_anatomy_issues INTEGER DEFAULT 0,
                preferred_over_id INTEGER,
                notes TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (generation_id) REFERENCES generations(id)
            )
        ''')

        # Learned patterns tablosu
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS learned_patterns (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scene_type TEXT,
                mood TEXT,
                genre TEXT,
                best_prompt_additions TEXT,
                best_negative_additions TEXT,
                optimal_steps INTEGER DEFAULT 25,
                optimal_cfg REAL DEFAULT 7.5,
                sample_count INTEGER DEFAULT 0,
                avg_score REAL DEFAULT 0.0,
                success_rate REAL DEFAULT 0.0,
                updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(scene_type, mood, genre)
            )
        ''')

        # İndeksler
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_gen_scene ON generations(scene_type, mood, genre)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_feedback_score ON feedback(overall_score)')

        conn.commit()

    # ============== Generation CRUD ==============

    def save_generation(self, gen: Generation) -> int:
        conn = self._get_conn()
        cursor = conn.cursor()

        if not gen.created_at:
            gen.created_at = datetime.now().isoformat()

        cursor.execute('''
            INSERT OR REPLACE INTO generations
            (job_id, prompt, enhanced_prompt, negative_prompt, scene_type, mood, genre, style,
             width, height, steps, cfg_scale, seed, model, generation_time, image_path, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            gen.job_id, gen.prompt, gen.enhanced_prompt, gen.negative_prompt,
            gen.scene_type, gen.mood, gen.genre, gen.style,
            gen.width, gen.height, gen.steps, gen.cfg_scale, gen.seed,
            gen.model, gen.generation_time, gen.image_path, gen.created_at
        ))

        conn.commit()
        return cursor.lastrowid

    def get_generation(self, job_id: str) -> Optional[Generation]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM generations WHERE job_id = ?', (job_id,))
        row = cursor.fetchone()
        if row:
            return Generation(**dict(row))
        return None

    def get_generations_by_type(self, scene_type: str, mood: str = "", genre: str = "", limit: int = 100) -> List[Generation]:
        conn = self._get_conn()
        cursor = conn.cursor()

        query = 'SELECT * FROM generations WHERE scene_type = ?'
        params = [scene_type]

        if mood:
            query += ' AND mood = ?'
            params.append(mood)
        if genre:
            query += ' AND genre = ?'
            params.append(genre)

        query += ' ORDER BY created_at DESC LIMIT ?'
        params.append(limit)

        cursor.execute(query, params)
        return [Generation(**dict(row)) for row in cursor.fetchall()]

    # ============== Feedback CRUD ==============

    def save_feedback(self, feedback: Feedback) -> int:
        conn = self._get_conn()
        cursor = conn.cursor()

        if not feedback.created_at:
            feedback.created_at = datetime.now().isoformat()

        cursor.execute('''
            INSERT INTO feedback
            (generation_id, overall_score, prompt_accuracy, emotion_accuracy, composition_score,
             has_hand_issues, has_face_issues, has_blur_issues, has_text_artifacts,
             has_composition_issues, has_anatomy_issues, preferred_over_id, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            feedback.generation_id, feedback.overall_score, feedback.prompt_accuracy,
            feedback.emotion_accuracy, feedback.composition_score,
            int(feedback.has_hand_issues), int(feedback.has_face_issues),
            int(feedback.has_blur_issues), int(feedback.has_text_artifacts),
            int(feedback.has_composition_issues), int(feedback.has_anatomy_issues),
            feedback.preferred_over_id, feedback.notes, feedback.created_at
        ))

        conn.commit()
        return cursor.lastrowid

    def get_feedback_stats(self, scene_type: str = "", mood: str = "", genre: str = "") -> Dict[str, Any]:
        conn = self._get_conn()
        cursor = conn.cursor()

        query = '''
            SELECT
                AVG(f.overall_score) as avg_score,
                AVG(f.prompt_accuracy) as avg_prompt_acc,
                AVG(f.emotion_accuracy) as avg_emotion_acc,
                SUM(f.has_hand_issues) as hand_issues_count,
                SUM(f.has_face_issues) as face_issues_count,
                SUM(f.has_blur_issues) as blur_issues_count,
                SUM(f.has_text_artifacts) as text_issues_count,
                COUNT(*) as total_count
            FROM feedback f
            JOIN generations g ON f.generation_id = g.id
            WHERE 1=1
        '''
        params = []

        if scene_type:
            query += ' AND g.scene_type = ?'
            params.append(scene_type)
        if mood:
            query += ' AND g.mood = ?'
            params.append(mood)
        if genre:
            query += ' AND g.genre = ?'
            params.append(genre)

        cursor.execute(query, params)
        row = cursor.fetchone()

        if row and row['total_count'] > 0:
            return dict(row)
        return {}

    # ============== Learned Patterns ==============

    def get_learned_pattern(self, scene_type: str, mood: str = "", genre: str = "") -> Optional[LearnedPattern]:
        conn = self._get_conn()
        cursor = conn.cursor()

        cursor.execute('''
            SELECT * FROM learned_patterns
            WHERE scene_type = ? AND mood = ? AND genre = ?
        ''', (scene_type, mood or "", genre or ""))

        row = cursor.fetchone()
        if row:
            return LearnedPattern(**dict(row))
        return None

    def save_learned_pattern(self, pattern: LearnedPattern) -> int:
        conn = self._get_conn()
        cursor = conn.cursor()

        pattern.updated_at = datetime.now().isoformat()

        cursor.execute('''
            INSERT OR REPLACE INTO learned_patterns
            (scene_type, mood, genre, best_prompt_additions, best_negative_additions,
             optimal_steps, optimal_cfg, sample_count, avg_score, success_rate, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            pattern.scene_type, pattern.mood or "", pattern.genre or "",
            pattern.best_prompt_additions, pattern.best_negative_additions,
            pattern.optimal_steps, pattern.optimal_cfg,
            pattern.sample_count, pattern.avg_score, pattern.success_rate,
            pattern.updated_at
        ))

        conn.commit()
        return cursor.lastrowid

    def get_best_generations(self, scene_type: str, mood: str = "", min_score: int = 4, limit: int = 10) -> List[Dict]:
        """En yüksek puanlı üretimleri getir"""
        conn = self._get_conn()
        cursor = conn.cursor()

        query = '''
            SELECT g.*, f.overall_score, f.prompt_accuracy, f.emotion_accuracy
            FROM generations g
            JOIN feedback f ON g.id = f.generation_id
            WHERE f.overall_score >= ?
        '''
        params = [min_score]

        if scene_type:
            query += ' AND g.scene_type = ?'
            params.append(scene_type)
        if mood:
            query += ' AND g.mood = ?'
            params.append(mood)

        query += ' ORDER BY f.overall_score DESC, f.created_at DESC LIMIT ?'
        params.append(limit)

        cursor.execute(query, params)
        return [dict(row) for row in cursor.fetchall()]

    def get_common_issues(self, scene_type: str = "") -> Dict[str, int]:
        """En yaygın hataları getir"""
        conn = self._get_conn()
        cursor = conn.cursor()

        query = '''
            SELECT
                SUM(has_hand_issues) as hands,
                SUM(has_face_issues) as faces,
                SUM(has_blur_issues) as blur,
                SUM(has_text_artifacts) as text,
                SUM(has_composition_issues) as composition,
                SUM(has_anatomy_issues) as anatomy
            FROM feedback f
        '''

        if scene_type:
            query += ' JOIN generations g ON f.generation_id = g.id WHERE g.scene_type = ?'
            cursor.execute(query, (scene_type,))
        else:
            cursor.execute(query)

        row = cursor.fetchone()
        if row:
            return {k: v or 0 for k, v in dict(row).items()}
        return {}

# Singleton instance
db = DatabaseManager()
