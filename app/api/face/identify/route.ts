import { NextResponse } from "next/server";
import { callFaceEngine } from "@/lib/faceEngine";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get("image");

    if (!imageFile) {
      return NextResponse.json({
        success: false,
        error: "NO_IMAGE_PROVIDED",
        data: {
          recognized: false,
          status: "NO_IMAGE",
          person_id: null,
          full_name: null,
          role: null,
          distance: null,
          confidence: 0,
          liveness: { status: "UNKNOWN", score: 0.0, reasons: [] },
        },
      });
    }

    // Call Python Face Engine microservice (PyTorch MTCNN + InceptionResnetV1)
    const result = await callFaceEngine("/api/face/identify", {
      method: "POST",
      body: formData,
    });

    if (result.status !== 200 || !result.body || !result.body.success) {
      const errorReason = result.body?.error || "FACE_ENGINE_UNAVAILABLE";
      
      // Audit log failed attempt
      try {
        await query(
          `INSERT INTO recognition_events (faces_detected, recognized, status, failure_reason) VALUES ($1, $2, $3, $4)`,
          [0, false, "ENGINE_ERROR", errorReason]
        );
      } catch {}

      return NextResponse.json(
        {
          success: false,
          error: "FACE_ENGINE_UNAVAILABLE",
          message: "Face recognition service unavailable.",
          data: {
            recognized: false,
            status: "FACE_ENGINE_UNAVAILABLE",
            person_id: null,
            full_name: null,
            role: null,
            distance: null,
            confidence: 0,
            liveness: { status: "UNKNOWN", score: 0.0, reasons: [errorReason] },
          },
        },
        { status: 503 }
      );
    }

    // Return genuine response payload from face-engine
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engineData = result.body.data as any;
    const isRecognized = engineData.status === "recognized";

    // Audit log recognition attempt
    try {
      await query(
        `INSERT INTO recognition_events (person_id, faces_detected, recognized, confidence, distance, liveness_score, quality_score, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          engineData.person_id || null,
          isRecognized || engineData.status === "unknown_face" ? 1 : 0,
          isRecognized,
          engineData.confidence || 0.0,
          engineData.distance || null,
          engineData.liveness?.score || 0.0,
          engineData.quality_score || 0,
          engineData.status,
        ]
      );
    } catch {}

    return NextResponse.json({
      success: true,
      data: {
        recognized: isRecognized,
        status: engineData.status,
        person_id: engineData.person_id || null,
        full_name: engineData.full_name || (isRecognized ? "Recognized User" : "Unknown Person"),
        role: engineData.role || "none",
        confidence: engineData.confidence || 0.0,
        distance: engineData.distance || null,
        quality_score: engineData.quality_score || 0,
        liveness: engineData.liveness,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal biometric identification error.";
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_SERVER_ERROR",
        message: errorMsg,
        data: {
          recognized: false,
          status: "INTERNAL_SERVER_ERROR",
          person_id: null,
          full_name: null,
          role: null,
          distance: null,
          confidence: 0,
          liveness: { status: "UNKNOWN", score: 0.0, reasons: [] },
        },
      },
      { status: 500 }
    );
  }
}
