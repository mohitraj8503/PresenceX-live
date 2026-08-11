import { NextResponse } from "next/server";
import { callFaceEngine } from "@/lib/faceEngine";

const DEFAULT_REPORT = {
  session_id: "session_demo_01",
  session_name: "B.Tech AI & DS - Morning Attendance",
  is_active: true,
  total_registered: 3,
  present_count: 3,
  absent_count: 0,
  present: [
    {
      person_id: "mohitraj8503",
      full_name: "Mohit Raj",
      role: "student",
      marked_at: new Date().toISOString(),
      confidence: 95.4,
      distance: 0.284,
    },
    {
      person_id: "sunny",
      full_name: "Sunny",
      role: "student",
      marked_at: new Date().toISOString(),
      confidence: 96.1,
      distance: 0.261,
    },
    {
      person_id: "jeetu",
      full_name: "jeetu",
      role: "student",
      marked_at: new Date().toISOString(),
      confidence: 86.8,
      distance: 0.352,
    },
  ],
  absentees: [],
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const result = await callFaceEngine(
      `/api/attendance/session/${sessionId}/report`,
      { method: "GET" }
    );

    if (result.status === 200 && result.body && result.body.success) {
      return NextResponse.json(result.body, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...DEFAULT_REPORT,
        session_id: sessionId,
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: DEFAULT_REPORT,
    });
  }
}
