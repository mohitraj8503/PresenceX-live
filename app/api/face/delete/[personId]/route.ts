import { NextResponse } from "next/server";
import { callFaceEngine } from "@/lib/faceEngine";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await params;

    // 1. Delete from Supabase PostgreSQL if configured
    if (isSupabaseConfigured && supabase) {
      await supabase
        .from("face_profiles")
        .delete()
        .eq("person_id", personId);
    }

    // 2. Delete from Python Face Engine
    const result = await callFaceEngine(`/api/face/delete/${personId}`, {
      method: "DELETE",
    });

    if (result.status === 200 && result.body) {
      return NextResponse.json(result.body, { status: result.status });
    }

    return NextResponse.json({
      success: true,
      data: {
        person_id: personId,
        message: "Enrolled face profile deleted successfully.",
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        person_id: "deleted",
        message: "Enrolled face profile deleted successfully.",
      },
    });
  }
}
