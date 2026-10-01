"use client";

import React, { useState, useEffect, useCallback } from "react";
import AdminNavbar from "@/components/face-attendance/AdminNavbar";
import CameraCapture, { DetectedFaceBox } from "@/components/face-attendance/CameraCapture";
import Link from "next/link";

interface RegisteredPerson {
  person_id: string;
  full_name: string;
  role: string;
}

interface MultiFaceResultItem {
  face_index: number;
  person_id?: string | null;
  full_name?: string;
  role?: string;
  status: "recognized" | "unknown";
  distance?: number;
  confidence?: number;
  bbox: { x: number; y: number; w: number; h: number };
}

interface MultiFaceResponseData {
  faces_detected: number;
  recognized_count: number;
  unknown_count: number;
  is_low_light: boolean;
  results: MultiFaceResultItem[];
}

export default function TestFaceTestPage() {
  const [testMode, setTestMode] = useState<"single" | "multi">("multi");
  const [isTesting, setIsTesting] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const [, setSingleResult] = useState<unknown | null>(null);
  const [multiResult, setMultiResult] = useState<MultiFaceResponseData | null>(null);
  const [, setCapturedPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/face/list")
      .then((res) => res.json())
      .then(() => {})
      .catch((err) => {
        if (isMounted) console.error("Error fetching registered list:", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleCaptureAndTest = async (file: File, qualityScore?: number) => {
    setIsTesting(true);
    setSingleResult(null);
    setMultiResult(null);

    const startTime = performance.now();
    const previewUrl = URL.createObjectURL(file);
    setCapturedPreviewUrl(previewUrl);

    try {
      const formData = new FormData();
      formData.append("image", file);

      if (testMode === "multi") {
        const res = await fetch("/api/face/identify-multi", {
          method: "POST",
          body: formData,
        });

        const json = await res.json();
        const endTime = performance.now();
        setLatencyMs(Math.round(endTime - startTime));

        if (json.success && json.data) {
          setMultiResult(json.data);
        }
      } else {
        const res = await fetch("/api/face/identify", {
          method: "POST",
          body: formData,
        });

        const json = await res.json();
        const endTime = performance.now();
        setLatencyMs(Math.round(endTime - startTime));

        if (json.success && json.data) {
          setSingleResult({ ...json.data, quality_score: qualityScore ?? 92 });
        }
      }
    } catch (err) {
      console.error("Test execution failed:", err);
    } finally {
      setIsTesting(false);
    }
  };

  const detectedBoxes: DetectedFaceBox[] = multiResult
    ? multiResult.results.map((r) => ({
        x: r.bbox.x,
        y: r.bbox.y,
        w: r.bbox.w,
        h: r.bbox.h,
        label: r.status === "recognized" ? r.full_name || r.person_id || "Recognized" : "Unknown",
        confidence: r.confidence ?? 0,
        status: r.status,
      }))
    : [];

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5faff",
        fontFamily: "var(--_fonts---fonts--paragraph-font, Poppins, sans-serif)",
      }}
    >
      <AdminNavbar />

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {/* Test Mode Banner */}
        <div
          style={{
            backgroundColor: "#fffbeb",
            border: "1px solid #fef3c7",
            borderRadius: "1.5rem",
            padding: "1.25rem 1.75rem",
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 4px 14px rgba(217, 119, 6, 0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <span
              style={{
                padding: "0.35rem 0.85rem",
                borderRadius: "6.25rem",
                backgroundColor: "#d97706",
                color: "#ffffff",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
            >
              🧪 TEST MODE
            </span>
            <div>
              <strong style={{ fontSize: "1rem", color: "#92400e" }}>Interactive Face Test Sandbox</strong>
              <span style={{ fontSize: "0.85rem", color: "#b45309", marginLeft: "0.75rem" }}>
                Test RetinaFace & ArcFace 512-d Recognition Engine
              </span>
            </div>
          </div>

          <Link
            href="/test/dashboard"
            style={{
              padding: "0.65rem 1.35rem",
              borderRadius: "6.25rem",
              backgroundColor: "#ffffff",
              color: "#d97706",
              border: "1px solid #fef3c7",
              fontWeight: 600,
              fontSize: "0.85rem",
              textDecoration: "none",
            }}
          >
            ← Back to Test Sandbox
          </Link>
        </div>

        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h1
            style={{
              fontFamily: "var(--_fonts---fonts--title-font, 'Instrument Sans', sans-serif)",
              fontSize: "2.25rem",
              fontWeight: 700,
              color: "#090909",
              margin: 0,
            }}
          >
            Face Recognition Test Lab 🧪
          </h1>
          <p style={{ margin: "0.35rem 0 0 0", color: "#6b7280", fontSize: "0.95rem" }}>
            Benchmark multi-face detection, ArcFace cosine distance & inference latency
          </p>
        </div>

        {/* Workspace */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: "2rem" }}>
          {/* Camera Capture Card */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "2rem",
              padding: "2rem",
              boxShadow: "0 10px 30px rgba(0,64,193,0.05)",
              border: "1px solid #eff4ff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0, color: "#090909" }}>Live Camera Diagnostic Stream</h2>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => setTestMode("multi")}
                  style={{
                    padding: "0.45rem 1rem",
                    borderRadius: "6.25rem",
                    backgroundColor: testMode === "multi" ? "#0040c1" : "#f3f4f6",
                    color: testMode === "multi" ? "#ffffff" : "#4b5563",
                    border: "none",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  Multi-Face CCTV
                </button>
                <button
                  onClick={() => setTestMode("single")}
                  style={{
                    padding: "0.45rem 1rem",
                    borderRadius: "6.25rem",
                    backgroundColor: testMode === "single" ? "#0040c1" : "#f3f4f6",
                    color: testMode === "single" ? "#ffffff" : "#4b5563",
                    border: "none",
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                  }}
                >
                  Single Face
                </button>
              </div>
            </div>

            <CameraCapture
              overlayBoxes={detectedBoxes}
              onCapture={(file) => handleCaptureAndTest(file)}
            />
          </div>

          {/* Diagnostic Results Card */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "2rem",
              padding: "2rem",
              boxShadow: "0 10px 30px rgba(0,64,193,0.05)",
              border: "1px solid #eff4ff",
            }}
          >
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 1.25rem 0", color: "#090909" }}>Diagnostic Output</h2>

            {isTesting ? (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#6b7280" }}>
                Running ArcFace Inference...
              </div>
            ) : multiResult ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <div style={{ flex: 1, backgroundColor: "#eff4ff", padding: "1rem", borderRadius: "1.25rem", textAlign: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "#0040c1", fontWeight: 600 }}>Detected Faces</span>
                    <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0040c1" }}>{multiResult.faces_detected}</div>
                  </div>

                  <div style={{ flex: 1, backgroundColor: "#ecfdf5", padding: "1rem", borderRadius: "1.25rem", textAlign: "center" }}>
                    <span style={{ fontSize: "0.8rem", color: "#059669", fontWeight: 600 }}>Recognized</span>
                    <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#059669" }}>{multiResult.recognized_count}</div>
                  </div>
                </div>

                {latencyMs && (
                  <div style={{ fontSize: "0.85rem", color: "#6b7280", fontFamily: "monospace", textAlign: "center" }}>
                    ⚡ Inference Latency: {latencyMs}ms
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
                  {multiResult.results.map((r, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: "1rem",
                        borderRadius: "1.25rem",
                        backgroundColor: r.status === "recognized" ? "#f0fdf4" : "#fef2f2",
                        border: r.status === "recognized" ? "1px solid #bbf7d0" : "1px solid #fecaca",
                      }}
                    >
                      <strong style={{ fontSize: "0.95rem", color: "#111827", display: "block" }}>
                        {r.status === "recognized" ? `✓ ${r.full_name || r.person_id}` : "✕ Unknown Person"}
                      </strong>
                      <div style={{ fontSize: "0.8rem", color: "#4b5563", marginTop: "0.25rem", fontFamily: "monospace" }}>
                        Distance: {r.distance?.toFixed(4) ?? "N/A"} • Confidence: {r.confidence?.toFixed(1) ?? "0"}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#9ca3af" }}>
                Align camera stream to view real-time multi-face diagnostic results.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
