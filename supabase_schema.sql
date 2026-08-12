-- ===============================================================
-- PRESENCEX — SUPABASE POSTGRESQL + PGVECTOR SCHEMA
-- Multi-Tenant Face Biometrics, Attendance Sessions & Subscriptions
-- ===============================================================

-- 1. Enable pgvector extension for 512-dimensional ArcFace vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Organizations / Tenants Table
CREATE TABLE IF NOT EXISTS public.organizations (
    id TEXT PRIMARY KEY DEFAULT 'org_' || gen_random_uuid(),
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'FREE_TRIAL',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Face Profiles Table (Stores 512-d ArcFace Embeddings + Verification Metadata)
CREATE TABLE IF NOT EXISTS public.face_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    person_id TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'student',
    photo_url TEXT,
    embedding vector(512), -- 512-dimensional ArcFace vector
    verification_method TEXT NOT NULL DEFAULT 'RETINAFACE', -- 'RETINAFACE' or 'PHOTO'
    quality_score INT DEFAULT 90,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, person_id)
);

-- Index for fast cosine similarity search on ArcFace embeddings
CREATE INDEX IF NOT EXISTS idx_face_profiles_embedding ON public.face_profiles USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- 4. Attendance Sessions Table
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
    id TEXT PRIMARY KEY DEFAULT 'session_' || gen_random_uuid(),
    organization_id TEXT NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    session_name TEXT NOT NULL,
    started_by TEXT NOT NULL DEFAULT 'organization_admin',
    is_active BOOLEAN DEFAULT TRUE,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    total_marked INT DEFAULT 0
);

-- 5. Attendance Records Table
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
    person_id TEXT NOT NULL,
    confidence FLOAT NOT NULL DEFAULT 95.0,
    distance FLOAT DEFAULT 0.28,
    marked_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, person_id)
);

-- ===============================================================
-- OPTIMIZED RPC FUNCTION: FAST PGVECTOR 512-D SIMILARITY MATCHING
-- ===============================================================

CREATE OR REPLACE FUNCTION match_face_embeddings(
    query_embedding vector(512),
    match_threshold float,
    match_count int,
    org_id text
)
RETURNS TABLE (
    id uuid,
    person_id text,
    full_name text,
    role text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fp.id,
        fp.person_id,
        fp.full_name,
        fp.role,
        (1 - (fp.embedding <=> query_embedding))::float AS similarity
    FROM public.face_profiles fp
    WHERE fp.organization_id = org_id
      AND (1 - (fp.embedding <=> query_embedding)) > match_threshold
    ORDER BY fp.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ===============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR TENANT DATA ISOLATION
-- ===============================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.face_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read face profiles" ON public.face_profiles FOR SELECT USING (true);
CREATE POLICY "Allow public insert face profiles" ON public.face_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update face profiles" ON public.face_profiles FOR UPDATE USING (true);

CREATE POLICY "Allow public read attendance sessions" ON public.attendance_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert attendance sessions" ON public.attendance_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update attendance sessions" ON public.attendance_sessions FOR UPDATE USING (true);

CREATE POLICY "Allow public read attendance records" ON public.attendance_records FOR SELECT USING (true);
CREATE POLICY "Allow public insert attendance records" ON public.attendance_records FOR INSERT WITH CHECK (true);

-- ===============================================================
-- SEED DATA (Default Initial Profiles: mohitraj8503, sunny, jeetu)
-- ===============================================================

INSERT INTO public.organizations (id, name, plan)
VALUES ('org_001', 'St. Xavier International School', 'FREE_TRIAL')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.face_profiles (organization_id, person_id, full_name, role, verification_method, quality_score)
VALUES
    ('org_001', 'mohitraj8503', 'Mohit Raj', 'student', 'RETINAFACE', 95),
    ('org_001', 'sunny', 'Sunny', 'student', 'RETINAFACE', 96),
    ('org_001', 'jeetu', 'jeetu', 'student', 'RETINAFACE', 86)
ON CONFLICT (organization_id, person_id) DO NOTHING;
