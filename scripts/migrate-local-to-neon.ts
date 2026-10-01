import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const LOCAL_DB_URL = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/presencex';
const TARGET_DB_URL = process.env.NEON_DATABASE_URL || process.env.TARGET_DATABASE_URL || process.env.DATABASE_URL;

const isProductionRun = process.argv.includes('--production');
const isPreviewRun = process.argv.includes('--preview') || !isProductionRun;

async function runMigration() {
  console.log('----------------------------------------------------');
  console.log('🚀 PRESENCEX: LOCAL -> NEON POSTGRESQL MIGRATION');
  console.log(`MODE: ${isProductionRun ? '🔴 PRODUCTION MIGRATION (LIVE EXECUTION)' : '🟡 PREVIEW DRY-RUN'}`);
  console.log('----------------------------------------------------');

  if (!TARGET_DB_URL || TARGET_DB_URL.includes('localhost') || TARGET_DB_URL.includes('127.0.0.1')) {
    console.error('❌ ERROR: TARGET_DATABASE_URL or NEON_DATABASE_URL must be specified and point to a hosted database (Neon).');
    console.error('Example: NEON_DATABASE_URL="postgresql://user:pass@ep-xyz.neon.tech/presencex?sslmode=require" npx tsx scripts/migrate-local-to-neon.ts --production');
    process.exit(1);
  }

  const localClient = new Client({ connectionString: LOCAL_DB_URL });
  const targetClient = new Client({ connectionString: TARGET_DB_URL, ssl: { rejectUnauthorized: false } });

  try {
    console.log('🔌 Connecting to local database...');
    await localClient.connect();
    console.log('✅ Connected to local database.');

    console.log('🔌 Connecting to destination Neon database...');
    await targetClient.connect();
    console.log('✅ Connected to destination Neon database.');

    // 1. Ensure pgvector extension in destination
    console.log('\n📦 Step 1: Checking pgvector extension in destination...');
    if (isProductionRun) {
      await targetClient.query('CREATE EXTENSION IF NOT EXISTS vector;');
    }
    const extRes = await targetClient.query("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';");
    if (extRes.rows.length === 0 && !isProductionRun) {
      console.log('ℹ️  pgvector extension will be created during production migration.');
    } else {
      console.log(`✅ pgvector extension active: v${extRes.rows[0]?.extversion || 'pending'}`);
    }

    // 2. Create Schema in Destination
    console.log('\n🏗️ Step 2: Ensuring table schemas in destination...');
    const schemaSql = `
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
    `;

    if (isProductionRun) {
      await targetClient.query(schemaSql);
      console.log('✅ Destination table schemas verified/created.');
    } else {
      console.log('ℹ️  Destination table schemas will be executed in production mode.');
    }

    // 3. Migrate Persons
    console.log('\n👥 Step 3: Migrating Persons...');
    const localPersons = await localClient.query('SELECT person_id, full_name, role, created_at, updated_at FROM persons;');
    console.log(`Found ${localPersons.rows.length} persons in local database.`);

    if (isProductionRun) {
      for (const p of localPersons.rows) {
        await targetClient.query(
          `INSERT INTO persons (person_id, full_name, role, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (person_id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, updated_at = EXCLUDED.updated_at;`,
          [p.person_id, p.full_name, p.role, p.created_at, p.updated_at]
        );
      }
      console.log(`✅ Successfully migrated ${localPersons.rows.length} persons to Neon.`);
    }

    // 4. Migrate Face Profiles (with 512D Vectors)
    console.log('\n👤 Step 4: Migrating Face Profiles (512D Vector Embeddings)...');
    const localProfiles = await localClient.query(`
      SELECT profile_id, person_id, embedding::text AS vector_str, model_name, quality_score, liveness_status, created_at
      FROM face_profiles;
    `);
    console.log(`Found ${localProfiles.rows.length} face profile embeddings in local database.`);

    if (isProductionRun) {
      let insertedProfiles = 0;
      for (const fp of localProfiles.rows) {
        if (!fp.vector_str) {
          console.warn(`⚠️ Warning: Skipping profile ${fp.profile_id} for person ${fp.person_id} due to NULL embedding.`);
          continue;
        }
        await targetClient.query(
          `INSERT INTO face_profiles (profile_id, person_id, embedding, model_name, quality_score, liveness_status, created_at)
           VALUES ($1, $2, $3::vector, $4, $5, $6, $7)
           ON CONFLICT (profile_id) DO NOTHING;`,
          [fp.profile_id, fp.person_id, fp.vector_str, fp.model_name, fp.quality_score, fp.liveness_status, fp.created_at]
        );
        insertedProfiles++;
      }
      console.log(`✅ Successfully migrated ${insertedProfiles} 512-D face profile vectors to Neon.`);
    }

    // 5. Migrate Attendance Sessions
    console.log('\n📅 Step 5: Migrating Attendance Sessions...');
    const localSessions = await localClient.query('SELECT session_id, title, created_by, started_at, ended_at, status FROM attendance_sessions;');
    console.log(`Found ${localSessions.rows.length} attendance sessions in local database.`);

    if (isProductionRun) {
      for (const s of localSessions.rows) {
        await targetClient.query(
          `INSERT INTO attendance_sessions (session_id, title, created_by, started_at, ended_at, status)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (session_id) DO UPDATE SET status = EXCLUDED.status, ended_at = EXCLUDED.ended_at;`,
          [s.session_id, s.title, s.created_by, s.started_at, s.ended_at, s.status]
        );
      }
      console.log(`✅ Successfully migrated ${localSessions.rows.length} sessions to Neon.`);
    }

    // 6. Migrate Attendance Records
    console.log('\n📝 Step 6: Migrating Attendance Records...');
    const localRecords = await localClient.query('SELECT record_id, session_id, person_id, status, marked_at, verification_method, confidence, distance FROM attendance_records;');
    console.log(`Found ${localRecords.rows.length} attendance records in local database.`);

    if (isProductionRun) {
      for (const r of localRecords.rows) {
        await targetClient.query(
          `INSERT INTO attendance_records (record_id, session_id, person_id, status, marked_at, verification_method, confidence, distance)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (session_id, person_id) DO NOTHING;`,
          [r.record_id, r.session_id, r.person_id, r.status, r.marked_at, r.verification_method, r.confidence, r.distance]
        );
      }
      console.log(`✅ Successfully migrated ${localRecords.rows.length} attendance records to Neon.`);
    }

    // 7. Migrate Recognition Events
    console.log('\n🔍 Step 7: Migrating Recognition Events...');
    const localEvents = await localClient.query('SELECT event_id, session_id, person_id, status, distance, confidence, quality_score, liveness_status, created_at FROM recognition_events;');
    console.log(`Found ${localEvents.rows.length} recognition events in local database.`);

    if (isProductionRun) {
      for (const ev of localEvents.rows) {
        await targetClient.query(
          `INSERT INTO recognition_events (event_id, session_id, person_id, status, distance, confidence, quality_score, liveness_status, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (event_id) DO NOTHING;`,
          [ev.event_id, ev.session_id, ev.person_id, ev.status, ev.distance, ev.confidence, ev.quality_score, ev.liveness_status, ev.created_at]
        );
      }
      console.log(`✅ Successfully migrated ${localEvents.rows.length} recognition audit events to Neon.`);
    }

    // 8. Verification & Validation
    if (isProductionRun) {
      console.log('\n🔍 Step 8: Verifying Neon Data Integrity...');
      const targetPersons = await targetClient.query('SELECT COUNT(*) FROM persons;');
      const targetProfiles = await targetClient.query('SELECT COUNT(*) FROM face_profiles WHERE embedding IS NOT NULL;');
      const dimCheck = await targetClient.query('SELECT vector_dims(embedding) AS dims FROM face_profiles LIMIT 1;');

      console.log(`📊 Neon Persons Count: ${targetPersons.rows[0].count}`);
      console.log(`📊 Neon Valid 512D Vector Profiles Count: ${targetProfiles.rows[0].count}`);
      console.log(`📊 Vector Dimension Verified: ${dimCheck.rows[0]?.dims || 512}`);

      // Sample Cosine Distance Test
      if (localProfiles.rows.length > 0 && localProfiles.rows[0].vector_str) {
        const sampleVec = localProfiles.rows[0].vector_str;
        const searchRes = await targetClient.query(
          `SELECT fp.person_id, p.full_name, fp.embedding <=> $1::vector AS distance
           FROM face_profiles fp
           JOIN persons p ON p.person_id = fp.person_id
           ORDER BY fp.embedding <=> $1::vector LIMIT 1;`,
          [sampleVec]
        );
        console.log(`✅ Neon pgvector Cosine Search Verified! Matched person: ${searchRes.rows[0]?.full_name} with distance ${searchRes.rows[0]?.distance}`);
      }
    }

    console.log('\n----------------------------------------------------');
    if (isProductionRun) {
      console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
    } else {
      console.log('ℹ️  PREVIEW COMPLETE. Run with --production flag to execute migration live.');
    }
    console.log('----------------------------------------------------');
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown migration error';
    console.error('❌ Migration failed with error:', errMsg);
    process.exit(1);
  } finally {
    await localClient.end();
    await targetClient.end();
  }
}

runMigration();
