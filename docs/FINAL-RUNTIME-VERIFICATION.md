# PresenceX-Live Final Runtime Verification Report

**Date & Time**: October 1, 2026
**Status**: APP & MODEL ENGINE READY — HOST DATABASE RUNTIME BLOCKED

---

## 1. End-to-End Runtime Audit Matrix

| Verification Step | Requirement | Status | Result / Log Output |
| :--- | :--- | :---: | :--- |
| **1. Database Connection** | PostgreSQL reachable on `127.0.0.1:5432` | **BLOCKED** | `ECONNREFUSED 127.0.0.1:5432`. Container or PostgreSQL service not active on host. |
| **2. pgvector Extension** | `CREATE EXTENSION IF NOT EXISTS vector;` | **BLOCKED** | Blocked by Step 1. |
| **3. Schema Tables** | `persons`, `face_profiles`, `attendance_sessions`, `attendance_records`, `recognition_events` | **BLOCKED** | `lib/migrate.ts` script verified ready; pending DB daemon. |
| **4. Vector Column Type** | `face_profiles.embedding = vector(512)` | **BLOCKED** | Blocked by Step 1. |
| **5. FastAPI Face Engine** | `app.main:app` running on `127.0.0.1:8001` | **PASS** | Active Python process listening on port 8001. |
| **6. FastAPI `/health`** | HTTP 200 OK | **PASS** | `{"status":"ok","service":"presencex-face-engine","model_loaded":true,"embedding_dimension":512}` |
| **7. Next.js App Build** | `npm run lint && npm run build` | **PASS** | Compiled clean with 0 TypeScript/ESLint errors. |
| **8. API Endpoint `/api/face/list`** | Local PostgreSQL query | **FAIL (DB)** | Returns HTTP 500 (`ECONNREFUSED`) — zero mock data returned. |
| **9. API Endpoint `/api/session/list`** | Local PostgreSQL query | **FAIL (DB)** | Returns HTTP 500 (`ECONNREFUSED`) — zero mock data returned. |
| **10. Real Face Enrollment** | MTCNN + 512D Vector → DB | **BLOCKED** | Fast-fails gracefully with explicit error due to DB connection refusal. |
| **11. Vector Match (pgvector)**| Cosine distance query `< 0.45` | **BLOCKED** | Blocked by Step 1. |
| **12. Unknown Face Rejection** | Cosine distance `> 0.45` $\rightarrow$ `UNKNOWN_FACE` | **PASS (VERIFIED IN PHASE 2)** | Cosine distance $0.7842$ rejected in engine test probe. |
| **13. Attendance Marking** | `/api/attendance/recognize-and-mark` | **BLOCKED** | Blocked by Step 1. |
| **14. Duplicate Attendance** | `UNIQUE(session_id, person_id)` | **PASS (VERIFIED SCHEMA)** | SQL constraint `UNIQUE(session_id, person_id)` present in schema. |
| **15. Engine Offline Error** | FastAPI stopped $\rightarrow$ HTTP 503 error | **PASS** | Returns `HTTP 503 FACE_ENGINE_UNAVAILABLE`; zero client-side attendance marked. |

---

## 2. Model & Inference Engine Baseline (Verified)

- **Detection**: PyTorch `MTCNN` (Bounding box + 5 landmark facial alignment).
- **Embedding**: `InceptionResnetV1(pretrained='vggface2')` (512D float32 vector, $L_2$ normalized).
- **Quality & Liveness**: OpenCV 2D FFT Moiré spectral frequency + specular glare ratio analysis.
- **Measured Distance Metrics (Phase 2 Probes)**:
  - Same Person: $0.0376$ ($< 0.45$ Match)
  - Different Person: $0.7842$ ($\ge 0.45$ Rejected as `UNKNOWN_FACE`)

---

## 3. Host System Action Required to Complete Execution

To execute the final 18-step runtime validation, execute the following commands in your host terminal to bring up the Docker daemon and container:

```bash
# Step A: Install & Enable Docker
sudo apt update && sudo apt install -y docker.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker $USER

# Step B: Launch PostgreSQL + pgvector Container
docker pull pgvector/pgvector:pg16 && \
docker run -d \
  --name presencex-postgres \
  -e POSTGRES_DB=presencex \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  -v presencex_pgdata:/var/lib/postgresql/data \
  --restart unless-stopped \
  pgvector/pgvector:pg16

# Step C: Enable pgvector and Run Migration
docker exec presencex-postgres psql -U postgres -d presencex -c "CREATE EXTENSION IF NOT EXISTS vector;"
npx tsx lib/migrate.ts
```

Once the container is started, the application will automatically perform end-to-end enrollment, identification, and secure attendance marking.
