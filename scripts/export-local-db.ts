import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const LOCAL_DB_URL = process.env.LOCAL_DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/presencex';

async function exportLocalDatabase() {
  console.log('----------------------------------------------------');
  console.log('📦 PRESENCEX: EXPORTING LOCAL DATABASE & EMBEDDINGS');
  console.log('----------------------------------------------------');

  const client = new Client({ connectionString: LOCAL_DB_URL });

  try {
    await client.connect();
    console.log('✅ Connected to local PostgreSQL.');

    const persons = (await client.query('SELECT * FROM persons;')).rows;
    const faceProfiles = (await client.query('SELECT profile_id, person_id, embedding::text AS vector_str, model_name, quality_score, liveness_status, created_at FROM face_profiles;')).rows;
    const sessions = (await client.query('SELECT * FROM attendance_sessions;')).rows;
    const records = (await client.query('SELECT * FROM attendance_records;')).rows;
    const events = (await client.query('SELECT * FROM recognition_events;')).rows;

    const exportData = {
      exported_at: new Date().toISOString(),
      counts: {
        persons: persons.length,
        face_profiles: faceProfiles.length,
        attendance_sessions: sessions.length,
        attendance_records: records.length,
        recognition_events: events.length,
      },
      persons,
      faceProfiles,
      sessions,
      records,
      events,
    };

    const exportPath = path.resolve(process.cwd(), 'presencex-local-export.json');
    fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));

    console.log(`\n🎉 Export Complete! Export file saved to: ${exportPath}`);
    console.log(`📊 Total Persons: ${persons.length}`);
    console.log(`📊 Total 512D Face Vectors: ${faceProfiles.length}`);
    console.log(`📊 Total Attendance Records: ${records.length}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Export failed:', msg);
  } finally {
    await client.end();
  }
}

exportLocalDatabase();
