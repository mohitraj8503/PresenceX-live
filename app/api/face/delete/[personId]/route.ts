import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ personId: string }> }
) {
  try {
    const { personId } = await params;

    if (!personId) {
      return NextResponse.json({ success: false, error: "PERSON_ID_REQUIRED" }, { status: 400 });
    }

    // Cascade delete person and face_profiles vectors from PostgreSQL
    await query(`DELETE FROM persons WHERE person_id = $1;`, [personId]);

    return NextResponse.json({
      success: true,
      data: {
        person_id: personId,
        message: `Successfully deleted profile and biometric vector for ${personId}.`,
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to delete profile.";
    return NextResponse.json(
      { success: false, error: "DELETE_FAILED", message: errorMsg },
      { status: 500 }
    );
  }
}
