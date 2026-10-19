# PAVEMENT-PINN v3 - reference code (lihat Lampiran B di Dokumen Induk)
Prasyarat: Python 3.11+, numpy, scipy, opencv-python; PyMastic (git clone https://github.com/Mostafa-Nakhaei/PyMastic, Apache-2.0).
Untuk modul AI: torch (XPU bila ada GPU Intel), openvino, nncf, openvino-genai, optimum[openvino], ultralytics.

DIUJI saat penyusunan dokumen: pavement_core.py, test_core.py, trust_gate.py, gen_mlet_dataset.py, mc_life.py
BELUM DIUJI (API terbaru, uji di laptop Intel tim): train_pi_surrogate.py, train_yolo.py, slm_brief.py, bench_tools.py

Mulai:  python test_core.py   (ubah path PyMastic di file bila perlu; harus mencetak "ALL TESTS PASSED")
Catatan: PyMastic iteration=20 (40 menghasilkan NaN untuk struktur tebal); q dalam kPa bila E dalam MPa.
