# Phase 3 Connectivity Debug & Root Cause Analysis

**Date**: October 1, 2026
**Status**: DIAGNOSED & ENGINE LAUNCHED (DB BLOCKER IDENTIFIED)

---

## Component Health Diagnostic Matrix

| Component | Status | Detailed Finding / Diagnostics |
| :--- | :---: | :--- |
| **PostgreSQL Database** | **FAIL (BLOCKER)** | Connection refused on `127.0.0.1:5432`. Neither `docker` binary nor `postgresql` system service is running/available on host. |
| **pgvector Extension** | **FAIL (BLOCKED)** | Cannot verify vector schema until PostgreSQL daemon is started on port `5432`. |
| **FastAPI Face Engine** | **PASS** | Successfully launched on `http://127.0.0.1:8001` (Process active in background). |
| **FastAPI `/health`** | **PASS** | Returns `{"status":"ok", "model_loaded":true, "embedding_dimension":512, "model_name":"InceptionResnetV1_VGGFace2"}`. |
| **Next.js → FastAPI** | **PASS** | Next.js API client in `lib/faceEngine.ts` configured for `http://127.0.0.1:8001`. Engine reachability restored. |
| **`/api/face/list`** | **FAIL (DB DEPENDENT)** | Returns HTTP 500 (`ECONNREFUSED 127.0.0.1:5432`) because local PostgreSQL is unreachable. |
| **`/api/session/list`** | **FAIL (DB DEPENDENT)** | Returns HTTP 500 (`ECONNREFUSED 127.0.0.1:5432`) because local PostgreSQL is unreachable. |
| **`/api/face/register`** | **FAIL (DB DEPENDENT)** | Fast-fails gracefully: FastAPI embedding succeeds, but storage to PostgreSQL fails due to DB offline. |

---

## Detailed Root Cause Analysis

### 1. Root Cause of `face_engine_unreachable`
- **Cause**: The Python FastAPI service was not running on `127.0.0.1:8001`.
- **Resolution**: Launched FastAPI background daemon (`python3 -m uvicorn app.main:app --host 127.0.0.1 --port 8001`). Verified active health response:
  ```json
  {
    "status": "ok",
    "service": "presencex-face-engine",
    "model_loaded": true,
    "embedding_dimension": 512,
    "model_name": "InceptionResnetV1_VGGFace2"
  }
  ```

### 2. Root Cause of HTTP 500 on `/api/face/list` & `/api/session/list`
- **Cause**: PostgreSQL daemon on `localhost:5432` is not active (`connect ECONNREFUSED 127.0.0.1:5432`).
- **Required Action**: The user must start PostgreSQL or a Docker container with `pgvector` enabled on port `5432`.

### 3. UI Fix for Registration Page
- **Issue**: Enrollment portal was showing `Periodic 60s Checkpoint Engine • Next in 59s`.
- **Fix**: Updated `app/admin/register/page.tsx` to pass `mode="single"` to `CameraCapture`. The 60-second periodic timer is now strictly isolated to Kiosk mode (`mode="kiosk"`). The registration portal displays `"Live Camera Ready for Face Enrollment"` with a manual `"📷 Capture Face"` action button.

---

## Verification Commands for User

Once PostgreSQL is started on port 5432:

```bash
# 1. Run database migrations
npx tsx lib/migrate.ts

# 2. Test Next.js application
npm run dev
```

---

**Phase 3 Debug documentation complete. Standing by for database availability.**
