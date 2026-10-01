import io
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
import numpy as np
import cv2

from app.config import settings
from app.embedder import biometric_engine
from app.liveness import analyze_liveness_and_anti_replay, evaluate_face_quality
from app.matcher import search_nearest_embedding, save_face_profile, upsert_person, check_duplicate_face
from app.schemas import ApiResponse, SingleIdentifyResult, MultiIdentifyResult, RegisterResult, LivenessResult, BBox, MultiFaceItem

app = FastAPI(title="PresenceX AI Biometric Face Engine", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "presencex-face-engine",
        "model_loaded": True,
        "embedding_dimension": settings.EMBEDDING_DIMENSION,
        "model_name": settings.FACE_MODEL_NAME
    }

@app.post("/api/face/identify", response_model=ApiResponse)
async def identify_single_face(
    image: UploadFile = File(...),
    expected_person_id: str = Form(None)
):
    try:
        contents = await image.read()
        pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
        
        detected_faces = biometric_engine.detect_and_embed(pil_img)
        
        if not detected_faces:
            return ApiResponse(
                success=True,
                data=SingleIdentifyResult(
                    status="no_face_detected",
                    person_id=None,
                    full_name="No Face Detected",
                    role="none",
                    confidence=0.0,
                    distance=None,
                    quality_score=0,
                    liveness=LivenessResult(status="UNKNOWN", score=0.0, reasons=["no_face"])
                ).dict()
            )

        face = detected_faces[0]
        liveness = analyze_liveness_and_anti_replay(face["crop_pil"], face["crop_cv"])
        quality_info = evaluate_face_quality(face["crop_cv"], face["bbox"])
        quality = quality_info["quality_score"]

        if liveness["status"] == "SPOOF":
            return ApiResponse(
                success=True,
                data=SingleIdentifyResult(
                    status="spoof_suspected",
                    person_id=None,
                    full_name="Screen / Photo Blocked",
                    role="none",
                    confidence=0.0,
                    distance=None,
                    quality_score=quality,
                    liveness=LivenessResult(**liveness)
                ).dict()
            )

        match_res = search_nearest_embedding(face["embedding"])

        if match_res and match_res["matched"]:
            return ApiResponse(
                success=True,
                data=SingleIdentifyResult(
                    status="recognized",
                    person_id=match_res["person_id"],
                    full_name=match_res["full_name"],
                    role=match_res["role"],
                    confidence=match_res["confidence"],
                    distance=match_res["distance"],
                    quality_score=quality,
                    liveness=LivenessResult(**liveness)
                ).dict()
            )
        else:
            return ApiResponse(
                success=True,
                data=SingleIdentifyResult(
                    status="unknown_face",
                    person_id=None,
                    full_name="Unknown Person",
                    role="none",
                    confidence=0.0,
                    distance=match_res["distance"] if match_res else None,
                    quality_score=quality,
                    liveness=LivenessResult(**liveness)
                ).dict()
            )
    except Exception as e:
        return ApiResponse(success=False, error=str(e))

@app.post("/api/face/identify-multi", response_model=ApiResponse)
async def identify_multi_faces(image: UploadFile = File(...)):
    try:
        contents = await image.read()
        pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
        
        detected_faces = biometric_engine.detect_and_embed(pil_img)
        
        if not detected_faces:
            return ApiResponse(
                success=True,
                data=MultiIdentifyResult(
                    faces_detected=0,
                    recognized_count=0,
                    unknown_count=0,
                    status="NO_FACE",
                    results=[]
                ).dict()
            )

        results_list = []
        recognized_cnt = 0
        unknown_cnt = 0

        for idx, face in enumerate(detected_faces):
            liveness = analyze_liveness_and_anti_replay(face["crop_pil"], face["crop_cv"])
            quality_info = evaluate_face_quality(face["crop_cv"], face["bbox"])
            quality = quality_info["quality_score"]

            if liveness["status"] == "SPOOF":
                results_list.append(MultiFaceItem(
                    face_index=idx,
                    person_id=None,
                    full_name="Screen / Photo Blocked",
                    role="none",
                    status="spoof_suspected",
                    distance=None,
                    confidence=0.0,
                    bbox=BBox(**face["bbox"]),
                    liveness=LivenessResult(**liveness),
                    quality_score=quality
                ))
                unknown_cnt += 1
                continue

            match_res = search_nearest_embedding(face["embedding"])
            if match_res and match_res["matched"]:
                recognized_cnt += 1
                results_list.append(MultiFaceItem(
                    face_index=idx,
                    person_id=match_res["person_id"],
                    full_name=match_res["full_name"],
                    role=match_res["role"],
                    status="recognized",
                    distance=match_res["distance"],
                    confidence=match_res["confidence"],
                    bbox=BBox(**face["bbox"]),
                    liveness=LivenessResult(**liveness),
                    quality_score=quality
                ))
            else:
                unknown_cnt += 1
                results_list.append(MultiFaceItem(
                    face_index=idx,
                    person_id=None,
                    full_name="Unknown Person",
                    role="none",
                    status="unknown",
                    distance=match_res["distance"] if match_res else None,
                    confidence=0.0,
                    bbox=BBox(**face["bbox"]),
                    liveness=LivenessResult(**liveness),
                    quality_score=quality
                ))

        return ApiResponse(
            success=True,
            data=MultiIdentifyResult(
                faces_detected=len(detected_faces),
                recognized_count=recognized_cnt,
                unknown_count=unknown_cnt,
                status="FACES_RECOGNIZED" if recognized_cnt > 0 else "NO_MATCH",
                results=results_list
            ).dict()
        )
    except Exception as e:
        return ApiResponse(success=False, error=str(e))

@app.post("/api/face/register", response_model=ApiResponse)
async def register_face_embedding(
    image: UploadFile = File(...),
    person_id: str = Form(...),
    full_name: str = Form(...),
    role: str = Form("student")
):
    try:
        contents = await image.read()
        pil_img = Image.open(io.BytesIO(contents)).convert("RGB")
        
        detected_faces = biometric_engine.detect_and_embed(pil_img)
        
        if not detected_faces:
            return ApiResponse(success=False, error="no_face_detected")

        if len(detected_faces) > 1:
            # Sort detected faces by bounding box area (width * height) descending
            detected_faces.sort(key=lambda f: f["bbox"]["w"] * f["bbox"]["h"], reverse=True)
            area1 = detected_faces[0]["bbox"]["w"] * detected_faces[0]["bbox"]["h"]
            area2 = detected_faces[1]["bbox"]["w"] * detected_faces[1]["bbox"]["h"]
            
            # If the top 2 faces are within 15% area difference, return ambiguity error
            if (area1 - area2) / float(area1) < 0.15:
                return ApiResponse(
                    success=False,
                    error="multiple_faces_at_similar_distance",
                    message="Multiple faces at similar distance — please keep only the person being enrolled in frame."
                )

        # Use the primary/largest face for enrollment
        face = detected_faces[0]
        liveness = analyze_liveness_and_anti_replay(face["crop_pil"], face["crop_cv"])
        if liveness["status"] == "SPOOF":
            return ApiResponse(success=False, error="spoof_detected")

        quality_info = evaluate_face_quality(face["crop_cv"], face["bbox"])
        if not quality_info["passes_quality"]:
            return ApiResponse(success=False, error=quality_info["reason"] or "face_quality_too_low")

        # Duplicate Face Check against other registered users
        dup_check = check_duplicate_face(face["embedding"], exclude_person_id=person_id)
        if dup_check["is_duplicate"]:
            return ApiResponse(
                success=False,
                error=f"duplicate_face_detected (Matches {dup_check['existing_full_name']})"
            )

        # Save Person & Face Profile Vector to Database
        upsert_person(person_id, full_name, role)
        save_face_profile(
            person_id=person_id,
            embedding=face["embedding"],
            model_name=settings.FACE_MODEL_NAME,
            quality_score=quality_info["quality_score"],
            liveness_status=liveness["status"]
        )

        return ApiResponse(
            success=True,
            data=RegisterResult(
                person_id=person_id,
                full_name=full_name,
                role=role,
                verification_method="MTCNN_INCEPTIONRESNET_512D",
                quality_score=quality_info["quality_score"],
                embedding_dimension=settings.EMBEDDING_DIMENSION,
                message="Face biometric vector successfully stored in PostgreSQL pgvector."
            ).dict()
        )
    except Exception as e:
        return ApiResponse(success=False, error=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=settings.FACE_ENGINE_PORT, reload=True)
