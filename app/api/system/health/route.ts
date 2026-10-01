import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  const healthReport: Record<string, Record<string, unknown> | string> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      nextjs: { status: 'healthy', version: '16.2.9' },
      database: { status: 'unknown' },
      face_engine: { status: 'unknown' },
    }
  };

  let overallHealthy = true;

  // 1. Check PostgreSQL & pgvector
  try {
    const dbTest = await query<{ ping: number }>('SELECT 1 as ping');
    if (dbTest.length > 0) {
      const vecCheck = await query<{ extversion: string }>("SELECT extversion FROM pg_extension WHERE extname = 'vector'");
      const vectorInstalled = vecCheck.length > 0;
      (healthReport.services as Record<string, unknown>).database = {
        status: 'healthy',
        provider: process.env.DATABASE_URL?.includes('localhost') || process.env.DATABASE_URL?.includes('127.0.0.1')
          ? 'Self-Hosted PostgreSQL (Local)'
          : 'Self-Hosted VPS PostgreSQL',
        pgvector: vectorInstalled ? `active (v${vecCheck[0].extversion})` : 'missing',
      };
    }
  } catch (err: unknown) {
    overallHealthy = false;
    const errMsg = err instanceof Error ? err.message : 'Database connection failed';
    (healthReport.services as Record<string, unknown>).database = {
      status: 'unhealthy',
      error: errMsg,
    };
  }

  // 2. Check FastAPI Face Engine
  const faceEngineUrl = process.env.FACE_ENGINE_URL || 'http://127.0.0.1:8001';
  try {
    const feRes = await fetch(`${faceEngineUrl}/health`, { cache: 'no-store' });
    if (feRes.ok) {
      const feData = await feRes.json();
      (healthReport.services as Record<string, unknown>).face_engine = {
        status: 'healthy',
        url: faceEngineUrl,
        data: feData,
      };
    } else {
      overallHealthy = false;
      (healthReport.services as Record<string, unknown>).face_engine = {
        status: 'unhealthy',
        http_code: feRes.status,
      };
    }
  } catch (err: unknown) {
    overallHealthy = false;
    const errMsg = err instanceof Error ? err.message : 'Face engine unreachable';
    (healthReport.services as Record<string, unknown>).face_engine = {
      status: 'unhealthy',
      error: `${errMsg} (${faceEngineUrl})`,
    };
  }

  healthReport.status = overallHealthy ? 'healthy' : 'degraded';
  return NextResponse.json(healthReport, { status: overallHealthy ? 200 : 503 });
}
