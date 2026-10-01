import { query } from "./db";

export async function runDatabaseMigrations() {
  try {
    // 1. Enable pgvector extension
    await query(`CREATE EXTENSION IF NOT EXISTS vector;`);

    // 2. Create persons table
    await query(`
      CREATE TABLE IF NOT EXISTS persons (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        person_id TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'student',
        email TEXT,
        photo_url TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Create face_profiles table with pgvector embedding vector(512)
    await query(`
      CREATE TABLE IF NOT EXISTS face_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        person_id TEXT NOT NULL REFERENCES persons(person_id) ON DELETE CASCADE ON UPDATE CASCADE,
        embedding vector(512),
        model_name TEXT NOT NULL DEFAULT 'InceptionResnetV1_VGGFace2',
        embedding_dimension INT NOT NULL DEFAULT 512,
        quality_score INT DEFAULT 90,
        verification_method TEXT NOT NULL DEFAULT 'MTCNN_INCEPTIONRESNET_512D',
        liveness_status TEXT DEFAULT 'LIVE',
        source_image_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 4. Create attendance_sessions table
    await query(`
      CREATE TABLE IF NOT EXISTS attendance_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        end_time TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 5. Create attendance_records table with UNIQUE(session_id, person_id) constraint
    await query(`
      CREATE TABLE IF NOT EXISTS attendance_records (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id TEXT NOT NULL REFERENCES attendance_sessions(session_id) ON DELETE CASCADE ON UPDATE CASCADE,
        person_id TEXT NOT NULL REFERENCES persons(person_id) ON DELETE CASCADE ON UPDATE CASCADE,
        confidence FLOAT NOT NULL DEFAULT 95.0,
        distance FLOAT,
        recognition_method TEXT NOT NULL DEFAULT 'BIOMETRIC_FACE_RECOGNITION',
        liveness_status TEXT NOT NULL DEFAULT 'LIVE',
        marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        source TEXT DEFAULT 'KIOSK_CAMERA',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT unique_session_person UNIQUE (session_id, person_id)
      );
    `);

    // 6. Create recognition_events audit table
    await query(`
      CREATE TABLE IF NOT EXISTS recognition_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id TEXT,
        person_id TEXT,
        faces_detected INT NOT NULL DEFAULT 0,
        recognized BOOLEAN NOT NULL DEFAULT FALSE,
        confidence FLOAT DEFAULT 0.0,
        distance FLOAT,
        liveness_score FLOAT,
        quality_score INT,
        model_name TEXT DEFAULT 'InceptionResnetV1_VGGFace2',
        status TEXT NOT NULL,
        failure_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log("[MIGRATIONS] PostgreSQL + pgvector schema verified successfully!");
    return true;
  } catch (err) {
    console.error("[MIGRATIONS ERROR] Failed to run migrations:", err);
    return false;
  }
}
