import { NextResponse } from "next/server";
import { callFaceEngine } from "@/lib/faceEngine";

const FALLBACK_PERSONS = [
  {
    person_id: "mohitraj8503",
    full_name: "Mohit Raj",
    role: "student",
    model_name: "ArcFace 512-d",
    created_at: new Date().toISOString(),
    verification_method: "RETINAFACE" as const,
    quality_score: 95,
  },
  {
    person_id: "sunny",
    full_name: "Sunny",
    role: "student",
    model_name: "ArcFace 512-d",
    created_at: new Date().toISOString(),
    verification_method: "RETINAFACE" as const,
    quality_score: 96,
  },
  {
    person_id: "jeetu",
    full_name: "jeetu",
    role: "student",
    model_name: "ArcFace 512-d",
    created_at: new Date().toISOString(),
    verification_method: "RETINAFACE" as const,
    quality_score: 86,
  },
];

export async function GET() {
  try {
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

    // Fallback to seed profiles if Python engine is unreachable or DB is empty on production
    return NextResponse.json({
      success: true,
      data: {
        total_registered: FALLBACK_PERSONS.length,
        registered_persons: FALLBACK_PERSONS,
      },
    });
  } catch {
    return NextResponse.json({
      success: true,
      data: {
        total_registered: FALLBACK_PERSONS.length,
        registered_persons: FALLBACK_PERSONS,
      },
    });
  }
}
