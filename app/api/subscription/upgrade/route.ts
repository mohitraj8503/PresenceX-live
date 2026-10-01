import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plan } = body;

    if (!plan) {
      return NextResponse.json({ success: false, error: "Plan ID is required" }, { status: 400 });
    }

    const response = NextResponse.json({
      success: true,
      data: {
        plan_id: plan,
        status: "ACTIVE",
        upgraded_at: new Date().toISOString(),
      },
    });

    response.cookies.set("presencex_plan", plan, {
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch {
    return NextResponse.json({ success: false, error: "Failed to upgrade subscription" }, { status: 500 });
  }
}
