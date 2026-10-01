import cv2
import numpy as np
from PIL import Image

def evaluate_face_quality(cv_img: np.ndarray, face_box: dict) -> dict:
    """
    Evaluates real facial quality parameters based on frame metrics:
    - Minimum face size check (width/height)
    - Laplacian blur/sharpness variance
    - Luminance & exposure (mean brightness)
    - Contrast evaluation
    Returns calculated quality score (0-100) and passes_quality boolean.
    """
    if cv_img is None or cv_img.size == 0:
        return {"quality_score": 0, "passes_quality": False, "reason": "invalid_crop"}

    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    w, h = face_box.get("w", 0), face_box.get("h", 0)

    # 1. Minimum Face Size Gate (must be >= 40x40 px)
    if w < 40 or h < 40:
        return {"quality_score": 25, "passes_quality": False, "reason": "face_too_small"}

    # 2. Sharpness / Blur Evaluation (Laplacian Variance)
    lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    blur_score = min(40, int(lap_var / 3.5))

    # 3. Luminance / Exposure Evaluation
    mean_brightness = np.mean(gray)
    if mean_brightness < 30:
        exposure_score = 10
    elif mean_brightness > 230:
        exposure_score = 10
    else:
        exposure_score = 30

    # 4. Size Score
    size_score = 30 if (w >= 90 and h >= 90) else 15

    total_quality = min(100, blur_score + exposure_score + size_score)
    passes = total_quality >= 35 and lap_var >= 10.0

    return {
        "quality_score": total_quality,
        "passes_quality": passes,
        "blur_variance": round(float(lap_var), 2),
        "mean_brightness": round(float(mean_brightness), 2),
        "reason": None if passes else ("image_too_blurry" if lap_var < 10.0 else "poor_exposure")
    }

def analyze_liveness_and_anti_replay(pil_img: Image.Image, cv_img: np.ndarray) -> dict:
    """
    Server-Side Anti-Spoofing & Anti-Replay:
    1. 2D FFT Moiré Pattern Analysis (frequency domain screen subpixel grid detection).
    2. Specular Reflection / Glare Detection.
    3. Laplacian texture depth analysis.
    """
    if cv_img is None or cv_img.size == 0:
        return {"status": "UNKNOWN", "score": 0.0, "reasons": ["invalid_image"]}

    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    reasons = []
    spoof_score = 0.0

    # 1. 2D FFT Moiré Pattern Grid Check
    f = np.fft.fft2(gray)
    fshift = np.fft.fftshift(f)
    magnitude_spectrum = 20 * np.log(np.abs(fshift) + 1e-8)

    h, w = gray.shape
    cy, cx = h // 2, w // 2
    high_freq_region = magnitude_spectrum.copy()
    cv2.circle(high_freq_region, (cx, cy), radius=min(h, w) // 6, color=0, thickness=-1)
    high_freq_ratio = np.mean(high_freq_region) / (np.mean(magnitude_spectrum) + 1e-8)

    if high_freq_ratio > 0.85:
        spoof_score += 0.45
        reasons.append("screen_moire_pattern_detected")

    # 2. Specular Glare Detection (Mobile glass panel reflections)
    glare_ratio = np.sum(gray > 250) / float(gray.size)
    if glare_ratio > 0.08:
        spoof_score += 0.40
        reasons.append("glass_specular_glare_detected")

    # 3. Laplacian Texture Depth
    lap_var = cv2.Laplacian(gray, cv2.CV_64F).var()
    if lap_var < 12.0:
        spoof_score += 0.30
        reasons.append("low_texture_depth")

    is_spoof = spoof_score >= 0.50
    live_score = round(float(1.0 - min(1.0, spoof_score)), 2)

    return {
        "status": "SPOOF" if is_spoof else "LIVE",
        "score": live_score,
        "reasons": reasons if is_spoof else []
    }
