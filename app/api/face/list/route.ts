import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const rows = await query(`
      SELECT p.person_id, p.full_name, p.role, p.created_at,
             fp.model_name, fp.quality_score, fp.verification_method
      FROM persons p
      LEFT JOIN (
        SELECT DISTINCT ON (person_id) person_id, model_name, quality_score, verification_method
        FROM face_profiles
        ORDER BY person_id, created_at DESC
      ) fp ON p.person_id = fp.person_id
      ORDER BY p.created_at DESC;
    `);

    return NextResponse.json({
      success: true,
      data: {
        total_registered: rows.length,
        registered_persons: rows,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to fetch registered face directory.";
    return NextResponse.json(
      {
        success: false,
        error: "DATABASE_ERROR",
        message: errorMsg,
        data: {
          total_registered: 0,
          registered_persons: [],
        },
      },
      { status: 500 }
    );
  }
}
