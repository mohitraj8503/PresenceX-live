import { NextResponse } from "next/server";
import { callFaceEngine } from "@/lib/faceEngine";

const DEFAULT_SESSIONS = [
  {
    session_id: "session_demo_01",
    session_name: "B.Tech AI & DS - Morning Attendance",
    started_by: "organization_admin",
    is_active: true,
    started_at: new Date().toISOString(),
    total_marked: 3,
  },
  {
    session_id: "session_demo_02",
    session_name: "Computer Science - Lab Session",
    started_by: "organization_admin",
    is_active: false,
    started_at: new Date(Date.now() - 86400000).toISOString(),
    ended_at: new Date(Date.now() - 82800000).toISOString(),
    total_marked: 3,
  },
];

export async function GET() {
  try {
    const result = await callFaceEngine("/api/session/list", {
      method: "GET",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sData = result?.body?.data as any;

    if (
      result.status === 200 &&
      result.body &&
      result.body.success &&
      sData &&
      Array.isArray(sData.sessions) &&
      sData.sessions.length > 0
    ) {
      return NextResponse.json(result.body, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      data: {
        sessions: DEFAULT_SESSIONS,
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        sessions: DEFAULT_SESSIONS,
      },
    });
  }
}
