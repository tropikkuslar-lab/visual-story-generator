"""
Görsel Hikaye Üretici - Gelişmiş Yerel Görsel Üretim Backend
=============================================================
Çoklu model desteği, kalite modları, optimize prompt mühendisliği.

Desteklenen Modeller:
- SD 1.5: Hızlı, düşük VRAM (4GB+)
- SDXL: Yüksek kalite (8GB+ VRAM)
- SDXL Turbo: Hızlı yüksek kalite (8GB+)
- SDXL Lightning: Ultra hızlı (8GB+)

Kullanım:
    python server.py
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
from dataclasses import dataclass, asdict, field
from enum import Enum

# FastAPI imports
try:
    from fastapi import FastAPI, HTTPException, BackgroundTasks
    from fastapi.middleware.cors import CORSMiddleware
    from fastapi.staticfiles import StaticFiles
    from fastapi.responses import FileResponse, JSONResponse
    from pydantic import BaseModel
except ImportError:
    print("FastAPI kurulu değil. Kurmak için: pip install fastapi uvicorn")
    sys.exit(1)

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== Configuration ==============

class DeviceMode(str, Enum):
    GPU = "gpu"
    CPU = "cpu"

class QualityMode(str, Enum):
    FAST = "fast"          # 4-8 steps, lower quality, very fast
    BALANCED = "balanced"  # 15-20 steps, good quality
    QUALITY = "quality"    # 25-30 steps, high quality
    ULTRA = "ultra"        # 40+ steps, maximum quality

class ModelType(str, Enum):
    SD15 = "sd15"              # Stable Diffusion 1.5
    SDXL = "sdxl"              # SDXL Base
    SDXL_TURBO = "sdxl_turbo"  # SDXL Turbo (fast)
    SDXL_LIGHTNING = "sdxl_lightning"  # ByteDance SDXL Lightning

# Model configurations
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

# Quality mode settings
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

CONFIG = ServerConfig()

# ============== Prompt Enhancement ==============

class PromptEnhancer:
    """Prompt'ları daha iyi görsel sonuçlar için optimize eder"""

    # Stil bazlı prompt ekleri
    STYLE_ENHANCERS = {
        "cinematic": "cinematic lighting, film grain, dramatic composition, movie scene, 35mm film, anamorphic lens",
        "anime": "anime style, studio ghibli, vibrant colors, detailed illustration, cel shading",
        "comic": "comic book style, bold outlines, halftone dots, dynamic pose, marvel dc style",
        "digital": "digital art, artstation trending, highly detailed, sharp focus, 8k uhd",
        "oil": "oil painting, impressionist, visible brushstrokes, renaissance style, classical art",
        "watercolor": "watercolor painting, soft edges, flowing colors, paper texture, delicate",
        "minimal": "minimalist, clean lines, simple shapes, flat design, modern aesthetic",
        "realistic": "photorealistic, hyperrealistic, ultra detailed, 8k resolution, professional photography"
    }

    # Kalite artırıcı promptlar
    QUALITY_BOOSTERS = [
        "masterpiece",
        "best quality",
        "highly detailed",
        "sharp focus",
        "professional"
    ]

    # Negatif prompt şablonu (istenmeyen öğeler)
    NEGATIVE_PROMPT_BASE = (
        "blurry, low quality, bad anatomy, bad hands, text, error, missing fingers, "
        "extra digit, fewer digits, cropped, worst quality, low resolution, bad composition, "
        "ugly, duplicate, morbid, mutilated, out of frame, mutation, deformed, "
        "watermark, signature, username, jpeg artifacts"
    )

    # Stil bazlı negatif promptlar
    STYLE_NEGATIVES = {
        "anime": "realistic, photograph, 3d render",
        "realistic": "cartoon, anime, illustration, drawing, painting",
        "oil": "digital art, 3d render, photograph",
        "watercolor": "digital art, sharp edges, photograph"
    }

    @classmethod
    def enhance_prompt(
        cls,
        prompt: str,
        style: str = "cinematic",
        quality_mode: QualityMode = QualityMode.BALANCED,
        mood: str = "",
        lighting: str = "",
        add_quality_tags: bool = True
    ) -> str:
        """Prompt'u stil ve kalite için optimize et"""

        parts = []

        # Kalite etiketleri
        if add_quality_tags:
            if quality_mode in [QualityMode.QUALITY, QualityMode.ULTRA]:
                parts.extend(cls.QUALITY_BOOSTERS)
            elif quality_mode == QualityMode.BALANCED:
                parts.extend(cls.QUALITY_BOOSTERS[:3])

        # Ana prompt
        parts.append(prompt.strip())

        # Stil ekle
        style_key = style.lower()
        if style_key in cls.STYLE_ENHANCERS:
            parts.append(cls.STYLE_ENHANCERS[style_key])

        # Mood varsa ekle
        if mood and mood.lower() != "nötr":
            mood_map = {
                "huzurlu": "peaceful atmosphere, serene, calm mood",
                "gerilimli": "tense atmosphere, dramatic, suspenseful",
                "mutlu": "joyful mood, bright, cheerful atmosphere",
                "hüzünlü": "melancholic mood, somber, emotional",
                "romantik": "romantic atmosphere, warm, intimate",
                "gizemli": "mysterious atmosphere, enigmatic, dark",
                "epik": "epic scale, grandiose, majestic"
            }
            if mood.lower() in mood_map:
                parts.append(mood_map[mood.lower()])

        # Işık varsa ekle
        if lighting and lighting.lower() != "doğal":
            light_map = {
                "gündüz - parlak": "bright daylight, sun rays, natural lighting",
                "gün batımı - altın": "golden hour, sunset lighting, warm tones",
                "gece - ay ışığı": "moonlight, night scene, cool blue tones",
                "sisli - atmosferik": "foggy, atmospheric, misty, volumetric lighting",
                "iç mekan - yumuşak": "soft indoor lighting, ambient light",
                "dramatik - kontrast": "dramatic lighting, high contrast, chiaroscuro"
            }
            if lighting.lower() in light_map:
                parts.append(light_map[lighting.lower()])

        return ", ".join(parts)

    @classmethod
    def get_negative_prompt(cls, style: str = "cinematic") -> str:
        """Stil bazlı negatif prompt döndür"""
        negative = cls.NEGATIVE_PROMPT_BASE

        style_key = style.lower()
        if style_key in cls.STYLE_NEGATIVES:
            negative += ", " + cls.STYLE_NEGATIVES[style_key]

        return negative

# ============== Device Detection ==============

class DeviceManager:
    """GPU/CPU otomatik algılama ve yönetim"""

    def __init__(self):
        self.mode: DeviceMode = DeviceMode.CPU
        self.device: str = "cpu"
        self.gpu_info: Optional[str] = None
        self.vram_gb: float = 0
        self._detect_device()

    def _detect_device(self):
        try:
            import torch
            if torch.cuda.is_available():
                self.mode = DeviceMode.GPU
                self.device = "cuda"
                self.gpu_info = torch.cuda.get_device_name(0)
                self.vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
                logger.info(f"GPU algılandı: {self.gpu_info} ({self.vram_gb:.1f}GB VRAM)")
            elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
                self.mode = DeviceMode.GPU
                self.device = "mps"
                self.gpu_info = "Apple Silicon (MPS)"
                self.vram_gb = 8  # Varsayılan
                logger.info(f"Apple Silicon algılandı")
            else:
                self.mode = DeviceMode.CPU
                self.device = "cpu"
                logger.warning("GPU bulunamadı, CPU modunda çalışılacak")
        except ImportError:
            logger.error("PyTorch kurulu değil!")
            self.mode = DeviceMode.CPU
            self.device = "cpu"

    def get_available_models(self) -> List[Dict[str, Any]]:
        """Kullanılabilir modelleri döndür"""
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
        """VRAM'e göre önerilen modeli döndür"""
        if self.vram_gb >= 10:
            return ModelType.SDXL
        elif self.vram_gb >= 8:
            return ModelType.SDXL_TURBO
        else:
            return ModelType.SD15

# ============== Image Generator ==============

class ImageGenerator:
    """Gelişmiş Stable Diffusion görsel üretici"""

    def __init__(self, device_manager: DeviceManager):
        self.device_manager = device_manager
        self.pipes: Dict[ModelType, Any] = {}
        self.current_model: Optional[ModelType] = None
        self.loading = False
        self._lock = threading.Lock()

    def load_model(self, model_type: ModelType, force_reload: bool = False) -> bool:
        """Belirtilen modeli yükle"""
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
            logger.info(f"(İlk seferde indirilecek, sonra offline çalışır)")

            cache_dir = Path(CONFIG.model_cache_dir)
            cache_dir.mkdir(parents=True, exist_ok=True)

            # Dtype seçimi
            if self.device_manager.mode == DeviceMode.GPU:
                dtype = torch.float16
            else:
                dtype = torch.float32

            # Eski modeli temizle (bellek için)
            if self.current_model and self.current_model in self.pipes:
                del self.pipes[self.current_model]
                gc.collect()
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()

            # Model tipine göre pipeline oluştur
            if model_type == ModelType.SD15:
                pipe = StableDiffusionPipeline.from_pretrained(
                    model_id,
                    torch_dtype=dtype,
                    cache_dir=str(cache_dir),
                    safety_checker=None,
                    requires_safety_checker=False
                )
                pipe.scheduler = DPMSolverMultistepScheduler.from_config(
                    pipe.scheduler.config
                )

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
                # SDXL Lightning için base model + LoRA
                from diffusers import UNet2DConditionModel
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
                # Lightning LoRA yükle
                pipe.load_lora_weights(
                    "ByteDance/SDXL-Lightning",
                    weight_name="sdxl_lightning_4step_lora.safetensors",
                    cache_dir=str(cache_dir)
                )
                pipe.fuse_lora()

            # Cihaza taşı
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
            logger.info(f"Model başarıyla yüklendi: {config['name']}")
            return True

        except Exception as e:
            logger.error(f"Model yükleme hatası: {e}")
            import traceback
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
        style: str = "cinematic",
        mood: str = "",
        lighting: str = ""
    ) -> Optional[Dict[str, Any]]:
        """Gelişmiş görsel üretimi"""

        # Model seçimi
        if model_type is None:
            model_type = self.device_manager.get_recommended_model()

        # Model yükle
        if model_type not in self.pipes:
            if not self.load_model(model_type):
                return None

        pipe = self.pipes[model_type]
        config = MODEL_CONFIGS[model_type]

        # Prompt'u zenginleştir
        enhanced_prompt = PromptEnhancer.enhance_prompt(
            prompt=prompt,
            style=style,
            quality_mode=quality_mode,
            mood=mood,
            lighting=lighting
        )

        # Negatif prompt
        if not negative_prompt:
            negative_prompt = PromptEnhancer.get_negative_prompt(style)

        # Kalite ayarları
        quality_config = QUALITY_SETTINGS[quality_mode]

        # Model özel ayarları
        if "fixed_steps" in config:
            steps = config["fixed_steps"]
        else:
            steps = quality_config["steps"]

        if "guidance_scale" in config:
            guidance_scale = config["guidance_scale"]
        else:
            guidance_scale = quality_config["guidance"]

        # Boyut sınırlaması
        max_size = config["max_size"]
        width = min(width, max_size)
        height = min(height, max_size)

        # 8'e bölünebilir olmalı
        width = (width // 8) * 8
        height = (height // 8) * 8

        try:
            import torch

            # Seed
            if seed is None:
                seed = int(time.time() * 1000) % (2**32)

            generator = torch.Generator(device=self.device_manager.device).manual_seed(seed)

            logger.info(f"Görsel üretiliyor:")
            logger.info(f"  Model: {config['name']}")
            logger.info(f"  Boyut: {width}x{height}")
            logger.info(f"  Steps: {steps}")
            logger.info(f"  Prompt: {enhanced_prompt[:100]}...")

            start_time = time.time()

            # Üretim
            result = pipe(
                prompt=enhanced_prompt,
                negative_prompt=negative_prompt,
                width=width,
                height=height,
                num_inference_steps=steps,
                guidance_scale=guidance_scale,
                generator=generator
            )

            image = result.images[0]

            # Kaydet
            output_dir = Path(CONFIG.output_dir)
            output_dir.mkdir(parents=True, exist_ok=True)

            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"scene_{timestamp}_{seed}.png"
            filepath = output_dir / filename

            image.save(filepath, quality=95)

            elapsed = time.time() - start_time
            logger.info(f"Görsel üretildi: {filename} ({elapsed:.1f}s)")

            return {
                "filepath": str(filepath),
                "filename": filename,
                "seed": seed,
                "model": config["name"],
                "enhanced_prompt": enhanced_prompt,
                "negative_prompt": negative_prompt,
                "width": width,
                "height": height,
                "steps": steps,
                "guidance_scale": guidance_scale,
                "generation_time": round(elapsed, 2)
            }

        except Exception as e:
            logger.error(f"Görsel üretim hatası: {e}")
            import traceback
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
    mood: str = ""
    lighting: str = ""
    status: str = "pending"
    result: Optional[Dict] = None
    error: Optional[str] = None
    created_at: str = ""
    completed_at: Optional[str] = None

class JobQueue:
    """İş kuyruğu"""

    def __init__(self, generator: ImageGenerator, max_size: int = 10):
        self.generator = generator
        self.queue: queue.Queue = queue.Queue(maxsize=max_size)
        self.jobs: Dict[str, GenerationJob] = {}
        self.worker_thread: Optional[threading.Thread] = None
        self._lock = threading.Lock()

    def start_worker(self):
        if self.worker_thread is None or not self.worker_thread.is_alive():
            self.worker_thread = threading.Thread(target=self._worker_loop, daemon=True)
            self.worker_thread.start()
            logger.info("İş kuyruğu işçisi başlatıldı")

    def _worker_loop(self):
        while True:
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

        try:
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
                style=job.style,
                mood=job.mood,
                lighting=job.lighting
            )

            with self._lock:
                if result:
                    job.status = "completed"
                    job.result = result
                else:
                    job.status = "failed"
                    job.error = "Görsel üretilemedi"
                job.completed_at = datetime.now().isoformat()

        except Exception as e:
            with self._lock:
                job.status = "failed"
                job.error = str(e)
                job.completed_at = datetime.now().isoformat()

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

# ============== API ==============

app = FastAPI(
    title="Görsel Hikaye Üretici API",
    description="Gelişmiş yerel Stable Diffusion görsel üretim servisi",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
device_manager: Optional[DeviceManager] = None
generator: Optional[ImageGenerator] = None
job_queue: Optional[JobQueue] = None

# Pydantic models
class GenerateRequest(BaseModel):
    prompt: str
    negative_prompt: str = ""
    width: int = 512
    height: int = 512
    steps: int = 25
    guidance_scale: float = 7.5
    seed: Optional[int] = None
    aspect_ratio: Optional[str] = None
    model: Optional[str] = None
    quality_mode: str = "balanced"
    style: str = "cinematic"
    mood: str = ""
    lighting: str = ""

class JobResponse(BaseModel):
    job_id: str
    status: str
    message: str

@app.on_event("startup")
async def startup():
    global device_manager, generator, job_queue

    logger.info("=" * 60)
    logger.info("   GÖRSEL HİKAYE ÜRETİCİ v2.0 - GELİŞMİŞ BACKEND")
    logger.info("=" * 60)

    device_manager = DeviceManager()
    generator = ImageGenerator(device_manager)
    job_queue = JobQueue(generator, max_size=CONFIG.max_queue_size)
    job_queue.start_worker()

    Path(CONFIG.output_dir).mkdir(parents=True, exist_ok=True)

    logger.info(f"Sunucu hazır: http://localhost:{CONFIG.port}")
    logger.info(f"Mod: {device_manager.mode.value.upper()}")
    if device_manager.gpu_info:
        logger.info(f"GPU: {device_manager.gpu_info} ({device_manager.vram_gb:.1f}GB)")

@app.get("/")
async def root():
    return {
        "service": "Görsel Hikaye Üretici v2.0",
        "status": "online",
        "mode": device_manager.mode.value if device_manager else "unknown"
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

    return {
        "device": {
            "mode": device_manager.mode.value if device_manager else "unknown",
            "device": device_manager.device if device_manager else "unknown",
            "gpu_info": device_manager.gpu_info if device_manager else None,
            "vram_gb": round(device_manager.vram_gb, 1) if device_manager else 0
        },
        "model": {
            "loaded": model_loaded,
            "loading": generator.loading if generator else False,
            "name": current_model,
            "available_models": models,
            "recommended": recommended.value
        },
        "queue": queue_status,
        "quality_modes": [
            {"id": m.value, "desc": QUALITY_SETTINGS[m]["desc"]}
            for m in QualityMode
        ],
        "recommended_settings": {
            "steps": QUALITY_SETTINGS[QualityMode.BALANCED]["steps"],
            "width": MODEL_CONFIGS[recommended]["default_size"],
            "height": MODEL_CONFIGS[recommended]["default_size"],
            "estimated_time": "15-30 saniye" if device_manager and device_manager.mode == DeviceMode.GPU else "2-5 dakika"
        },
        "offline_ready": model_loaded
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
        "message": "Model yükleniyor (ilk seferde indirilecek)"
    }

@app.post("/api/generate", response_model=JobResponse)
async def generate_image(request: GenerateRequest):
    if not job_queue:
        raise HTTPException(500, "Kuyruk başlatılmadı")

    # Aspect ratio'dan boyut hesapla
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

    job_id = f"job_{int(time.time() * 1000)}"
    job = GenerationJob(
        job_id=job_id,
        prompt=request.prompt,
        negative_prompt=request.negative_prompt,
        width=width,
        height=height,
        steps=request.steps,
        guidance_scale=request.guidance_scale,
        seed=request.seed,
        model_type=request.model,
        quality_mode=request.quality_mode,
        style=request.style,
        mood=request.mood,
        lighting=request.lighting,
        created_at=datetime.now().isoformat()
    )

    if not job_queue.add_job(job):
        raise HTTPException(429, "Kuyruk dolu, lütfen bekleyin")

    queue_status = job_queue.get_queue_status()

    return JobResponse(
        job_id=job_id,
        status="queued",
        message=f"İş kuyruğa eklendi (sıra: {queue_status['pending']})"
    )

@app.get("/api/job/{job_id}")
async def get_job_status(job_id: str):
    if not job_queue:
        raise HTTPException(500, "Kuyruk başlatılmadı")

    job = job_queue.get_job(job_id)
    if not job:
        raise HTTPException(404, "İş bulunamadı")

    response = asdict(job)

    if job.status == "completed" and job.result:
        response["image_url"] = f"/api/image/{job.result['filename']}"
        response["generation_info"] = {
            "model": job.result.get("model"),
            "seed": job.result.get("seed"),
            "enhanced_prompt": job.result.get("enhanced_prompt"),
            "generation_time": job.result.get("generation_time")
        }

    return response

@app.get("/api/image/{filename}")
async def get_image(filename: str):
    filepath = Path(CONFIG.output_dir) / filename
    if not filepath.exists():
        raise HTTPException(404, "Görsel bulunamadı")
    return FileResponse(filepath, media_type="image/png")

@app.get("/api/images")
async def list_images():
    output_dir = Path(CONFIG.output_dir)
    if not output_dir.exists():
        return {"images": []}

    images = []
    for f in sorted(output_dir.glob("*.png"), key=lambda x: x.stat().st_mtime, reverse=True):
        images.append({
            "filename": f.name,
            "url": f"/api/image/{f.name}",
            "size": f.stat().st_size,
            "created": datetime.fromtimestamp(f.stat().st_mtime).isoformat()
        })

    return {"images": images[:50]}

# ============== Main ==============

if __name__ == "__main__":
    import uvicorn

    print("""
╔══════════════════════════════════════════════════════════════════╗
║      GÖRSEL HİKAYE ÜRETİCİ v2.0 - GELİŞMİŞ YEREL BACKEND         ║
╠══════════════════════════════════════════════════════════════════╣
║  Özellikler:                                                     ║
║  • Çoklu model: SD 1.5, SDXL, SDXL Turbo, SDXL Lightning        ║
║  • Akıllı prompt zenginleştirme                                  ║
║  • Kalite modları: Hızlı, Dengeli, Kaliteli, Ultra              ║
║  • Stil bazlı optimizasyon                                       ║
╠══════════════════════════════════════════════════════════════════╣
║  Frontend: http://localhost:5173                                 ║
║  API: http://localhost:8765                                      ║
╚══════════════════════════════════════════════════════════════════╝
    """)

    uvicorn.run(
        app,
        host=CONFIG.host,
        port=CONFIG.port,
        log_level="info"
    )
