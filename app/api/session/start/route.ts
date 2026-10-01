import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionName = body?.session_name || "Morning Attendance";
    const sessionId = "session_" + Date.now();

    await query(
      `INSERT INTO attendance_sessions (session_id, name, status, start_time)
       VALUES ($1, $2, 'ACTIVE', NOW());`,
      [sessionId, sessionName]
    );

    return NextResponse.json({
      success: true,
      data: {
        session_id: sessionId,
        session_name: sessionName,
        is_active: true,
        started_at: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to start session.";
    return NextResponse.json(
      { success: false, error: "SESSION_CREATE_FAILED", message: errorMsg },
      { status: 500 }
    );
  }
}
