"use client";

import React, { useState, useEffect, useCallback } from "react";
import AdminNavbar from "@/components/face-attendance/AdminNavbar";
import CameraCapture, { DetectedFaceBox } from "@/components/face-attendance/CameraCapture";

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
  status: "recognized" | "unknown" | "spoof_suspected";
  distance?: number | null;
  confidence?: number;
  bbox: { x: number; y: number; w: number; h: number };
}

interface MultiFaceResponseData {
  faces_detected: number;
  recognized_count: number;
  unknown_count: number;
  is_low_light: boolean;
  status?: string;
  liveness?: {
    status: string;
    score: number;
    reasons: string[];
  };
  results: MultiFaceResultItem[];
}

interface SingleFaceResultData {
  status: "recognized" | "unknown" | "no_face_detected" | "spoof_suspected";
  person_id?: string | null;
  full_name?: string;
  role?: string;
  confidence?: number;
  distance?: number | null;
  quality_score?: number;
  is_low_light?: boolean;
  liveness?: {
    status: string;
    score: number;
    reasons: string[];
  };
}

export default function FaceTestPage() {
  const [registeredPeople, setRegisteredPeople] = useState<RegisteredPerson[]>([]);
  const [expectedPersonId, setExpectedPersonId] = useState<string>("");

  const [testMode, setTestMode] = useState<"single" | "multi">("multi");
  const [isTesting, setIsTesting] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const [singleResult, setSingleResult] = useState<SingleFaceResultData | null>(null);
  const [multiResult, setMultiResult] = useState<MultiFaceResponseData | null>(null);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);

  const fetchRegisteredPeople = useCallback(async () => {
    try {
      const res = await fetch("/api/face/list");
      const json = await res.json();
      if (json.success && json.data && json.data.registered_persons) {
        setRegisteredPeople(json.data.registered_persons);
      }
    } catch (err) {
      console.error("Error fetching registered list:", err);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadPeople = async () => {
      if (isMounted) {
        await fetchRegisteredPeople();
      }
    };
    loadPeople();
    return () => {
      isMounted = false;
    };
  }, [fetchRegisteredPeople]);

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
      console.error("Failed to identify face:", err);
    } finally {
      setIsTesting(false);
    }
  };

  const handleResetTest = () => {
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
      setCapturedPreviewUrl(null);
    }
    setSingleResult(null);
    setMultiResult(null);
    setLatencyMs(null);
    setIsTesting(false);
  };

  const isCameraDisabled = isTesting || singleResult !== null || multiResult !== null;

  // Convert multiResult bounding boxes for canvas overlay
  const overlayBoxes: DetectedFaceBox[] = multiResult
    ? multiResult.results.map((r) => ({
        x: r.bbox.x,
        y: r.bbox.y,
        w: r.bbox.w,
        h: r.bbox.h,
        label: r.full_name,
        status: r.status,
        distance: r.distance,
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
        {/* Title Header & Mode Toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "2rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <h1
              style={{
                fontFamily: "var(--_fonts---fonts--title-font, 'Instrument Sans', sans-serif)",
                fontSize: "2.25rem",
                fontWeight: 700,
                color: "#090909",
                margin: 0,
                letterSpacing: "-0.02em",
              }}
            >
              Multi-Face Recognition Engine 🧪
            </h1>
            <p style={{ margin: "0.35rem 0 0 0", color: "#6b7280", fontSize: "0.95rem" }}>
              Batch 1:N Vector Search & Classroom CCTV Analytics
            </p>
          </div>

          <div
            style={{
              display: "flex",
              backgroundColor: "#ffffff",
              padding: "0.35rem",
              borderRadius: "6.25rem",
              border: "1px solid #d1e0ff",
              boxShadow: "0 4px 12px rgba(0,64,193,0.04)",
            }}
          >
            <button
              onClick={() => {
                setTestMode("multi");
                handleResetTest();
              }}
              style={{
                padding: "0.6rem 1.35rem",
                borderRadius: "6.25rem",
                backgroundColor: testMode === "multi" ? "#0040c1" : "transparent",
                color: testMode === "multi" ? "#ffffff" : "#6b7280",
                border: "none",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              👥 Multi-Face CCTV Mode
            </button>
            <button
              onClick={() => {
                setTestMode("single");
                handleResetTest();
              }}
              style={{
                padding: "0.6rem 1.35rem",
                borderRadius: "6.25rem",
                backgroundColor: testMode === "single" ? "#0040c1" : "transparent",
                color: testMode === "single" ? "#ffffff" : "#6b7280",
                border: "none",
                fontWeight: 600,
                fontSize: "0.85rem",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              👤 Single-Face Kiosk Mode
            </button>
          </div>
        </div>

        {/* 2-Column Grid: Camera Left, Results Right */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", alignItems: "start" }}>
          {/* Left Column: Camera Stream */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "2rem",
              padding: "2rem",
              boxShadow: "0 10px 30px rgba(0, 64, 193, 0.08)",
              border: "1px solid #eff4ff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h2
                style={{
                  fontFamily: "var(--_fonts---fonts--title-font, 'Instrument Sans', sans-serif)",
                  fontSize: "1.35rem",
                  fontWeight: 600,
                  color: "#090909",
                  margin: 0,
                }}
              >
                {testMode === "multi" ? "Live CCTV Feed" : "Single-Face Stream"}
              </h2>

              {latencyMs && (
                <span style={{ fontSize: "0.8rem", color: "#0040c1", fontWeight: 700, fontFamily: "monospace" }}>
                  ⚡ {latencyMs} ms latency
                </span>
              )}
            </div>

            {testMode === "single" && (
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>
                  Expected Person (Optional Accuracy Test)
                </label>
                <select
                  value={expectedPersonId}
                  onChange={(e) => setExpectedPersonId(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "1rem",
                    border: "1px solid #d1e0ff",
                    fontSize: "0.9rem",
                    outline: "none",
                    backgroundColor: "#f9f9f9",
                  }}
                >
                  <option value="">-- None (Pure 1:N Identification Mode) --</option>
                  {registeredPeople.map((p) => (
                    <option key={p.person_id} value={p.person_id}>
                      {p.full_name} ({p.person_id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <CameraCapture
              onCapture={handleCaptureAndTest}
              disabled={isCameraDisabled}
              capturedPreviewUrl={capturedPreviewUrl}
              mode={testMode}
              overlayBoxes={overlayBoxes}
            />

            {(singleResult || multiResult) && (
              <button
                onClick={handleResetTest}
                style={{
                  marginTop: "1.25rem",
                  width: "100%",
                  padding: "0.85rem",
                  borderRadius: "6.25rem",
                  backgroundColor: "#0040c1",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(0, 64, 193, 0.25)",
                }}
              >
                ↻ Restart Live Analysis
              </button>
            )}
          </div>

          {/* Right Column: Recognition Analysis Panel */}
          <div>
            <h2
              style={{
                fontFamily: "var(--_fonts---fonts--title-font, 'Instrument Sans', sans-serif)",
                fontSize: "1.35rem",
                fontWeight: 600,
                color: "#090909",
                margin: "0 0 1.25rem 0",
              }}
            >
              Recognition Analysis
            </h2>

            {isTesting ? (
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "2rem",
                  padding: "4rem 2rem",
                  textAlign: "center",
                  boxShadow: "0 10px 30px rgba(0, 64, 193, 0.04)",
                  border: "1px solid #eff4ff",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "50%",
                    border: "3px solid #d1e0ff",
                    borderTopColor: "#0040c1",
                    animation: "spin 1s linear infinite",
                    margin: "0 auto 1.25rem auto",
                  }}
                />
                <h3 style={{ margin: "0 0 0.5rem 0", color: "#111827", fontSize: "1.1rem" }}>
                  {testMode === "multi" ? "Detecting & Batch Matching All Faces..." : "Analyzing Face Embedding..."}
                </h3>
                <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
                  Running RetinaFace + ArcFace 512-d vector matrix search.
                </p>
              </div>
            ) : multiResult ? (
              /* Multi-Face Classroom CCTV Results Panel */
              <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {/* Metric Summary Strip */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
                  <div style={{ backgroundColor: "#ffffff", padding: "1.15rem", borderRadius: "1.5rem", border: "1px solid #eff4ff" }}>
                    <div style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: 600 }}>Detected</div>
                    <div style={{ fontSize: "1.85rem", fontWeight: 700, color: "#0040c1", marginTop: "0.2rem" }}>
                      {multiResult.faces_detected}
                    </div>
                  </div>

                  <div style={{ backgroundColor: "#ecfdf5", padding: "1.15rem", borderRadius: "1.5rem", border: "1px solid #a7f3d0" }}>
                    <div style={{ fontSize: "0.8rem", color: "#059669", fontWeight: 600 }}>Recognized</div>
                    <div style={{ fontSize: "1.85rem", fontWeight: 700, color: "#059669", marginTop: "0.2rem" }}>
                      {multiResult.recognized_count}
                    </div>
                  </div>

                  <div style={{ backgroundColor: "#fef2f2", padding: "1.15rem", borderRadius: "1.5rem", border: "1px solid #fecaca" }}>
                    <div style={{ fontSize: "0.8rem", color: "#dc2626", fontWeight: 600 }}>Unknown</div>
                    <div style={{ fontSize: "1.85rem", fontWeight: 700, color: "#dc2626", marginTop: "0.2rem" }}>
                      {multiResult.unknown_count}
                    </div>
                  </div>

                  <div style={{ backgroundColor: "#eff4ff", padding: "1.15rem", borderRadius: "1.5rem", border: "1px solid #d1e0ff" }}>
                    <div style={{ fontSize: "0.8rem", color: "#0040c1", fontWeight: 600 }}>Latency</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#0040c1", marginTop: "0.35rem" }}>
                      {latencyMs ? `${latencyMs}ms` : "Fast"}
                    </div>
                  </div>
                </div>

                {/* List of Batch Recognized Faces */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "2rem",
                    padding: "1.75rem",
                    border: "1px solid #eff4ff",
                    boxShadow: "0 10px 30px rgba(0, 64, 193, 0.05)",
                  }}
                >
                  <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.2rem", color: "#090909" }}>
                    Batch Identified Faces ({multiResult.results.length})
                  </h3>

                  {multiResult.results.length === 0 ? (
                    <p style={{ color: "#9ca3af", fontSize: "0.9rem", margin: 0 }}>No faces detected in frame.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                      {multiResult.results.map((item) => (
                        <div
                          key={item.face_index}
                          style={{
                            padding: "1.15rem",
                            borderRadius: "1.25rem",
                            backgroundColor: item.status === "recognized" ? "#f0fdf4" : "#fef2f2",
                            border: `1px solid ${item.status === "recognized" ? "#bbf7d0" : "#fecaca"}`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                            <div
                              style={{
                                width: "42px",
                                height: "42px",
                                borderRadius: "50%",
                                backgroundColor: item.status === "recognized" ? "#dcfce7" : "#fee2e2",
                                color: item.status === "recognized" ? "#059669" : "#dc2626",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                                fontSize: "1.1rem",
                              }}
                            >
                              {item.status === "recognized" ? "✓" : "✕"}
                            </div>

                            <div>
                              <strong style={{ fontSize: "1rem", color: "#111827", display: "block" }}>
                                {item.full_name}
                              </strong>
                              <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                                Face #{item.face_index} • {item.role}
                              </span>
                            </div>
                          </div>

                          <div style={{ textAlign: "right" }}>
                            {item.status === "recognized" ? (
                              <span
                                style={{
                                  padding: "0.25rem 0.75rem",
                                  borderRadius: "6.25rem",
                                  backgroundColor: "#059669",
                                  color: "#ffffff",
                                  fontSize: "0.85rem",
                                  fontWeight: 700,
                                }}
                              >
                                Match Confirmed
                              </span>
                            ) : (
                              <span
                                style={{
                                  padding: "0.25rem 0.75rem",
                                  borderRadius: "6.25rem",
                                  backgroundColor: "#dc2626",
                                  color: "#ffffff",
                                  fontSize: "0.85rem",
                                  fontWeight: 700,
                                }}
                              >
                                Unknown
                              </span>
                            )}
                            <div style={{ fontSize: "0.75rem", color: "#6b7280", marginTop: "0.25rem", fontFamily: "monospace" }}>
                              Distance: {item.distance ?? "0.6800+"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : singleResult ? (
              /* Single Face Result Panel */
              (() => {
                const isSpoof = singleResult.status === "spoof_suspected" || singleResult.liveness?.status === "SPOOF_SUSPECTED";
                const isMatched = !isSpoof && singleResult.status === "recognized" && Boolean(singleResult.person_id);
                const isNoFace = !isSpoof && (singleResult.status === "no_face_detected" || (!isMatched && singleResult.person_id === null));

                let badgeText = "✓ CONFIRMED MATCH";
                let badgeBg = "#ecfdf5";
                let badgeColor = "#059669";
                let borderColor = "#a7f3d0";

                if (isSpoof) {
                  badgeText = "📱 SCREEN / MOBILE DETECTED";
                  badgeBg = "#fff2f0";
                  badgeColor = "#ff4d4f";
                  borderColor = "#ffccc7";
                } else if (isNoFace) {
                  badgeText = "📷 NO FACE DETECTED";
                  badgeBg = "#f3f4f6";
                  badgeColor = "#4b5563";
                  borderColor = "#e5e7eb";
                } else if (!isMatched) {
                  badgeText = "⚠️ UNKNOWN FACE";
                  badgeBg = "#fef2f2";
                  badgeColor = "#dc2626";
                  borderColor = "#fca5a5";
                }

                return (
                  <div
                    style={{
                      backgroundColor: "#ffffff",
                      borderRadius: "2rem",
                      padding: "2rem",
                      boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
                      border: `2px solid ${borderColor}`,
                    }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.35rem 0.85rem",
                        borderRadius: "6.25rem",
                        backgroundColor: badgeBg,
                        color: badgeColor,
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        marginBottom: "1rem",
                      }}
                    >
                      {badgeText}
                    </div>

                    <h3 style={{ fontSize: "1.85rem", fontWeight: 700, color: "#090909", margin: "0 0 0.25rem 0" }}>
                      {isSpoof ? "Presentation Attack Blocked" : isMatched ? singleResult.full_name : isNoFace ? "No Face in Camera Frame" : "Unknown Face"}
                    </h3>
                    <div style={{ color: "#6b7280", fontSize: "0.9rem", fontFamily: "monospace", marginBottom: "1rem" }}>
                      Person ID: <code>{isSpoof ? "none (Spoof Blocked)" : isMatched ? singleResult.person_id : isNoFace ? "none" : "unrecognized"}</code>
                    </div>

                    {/* Anti-Spoofing & Security Feedback Guidance Box */}
                    <div
                      style={{
                        padding: "0.85rem 1.15rem",
                        borderRadius: "1rem",
                        backgroundColor: isSpoof ? "#fff2f0" : isMatched ? "#ecfdf5" : isNoFace ? "#f9fafb" : "#fff2f0",
                        border: `1px solid ${borderColor}`,
                        color: isSpoof ? "#dc2626" : isMatched ? "#047857" : isNoFace ? "#4b5563" : "#dc2626",
                        fontSize: "0.88rem",
                        fontWeight: 600,
                        marginBottom: "1.5rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      {isSpoof
                        ? "📱 Screen / photo detected. Please keep your mobile phone away and show your live face."
                        : isMatched
                        ? `✓ ${singleResult.full_name} — Live face verified successfully.`
                        : isNoFace
                        ? "👀 No face detected. Please step into the camera frame."
                        : "❓ Live face detected, but this person is not enrolled in the directory."}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div style={{ padding: "1rem", borderRadius: "1rem", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
                        <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>Cosine Distance</div>
                        <div style={{ fontSize: isMatched ? "1.5rem" : "0.95rem", fontWeight: 700, color: isMatched ? "#0040c1" : "#6b7280", marginTop: "0.25rem" }}>
                          {isMatched && singleResult.distance != null ? singleResult.distance : isSpoof ? "Blocked (Spoof)" : isNoFace ? "N/A" : "No match (< 0.68)"}
                        </div>
                      </div>

                      <div style={{ padding: "1rem", borderRadius: "1rem", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
                        <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>Match Threshold</div>
                        <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#059669" }}>
                          0.6800
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "2rem",
                  padding: "4rem 2rem",
                  textAlign: "center",
                  border: "1px dashed #c2e0ff",
                  boxShadow: "0 10px 30px rgba(0, 64, 193, 0.04)",
                }}
              >
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    backgroundColor: "#eff4ff",
                    color: "#0040c1",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.75rem",
                    marginBottom: "1rem",
                  }}
                >
                  👥
                </div>
                <h3
                  style={{
                    fontFamily: "var(--_fonts---fonts--title-font, 'Instrument Sans', sans-serif)",
                    fontSize: "1.35rem",
                    margin: "0 0 0.5rem 0",
                    color: "#090909",
                  }}
                >
                  Multi-Face CCTV Engine Ready
                </h3>
                <p style={{ color: "#6b7280", fontSize: "0.95rem", margin: 0, lineHeight: 1.5 }}>
                  Align faces inside camera frame. Auto-recognition will detect and match all faces in the frame simultaneously.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
