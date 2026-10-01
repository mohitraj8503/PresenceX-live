# PresenceX Biometric Models & Licensing Audit Document

## Selected Models & Frameworks

### 1. Primary Biometric Engine: PyTorch MTCNN + InceptionResnetV1 (VGGFace2)
- **Library**: `facenet-pytorch`
- **Code License**: MIT License
- **Pretrained Weights**: VGGFace2 (InceptionResnetV1)
- **Embedding Output**: 512-Dimensional L2-Normalized Floating-Point Vector (`vector(512)` in PostgreSQL `pgvector`).
- **Usage Scope**: Educational, research, and non-commercial open-source deployment.

### 2. InsightFace Architecture Reference
- **Reference Repository**: [https://github.com/deepinsight/insightface](https://github.com/deepinsight/insightface)
- **Code License**: MIT License
- **Pretrained Weights Note**: InsightFace official pretrained models (e.g. ArcFace LResNet100E-IR) are dual-licensed. While code is MIT, certain pretrained weights carry non-commercial research restrictions.
- **PresenceX Adaptation**: PresenceX utilizes the MIT-licensed InceptionResnetV1 512D architecture for strict vector compatibility while supporting custom-trained ArcFace 512D ONNX models via environment variable `FACE_MODEL_NAME`.

### 3. Anti-Spoofing & Liveness Reference
- **Reference Repositories**:
  - `Smart_Attendance_System` (MIT License): Multi-frame challenge, yaw head movement, and distinct frame anti-replay (`frames_are_distinct()`).
  - `face-anti-spoofing` by yakhyo (Apache-2.0 License): Silent anti-spoofing ONNX inference.
- **PresenceX Anti-Spoofing Strategy**:
  - **Server-Side Passive Liveness**: 2D FFT spectral moiré pattern frequency grid inspection + specular reflection glare ratio analysis.
  - **Anti-Replay**: Frame hashing and distinct image comparison preventing duplicate POST replay attacks.
