@echo off
REM ============================================
REM Görsel Hikaye Üretici - Windows Kurulum
REM ============================================

echo ══════════════════════════════════════════════════════════════
echo      GÖRSEL HİKAYE ÜRETİCİ - KURULUM BAŞLIYOR
echo ══════════════════════════════════════════════════════════════

REM Python kontrolü
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python bulunamadı. Lütfen Python 3.10+ kurun.
    echo    https://www.python.org/downloads/
    pause
    exit /b 1
)

for /f "tokens=2" %%i in ('python --version') do set PYTHON_VERSION=%%i
echo ✓ Python sürümü: %PYTHON_VERSION%

REM Virtual environment oluştur
echo.
echo 📦 Virtual environment oluşturuluyor...
python -m venv venv
call venv\Scripts\activate.bat

REM pip güncelle
python -m pip install --upgrade pip

REM GPU algılama
echo.
echo 🔍 GPU algılanıyor...

nvidia-smi >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ NVIDIA GPU algılandı
    nvidia-smi --query-gpu=name,memory.total --format=csv,noheader

    echo.
    echo 📥 PyTorch (CUDA) kuruluyor...
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
) else (
    echo ⚠ NVIDIA GPU bulunamadı, CPU modu kullanılacak
    echo 📥 PyTorch (CPU) kuruluyor...
    pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
)

REM Diğer bağımlılıklar
echo.
echo 📥 Diğer bağımlılıklar kuruluyor...
pip install -r requirements.txt

echo.
echo ══════════════════════════════════════════════════════════════
echo                     KURULUM TAMAMLANDI
echo ══════════════════════════════════════════════════════════════
echo.
echo   Sunucuyu başlatmak için:
echo.
echo   venv\Scripts\activate.bat
echo   python server.py
echo.
echo   İlk çalıştırmada model indirilecek (~5-7GB)
echo   Sonra internet olmadan çalışır.
echo.
echo ══════════════════════════════════════════════════════════════

REM Model önceden indirilsin mi?
set /p DOWNLOAD_MODEL="Modeli şimdi indirmek ister misiniz? (y/n): "
if /i "%DOWNLOAD_MODEL%"=="y" (
    echo.
    echo 📥 Model indiriliyor (bu biraz sürebilir)...
    python -c "from diffusers import StableDiffusionPipeline; import torch; print('Model indiriliyor...'); pipe = StableDiffusionPipeline.from_pretrained('runwayml/stable-diffusion-v1-5', torch_dtype=torch.float16 if torch.cuda.is_available() else torch.float32, cache_dir='./models'); print('Model indirildi!')"
)

echo.
echo ✅ Kurulum tamamlandı!
pause
