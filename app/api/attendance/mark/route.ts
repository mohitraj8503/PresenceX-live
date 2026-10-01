import { NextResponse } from "next/server";
import { POST as recognizeAndMarkPOST } from "../recognize-and-mark/route";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const sessionId = formData.get("session_id") as string;

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: "SESSION_AND_PERSON_ID_REQUIRED" },
        { status: 400 }
      );
    }

    // Proxy securely to recognize-and-mark if image is attached
    const imageFile = formData.get("image");
    if (imageFile) {
      const markReq = new Request("http://localhost/api/attendance/recognize-and-mark", {
        method: "POST",
        body: formData,
      });
      return await recognizeAndMarkPOST(markReq);
    }

    return NextResponse.json(
      {
        success: false,
        error: "CLIENT_PERSON_ID_NOT_ALLOWED",
        message: "Attendance must be marked via live facial recognition frame capture.",
      },
      { status: 403 }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Failed to mark attendance.";
    return NextResponse.json(
      { success: false, error: "ATTENDANCE_FAILED", message: errorMsg },
      { status: 500 }
    );
  }
}
