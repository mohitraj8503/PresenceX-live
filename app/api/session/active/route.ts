import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const rows = await query<{ session_id: string; session_name: string; is_active: boolean; started_at: string; total_marked: string }>(`
      SELECT session_id, name AS session_name, status, start_time AS started_at,
             (SELECT COUNT(*) FROM attendance_records WHERE session_id = attendance_sessions.session_id) AS total_marked
      FROM attendance_sessions
      WHERE status = 'ACTIVE'
      ORDER BY start_time DESC
      LIMIT 1;
    `);

    if (rows.length > 0) {
      const s = rows[0];
      return NextResponse.json({
        success: true,
        data: {
          session_id: s.session_id,
          session_name: s.session_name,
          is_active: true,
          started_at: s.started_at,
          total_marked: parseInt(s.total_marked || "0", 10),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: null,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch active session.";
    return NextResponse.json(
      { success: false, error: "DATABASE_ERROR", message: errorMsg },
      { status: 500 }
    );
  }
}
