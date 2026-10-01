import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DB_URL = process.env.DATABASE_URL || process.env.NEON_DATABASE_URL;

async function backupProduction() {
  if (!DB_URL) {
    console.error('❌ DATABASE_URL is not configured.');
    process.exit(1);
  }

  const client = new Client({ connectionString: DB_URL, ssl: DB_URL.includes('neon.tech') ? { rejectUnauthorized: false } : undefined });

  try {
    await client.connect();
    console.log('🔌 Connected to database for backup...');

    const persons = (await client.query('SELECT * FROM persons;')).rows;
    const faceProfiles = (await client.query('SELECT profile_id, person_id, embedding::text AS embedding, model_name, quality_score, liveness_status, created_at FROM face_profiles;')).rows;
    const sessions = (await client.query('SELECT * FROM attendance_sessions;')).rows;
    const records = (await client.query('SELECT * FROM attendance_records;')).rows;
    const events = (await client.query('SELECT * FROM recognition_events;')).rows;

    const backupData = {
      timestamp: new Date().toISOString(),
      counts: {
        persons: persons.length,
        face_profiles: faceProfiles.length,
        attendance_sessions: sessions.length,
        attendance_records: records.length,
        recognition_events: events.length,
      },
      data: {
        persons,
        faceProfiles,
        sessions,
        records,
        events,
      }
    };

    const backupDir = path.resolve(process.cwd(), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const filename = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    const filepath = path.join(backupDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(backupData, null, 2));
    console.log(`✅ Production Backup successfully saved to ${filepath}`);
    console.log(`📊 Statistics: ${persons.length} persons, ${faceProfiles.length} face vectors, ${records.length} attendance records.`);
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error';
    console.error('❌ Backup failed:', errMsg);
  } finally {
    await client.end();
  }
}

backupProduction();
