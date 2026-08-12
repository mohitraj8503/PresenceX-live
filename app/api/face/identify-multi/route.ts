import { NextResponse } from "next/server";
import { callFaceEngine } from "@/lib/faceEngine";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const result = await callFaceEngine("/api/face/identify-multi", {
      method: "POST",
      body: formData,
    });

    if (result.status === 200 && result.body && result.body.success) {
      return NextResponse.json(result.body, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      data: {
        faces_detected: 0,
        recognized_count: 0,
        unknown_count: 0,
        is_low_light: false,
        results: [],
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        faces_detected: 0,
        recognized_count: 0,
        unknown_count: 0,
        is_low_light: false,
        results: [],
      },
    });
  }
}
