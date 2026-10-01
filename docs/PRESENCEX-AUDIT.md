# PresenceX-Live — Technical Architecture Audit & Baseline Report (Phase 0)

## A. EXECUTIVE SUMMARY & CURRENT ARCHITECTURE MAP

This document provides a comprehensive technical audit of the **PresenceX-live** repository (`https://github.com/mohitraj8503/PresenceX-live`), identifying current pipeline components, data flows, vulnerabilities, and missing biometrics infrastructure.

### Current System Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│                   Next.js 16 Web Application                │
│ (Client Pages: /kiosk, /admin/register, /admin/face-test)   │
└──────────────────────────────┬──────────────────────────────┘
                               │ FormData Upload (Client Stream Capture)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Next.js API Gateway Layer                │
│  (/api/face/identify, /api/face/register, /api/attendance)  │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
    HTTP POST  │                               │ SQL Queries
               ▼                               ▼
┌──────────────────────────────┐  ┌───────────────────────────┐
│     FastAPI Face Engine      │  │   PostgreSQL + pgvector   │
│   (PyTorch MTCNN + 512D)     │  │  (persons, face_profiles) │
└──────────────────────────────┘  └───────────────────────────┘
```

---

## B. PIPELINE AUDIT BY STAGE

### 1. Frontend Camera & Detection Flow
- **Location**: [`components/face-attendance/CameraCapture.tsx`](file:///home/mohitraj8503/Documents/PresenceX-live-main/components/face-attendance/CameraCapture.tsx)
- **Mechanism**: Captures HTML5 Video frames every 250ms and performs canvas image sampling.
- **Client Heuristic**: Uses an RGB skin-pixel ratio calculation (`r > 35 && g > 20 && b > 10`) to update HUD badges.
- **Biometric Decision**: Does **NOT** make biometric decisions on the client side; raw canvas JPEG blobs are submitted to server endpoints for server-side evaluation.

### 2. Facial Enrollment Flow
- **Location**: [`app/admin/register/page.tsx`](file:///home/mohitraj8503/Documents/PresenceX-live-main/app/admin/register/page.tsx) $\rightarrow$ [`/api/face/register`](file:///home/mohitraj8503/Documents/PresenceX-live-main/app/api/face/register/route.ts)
- **Data Contract**: Accepts `person_id`, `full_name`, `role`, and `image`.
- **Validation**: Requires single-face MTCNN detection, quality evaluation ($\ge 35$), and liveness checks before generating the `512D` vector embedding.
- **Storage**: Inserts metadata into `persons` and float vector arrays into `face_profiles.embedding vector(512)`.

### 3. Facial Identification Flow
- **Location**: [`/api/face/identify`](file:///home/mohitraj8503/Documents/PresenceX-live-main/app/api/face/identify/route.ts) & [`/api/face/identify-multi`](file:///home/mohitraj8503/Documents/PresenceX-live-main/app/api/face/identify-multi/route.ts)
- **Proxy**: Passes request to `FACE_ENGINE_URL` (`http://127.0.0.1:8001`).
- **Vector Search**: Executes pgvector cosine distance search (`SELECT (embedding <=> $1::vector) AS distance ORDER BY distance LIMIT 5`).
- **Threshold**: Compares distance against `FACE_MATCH_THRESHOLD` ($0.45$). If distance $\le 0.45$, status is `recognized`; otherwise `unknown_face`.

### 4. Attendance Marking Flow
- **Location**: [`app/kiosk/page.tsx`](file:///home/mohitraj8503/Documents/PresenceX-live-main/app/kiosk/page.tsx) $\rightarrow$ [`/api/attendance/recognize-and-mark`](file:///home/mohitraj8503/Documents/PresenceX-live-main/app/api/attendance/recognize-and-mark/route.ts)
- **Security Rule**: Does **not** accept client-supplied `person_id` as proof of attendance.
- **Server Execution**:
  1. Validates that `session_id` exists in `attendance_sessions` with `status = 'ACTIVE'`.
  2. Runs server-side MTCNN + InceptionResnetV1 facial identification.
  3. Rejects `SPOOF_DETECTED` or `UNKNOWN_FACE` attempts.
  4. Enforces PostgreSQL `CONSTRAINT unique_session_person UNIQUE (session_id, person_id)` to prevent duplicate entries.
  5. Inserts record into `attendance_records` and logs event to `recognition_events`.

---

## C. KNOWN BUGS, CONFLICTS & REMAINING AUDIT FINDINGS

1. **Database Schema Discrepancy**:
   - `prisma/schema.prisma` defines models without vector fields (`FaceProfile`).
   - `supabase_schema.sql` contains Supabase-specific SQL definitions.
   - **Resolution Required**: Standardize on local PostgreSQL + `pgvector` schema using PostgreSQL native client (`pg`) and clean SQL migrations in Phase 1.
2. **Proxy Deprecation Warning**: Next.js 16 emits a deprecation warning regarding `middleware.ts` vs `proxy`.
3. **Audit Event Logging**: Audit tables (`recognition_events`) require strict parameterization and complete error tracking during offline engine events.

---

## D. RECOMMENDED PHASED IMPLEMENTATION PLAN

- **PHASE 1**: Local PostgreSQL + pgvector Schema Setup & Migration Verification.
- **PHASE 2**: Real Python Face Engine (MTCNN + InceptionResnetV1 512D + 2D FFT Anti-Spoofing).
- **PHASE 3**: Connect Next.js API Layer to Python Engine (Strict 503 Failure Handling).
- **PHASE 4**: Real Biometric Face Enrollment (Single-Face Gate & Vector Insertion).
- **PHASE 5**: Real pgvector Distance Search & Dynamic Threshold Validation.
- **PHASE 6**: Multi-Face Classroom CCTV Vector Recognition.
- **PHASE 7**: Server-Authoritative Secure Attendance Marking & Audit Logs.
- **PHASE 8**: Frontend & Camera Capture UI Integration.
- **PHASE 9**: Database, Security & Code Cleanup.
- **PHASE 10**: Complete End-to-End Verification & Automated Test Suite.
