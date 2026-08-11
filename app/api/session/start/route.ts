import { NextResponse } from "next/server";
import { callFaceEngine } from "@/lib/faceEngine";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await callFaceEngine("/api/session/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "bad_request" },
      { status: 400 }
    );
  }
}
