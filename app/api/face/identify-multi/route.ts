import { NextResponse } from "next/server";
import { callFaceEngine } from "@/lib/faceEngine";
import { query } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const result = await callFaceEngine("/api/face/identify-multi", {
      method: "POST",
      body: formData,
    });

    if (result.status !== 200 || !result.body || !result.body.success) {
      return NextResponse.json(
        {
          success: false,
          error: "FACE_ENGINE_UNAVAILABLE",
          message: "Multi-face recognition service unavailable.",
          data: {
            faces_detected: 0,
            recognized_count: 0,
            unknown_count: 0,
            status: "FACE_ENGINE_UNAVAILABLE",
            results: [],
          },
        },
        { status: 503 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engineData = result.body.data as any;

    // Audit log multi-face recognition event
    try {
      await query(
        `INSERT INTO recognition_events (faces_detected, recognized, confidence, status)
         VALUES ($1, $2, $3, $4)`,
        [
          engineData.faces_detected || 0,
          (engineData.recognized_count || 0) > 0,
          (engineData.recognized_count || 0) > 0 ? 95.0 : 0.0,
          engineData.status || "MULTI_ANALYSIS",
        ]
      );
    } catch {}

    return NextResponse.json(result.body, { status: result.status });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal multi-face identification error.";
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: errorMsg,
        data: {
          faces_detected: 0,
          recognized_count: 0,
          unknown_count: 0,
          status: "ERROR",
          results: [],
        },
      },
      { status: 500 }
    );
  }
}
