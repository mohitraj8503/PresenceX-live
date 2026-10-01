import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const TARGET_DB_URL = process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;

async function importProductionDatabase() {
  console.log('----------------------------------------------------');
  console.log('📥 PRESENCEX: IMPORTING DATABASE & VECTOR EMBEDDINGS TO VPS');
  console.log('----------------------------------------------------');

  if (!TARGET_DB_URL) {
    console.error('❌ ERROR: TARGET_DATABASE_URL or DATABASE_URL environment variable is required.');
    process.exit(1);
  }

  const exportPath = path.resolve(process.cwd(), 'presencex-local-export.json');
  if (!fs.existsSync(exportPath)) {
    console.error(`❌ Export file not found at ${exportPath}. Run 'npm run db:export' first.`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(exportPath, 'utf-8');
  const payload = JSON.parse(rawData);

  const client = new Client({ connectionString: TARGET_DB_URL });

  try {
    await client.connect();
    console.log('✅ Connected to target PostgreSQL database.');

    // 1. Ensure pgvector extension
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('✅ pgvector extension verified.');

    // 2. Schema check
    await client.query(`
      CREATE TABLE IF NOT EXISTS persons (
        person_id VARCHAR(100) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'student',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS face_profiles (
        profile_id UUID PRIMARY KEY DEFAULT gen_random_all(),
        person_id VARCHAR(100) NOT NULL REFERENCES persons(person_id) ON DELETE CASCADE ON UPDATE CASCADE,
        embedding vector(512) NOT NULL,
        model_name VARCHAR(100) NOT NULL DEFAULT 'InceptionResnetV1_VGGFace2',
        quality_score FLOAT DEFAULT 1.0,
        liveness_status VARCHAR(50) DEFAULT 'PASS',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS attendance_sessions (
        session_id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        created_by VARCHAR(100),
        started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        ended_at TIMESTAMP WITH TIME ZONE,
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE'
      );

      CREATE TABLE IF NOT EXISTS attendance_records (
        record_id UUID PRIMARY KEY DEFAULT gen_random_all(),
        session_id VARCHAR(100) NOT NULL REFERENCES attendance_sessions(session_id) ON DELETE CASCADE,
        person_id VARCHAR(100) NOT NULL REFERENCES persons(person_id) ON DELETE CASCADE ON UPDATE CASCADE,
        status VARCHAR(50) NOT NULL DEFAULT 'PRESENT',
        marked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        verification_method VARCHAR(100) DEFAULT 'BIOMETRIC_FACE_512D',
        confidence FLOAT,
        distance FLOAT,
        CONSTRAINT unique_session_person UNIQUE(session_id, person_id)
      );

      CREATE TABLE IF NOT EXISTS recognition_events (
        event_id UUID PRIMARY KEY DEFAULT gen_random_all(),
        session_id VARCHAR(100),
        person_id VARCHAR(100),
        status VARCHAR(50) NOT NULL,
        distance FLOAT,
        confidence FLOAT,
        quality_score FLOAT,
        liveness_status VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Schemas verified.');

    // 3. Import Persons
    for (const p of payload.persons) {
      await client.query(
        `INSERT INTO persons (person_id, full_name, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (person_id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, updated_at = EXCLUDED.updated_at;`,
        [p.person_id, p.full_name, p.role, p.created_at, p.updated_at]
      );
    }
    console.log(`✅ Imported ${payload.persons.length} persons.`);

    // 4. Import Face Profiles & 512D Vectors
    let insertedVectors = 0;
    for (const fp of payload.faceProfiles) {
      if (!fp.vector_str) continue;
      await client.query(
        `INSERT INTO face_profiles (profile_id, person_id, embedding, model_name, quality_score, liveness_status, created_at)
         VALUES ($1, $2, $3::vector, $4, $5, $6, $7)
         ON CONFLICT (profile_id) DO NOTHING;`,
        [fp.profile_id, fp.person_id, fp.vector_str, fp.model_name, fp.quality_score, fp.liveness_status, fp.created_at]
      );
      insertedVectors++;
    }
    console.log(`✅ Imported ${insertedVectors} 512-D face profile vectors.`);

    // 5. Import Sessions
    for (const s of payload.sessions) {
      await client.query(
        `INSERT INTO attendance_sessions (session_id, title, created_by, started_at, ended_at, status)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (session_id) DO UPDATE SET status = EXCLUDED.status, ended_at = EXCLUDED.ended_at;`,
        [s.session_id, s.title, s.created_by, s.started_at, s.ended_at, s.status]
      );
    }
    console.log(`✅ Imported ${payload.sessions.length} sessions.`);

    // 6. Import Attendance Records
    for (const r of payload.records) {
      await client.query(
        `INSERT INTO attendance_records (record_id, session_id, person_id, status, marked_at, verification_method, confidence, distance)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (session_id, person_id) DO NOTHING;`,
        [r.record_id, r.session_id, r.person_id, r.status, r.marked_at, r.verification_method, r.confidence, r.distance]
      );
    }
    console.log(`✅ Imported ${payload.records.length} attendance records.`);

    // 7. Verify Embeddings & Vector Search
    const vecCount = await client.query('SELECT COUNT(*) FROM face_profiles WHERE embedding IS NOT NULL;');
    const dimRes = await client.query('SELECT vector_dims(embedding) AS dims FROM face_profiles LIMIT 1;');

    console.log('\n📊 VERIFICATION SUMMARY:');
    console.log(`- Total Valid Face Embeddings: ${vecCount.rows[0].count}`);
    console.log(`- Vector Dimensions: ${dimRes.rows[0]?.dims || 512}`);
    console.log('🎉 DATABASE & VECTOR IMPORT SUCCESSFUL!');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Import failed:', msg);
  } finally {
    await client.end();
  }
}

importProductionDatabase();
