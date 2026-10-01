# PresenceX AI Face Engine Microservice

High-performance Python FastAPI biometric microservice running PyTorch MTCNN (5-point landmark face detection & canonical alignment) and InceptionResnetV1 (VGGFace2 512-dimensional vector embedding extraction).

## Features
- **MTCNN Face Detector**: Detects faces, crops, and aligns eye/nose/mouth coordinates.
- **512-D L2-Normalized Vector Embeddings**: InceptionResnetV1 feature vectors stored directly in PostgreSQL using `pgvector`.
- **Dual-Layer Anti-Spoofing & Liveness**: 2D FFT Moiré pattern frequency analysis and specular glass glare detection.
- **FastAPI Endpoints**: High-throughput async single and multi-face recognition routes.

## How to Run
```bash
cd face-engine
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8001
```
