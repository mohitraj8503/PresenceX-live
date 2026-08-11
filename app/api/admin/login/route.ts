import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { password } = await request.json();
    const expectedPassword = process.env.ADMIN_PASSWORD || "Mohit@123";

    if (!password || password !== expectedPassword) {
      return NextResponse.json(
        { success: false, data: null, error: "invalid_password" },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      data: { authenticated: true },
      error: null,
    });

    // Set HTTP-only session cookie valid for 7 days
    response.cookies.set("presencex_session", "authenticated", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, data: null, error: "bad_request" },
      { status: 400 }
    );
  }
}
