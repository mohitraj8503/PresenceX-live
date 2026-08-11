import { NextResponse } from "next/server";
import { callFaceEngine } from "@/lib/faceEngine";

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

    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "bad_request" },
      { status: 400 }
    );
  }
}
