import { NextResponse } from "next/server";
import { query } from "@/lib/db";

interface PersonRow {
  person_id: string;
  full_name: string;
  role: string;
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { person_id, new_person_id, full_name, role } = body;

    if (!person_id || !full_name?.trim()) {
      return NextResponse.json(
        { success: false, error: "PERSON_ID_AND_FULL_NAME_REQUIRED" },
        { status: 400 }
      );
    }

    const targetPersonId = (new_person_id && new_person_id.trim()) ? new_person_id.trim() : person_id.trim();
    const updatedRole = role || "student";

    // If person_id slug is changing, verify target slug isn't already taken
    if (targetPersonId !== person_id.trim()) {
      const existing = await query<PersonRow>("SELECT person_id FROM persons WHERE person_id = $1", [targetPersonId]);
      if (existing.length > 0) {
        return NextResponse.json(
          { success: false, error: "PERSON_ID_ALREADY_EXISTS", message: `Person ID '${targetPersonId}' is already in use.` },
          { status: 400 }
        );
      }
    }

    const res = await query<PersonRow>(
      `UPDATE persons 
       SET person_id = $1, full_name = $2, role = $3, updated_at = NOW() 
       WHERE person_id = $4 
       RETURNING person_id, full_name, role`,
      [targetPersonId, full_name.trim(), updatedRole, person_id.trim()]
    );

    if (res.length === 0) {
      return NextResponse.json(
        { success: false, error: "PERSON_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: res[0],
      message: "Person details updated successfully.",
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to update person details.";
    return NextResponse.json(
      { success: false, error: "UPDATE_FAILED", message: errorMsg },
      { status: 500 }
    );
  }
}
