"""
Security Module - Güvenlik ve İçerik Filtreleme
================================================
NSFW/şiddet filtresi, path sanitization, rate limiting
"""

import re
import os
import uuid
import hashlib
import logging
from pathlib import Path
from typing import List, Tuple, Optional, Set
from dataclasses import dataclass
from functools import wraps
import time

logger = logging.getLogger(__name__)

# ============== Content Filtering ==============

@dataclass
class ContentCheckResult:
    """İçerik kontrol sonucu"""
    is_safe: bool
    blocked_categories: List[str]
    warning_categories: List[str]
    confidence: float
    sanitized_prompt: str

class ContentFilter:
    """NSFW ve şiddet içerik filtresi"""

    # Yasaklı kelimeler (kesin engel)
    BLOCKED_TERMS = {
        # NSFW
        'nude', 'naked', 'nsfw', 'porn', 'xxx', 'sex', 'erotic', 'hentai',
        'explicit', 'genitals', 'nipple', 'breast', 'topless', 'undress',
        'çıplak', 'porno', 'cinsel', 'erotik', 'soyun', 'meme', 'göğüs',

        # Şiddet
        'gore', 'gory', 'mutilation', 'dismember', 'torture', 'brutal murder',
        'decapitat', 'disembowel', 'graphic violence', 'bloody death',
        'işkence', 'vahşet', 'katliam', 'parçala', 'öldür',

        # Çocuk güvenliği
        'child abuse', 'minor', 'underage', 'loli', 'shota', 'çocuk istismar',

        # Nefret söylemi
        'nazi', 'swastika', 'terrorist', 'isis', 'terör'
    }

    # Uyarı kelimeleri (dikkatli kullanım)
    WARNING_TERMS = {
        # Silahlar
        'gun', 'rifle', 'weapon', 'knife attack', 'sword fight',
        'silah', 'tüfek', 'bıçak',

        # Hafif şiddet
        'blood', 'wound', 'injury', 'fight', 'battle', 'war',
        'kan', 'yara', 'savaş', 'kavga', 'dövüş',

        # Hassas konular
        'suicide', 'self-harm', 'drug use', 'alcohol',
        'intihar', 'uyuşturucu', 'alkol'
    }

    # Güvenli bağlamlar (bu kelimelerle birlikte kullanımda uyarı azalır)
    SAFE_CONTEXTS = {
        'historical', 'museum', 'documentary', 'educational', 'medical',
        'fantasy', 'game', 'movie scene', 'artistic', 'metaphor',
        'tarih', 'müze', 'belgesel', 'eğitim', 'tıbbi', 'fantazi', 'oyun'
    }

    @classmethod
    def check_prompt(cls, prompt: str) -> ContentCheckResult:
        """Prompt'u güvenlik açısından kontrol et"""
        lower_prompt = prompt.lower()
        blocked = []
        warnings = []

        # Yasaklı terimleri kontrol et
        for term in cls.BLOCKED_TERMS:
            if term in lower_prompt:
                blocked.append(term)

        # Uyarı terimlerini kontrol et
        for term in cls.WARNING_TERMS:
            if term in lower_prompt:
                # Güvenli bağlam var mı kontrol et
                has_safe_context = any(ctx in lower_prompt for ctx in cls.SAFE_CONTEXTS)
                if not has_safe_context:
                    warnings.append(term)

        # Sonuç
        is_safe = len(blocked) == 0
        confidence = 1.0 - (len(warnings) * 0.1)  # Her uyarı %10 güven düşürür

        # Sanitize: yasaklı terimleri kaldır
        sanitized = prompt
        for term in blocked:
            sanitized = re.sub(re.escape(term), '[BLOCKED]', sanitized, flags=re.IGNORECASE)

        return ContentCheckResult(
            is_safe=is_safe,
            blocked_categories=blocked,
            warning_categories=warnings,
            confidence=max(0.0, confidence),
            sanitized_prompt=sanitized
        )

    @classmethod
    def get_safe_negative_prompt(cls) -> str:
        """Güvenli içerik için negatif prompt eklemeleri"""
        return (
            "nsfw, nude, naked, explicit, sexual, erotic, "
            "gore, gory, bloody, graphic violence, disturbing, "
            "child, minor, underage, "
            "racist, offensive, hate symbol"
        )

# ============== Path Security ==============

class PathSecurity:
    """Dosya yolu güvenliği"""

    ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp', '.gif'}
    ALLOWED_DIRS = {'generated_images', 'uploads', 'temp'}

    @classmethod
    def sanitize_filename(cls, filename: str) -> str:
        """Dosya adını güvenli hale getir"""
        # Sadece güvenli karakterler
        safe_chars = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)

        # Path traversal önleme
        safe_chars = safe_chars.replace('..', '_')

        # Uzunluk sınırı
        if len(safe_chars) > 200:
            name, ext = os.path.splitext(safe_chars)
            safe_chars = name[:200-len(ext)] + ext

        return safe_chars

    @classmethod
    def validate_path(cls, filepath: str, base_dir: str) -> Tuple[bool, str]:
        """Dosya yolunu doğrula"""
        try:
            # Path nesnelerine çevir
            base = Path(base_dir).resolve()
            target = Path(filepath).resolve()

            # Base directory içinde mi?
            if not str(target).startswith(str(base)):
                return False, "Path traversal attempt detected"

            # Uzantı kontrolü
            ext = target.suffix.lower()
            if ext and ext not in cls.ALLOWED_EXTENSIONS:
                return False, f"Extension not allowed: {ext}"

            return True, ""

        except Exception as e:
            return False, f"Path validation error: {str(e)}"

    @classmethod
    def generate_secure_filename(cls, prefix: str = "img", ext: str = ".png") -> str:
        """Güvenli benzersiz dosya adı oluştur"""
        unique_id = uuid.uuid4().hex[:12]
        timestamp = int(time.time())
        return f"{prefix}_{timestamp}_{unique_id}{ext}"

# ============== Job ID Security ==============

class JobIdManager:
    """Güvenli iş ID yönetimi"""

    _active_jobs: Set[str] = set()

    @classmethod
    def generate(cls) -> str:
        """Güvenli UUID tabanlı iş ID'si oluştur"""
        job_id = f"job_{uuid.uuid4().hex}"
        cls._active_jobs.add(job_id)
        return job_id

    @classmethod
    def validate(cls, job_id: str) -> bool:
        """İş ID'sinin geçerli formatında olduğunu kontrol et"""
        # Format: job_<32 hex chars>
        if not job_id.startswith('job_'):
            return False

        hex_part = job_id[4:]
        if len(hex_part) != 32:
            return False

        try:
            int(hex_part, 16)
            return True
        except ValueError:
            return False

    @classmethod
    def exists(cls, job_id: str) -> bool:
        """İş ID'sinin aktif olup olmadığını kontrol et"""
        return job_id in cls._active_jobs

    @classmethod
    def remove(cls, job_id: str):
        """İş ID'sini listeden kaldır"""
        cls._active_jobs.discard(job_id)

# ============== Rate Limiting ==============

class RateLimiter:
    """Basit rate limiting"""

    def __init__(self, requests_per_minute: int = 30):
        self.requests_per_minute = requests_per_minute
        self.requests: dict = {}  # ip -> [(timestamp, ...)]

    def is_allowed(self, client_ip: str) -> Tuple[bool, int]:
        """İstek izni kontrolü"""
        now = time.time()
        minute_ago = now - 60

        # Eski istekleri temizle
        if client_ip in self.requests:
            self.requests[client_ip] = [
                ts for ts in self.requests[client_ip]
                if ts > minute_ago
            ]
        else:
            self.requests[client_ip] = []

        # Limit kontrolü
        if len(self.requests[client_ip]) >= self.requests_per_minute:
            wait_time = int(60 - (now - self.requests[client_ip][0]))
            return False, wait_time

        # İsteği kaydet
        self.requests[client_ip].append(now)
        return True, 0

# ============== Output Cleanup ==============

class OutputCleaner:
    """Çıktı dosyalarını temizleme"""

    def __init__(self, output_dir: str, max_files: int = 500, max_age_hours: int = 24):
        self.output_dir = Path(output_dir)
        self.max_files = max_files
        self.max_age_hours = max_age_hours

    def cleanup(self) -> int:
        """Eski dosyaları temizle"""
        if not self.output_dir.exists():
            return 0

        files = list(self.output_dir.glob('*.png'))
        removed = 0

        # Yaşa göre sil
        now = time.time()
        max_age_seconds = self.max_age_hours * 3600

        for f in files:
            try:
                age = now - f.stat().st_mtime
                if age > max_age_seconds:
                    f.unlink()
                    removed += 1
            except Exception as e:
                logger.warning(f"Dosya silinirken hata: {f} - {e}")

        # Sayıya göre sil (en eskiler)
        files = sorted(self.output_dir.glob('*.png'), key=lambda x: x.stat().st_mtime)
        while len(files) > self.max_files:
            try:
                files[0].unlink()
                files.pop(0)
                removed += 1
            except Exception as e:
                logger.warning(f"Dosya silinirken hata: {e}")
                break

        if removed > 0:
            logger.info(f"Temizlik: {removed} dosya silindi")

        return removed

# ============== CORS Configuration ==============

def get_cors_config(production: bool = False) -> dict:
    """Ortama göre CORS ayarları"""
    if production:
        return {
            "allow_origins": [
                "https://yourdomain.com",
                "https://app.yourdomain.com"
            ],
            "allow_credentials": True,
            "allow_methods": ["GET", "POST"],
            "allow_headers": ["Content-Type", "Authorization"],
            "max_age": 600
        }
    else:
        # Development - daha açık
        return {
            "allow_origins": [
                "http://localhost:5173",
                "http://localhost:3000",
                "http://127.0.0.1:5173"
            ],
            "allow_credentials": True,
            "allow_methods": ["*"],
            "allow_headers": ["*"]
        }

# ============== Request Validation ==============

class RequestValidator:
    """İstek doğrulama"""

    MAX_PROMPT_LENGTH = 2000
    MAX_NEGATIVE_PROMPT_LENGTH = 1000
    ALLOWED_ASPECT_RATIOS = {'16:9', '9:16', '1:1', '4:3', '3:4', '21:9'}
    MAX_STEPS = 100
    MIN_STEPS = 1
    MAX_CFG = 20.0
    MIN_CFG = 1.0
    MAX_SIZE = 2048
    MIN_SIZE = 256

    @classmethod
    def validate_generation_request(cls, data: dict) -> Tuple[bool, str, dict]:
        """Üretim isteğini doğrula ve sanitize et"""
        errors = []
        sanitized = {}

        # Prompt
        prompt = data.get('prompt', '').strip()
        if not prompt:
            errors.append("Prompt gerekli")
        elif len(prompt) > cls.MAX_PROMPT_LENGTH:
            errors.append(f"Prompt çok uzun (max {cls.MAX_PROMPT_LENGTH} karakter)")
        else:
            # Content filter
            check = ContentFilter.check_prompt(prompt)
            if not check.is_safe:
                errors.append(f"Yasaklı içerik: {', '.join(check.blocked_categories)}")
            sanitized['prompt'] = check.sanitized_prompt

        # Negative prompt
        neg_prompt = data.get('negative_prompt', '').strip()
        if len(neg_prompt) > cls.MAX_NEGATIVE_PROMPT_LENGTH:
            neg_prompt = neg_prompt[:cls.MAX_NEGATIVE_PROMPT_LENGTH]
        sanitized['negative_prompt'] = neg_prompt

        # Aspect ratio
        aspect = data.get('aspect_ratio', '16:9')
        if aspect not in cls.ALLOWED_ASPECT_RATIOS:
            aspect = '16:9'
        sanitized['aspect_ratio'] = aspect

        # Steps
        steps = data.get('steps', 25)
        try:
            steps = int(steps)
            steps = max(cls.MIN_STEPS, min(cls.MAX_STEPS, steps))
        except (ValueError, TypeError):
            steps = 25
        sanitized['steps'] = steps

        # CFG
        cfg = data.get('guidance_scale', 7.5)
        try:
            cfg = float(cfg)
            cfg = max(cls.MIN_CFG, min(cls.MAX_CFG, cfg))
        except (ValueError, TypeError):
            cfg = 7.5
        sanitized['guidance_scale'] = cfg

        # Size
        for dim in ['width', 'height']:
            val = data.get(dim, 512)
            try:
                val = int(val)
                val = max(cls.MIN_SIZE, min(cls.MAX_SIZE, val))
                val = (val // 8) * 8  # 8'e bölünebilir
            except (ValueError, TypeError):
                val = 512
            sanitized[dim] = val

        # Seed
        seed = data.get('seed')
        if seed is not None:
            try:
                sanitized['seed'] = int(seed) % (2**32)
            except (ValueError, TypeError):
                sanitized['seed'] = None
        else:
            sanitized['seed'] = None

        # Diğer alanlar
        for field in ['model', 'quality_mode', 'style', 'mood', 'lighting']:
            val = data.get(field, '')
            if isinstance(val, str) and len(val) < 100:
                sanitized[field] = val.strip()
            else:
                sanitized[field] = ''

        is_valid = len(errors) == 0
        return is_valid, '; '.join(errors), sanitized


# Singleton instances
content_filter = ContentFilter()
rate_limiter = RateLimiter(requests_per_minute=30)
