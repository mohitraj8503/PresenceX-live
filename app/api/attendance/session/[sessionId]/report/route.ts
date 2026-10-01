import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Fetch session details
    const sessionRows = await query<{ session_id: string; session_name: string; status: string; is_active: boolean }>(
      `SELECT session_id, name AS session_name, status, (status = 'ACTIVE') AS is_active FROM attendance_sessions WHERE session_id = $1`,
      [sessionId]
    );

    if (sessionRows.length === 0) {
      return NextResponse.json(
        { success: false, error: "SESSION_NOT_FOUND" },
        { status: 404 }
      );
    }

    const session = sessionRows[0];

    // Fetch attendance records joined with persons
    const records = await query<{ person_id: string; full_name: string; role: string; confidence: number; distance: number | null; marked_at: string }>(`
      SELECT ar.person_id, p.full_name, p.role, ar.confidence, ar.distance, ar.marked_at
      FROM attendance_records ar
      JOIN persons p ON ar.person_id = p.person_id
      WHERE ar.session_id = $1
      ORDER BY ar.marked_at DESC;
    `, [sessionId]);

    // Fetch all registered persons to calculate absentees
    const allPersons = await query<{ person_id: string; full_name: string; role: string }>(`SELECT person_id, full_name, role FROM persons WHERE status = 'active';`);

    const presentSet = new Set(records.map((r) => r.person_id));
    const absentees = allPersons.filter((p) => !presentSet.has(p.person_id));

    return NextResponse.json({
      success: true,
      data: {
        session_id: session.session_id,
        session_name: session.session_name,
        is_active: Boolean(session.is_active),
        total_registered: allPersons.length,
        present_count: records.length,
        absent_count: absentees.length,
        present: records.map((r) => ({
          person_id: r.person_id,
          full_name: r.full_name,
          role: r.role,
          marked_at: r.marked_at,
          confidence: typeof r.confidence === "number" ? r.confidence : parseFloat(String(r.confidence || "0")),
          distance: r.distance != null ? (typeof r.distance === "number" ? r.distance : parseFloat(String(r.distance))) : null,
        })),
        absentees: absentees,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch session report.";
    return NextResponse.json(
      { success: false, error: "DATABASE_ERROR", message: errorMsg },
      { status: 500 }
    );
  }
}
