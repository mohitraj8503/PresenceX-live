import { NextResponse } from "next/server";
import { callFaceEngine } from "@/lib/faceEngine";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const result = await callFaceEngine(`/api/session/${sessionId}/end`, {
      method: "POST",
    });

    if (isSupabaseConfigured && supabase) {
      await supabase
        .from("attendance_sessions")
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq("id", sessionId);
    }

    if (result.status === 200 && result.body && result.body.success) {
      return NextResponse.json(result.body, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      data: {
        session_id: sessionId,
        is_active: false,
        ended_at: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        is_active: false,
        ended_at: new Date().toISOString(),
      },
    });
  }
}
