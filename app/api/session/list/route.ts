import { NextResponse } from "next/server";
import { callFaceEngine } from "@/lib/faceEngine";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

export async function GET() {
  try {
    // 1. Try querying Supabase PostgreSQL first
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("attendance_sessions")
        .select("*")
        .order("started_at", { ascending: false });

      if (!error && data) {
        const formattedSessions = data.map((s) => ({
          session_id: s.id,
          session_name: s.session_name,
          started_by: s.started_by || "organization_admin",
          is_active: s.is_active,
          started_at: s.started_at,
          ended_at: s.ended_at,
          total_marked: s.total_marked || 0,
        }));

        return NextResponse.json({
          success: true,
          data: {
            sessions: formattedSessions,
          },
        });
      }
    }

    // 2. Query Python Face Engine
    const result = await callFaceEngine("/api/session/list", {
      method: "GET",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sData = result?.body?.data as any;

    if (
      result.status === 200 &&
      result.body &&
      result.body.success &&
      sData &&
      Array.isArray(sData.sessions)
    ) {
      return NextResponse.json(result.body, { status: result.status });
    }

    // 3. Return clean empty sessions list if no sessions exist
    return NextResponse.json({
      success: true,
      data: {
        sessions: [],
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        sessions: [],
      },
    });
  }
}
