from pydantic import BaseModel, Field
from typing import List, Optional, Any

class LivenessResult(BaseModel):
    status: str # "LIVE", "SPOOF", "UNKNOWN"
    score: float
    reasons: List[str] = []

class BBox(BaseModel):
    x: int
    y: int
    w: int
    h: int

class SingleIdentifyResult(BaseModel):
    status: str # "recognized", "unknown_face", "no_face_detected", "spoof_suspected"
    person_id: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    confidence: float = 0.0
    distance: Optional[float] = None
    quality_score: int = 0
    liveness: LivenessResult

class MultiFaceItem(BaseModel):
    face_index: int
    person_id: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    status: str
    distance: Optional[float] = None
    confidence: float = 0.0
    bbox: BBox
    liveness: LivenessResult
    quality_score: int

class MultiIdentifyResult(BaseModel):
    faces_detected: int
    recognized_count: int
    unknown_count: int
    status: str
    results: List[MultiFaceItem]

class RegisterResult(BaseModel):
    person_id: str
    full_name: str
    role: str
    verification_method: str
    quality_score: int
    embedding_dimension: int
    message: str

class ApiResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
