import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get("image");

    if (!image) {
      return NextResponse.json({ success: false, error: "image_required" }, { status: 400 });
    }

    const backendFormData = new FormData();
    backendFormData.append("image", image);

    const pythonRes = await fetch("http://127.0.0.1:8001/api/face/identify-multi", {
      method: "POST",
      body: backendFormData,
    });

    const json = await pythonRes.json();
    return NextResponse.json(json, { status: pythonRes.status });
  } catch (error: unknown) {
    const err = error as Error;
    console.error("Error in Next.js /api/face/identify-multi proxy:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to communicate with Face Engine." },
      { status: 500 }
    );
  }
}
