import { NextResponse } from "next/server";
import { callFaceEngine } from "@/lib/faceEngine";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const sessionId = (formData.get("session_id") as string) || "";
    const imageFile = formData.get("image");

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "SESSION_ID_REQUIRED", message: "Active session_id is required." },
        { status: 400 }
      );
    }

    if (!imageFile) {
      return NextResponse.json(
        { success: false, error: "IMAGE_REQUIRED", message: "Camera image capture is required." },
        { status: 400 }
      );
    }

    // 1. Verify session exists and is ACTIVE in PostgreSQL
    const sessionRows = await query(
      `SELECT session_id, name, status FROM attendance_sessions WHERE session_id = $1 AND status = 'ACTIVE'`,
      [sessionId]
    );

    if (sessionRows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "SESSION_INACTIVE",
          message: "Selected attendance session is closed or inactive.",
        },
        { status: 400 }
      );
    }

    // 2. Perform Server-Side Multi-Face Facial Recognition + Liveness via Python Face Engine
    const identifyResult = await callFaceEngine("/api/face/identify-multi", {
      method: "POST",
      body: formData,
    });

    if (identifyResult.status !== 200 || !identifyResult.body || !identifyResult.body.success) {
      return NextResponse.json(
        {
          success: false,
          error: "FACE_ENGINE_UNAVAILABLE",
          message: "Face recognition service unavailable.",
        },
        { status: 503 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const engineData = identifyResult.body.data as any;
    const resultsList = engineData.results || [];

    const newlyMarked: Array<{ person_id: string; full_name: string; distance: number | null }> = [];
    const overlayBoxes: Array<{ x: number; y: number; w: number; h: number; label: string; status: "recognized" | "unknown"; distance: number | null }> = [];

    const nowIso = new Date().toISOString();

    for (const item of resultsList) {
      const isRecognized = item.status === "recognized" && item.person_id;
      const bbox = item.bbox || { x: 0, y: 0, w: 100, h: 100 };

      overlayBoxes.push({
        x: bbox.x,
        y: bbox.y,
        w: bbox.w,
        h: bbox.h,
        label: isRecognized ? item.full_name : "Unknown Person",
        status: isRecognized ? "recognized" : "unknown",
        distance: item.distance || null,
      });

      // Audit Log Recognition Event
      try {
        await query(
          `INSERT INTO recognition_events (session_id, person_id, faces_detected, recognized, confidence, distance, quality_score, model_name, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            sessionId,
            isRecognized ? item.person_id : null,
            engineData.faces_detected || 1,
            isRecognized,
            item.confidence || 0.0,
            item.distance || null,
            item.quality_score || 90,
            "InceptionResnetV1_VGGFace2",
            isRecognized ? "RECOGNIZED" : item.status || "UNKNOWN_FACE",
          ]
        );
      } catch {}

      if (isRecognized) {
        // Prevent duplicate attendance insertion using UNIQUE(session_id, person_id)
        const existing = await query<{ id: string }>(
          `SELECT id FROM attendance_records WHERE session_id = $1 AND person_id = $2`,
          [sessionId, item.person_id]
        );

        if (existing.length === 0) {
          await query(
            `INSERT INTO attendance_records (session_id, person_id, confidence, distance, recognition_method, liveness_status, marked_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [sessionId, item.person_id, item.confidence || 95.0, item.distance || null, "BIOMETRIC_FACE_RECOGNITION", "LIVE", nowIso]
          );
          newlyMarked.push({
            person_id: item.person_id,
            full_name: item.full_name,
            distance: item.distance || null,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        session_id: sessionId,
        faces_detected: engineData.faces_detected || 0,
        recognized_count: engineData.recognized_count || 0,
        unknown_count: engineData.unknown_count || 0,
        newly_marked_count: newlyMarked.length,
        newly_marked: newlyMarked,
        overlay_boxes: overlayBoxes,
        message: `Processed ${engineData.faces_detected || 0} faces. Marked ${newlyMarked.length} student(s) present.`,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to mark attendance.";
    return NextResponse.json(
      { success: false, error: "ATTENDANCE_MARKING_FAILED", message: errorMsg },
      { status: 500 }
    );
  }
}
