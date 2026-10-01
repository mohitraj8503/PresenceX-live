import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    data: { authenticated: false },
    error: null,
  });

  response.cookies.delete("presencex_session");
  return response;
}
