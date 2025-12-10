#!/bin/bash
# ============================================
# Görsel Hikaye Üretici - Linux/macOS Kurulum
# ============================================

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║     GÖRSEL HİKAYE ÜRETİCİ - KURULUM BAŞLIYOR                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# Python kontrolü
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 bulunamadı. Lütfen Python 3.10+ kurun."
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "✓ Python sürümü: $PYTHON_VERSION"

# Virtual environment oluştur
echo ""
echo "📦 Virtual environment oluşturuluyor..."
python3 -m venv venv
source venv/bin/activate

# pip güncelle
pip install --upgrade pip

# GPU algılama
echo ""
echo "🔍 GPU algılanıyor..."

if command -v nvidia-smi &> /dev/null; then
    echo "✓ NVIDIA GPU algılandı"
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader

    echo ""
    echo "📥 PyTorch (CUDA) kuruluyor..."
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
else
    echo "⚠ NVIDIA GPU bulunamadı, CPU modu kullanılacak"

    # Apple Silicon kontrolü
    if [[ $(uname -m) == 'arm64' ]] && [[ $(uname) == 'Darwin' ]]; then
        echo "✓ Apple Silicon algılandı (MPS)"
        pip install torch torchvision
    else
        echo "📥 PyTorch (CPU) kuruluyor..."
        pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
    fi
fi

# Diğer bağımlılıklar
echo ""
echo "📥 Diğer bağımlılıklar kuruluyor..."
pip install -r requirements.txt

# Model ön-indirme (opsiyonel)
echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    KURULUM TAMAMLANDI                        ║"
echo "╠══════════════════════════════════════════════════════════════╣"
echo "║  Sunucuyu başlatmak için:                                    ║"
echo "║                                                              ║"
echo "║  source venv/bin/activate                                    ║"
echo "║  python server.py                                            ║"
echo "║                                                              ║"
echo "║  İlk çalıştırmada model indirilecek (~5-7GB)                 ║"
echo "║  Sonra internet olmadan çalışır.                             ║"
echo "╚══════════════════════════════════════════════════════════════╝"

# Model önceden indirilsin mi?
read -p "Modeli şimdi indirmek ister misiniz? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "📥 Model indiriliyor (bu biraz sürebilir)..."
    python -c "
from diffusers import StableDiffusionPipeline
import torch

print('Model indiriliyor: runwayml/stable-diffusion-v1-5')
pipe = StableDiffusionPipeline.from_pretrained(
    'runwayml/stable-diffusion-v1-5',
    torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
    cache_dir='./models'
)
print('✓ Model indirildi ve hazır!')
"
fi

echo ""
echo "✅ Kurulum tamamlandı!"
