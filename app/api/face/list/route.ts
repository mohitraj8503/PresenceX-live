import { NextResponse } from "next/server";
import { callFaceEngine } from "@/lib/faceEngine";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";

interface RegisteredPersonItem {
  person_id: string;
  full_name: string;
  role: string;
  verification_method: "RETINAFACE" | "PHOTO" | "MANUAL_LIVE" | "BULK_PHOTO";
  quality_score?: number | null;
  photo_url?: string | null;
  created_at?: string;
  model_name?: string;
}

const SEED_PROFILES: RegisteredPersonItem[] = [
  {
    person_id: "mohitraj8503",
    full_name: "Mohit Raj",
    role: "student",
    model_name: "ArcFace 512-d",
    created_at: new Date().toISOString(),
    verification_method: "RETINAFACE",
    quality_score: 95,
    photo_url: null,
  },
  {
    person_id: "sunny",
    full_name: "Sunny",
    role: "student",
    model_name: "ArcFace 512-d",
    created_at: new Date().toISOString(),
    verification_method: "RETINAFACE",
    quality_score: 96,
    photo_url: null,
  },
  {
    person_id: "jeetu",
    full_name: "jeetu",
    role: "student",
    model_name: "ArcFace 512-d",
    created_at: new Date().toISOString(),
    verification_method: "RETINAFACE",
    quality_score: 86,
    photo_url: null,
  },
  {
    person_id: "mukul pandey",
    full_name: "Mukul Pandey",
    role: "student",
    model_name: "ArcFace 512-d",
    created_at: new Date().toISOString(),
    verification_method: "RETINAFACE",
    quality_score: 92,
    photo_url: null,
  },
];

export async function GET() {
  try {
    // 1. Try querying local Python Face Engine first (contains real SQLite registered faces)
    const result = await callFaceEngine("/api/face/list", {
      method: "GET",
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bData = result?.body?.data as any;

    if (
      result.status === 200 &&
      result.body &&
      result.body.success &&
      bData &&
      Array.isArray(bData.registered_persons) &&
      bData.registered_persons.length > 0
    ) {
      return NextResponse.json(result.body, { status: result.status });
    }

    // 2. Try querying Supabase PostgreSQL if configured
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase
        .from("face_profiles")
        .select("person_id, full_name, role, verification_method, quality_score, photo_url, created_at");

      if (!error && data && data.length > 0) {
        const map = new Map<string, RegisteredPersonItem>();
        for (const p of data as RegisteredPersonItem[]) {
          map.set(p.person_id, p);
        }
        for (const s of SEED_PROFILES) {
          if (!map.has(s.person_id)) {
            map.set(s.person_id, s);
          }
        }
        const merged = Array.from(map.values());
        return NextResponse.json({
          success: true,
          data: {
            total_registered: merged.length,
            registered_persons: merged,
          },
        });
      }
    }

    // 3. Fallback to full seed directory
    return NextResponse.json({
      success: true,
      data: {
        total_registered: SEED_PROFILES.length,
        registered_persons: SEED_PROFILES,
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        total_registered: SEED_PROFILES.length,
        registered_persons: SEED_PROFILES,
      },
    });
  }
}
