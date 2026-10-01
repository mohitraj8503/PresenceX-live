import torch
from facenet_pytorch import MTCNN, InceptionResnetV1
from PIL import Image
import numpy as np
import cv2
from typing import List, Tuple, Dict, Any

class BiometricEngine:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        # MTCNN for multi-face detection & 5-point landmark alignment
        self.mtcnn = MTCNN(keep_all=True, device=self.device, post_process=True)
        # InceptionResnetV1 pretrained on VGGFace2 generating 512-D L2-normalized embeddings
        self.embedder = InceptionResnetV1(pretrained='vggface2').eval().to(self.device)

    def detect_and_embed(self, pil_img: Image.Image) -> List[Dict[str, Any]]:
        """
        Detects all faces in image, crops/aligns them, and computes normalized 512D embeddings.
        Returns list of dicts: { bbox, cropped_pil, embedding, confidence }
        """
        w, h = pil_img.size
        boxes, probs = self.mtcnn.detect(pil_img)
        
        results = []
        if boxes is None or len(boxes) == 0:
            return results

        # Process each detected face crop
        faces = self.mtcnn(pil_img)
        if faces is None:
            return results

        for i, box in enumerate(boxes):
            prob = float(probs[i]) if probs is not None else 0.90
            if prob < 0.85:
                continue

            x1, y1, x2, y2 = [int(b) for b in box]
            x1, y1 = max(0, x1), max(0, y1)
            x2, y2 = min(w, x2), min(h, y2)
            bw, bh = x2 - x1, y2 - y1

            # Require face to be at least 40x40 pixels to count as valid enrollment/recognition face
            if bw < 40 or bh < 40:
                continue

            # Extract tensor crop for InceptionResnetV1
            face_tensor = faces[i].unsqueeze(0).to(self.device)
            with torch.no_grad():
                raw_emb = self.embedder(face_tensor).cpu().numpy()[0]
                # L2 normalize
                norm = np.linalg.norm(raw_emb)
                norm_emb = (raw_emb / norm).tolist() if norm > 0 else raw_emb.tolist()

            # PIL crop for OpenCV quality and liveness processing
            crop_pil = pil_img.crop((x1, y1, x2, y2))

            results.append({
                "bbox": {"x": x1, "y": y1, "w": bw, "h": bh},
                "confidence": round(prob, 4),
                "embedding": norm_emb, # 512-d list
                "crop_pil": crop_pil,
                "crop_cv": cv2.cvtColor(np.array(crop_pil), cv2.COLOR_RGB2BGR)
            })

        return results

biometric_engine = BiometricEngine()
