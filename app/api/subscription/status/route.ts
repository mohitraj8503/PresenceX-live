import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const plan = cookieStore.get("presencex_plan")?.value || "FREE_TRIAL";
    const orgName = cookieStore.get("presencex_org")?.value || "St. Xavier International School";

    return NextResponse.json({
      success: true,
      data: {
        organization_name: decodeURIComponent(orgName),
        plan_id: plan,
        plan_name:
          plan === "PROFESSIONAL"
            ? "Professional Plan"
            : plan === "STARTER"
            ? "Starter Plan"
            : plan === "ENTERPRISE"
            ? "Enterprise Plan"
            : "Free Trial Plan",
        status: plan === "FREE_TRIAL" ? "TRIALING" : "ACTIVE",
        trial_days_remaining: plan === "FREE_TRIAL" ? 14 : 0,
        is_paid: plan !== "FREE_TRIAL",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch subscription status" },
      { status: 500 }
    );
  }
}
