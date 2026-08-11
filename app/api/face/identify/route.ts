import { NextResponse } from "next/server";
import { callFaceEngine } from "@/lib/faceEngine";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await callFaceEngine("/api/face/identify", {
      method: "POST",
      body: formData,
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "bad_request" },
      { status: 400 }
    );
  }
}
