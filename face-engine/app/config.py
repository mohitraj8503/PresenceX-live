import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/presencex")
    FACE_MATCH_THRESHOLD: float = float(os.getenv("FACE_MATCH_THRESHOLD", "0.45"))
    FACE_ENGINE_PORT: int = int(os.getenv("FACE_ENGINE_PORT", "8001"))
    FACE_MODEL_NAME: str = os.getenv("FACE_MODEL_NAME", "InceptionResnetV1_VGGFace2")
    EMBEDDING_DIMENSION: int = 512

    class Config:
        env_file = ".env"

settings = Settings()
