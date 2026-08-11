import { NextResponse } from "next/server";
import { callFaceEngine } from "@/lib/faceEngine";

export async function GET() {
  try {
    const result = await callFaceEngine("/api/session/active", {
      method: "GET",
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "bad_request" },
      { status: 400 }
    );
  }
}
