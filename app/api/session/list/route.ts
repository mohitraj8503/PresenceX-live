import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const rows = await query<{ session_id: string; session_name: string; is_active: boolean; started_at: string; ended_at: string | null; total_marked: string }>(`
      SELECT s.session_id, s.name AS session_name, s.status, s.start_time AS started_at, s.end_time AS ended_at,
             (s.status = 'ACTIVE') AS is_active,
             (SELECT COUNT(*) FROM attendance_records WHERE session_id = s.session_id) AS total_marked
      FROM attendance_sessions s
      ORDER BY s.start_time DESC;
    `);

    const sessions = rows.map((r) => ({
      session_id: r.session_id,
      session_name: r.session_name,
      is_active: Boolean(r.is_active),
      started_at: r.started_at,
      ended_at: r.ended_at,
      total_marked: parseInt(r.total_marked || "0", 10),
    }));

    return NextResponse.json({
      success: true,
      data: {
        sessions,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch session list.";
    return NextResponse.json(
      { success: false, error: "DATABASE_ERROR", message: errorMsg, data: { sessions: [] } },
      { status: 500 }
    );
  }
}
