"""
Görsel Hikaye Üretici - Gelişmiş Yerel Görsel Üretim Backend v3.0
=================================================================
Öğrenme sistemi, gelişmiş güvenlik, optimize prompt yönetimi.

Yenilikler v3.0:
- SQLite tabanlı öğrenme sistemi
- Feedback ve kalite metrikleri
- NSFW/şiddet filtreleme
- Gelişmiş duygu analizi
- Prompt şişmesi önleme
- GPU/VRAM stabilite
- Path güvenliği
"""

import os
import sys
import time
import json
import queue
import threading
import logging
import gc
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, Any, List
from dataclasses import dataclass, asdict
from enum import Enum
import traceback

# FastAPI imports
try:
    from fastapi import FastAPI, HTTPException, Request, Depends
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.responses import FileResponse, JSONResponse
    from pydantic import BaseModel, Field
    import uvicorn
except ImportError:
    print("FastAPI kurulu değil. Kurmak için: pip install fastapi uvicorn")
    sys.exit(1)

# Local modules
try:
    from database import db, Generation, Feedback
    from learning_manager import learning_manager, OptimizationResult
    from security import (
        ContentFilter, PathSecurity, JobIdManager, RateLimiter,
        OutputCleaner, RequestValidator, get_cors_config
    )
    from emotion_analyzer import emotion_analyzer, EmotionResult
except ImportError as e:
    print(f"Modül import hatası: {e}")
    print("Modüller yüklenemedi, temel modda çalışılacak.")

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('server.log', encoding='utf-8')
    ]
)
logger = logging.getLogger(__name__)

# ============== Configuration ==============

class DeviceMode(str, Enum):
    GPU = "gpu"
    CPU = "cpu"

class QualityMode(str, Enum):
    FAST = "fast"
    BALANCED = "balanced"
    QUALITY = "quality"
    ULTRA = "ultra"

class ModelType(str, Enum):
    SD15 = "sd15"
    SDXL = "sdxl"
    SDXL_TURBO = "sdxl_turbo"
    SDXL_LIGHTNING = "sdxl_lightning"

MODEL_CONFIGS = {
    ModelType.SD15: {
        "id": "runwayml/stable-diffusion-v1-5",
        "name": "Stable Diffusion 1.5",
        "min_vram": 4,
        "default_size": 512,
        "max_size": 768,
        "supports_refiner": False
    },
    ModelType.SDXL: {
        "id": "stabilityai/stable-diffusion-xl-base-1.0",
        "name": "SDXL Base",
        "min_vram": 8,
        "default_size": 1024,
        "max_size": 1024,
        "supports_refiner": True
    },
    ModelType.SDXL_TURBO: {
        "id": "stabilityai/sdxl-turbo",
        "name": "SDXL Turbo",
        "min_vram": 8,
        "default_size": 512,
        "max_size": 512,
        "supports_refiner": False,
        "fixed_steps": 4,
        "guidance_scale": 0.0
    },
    ModelType.SDXL_LIGHTNING: {
        "id": "ByteDance/SDXL-Lightning",
        "name": "SDXL Lightning",
        "min_vram": 8,
        "default_size": 1024,
        "max_size": 1024,
        "supports_refiner": False,
        "fixed_steps": 4
    }
}

QUALITY_SETTINGS = {
    QualityMode.FAST: {"steps": 8, "guidance": 5.0, "desc": "Çok hızlı (~5s GPU)"},
    QualityMode.BALANCED: {"steps": 20, "guidance": 7.0, "desc": "Dengeli (~15s GPU)"},
    QualityMode.QUALITY: {"steps": 30, "guidance": 7.5, "desc": "Yüksek kalite (~30s GPU)"},
    QualityMode.ULTRA: {"steps": 50, "guidance": 8.0, "desc": "Maksimum kalite (~60s GPU)"}
}

@dataclass
class ServerConfig:
    host: str = "0.0.0.0"
    port: int = 8765
    output_dir: str = "./generated_images"
    model_cache_dir: str = "./models"
    max_queue_size: int = 10
    max_concurrent_jobs: int = 1
    max_retries: int = 2
    cleanup_interval_hours: int = 24
    production: bool = False

CONFIG = ServerConfig()

# ============== Unified Prompt Enhancer ==============

class UnifiedPromptEnhancer:
    """
    MİNİMAL prompt işleyici - Prompt şişmesini ÖNLER.
    Frontend zaten optimize edilmiş kısa prompt gönderir.
    Backend sadece HAM prompt'u kullanır, ek yapmaz!

    Stable Diffusion sadece ilk ~77 token'a odaklanır.
    Fazla ek = içeriğin boğulması = alakasız resimler!
    """

    # Temel negatif prompt (her zaman ekle)
    BASE_NEGATIVE = (
        "blurry, low quality, bad anatomy, bad hands, text, error, "
        "worst quality, low resolution, ugly, duplicate, morbid, "
        "watermark, signature, jpeg artifacts"
    )

    @classmethod
    def enhance(
        cls,
        prompt: str,
        model_type: ModelType,
        optimization: Optional[OptimizationResult] = None,
        emotion: Optional[EmotionResult] = None,
        add_core_quality: bool = True
    ) -> str:
        """
        Prompt'u MİNİMAL düzeyde işle.
        Frontend zaten içerik öncelikli kısa prompt gönderir.
        Backend SADECE temizlik yapar, ek YAPMAZ!
        """
        # Frontend'den gelen prompt zaten optimize edilmiş
        # Sadece temizle ve döndür
        clean_prompt = prompt.strip()

        # Çok uzunsa kes (77 token ~ 300 karakter)
        if len(clean_prompt) > 350:
            # Son virgülden önce kes
            clean_prompt = clean_prompt[:350]
            last_comma = clean_prompt.rfind(',')
            if last_comma > 200:
                clean_prompt = clean_prompt[:last_comma]

        logger.info(f"[PROMPT] Uzunluk: {len(clean_prompt)} karakter")

        return clean_prompt

    @classmethod
    def get_negative_prompt(
        cls,
        user_negative: str = "",
        optimization: Optional[OptimizationResult] = None,
        add_safety: bool = True
    ) -> str:
        """Negatif prompt oluştur"""
        parts = [cls.BASE_NEGATIVE]

        # Kullanıcı negatifi
        if user_negative:
            parts.append(user_negative)

        # Güvenlik filtreleri
        if add_safety:
            parts.append(ContentFilter.get_safe_negative_prompt())

        # Öğrenme düzeltmeleri
        if optimization and optimization.confidence > 0.5:
            for neg in optimization.negative_additions[:5]:  # Max 5
                if neg.lower() not in parts[0].lower():
                    parts.append(neg)

        return ", ".join(parts)

# ============== Device Manager ==============

class DeviceManager:
    """GPU/CPU otomatik algılama ve yönetim"""

    def __init__(self):
        self.mode: DeviceMode = DeviceMode.CPU
        self.device: str = "cpu"
        self.gpu_info: Optional[str] = None
        self.vram_gb: float = 0
        self.vram_free_gb: float = 0
        self._detect_device()

    def _detect_device(self):
        try:
            import torch
            if torch.cuda.is_available():
                self.mode = DeviceMode.GPU
                self.device = "cuda"
                self.gpu_info = torch.cuda.get_device_name(0)
                props = torch.cuda.get_device_properties(0)
                self.vram_gb = props.total_memory / (1024**3)
                self._update_free_vram()
                logger.info(f"GPU algılandı: {self.gpu_info} ({self.vram_gb:.1f}GB VRAM)")
            elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                self.mode = DeviceMode.GPU
                self.device = "mps"
                self.gpu_info = "Apple Silicon (MPS)"
                self.vram_gb = 8
                logger.info("Apple Silicon algılandı")
            else:
                self.mode = DeviceMode.CPU
                self.device = "cpu"
                logger.warning("GPU bulunamadı, CPU modunda çalışılacak")
        except ImportError:
            logger.error("PyTorch kurulu değil!")
            self.mode = DeviceMode.CPU
            self.device = "cpu"

    def _update_free_vram(self):
        """Boş VRAM miktarını güncelle"""
        try:
            import torch
            if torch.cuda.is_available():
                free, total = torch.cuda.mem_get_info()
                self.vram_free_gb = free / (1024**3)
        except:
            self.vram_free_gb = self.vram_gb * 0.8

    def check_vram_for_size(self, width: int, height: int, model: ModelType) -> bool:
        """Belirtilen boyut için yeterli VRAM var mı"""
        self._update_free_vram()

        # Tahmini VRAM kullanımı (MB)
        pixels = width * height
        base_usage = MODEL_CONFIGS[model].get("min_vram", 4)
        size_factor = pixels / (512 * 512)
        estimated_usage = base_usage * size_factor

        return self.vram_free_gb >= estimated_usage

    def get_available_models(self) -> List[Dict[str, Any]]:
        models = []
        for model_type, config in MODEL_CONFIGS.items():
            available = self.vram_gb >= config["min_vram"] or self.mode == DeviceMode.CPU
            models.append({
                "id": model_type.value,
                "name": config["name"],
                "min_vram": config["min_vram"],
                "available": available,
                "recommended": (
                    (model_type == ModelType.SDXL and self.vram_gb >= 8) or
                    (model_type == ModelType.SD15 and self.vram_gb < 8)
                )
            })
        return models

    def get_recommended_model(self) -> ModelType:
        if self.vram_gb >= 10:
            return ModelType.SDXL
        elif self.vram_gb >= 8:
            return ModelType.SDXL_TURBO
        else:
            return ModelType.SD15

    def clear_cache(self):
        """GPU belleğini temizle"""
        try:
            import torch
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
                torch.cuda.synchronize()
                logger.info("GPU cache temizlendi")
        except Exception as e:
            logger.warning(f"Cache temizleme hatası: {e}")

# ============== Image Generator with Stability ==============

class ImageGenerator:
    """Gelişmiş Stable Diffusion görsel üretici - OOM koruması dahil"""

    def __init__(self, device_manager: DeviceManager):
        self.device_manager = device_manager
        self.pipes: Dict[ModelType, Any] = {}
        self.current_model: Optional[ModelType] = None
        self.loading = False
        self._lock = threading.Lock()
        self._consecutive_failures = 0
        self._max_consecutive_failures = 3

    def load_model(self, model_type: ModelType, force_reload: bool = False) -> bool:
        with self._lock:
            if model_type in self.pipes and not force_reload:
                self.current_model = model_type
                return True

            if self.loading:
                logger.warning("Başka bir model yükleniyor, bekleyin...")
                return False

            self.loading = True

        try:
            import torch
            from diffusers import (
                StableDiffusionPipeline,
                StableDiffusionXLPipeline,
                DPMSolverMultistepScheduler,
                EulerDiscreteScheduler,
                AutoPipelineForText2Image
            )

            config = MODEL_CONFIGS[model_type]
            model_id = config["id"]

            logger.info(f"Model yükleniyor: {config['name']}")

            cache_dir = Path(CONFIG.model_cache_dir)
            cache_dir.mkdir(parents=True, exist_ok=True)

            # Eski modeli temizle
            if self.current_model and self.current_model in self.pipes:
                del self.pipes[self.current_model]
                self.device_manager.clear_cache()

            dtype = torch.float16 if self.device_manager.mode == DeviceMode.GPU else torch.float32

            # Model tipine göre pipeline
            if model_type == ModelType.SD15:
                pipe = StableDiffusionPipeline.from_pretrained(
                    model_id,
                    torch_dtype=dtype,
                    cache_dir=str(cache_dir),
                    safety_checker=None,  # Manuel filtre kullanıyoruz
                    requires_safety_checker=False
                )
                pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config)

            elif model_type == ModelType.SDXL:
                pipe = StableDiffusionXLPipeline.from_pretrained(
                    model_id,
                    torch_dtype=dtype,
                    cache_dir=str(cache_dir),
                    use_safetensors=True,
                    variant="fp16" if dtype == torch.float16 else None
                )
                pipe.scheduler = DPMSolverMultistepScheduler.from_config(
                    pipe.scheduler.config,
                    algorithm_type="sde-dpmsolver++"
                )

            elif model_type == ModelType.SDXL_TURBO:
                pipe = AutoPipelineForText2Image.from_pretrained(
                    model_id,
                    torch_dtype=dtype,
                    cache_dir=str(cache_dir),
                    variant="fp16" if dtype == torch.float16 else None
                )

            elif model_type == ModelType.SDXL_LIGHTNING:
                base = "stabilityai/stable-diffusion-xl-base-1.0"
                pipe = StableDiffusionXLPipeline.from_pretrained(
                    base,
                    torch_dtype=dtype,
                    cache_dir=str(cache_dir),
                    variant="fp16" if dtype == torch.float16 else None
                )
                pipe.scheduler = EulerDiscreteScheduler.from_config(
                    pipe.scheduler.config,
                    timestep_spacing="trailing"
                )
                pipe.load_lora_weights(
                    "ByteDance/SDXL-Lightning",
                    weight_name="sdxl_lightning_4step_lora.safetensors",
                    cache_dir=str(cache_dir)
                )
                pipe.fuse_lora()

            pipe = pipe.to(self.device_manager.device)

            # Bellek optimizasyonları
            if self.device_manager.mode == DeviceMode.GPU:
                pipe.enable_attention_slicing()
                if hasattr(pipe, 'enable_vae_slicing'):
                    pipe.enable_vae_slicing()
                if self.device_manager.vram_gb < 8:
                    if hasattr(pipe, 'enable_model_cpu_offload'):
                        pipe.enable_model_cpu_offload()

            self.pipes[model_type] = pipe
            self.current_model = model_type
            self._consecutive_failures = 0
            logger.info(f"Model başarıyla yüklendi: {config['name']}")
            return True

        except Exception as e:
            logger.error(f"Model yükleme hatası: {e}")
            traceback.print_exc()
            return False
        finally:
            self.loading = False

    def generate(
        self,
        prompt: str,
        negative_prompt: str = "",
        width: int = 512,
        height: int = 512,
        steps: int = 25,
        guidance_scale: float = 7.5,
        seed: Optional[int] = None,
        model_type: Optional[ModelType] = None,
        quality_mode: QualityMode = QualityMode.BALANCED,
        scene_type: str = "",
        mood: str = "",
        genre: str = "",
        style: str = "cinematic",
        remove_background: bool = False,  # Şeffaf arka plan
        progress_callback: Optional[callable] = None,  # Progress bildirimi
        retry_count: int = 0
    ) -> Optional[Dict[str, Any]]:
        """OOM korumalı görsel üretimi - Şeffaf arka plan destekli"""

        if model_type is None:
            model_type = self.device_manager.get_recommended_model()

        if model_type not in self.pipes:
            if not self.load_model(model_type):
                return None

        pipe = self.pipes[model_type]
        config = MODEL_CONFIGS[model_type]

        # Duygu analizi
        emotion = None
        try:
            emotion = emotion_analyzer.analyze(prompt)
        except:
            pass

        # Öğrenme optimizasyonları
        optimization = None
        try:
            optimization = learning_manager.get_optimized_settings(
                scene_type=scene_type,
                mood=mood,
                genre=genre,
                base_steps=steps,
                base_cfg=guidance_scale
            )
        except:
            pass

        # Prompt'u minimize düzeyde zenginleştir
        enhanced_prompt = UnifiedPromptEnhancer.enhance(
            prompt=prompt,
            model_type=model_type,
            optimization=optimization,
            emotion=emotion,
            add_core_quality=True
        )

        # Negatif prompt
        final_negative = UnifiedPromptEnhancer.get_negative_prompt(
            user_negative=negative_prompt,
            optimization=optimization,
            add_safety=True
        )

        # Ayarları uygula
        quality_config = QUALITY_SETTINGS[quality_mode]

        if "fixed_steps" in config:
            steps = config["fixed_steps"]
        else:
            steps = quality_config["steps"]
            if optimization:
                steps += optimization.steps_adjustment

        if "guidance_scale" in config:
            guidance_scale = config["guidance_scale"]
        else:
            guidance_scale = quality_config["guidance"]
            if optimization:
                guidance_scale += optimization.cfg_adjustment

        # Boyut sınırlaması
        max_size = config["max_size"]
        width = min(width, max_size)
        height = min(height, max_size)
        width = (width // 8) * 8
        height = (height // 8) * 8

        # VRAM kontrolü
        if not self.device_manager.check_vram_for_size(width, height, model_type):
            logger.warning(f"Yetersiz VRAM, boyut küçültülüyor: {width}x{height}")
            width = min(width, 512)
            height = min(height, 512)

        try:
            import torch

            if seed is None:
                seed = int(time.time() * 1000) % (2**32)

            generator = torch.Generator(device=self.device_manager.device).manual_seed(seed)

            logger.info(f"Görsel üretiliyor: {config['name']} {width}x{height} steps={steps}")
            logger.info(f"===== PROMPT (ilk 500 karakter) =====")
            logger.info(f"{enhanced_prompt[:500]}...")
            logger.info(f"=====================================")

            start_time = time.time()

            # Progress callback wrapper
            def step_callback(step, timestep, latents):
                if progress_callback:
                    progress = int((step / steps) * 80)  # 0-80% üretim
                    progress_callback(progress, f"Görsel oluşturuluyor... ({step}/{steps})")

            # İlk progress
            if progress_callback:
                progress_callback(5, "Model hazırlanıyor...")

            # Üretim
            with torch.inference_mode():
                result = pipe(
                    prompt=enhanced_prompt,
                    negative_prompt=final_negative,
                    width=width,
                    height=height,
                    num_inference_steps=steps,
                    guidance_scale=guidance_scale,
                    generator=generator,
                    callback=step_callback,
                    callback_steps=1
                )

            image = result.images[0]

            # Arka plan kaldırma (istenirse)
            if remove_background:
                if progress_callback:
                    progress_callback(85, "Arka plan kaldırılıyor...")
                try:
                    from rembg import remove
                    from PIL import Image
                    import io

                    # PIL Image'ı bytes'a çevir
                    img_bytes = io.BytesIO()
                    image.save(img_bytes, format='PNG')
                    img_bytes.seek(0)

                    # Arka planı kaldır
                    output_bytes = remove(img_bytes.read())
                    image = Image.open(io.BytesIO(output_bytes))
                    logger.info("Arka plan başarıyla kaldırıldı")

                except ImportError:
                    logger.warning("rembg kurulu değil! pip install rembg ile kurun")
                except Exception as e:
                    logger.warning(f"Arka plan kaldırma hatası: {e}")

            if progress_callback:
                progress_callback(95, "Görsel kaydediliyor...")

            # Kaydet
            output_dir = Path(CONFIG.output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)

            filename = PathSecurity.generate_secure_filename("scene", ".png")
            filepath = output_dir / filename

            # PNG olarak kaydet (şeffaflık korunur)
            image.save(filepath, format='PNG')

            elapsed = time.time() - start_time
            logger.info(f"Görsel üretildi: {filename} ({elapsed:.1f}s)")

            self._consecutive_failures = 0

            # Öğrenme sistemine kaydet
            try:
                learning_manager.record_generation(
                    job_id=filename.replace('.png', ''),
                    prompt=prompt,
                    enhanced_prompt=enhanced_prompt,
                    negative_prompt=final_negative,
                    scene_type=scene_type,
                    mood=mood,
                    genre=genre,
                    style=style,
                    width=width,
                    height=height,
                    steps=steps,
                    cfg_scale=guidance_scale,
                    seed=seed,
                    model=config["name"],
                    generation_time=elapsed,
                    image_path=str(filepath)
                )
            except Exception as e:
                logger.warning(f"Öğrenme kaydı hatası: {e}")

            return {
                "filepath": str(filepath),
                "filename": filename,
                "seed": seed,
                "model": config["name"],
                "enhanced_prompt": enhanced_prompt,
                "negative_prompt": final_negative,
                "width": width,
                "height": height,
                "steps": steps,
                "guidance_scale": guidance_scale,
                "generation_time": round(elapsed, 2),
                "emotion": {
                    "class": emotion.primary_emotion.value if emotion else None,
                    "intensity": emotion.intensity if emotion else None
                } if emotion else None,
                "optimization_applied": optimization is not None and optimization.confidence > 0.5
            }

        except RuntimeError as e:
            if "out of memory" in str(e).lower():
                logger.error(f"OOM hatası! Retry: {retry_count}")
                self.device_manager.clear_cache()

                if retry_count < CONFIG.max_retries:
                    # Boyutu küçült ve tekrar dene
                    new_width = max(256, width // 2)
                    new_height = max(256, height // 2)
                    logger.info(f"Boyut küçültülerek tekrar deneniyor: {new_width}x{new_height}")

                    return self.generate(
                        prompt=prompt,
                        negative_prompt=negative_prompt,
                        width=new_width,
                        height=new_height,
                        steps=steps,
                        guidance_scale=guidance_scale,
                        seed=seed,
                        model_type=model_type,
                        quality_mode=quality_mode,
                        scene_type=scene_type,
                        mood=mood,
                        genre=genre,
                        style=style,
                        retry_count=retry_count + 1
                    )

            self._consecutive_failures += 1
            logger.error(f"Görsel üretim hatası: {e}")
            traceback.print_exc()

            if self._consecutive_failures >= self._max_consecutive_failures:
                logger.error("Çok fazla ardışık hata, model yeniden yükleniyor")
                self.load_model(model_type, force_reload=True)

            return None

        except Exception as e:
            self._consecutive_failures += 1
            logger.error(f"Görsel üretim hatası: {e}")
            traceback.print_exc()
            return None

# ============== Job Queue ==============

@dataclass
class GenerationJob:
    job_id: str
    prompt: str
    negative_prompt: str = ""
    width: int = 512
    height: int = 512
    steps: int = 25
    guidance_scale: float = 7.5
    seed: Optional[int] = None
    model_type: Optional[str] = None
    quality_mode: str = "balanced"
    style: str = "cinematic"
    scene_type: str = ""
    mood: str = ""
    genre: str = ""
    lighting: str = ""
    remove_background: bool = False  # Şeffaf arka plan
    status: str = "pending"
    progress: int = 0  # 0-100 arası ilerleme
    progress_message: str = ""  # İlerleme mesajı
    result: Optional[Dict] = None
    error: Optional[str] = None
    created_at: str = ""
    completed_at: Optional[str] = None
    retry_count: int = 0
    cancelled: bool = False  # İptal edildi mi

class JobQueue:
    def __init__(self, generator: ImageGenerator, max_size: int = 10):
        self.generator = generator
        self.queue: queue.Queue = queue.Queue(maxsize=max_size)
        self.jobs: Dict[str, GenerationJob] = {}
        self.worker_thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()
        self._shutdown = False

    def start_worker(self):
        if self.worker_thread is None or not self.worker_thread.is_alive():
            self._shutdown = False
            self.worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
            self.worker_thread.start()
            logger.info("İş kuyruğu işçisi başlatıldı")

    def stop_worker(self):
        self._shutdown = True
        if self.worker_thread:
            self.worker_thread.join(timeout=5)

    def _worker_loop(self):
        while not self._shutdown:
            try:
                job_id = self.queue.get(timeout=1)
                self._process_job(job_id)
                self.queue.task_done()
            except queue.Empty:
                continue
            except Exception as e:
                logger.error(f"Worker hatası: {e}")

    def _process_job(self, job_id: str):
        with self._lock:
            if job_id not in self.jobs:
                return
            job = self.jobs[job_id]
            job.status = "processing"
            job.progress = 0
            job.progress_message = "Başlatılıyor..."

        # Progress callback fonksiyonu
        def update_progress(progress: int, message: str):
            with self._lock:
                if job_id in self.jobs:
                    self.jobs[job_id].progress = progress
                    self.jobs[job_id].progress_message = message

        try:
            # İptal kontrolü
            with self._lock:
                if self.jobs[job_id].cancelled:
                    self.jobs[job_id].status = "cancelled"
                    self.jobs[job_id].progress_message = "İptal edildi"
                    return

            model_type = None
            if job.model_type:
                try:
                    model_type = ModelType(job.model_type)
                except ValueError:
                    pass

            quality_mode = QualityMode.BALANCED
            try:
                quality_mode = QualityMode(job.quality_mode)
            except ValueError:
                pass

            result = self.generator.generate(
                prompt=job.prompt,
                negative_prompt=job.negative_prompt,
                width=job.width,
                height=job.height,
                steps=job.steps,
                guidance_scale=job.guidance_scale,
                seed=job.seed,
                model_type=model_type,
                quality_mode=quality_mode,
                scene_type=job.scene_type,
                mood=job.mood,
                genre=job.genre,
                style=job.style,
                remove_background=job.remove_background,
                progress_callback=update_progress
            )

            with self._lock:
                # Son iptal kontrolü
                if self.jobs[job_id].cancelled:
                    self.jobs[job_id].status = "cancelled"
                    self.jobs[job_id].progress = 0
                    self.jobs[job_id].progress_message = "İptal edildi"
                    return

                if result:
                    job.status = "completed"
                    job.result = result
                    job.progress = 100
                    job.progress_message = "Tamamlandı!"
                else:
                    job.status = "failed"
                    job.error = "Görsel üretilemedi"
                    job.progress_message = "Hata oluştu"
                job.completed_at = datetime.now().isoformat()

        except Exception as e:
            with self._lock:
                job.status = "failed"
                job.error = str(e)
                job.progress_message = f"Hata: {str(e)[:50]}"
                job.completed_at = datetime.now().isoformat()

    def cancel_job(self, job_id: str) -> bool:
        """İşi iptal et"""
        with self._lock:
            if job_id in self.jobs:
                job = self.jobs[job_id]
                if job.status in ["pending", "processing"]:
                    job.cancelled = True
                    job.status = "cancelled"
                    job.progress_message = "Kullanıcı tarafından iptal edildi"
                    return True
        return False

    def add_job(self, job: GenerationJob) -> bool:
        try:
            with self._lock:
                self.jobs[job.job_id] = job
            self.queue.put_nowait(job.job_id)
            return True
        except queue.Full:
            return False

    def get_job(self, job_id: str) -> Optional[GenerationJob]:
        with self._lock:
            return self.jobs.get(job_id)

    def get_queue_status(self) -> Dict[str, Any]:
        with self._lock:
            pending = sum(1 for j in self.jobs.values() if j.status == "pending")
            processing = sum(1 for j in self.jobs.values() if j.status == "processing")
            return {
                "queue_size": self.queue.qsize(),
                "pending": pending,
                "processing": processing,
                "max_size": self.queue.maxsize
            }

    def cleanup_old_jobs(self, max_age_hours: int = 24):
        """Eski işleri temizle"""
        now = datetime.now()
        to_remove = []

        with self._lock:
            for job_id, job in self.jobs.items():
                if job.completed_at:
                    try:
                        completed = datetime.fromisoformat(job.completed_at)
                        age_hours = (now - completed).total_seconds() / 3600
                        if age_hours > max_age_hours:
                            to_remove.append(job_id)
                    except:
                        pass

            for job_id in to_remove:
                JobIdManager.remove(job_id)
                del self.jobs[job_id]

        if to_remove:
            logger.info(f"{len(to_remove)} eski iş temizlendi")

# ============== API ==============

app = FastAPI(
    title="Görsel Hikaye Üretici API v3.0",
    description="Öğrenen, güvenli, optimize görsel üretim servisi",
    version="3.0.0"
)

# CORS - ortama göre
cors_config = get_cors_config(CONFIG.production)
app.add_middleware(CORSMiddleware, **cors_config)

# Global instances
device_manager: Optional[DeviceManager] = None
generator: Optional[ImageGenerator] = None
job_queue: Optional[JobQueue] = None
rate_limiter = RateLimiter(requests_per_minute=30)
output_cleaner: Optional[OutputCleaner] = None

# Pydantic models
class GenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000)
    negative_prompt: str = Field("", max_length=1000)
    width: int = Field(512, ge=256, le=2048)
    height: int = Field(512, ge=256, le=2048)
    steps: int = Field(25, ge=1, le=100)
    guidance_scale: float = Field(7.5, ge=1.0, le=20.0)
    seed: Optional[int] = None
    aspect_ratio: Optional[str] = None
    model: Optional[str] = None
    quality_mode: str = "balanced"
    style: str = "cinematic"
    scene_type: str = ""
    mood: str = ""
    genre: str = ""
    lighting: str = ""
    remove_background: bool = False  # Şeffaf arka plan isteniyor mu

# Düşük puan nedenleri
class LowScoreReason(str, Enum):
    IRRELEVANT_IMAGE = "irrelevant_image"  # Alakasız resim
    WRONG_SUBJECT = "wrong_subject"  # Yanlış konu
    BAD_QUALITY = "bad_quality"  # Düşük kalite
    WRONG_STYLE = "wrong_style"  # Yanlış stil
    ANATOMICAL_ERROR = "anatomical_error"  # Anatomi hatası
    WRONG_COLORS = "wrong_colors"  # Yanlış renkler
    WRONG_LIGHTING = "wrong_lighting"  # Yanlış ışık
    WRONG_COMPOSITION = "wrong_composition"  # Yanlış kompozisyon
    RESOLUTION_ISSUE = "resolution_issue"  # Çözünürlük sorunu
    OTHER = "other"  # Diğer

class FeedbackRequest(BaseModel):
    job_id: str
    overall_score: int = Field(..., ge=1, le=5)
    prompt_accuracy: int = Field(3, ge=1, le=5)
    emotion_accuracy: int = Field(3, ge=1, le=5)
    composition_score: int = Field(3, ge=1, le=5)
    issues: Dict[str, bool] = Field(default_factory=dict)
    notes: str = ""
    # Düşük puan nedenleri (3 ve altı puan için)
    low_score_reasons: List[str] = Field(default_factory=list)
    low_score_details: str = ""  # Detaylı açıklama
    was_cancelled: bool = False  # Üretim iptal edildi mi

class JobResponse(BaseModel):
    job_id: str
    status: str
    message: str

# Rate limiting dependency
async def check_rate_limit(request: Request):
    client_ip = request.client.host if request.client else "unknown"
    allowed, wait_time = rate_limiter.is_allowed(client_ip)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Çok fazla istek. {wait_time} saniye bekleyin."
        )

@app.on_event("startup")
async def startup():
    global device_manager, generator, job_queue, output_cleaner

    logger.info("=" * 60)
    logger.info("   GÖRSEL HİKAYE ÜRETİCİ v3.0 - ÖĞRENEN BACKEND")
    logger.info("=" * 60)

    device_manager = DeviceManager()
    generator = ImageGenerator(device_manager)
    job_queue = JobQueue(generator, max_size=CONFIG.max_queue_size)
    job_queue.start_worker()

    output_cleaner = OutputCleaner(CONFIG.output_dir)

    Path(CONFIG.output_dir).mkdir(parents=True, exist_ok=True)
    Path("./data").mkdir(parents=True, exist_ok=True)

    logger.info(f"Sunucu hazır: http://localhost:{CONFIG.port}")
    logger.info(f"Mod: {device_manager.mode.value.upper()}")
    if device_manager.gpu_info:
        logger.info(f"GPU: {device_manager.gpu_info} ({device_manager.vram_gb:.1f}GB)")

@app.on_event("shutdown")
async def shutdown():
    if job_queue:
        job_queue.stop_worker()
    logger.info("Sunucu kapatılıyor")

@app.get("/")
async def root():
    return {
        "service": "Görsel Hikaye Üretici v3.0",
        "status": "online",
        "mode": device_manager.mode.value if device_manager else "unknown",
        "features": ["learning", "emotion_analysis", "safety_filter", "auto_optimization"]
    }

@app.get("/api/status")
async def get_status():
    queue_status = job_queue.get_queue_status() if job_queue else {}
    models = device_manager.get_available_models() if device_manager else []
    recommended = device_manager.get_recommended_model() if device_manager else ModelType.SD15

    current_model = None
    model_loaded = False
    if generator:
        model_loaded = generator.current_model is not None
        if generator.current_model:
            current_model = MODEL_CONFIGS[generator.current_model]["name"]

    # Öğrenme istatistikleri
    learning_stats = {}
    try:
        learning_stats = learning_manager.get_learning_stats()
    except:
        pass

    return {
        "device": {
            "mode": device_manager.mode.value if device_manager else "unknown",
            "device": device_manager.device if device_manager else "unknown",
            "gpu_info": device_manager.gpu_info if device_manager else None,
            "vram_gb": round(device_manager.vram_gb, 1) if device_manager else 0,
            "vram_free_gb": round(device_manager.vram_free_gb, 1) if device_manager else 0
        },
        "model": {
            "loaded": model_loaded,
            "loading": generator.loading if generator else False,
            "name": current_model,
            "available_models": models,
            "recommended": recommended.value
        },
        "queue": queue_status,
        "learning": learning_stats,
        "quality_modes": [
            {"id": m.value, "desc": QUALITY_SETTINGS[m]["desc"]}
            for m in QualityMode
        ],
        "recommended_settings": {
            "steps": QUALITY_SETTINGS[QualityMode.BALANCED]["steps"],
            "width": MODEL_CONFIGS[recommended]["default_size"],
            "height": MODEL_CONFIGS[recommended]["default_size"],
            "estimated_time": "15-30 saniye" if device_manager and device_manager.mode == DeviceMode.GPU else "2-5 dakika"
        }
    }

@app.post("/api/load-model")
async def load_model(model: Optional[str] = None):
    if not generator or not device_manager:
        raise HTTPException(500, "Generator başlatılmadı")

    model_type = device_manager.get_recommended_model()
    if model:
        try:
            model_type = ModelType(model)
        except ValueError:
            raise HTTPException(400, f"Geçersiz model: {model}")

    if generator.current_model == model_type:
        return {"status": "already_loaded", "model": MODEL_CONFIGS[model_type]["name"]}

    if generator.loading:
        return {"status": "loading", "message": "Model yükleniyor..."}

    def load_in_background():
        generator.load_model(model_type)

    thread = threading.Thread(target=load_in_background)
    thread.start()

    return {
        "status": "loading_started",
        "model": MODEL_CONFIGS[model_type]["name"],
        "message": "Model yükleniyor"
    }

@app.post("/api/generate", response_model=JobResponse, dependencies=[Depends(check_rate_limit)])
async def generate_image(request: GenerateRequest):
    if not job_queue:
        raise HTTPException(500, "Kuyruk başlatılmadı")

    # İçerik güvenlik kontrolü
    content_check = ContentFilter.check_prompt(request.prompt)
    if not content_check.is_safe:
        raise HTTPException(
            400,
            f"İçerik engellendi: {', '.join(content_check.blocked_categories)}"
        )

    # Boyut hesapla
    width, height = request.width, request.height
    recommended = device_manager.get_recommended_model() if device_manager else ModelType.SD15
    base_size = MODEL_CONFIGS[recommended]["default_size"]

    if request.aspect_ratio:
        ratios = {
            "16:9": (base_size, int(base_size * 9/16)),
            "9:16": (int(base_size * 9/16), base_size),
            "1:1": (base_size, base_size),
            "4:3": (base_size, int(base_size * 3/4)),
            "3:4": (int(base_size * 3/4), base_size),
            "21:9": (base_size, int(base_size * 9/21)),
        }
        if request.aspect_ratio in ratios:
            width, height = ratios[request.aspect_ratio]

    # Güvenli job ID
    job_id = JobIdManager.generate()

    job = GenerationJob(
        job_id=job_id,
        prompt=content_check.sanitized_prompt,
        negative_prompt=request.negative_prompt,
        width=width,
        height=height,
        steps=request.steps,
        guidance_scale=request.guidance_scale,
        seed=request.seed,
        model_type=request.model,
        quality_mode=request.quality_mode,
        style=request.style,
        scene_type=request.scene_type,
        mood=request.mood,
        genre=request.genre,
        lighting=request.lighting,
        remove_background=request.remove_background,  # Şeffaf arka plan
        created_at=datetime.now().isoformat()
    )

    if not job_queue.add_job(job):
        raise HTTPException(429, "Kuyruk dolu, lütfen bekleyin")

    queue_status = job_queue.get_queue_status()

    # Uyarılar varsa ekle
    message = f"İş kuyruğa eklendi (sıra: {queue_status['pending']})"
    if content_check.warning_categories:
        message += f" [Uyarı: {', '.join(content_check.warning_categories)}]"

    return JobResponse(
        job_id=job_id,
        status="queued",
        message=message
    )

@app.get("/api/job/{job_id}")
async def get_job_status(job_id: str):
    # Job ID güvenlik kontrolü
    if not JobIdManager.validate(job_id):
        raise HTTPException(400, "Geçersiz iş ID formatı")

    if not job_queue:
        raise HTTPException(500, "Kuyruk başlatılmadı")

    job = job_queue.get_job(job_id)
    if not job:
        raise HTTPException(404, "İş bulunamadı")

    response = asdict(job)

    # Progress bilgisi ekle
    response["progress"] = job.progress
    response["progress_message"] = job.progress_message
    response["can_rate"] = job.status == "completed" and not job.cancelled

    if job.status == "completed" and job.result:
        response["image_url"] = f"/api/image/{job.result['filename']}"
        response["generation_info"] = {
            "model": job.result.get("model"),
            "seed": job.result.get("seed"),
            "enhanced_prompt": job.result.get("enhanced_prompt"),
            "generation_time": job.result.get("generation_time"),
            "emotion": job.result.get("emotion"),
            "optimization_applied": job.result.get("optimization_applied")
        }

    return response

@app.post("/api/job/{job_id}/cancel")
async def cancel_job(job_id: str):
    """İşi iptal et - iptal edilen işler değerlendirilemez"""
    if not JobIdManager.validate(job_id):
        raise HTTPException(400, "Geçersiz iş ID formatı")

    if not job_queue:
        raise HTTPException(500, "Kuyruk başlatılmadı")

    success = job_queue.cancel_job(job_id)

    if success:
        return {
            "status": "cancelled",
            "message": "İş iptal edildi. İptal edilen işler değerlendirilemez.",
            "can_rate": False
        }
    else:
        raise HTTPException(400, "İş iptal edilemedi (zaten tamamlanmış olabilir)")

@app.get("/api/image/{filename}")
async def get_image(filename: str):
    # Güvenlik: path sanitization
    safe_filename = PathSecurity.sanitize_filename(filename)
    filepath = Path(CONFIG.output_dir) / safe_filename

    # Path traversal kontrolü
    is_valid, error = PathSecurity.validate_path(str(filepath), CONFIG.output_dir)
    if not is_valid:
        raise HTTPException(400, error)

    if not filepath.exists():
        raise HTTPException(404, "Görsel bulunamadı")

    return FileResponse(filepath, media_type="image/png")

@app.post("/api/feedback")
async def submit_feedback(request: FeedbackRequest):
    """Feedback kaydet ve öğrenmeyi tetikle"""
    try:
        # Generation'ı bul
        gen = db.get_generation(request.job_id)
        if not gen:
            raise HTTPException(404, "Üretim bulunamadı")

        # Feedback kaydet
        feedback_id = learning_manager.record_feedback(
            generation_id=gen.id,
            overall_score=request.overall_score,
            prompt_accuracy=request.prompt_accuracy,
            emotion_accuracy=request.emotion_accuracy,
            composition_score=request.composition_score,
            issues=request.issues,
            notes=request.notes
        )

        return {
            "status": "success",
            "feedback_id": feedback_id,
            "message": "Feedback kaydedildi, öğrenme güncellendi"
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Feedback hatası: {e}")
        raise HTTPException(500, "Feedback kaydedilemedi")

@app.get("/api/learning/stats")
async def get_learning_stats():
    """Öğrenme istatistiklerini getir"""
    try:
        stats = learning_manager.get_learning_stats()
        return stats
    except Exception as e:
        logger.error(f"Öğrenme istatistikleri hatası: {e}")
        return {}

@app.get("/api/feedback/low-score-reasons")
async def get_low_score_reasons():
    """Düşük puan nedenleri listesi - Frontend bu listeyi kullanıcıya gösterir"""
    return {
        "reasons": [
            {"id": "irrelevant_image", "tr": "Alakasız resim üretildi", "en": "Irrelevant image generated"},
            {"id": "wrong_subject", "tr": "Yanlış konu/karakter", "en": "Wrong subject/character"},
            {"id": "bad_quality", "tr": "Düşük görsel kalite", "en": "Low visual quality"},
            {"id": "wrong_style", "tr": "İstenen stil uygulanmadı", "en": "Wrong style applied"},
            {"id": "anatomical_error", "tr": "Anatomi/vücut hatası", "en": "Anatomical/body error"},
            {"id": "wrong_colors", "tr": "Yanlış renkler", "en": "Wrong colors"},
            {"id": "wrong_lighting", "tr": "Yanlış aydınlatma", "en": "Wrong lighting"},
            {"id": "wrong_composition", "tr": "Yanlış kompozisyon", "en": "Wrong composition"},
            {"id": "resolution_issue", "tr": "Çözünürlük sorunu", "en": "Resolution issue"},
            {"id": "other", "tr": "Diğer (açıklama yazın)", "en": "Other (please explain)"}
        ],
        "note": "3 veya altı puan verirseniz neden seçmeniz gerekir"
    }

@app.post("/api/analyze-emotion")
async def analyze_emotion(text: str):
    """Metin duygu analizi"""
    try:
        result = emotion_analyzer.analyze(text)
        return {
            "primary_emotion": result.primary_emotion.value,
            "intensity": result.intensity,
            "secondary_emotions": [
                {"emotion": e.value, "intensity": i}
                for e, i in result.secondary_emotions
            ],
            "confidence": result.confidence,
            "context_notes": result.context_notes,
            "visual_prompt": emotion_analyzer.get_visual_prompt(result),
            "mood_string": emotion_analyzer.get_mood_string(result)
        }
    except Exception as e:
        logger.error(f"Duygu analizi hatası: {e}")
        return {"error": str(e)}

@app.get("/api/images")
async def list_images(limit: int = 50):
    output_dir = Path(CONFIG.output_dir)
    if not output_dir.exists():
        return {"images": []}

    images = []
    for f in sorted(output_dir.glob("*.png"), key=lambda x: x.stat().st_mtime, reverse=True)[:limit]:
        images.append({
            "filename": f.name,
            "url": f"/api/image/{f.name}",
            "size": f.stat().st_size,
            "created": datetime.fromtimestamp(f.stat().st_mtime).isoformat()
        })

    return {"images": images}

@app.post("/api/cleanup")
async def cleanup():
    """Eski dosyaları temizle"""
    removed = 0
    if output_cleaner:
        removed = output_cleaner.cleanup()
    if job_queue:
        job_queue.cleanup_old_jobs()
    return {"removed_files": removed}

# ============== Main ==============

if __name__ == "__main__":
    print("""
╔══════════════════════════════════════════════════════════════════╗
║      GÖRSEL HİKAYE ÜRETİCİ v3.0 - ÖĞRENEN BACKEND                ║
╠══════════════════════════════════════════════════════════════════╣
║  Yenilikler:                                                     ║
║  • SQLite öğrenme sistemi                                        ║
║  • Gelişmiş duygu analizi (sınıf + yoğunluk)                    ║
║  • NSFW/şiddet filtreleme                                        ║
║  • Prompt şişmesi önleme                                         ║
║  • OOM koruması ve otomatik retry                                ║
║  • Feedback tabanlı kalite iyileştirme                           ║
╠══════════════════════════════════════════════════════════════════╣
║  Frontend: http://localhost:5173                                 ║
║  API: http://localhost:8765                                      ║
║  Docs: http://localhost:8765/docs                                ║
╚══════════════════════════════════════════════════════════════════╝
    """)

    uvicorn.run(
        app,
        host=CONFIG.host,
        port=CONFIG.port,
        log_level="info"
    )
