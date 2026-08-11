import { NextResponse } from "next/server";
import { callFaceEngine } from "@/lib/faceEngine";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const result = await callFaceEngine(`/api/session/${sessionId}/end`, {
      method: "POST",
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "bad_request" },
      { status: 400 }
    );
  }
}
