import { NextResponse } from "next/server";
import { callFaceEngine } from "@/lib/faceEngine";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await callFaceEngine("/api/face/identify", {
      method: "POST",
      body: formData,
    });

    if (result.status === 200 && result.body && result.body.success) {
      return NextResponse.json(result.body, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      data: {
        status: "unknown",
        person_id: null,
        full_name: "Unknown Face",
        role: "unrecognized",
        confidence: 0,
        quality_score: 80,
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        status: "unknown",
        person_id: null,
        full_name: "Unknown Face",
        role: "unrecognized",
        confidence: 0,
        quality_score: 80,
      },
    });
  }
}
