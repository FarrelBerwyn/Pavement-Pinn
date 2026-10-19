"""trust_gate.py - rule checks for Module A (calibrate thresholds on your own data)."""
import math
import cv2
import numpy as np

def _gray640(img_bgr):
    h, w = img_bgr.shape[:2]
    s = 640.0 / max(h, w)
    small = cv2.resize(img_bgr, (int(w * s), int(h * s)), interpolation=cv2.INTER_AREA)
    return cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)

def blur_variance(img_bgr):
    return float(cv2.Laplacian(_gray640(img_bgr), cv2.CV_64F).var())

def brightness(img_bgr):
    g = _gray640(img_bgr)
    return float(g.mean()), float(np.percentile(g, 5)), float(np.percentile(g, 95))

def phash64(img_bgr):
    g = cv2.resize(cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY), (32, 32), interpolation=cv2.INTER_AREA).astype(np.float32)
    d = cv2.dct(g)[:8, :8].flatten()
    med = np.median(d[1:])
    return int("".join("1" if v > med else "0" for v in d), 2)

def hamming(a, b):
    return bin(a ^ b).count("1")

def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    h = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * R * math.asin(math.sqrt(h))

def decide(blur_var, mean_b, in_corridor, gps_acc_m, p_road=None, tau_blur=60.0):
    reasons = []
    if blur_var < tau_blur: reasons.append("foto buram")
    if not (40 <= mean_b <= 220): reasons.append("terlalu gelap/terang")
    if not in_corridor: reasons.append("di luar koridor")
    if reasons: return "REJECT", reasons
    if gps_acc_m > 30: return "REVIEW", ["akurasi GPS rendah"]
    if p_road is not None and p_road < 0.7:
        return ("REJECT", ["bukan foto jalan"]) if p_road < 0.4 else ("REVIEW", ["adegan meragukan"])
    return "ACCEPT", []
