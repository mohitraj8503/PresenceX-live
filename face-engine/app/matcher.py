import psycopg2
from psycopg2.extras import RealDictCursor
import numpy as np
from typing import Optional, List, Dict, Any
from app.config import settings

def get_db_connection():
    return psycopg2.connect(settings.DATABASE_URL)

def check_duplicate_face(query_embedding: List[float], exclude_person_id: Optional[str] = None, threshold: float = 0.35) -> Optional[Dict[str, Any]]:
    """
    Checks if a newly uploaded face embedding belongs to a different person already registered.
    Prevents assigning the same face to multiple person IDs.
    """
    vec_str = str(query_embedding)
    sql = """
    SELECT fp.person_id, p.full_name, (fp.embedding <=> %s::vector) AS distance
    FROM face_profiles fp
    JOIN persons p ON fp.person_id = p.person_id
    WHERE (%s IS NULL OR fp.person_id != %s)
    ORDER BY fp.embedding <=> %s::vector ASC
    LIMIT 1;
    """
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (vec_str, exclude_person_id, exclude_person_id, vec_str))
            row = cur.fetchone()
            if row and float(row["distance"]) <= threshold:
                return {
                    "is_duplicate": True,
                    "existing_person_id": row["person_id"],
                    "existing_full_name": row["full_name"],
                    "distance": round(float(row["distance"]), 4)
                }
            return {"is_duplicate": False}
    finally:
        conn.close()

def search_nearest_embedding(query_embedding: List[float], threshold: float = None) -> Optional[Dict[str, Any]]:
    """
    Executes pgvector cosine distance search:
    SELECT person_id, (embedding <=> query_vec) AS distance FROM face_profiles
    """
    if threshold is None:
        threshold = settings.FACE_MATCH_THRESHOLD

    vec_str = str(query_embedding)

    sql = """
    SELECT fp.person_id, p.full_name, p.role, (fp.embedding <=> %s::vector) AS distance
    FROM face_profiles fp
    JOIN persons p ON fp.person_id = p.person_id
    ORDER BY fp.embedding <=> %s::vector ASC
    LIMIT 5;
    """

    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, (vec_str, vec_str))
            rows = cur.fetchall()
            if rows:
                best_row = rows[0]
                dist = float(best_row["distance"])
                if dist <= threshold:
                    confidence = round(float((1.0 - dist) * 100), 2)
                    return {
                        "person_id": best_row["person_id"],
                        "full_name": best_row["full_name"],
                        "role": best_row["role"],
                        "distance": round(dist, 4),
                        "confidence": confidence,
                        "matched": True
                    }
                else:
                    return {
                        "person_id": None,
                        "full_name": "Unknown",
                        "role": "none",
                        "distance": round(dist, 4),
                        "confidence": 0.0,
                        "matched": False
                    }
            return None
    finally:
        conn.close()

def save_face_profile(person_id: str, embedding: List[float], model_name: str, quality_score: int, liveness_status: str) -> bool:
    vec_str = str(embedding)
    sql = """
    INSERT INTO face_profiles (person_id, embedding, model_name, embedding_dimension, quality_score, liveness_status)
    VALUES (%s, %s::vector, %s, 512, %s, %s);
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, (person_id, vec_str, model_name, quality_score, liveness_status))
        conn.commit()
        return True
    finally:
        conn.close()

def upsert_person(person_id: str, full_name: str, role: str) -> bool:
    sql = """
    INSERT INTO persons (person_id, full_name, role)
    VALUES (%s, %s, %s)
    ON CONFLICT (person_id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, updated_at = NOW();
    """
    conn = get_db_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, (person_id, full_name, role))
        conn.commit()
        return True
    finally:
        conn.close()
