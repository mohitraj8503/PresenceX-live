import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    await query(
      `UPDATE attendance_sessions SET status = 'COMPLETED', end_time = NOW(), updated_at = NOW() WHERE session_id = $1;`,
      [sessionId]
    );

    return NextResponse.json({
      success: true,
      data: {
        session_id: sessionId,
        status: "COMPLETED",
        message: "Attendance session successfully ended.",
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to end session.";
    return NextResponse.json(
      { success: false, error: "SESSION_END_FAILED", message: errorMsg },
      { status: 500 }
    );
  }
}
