import { NextResponse } from "next/server";
import { callFaceEngine } from "@/lib/faceEngine";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const personId = (formData.get("person_id") as string) || "";
    const fullName = (formData.get("full_name") as string) || "";
    const role = (formData.get("role") as string) || "student";

    if (!personId.trim() || !fullName.trim()) {
      return NextResponse.json(
        { success: false, error: "PERSON_ID_AND_FULL_NAME_REQUIRED" },
        { status: 400 }
      );
    }

    const imageFile = formData.get("image");
    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: "FACE_IMAGE_REQUIRED" },
        { status: 400 }
      );
    }

    // Call Python Face Engine microservice for strict single-face detection, quality, liveness & vector embedding
    const result = await callFaceEngine("/api/face/register", {
      method: "POST",
      body: formData,
    });

    if (result.status !== 200 || !result.body || !result.body.success) {
      const errorMsg = result.body?.error || "FACE_ENGINE_UNAVAILABLE";
      const status = result.status === 503 || errorMsg === "FACE_ENGINE_UNAVAILABLE" ? 503 : 400;
      return NextResponse.json(
        {
          success: false,
          error: errorMsg,
          message:
            errorMsg === "no_face_detected"
              ? "No face detected in photo. Align face inside camera bounds."
              : errorMsg === "multiple_faces_at_similar_distance"
              ? "Multiple faces at similar distance — please keep only the person being enrolled in frame."
              : errorMsg === "multiple_faces_detected"
              ? "Multiple faces detected. Only one person should be visible during enrollment."
              : errorMsg === "spoof_detected"
              ? "Anti-spoof rejection: Live face required (no photos or screens)."
              : errorMsg === "face_quality_too_low"
              ? "Face image quality is too low. Turn on a light and move closer."
              : errorMsg === "FACE_ENGINE_UNAVAILABLE"
              ? "Face Engine service is offline (http://127.0.0.1:8001)."
              : (result.body as Record<string, unknown>)?.message as string || "Face recognition service unavailable.",
        },
        { status }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rData = result.body.data as any;

    // Sync metadata to PostgreSQL persons table
    await query(
      `INSERT INTO persons (person_id, full_name, role)
       VALUES ($1, $2, $3)
       ON CONFLICT (person_id) DO UPDATE SET full_name = EXCLUDED.full_name, role = EXCLUDED.role, updated_at = NOW()`,
      [personId.trim(), fullName.trim(), role]
    );

    return NextResponse.json({
      success: true,
      data: {
        person_id: personId.trim(),
        full_name: fullName.trim(),
        role: role,
        verification_method: rData?.verification_method || "MTCNN_INCEPTIONRESNET_512D",
        quality_score: rData?.quality_score || 90,
        embedding_dimension: rData?.embedding_dimension || 512,
        message: "Face biometric vector successfully registered in PostgreSQL pgvector database.",
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to register face.";
    return NextResponse.json(
      { success: false, error: "ENROLLMENT_FAILED", message: errorMsg },
      { status: 500 }
    );
  }
}
