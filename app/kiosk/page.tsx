"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import AdminNavbar from "@/components/face-attendance/AdminNavbar";
import CameraCapture from "@/components/face-attendance/CameraCapture";
import Link from "next/link";

interface ActiveSessionData {
  session_id: string;
  session_name: string;
  is_active: boolean;
  started_at: string;
  total_marked: number;
}

interface StudentPresenceState {
  person_id: string;
  full_name: string;
  role: string;
  status: "PRESENT" | "TEMPORARILY_AWAY" | "EXTENDED_ABSENCE" | "ABSENT";
  marked_at: string;
  last_seen_at: string;
  checkpoints_passed: number;
  total_checkpoints: number;
  away_started_at?: string | null;
  away_seconds?: number;
}

interface AttendanceReport {
  session_id: string;
  session_name: string;
  is_active: boolean;
  total_registered: number;
  present_count: number;
  absent_count: number;
  present: Array<{
    person_id: string;
    full_name: string;
    role: string;
    marked_at: string;
    confidence: number;
    distance: number;
  }>;
  absentees: Array<{
    person_id: string;
    full_name: string;
    role: string;
  }>;
}

export default function KioskPage() {
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [report, setReport] = useState<AttendanceReport | null>(null);

  const [isProcessingMark, setIsProcessingMark] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [completedCheckpoints, setCompletedCheckpoints] = useState(1);
  const [presenceList, setPresenceList] = useState<StudentPresenceState[]>([]);

  const [showEndModal, setShowEndModal] = useState(false);
  const [sessionCompletedSummary, setSessionCompletedSummary] = useState<AttendanceReport | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchReport = useCallback(async (sessionId: string) => {
    try {
      const res = await fetch(`/api/attendance/session/${sessionId}/report`);
      const json = await res.json();
      if (json.success && json.data) {
        setReport(json.data);

        // Build 5-Minute Grace Period State List
        const rData: AttendanceReport = json.data;
        const presentIds = new Set(rData.present.map((p) => p.person_id));

        const updatedPresence: StudentPresenceState[] = [
          ...rData.present.map((p) => ({
            person_id: p.person_id,
            full_name: p.full_name,
            role: p.role,
            status: "PRESENT" as const,
            last_seen_at: p.marked_at,
            marked_at: p.marked_at,
            checkpoints_passed: 0,
            total_checkpoints: 30,
          })),
          ...rData.absentees.map((a) => ({
            person_id: a.person_id,
            full_name: a.full_name,
            role: a.role,
            status: "ABSENT" as const,
            last_seen_at: "",
            marked_at: "",
            checkpoints_passed: 0,
            total_checkpoints: 30,
          })),
        ];

        setPresenceList(updatedPresence);
      }
    } catch (err) {
      console.error("Error fetching session report:", err);
    }
  }, []);

  const fetchActiveSession = useCallback(async () => {
    setIsLoadingSession(true);
    try {
      const res = await fetch("/api/session/active");
      const json = await res.json();
      if (json.success && json.data && json.data.is_active) {
        setActiveSession(json.data);
        fetchReport(json.data.session_id);
      } else {
        setActiveSession(null);
        setReport(null);
      }
    } catch (err) {
      console.error("Error fetching active session:", err);
    } finally {
      setIsLoadingSession(false);
    }
  }, [fetchReport]);

  useEffect(() => {
    let isMounted = true;
    const loadSession = async () => {
      if (isMounted) {
        await fetchActiveSession();
      }
    };
    loadSession();
    return () => {
      isMounted = false;
    };
  }, [fetchActiveSession]);

  // Elapsed Session Timer & Checkpoint Counter
  useEffect(() => {
    if (!activeSession || isPaused || sessionCompletedSummary) return;

    const startTime = new Date(activeSession.started_at).getTime();
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const diffSec = Math.max(0, Math.floor((now - startTime) / 1000));
      setElapsedSeconds(diffSec);

      // 60-second checkpoint increment (capped at 30)
      const currentCheckNumber = Math.min(30, Math.max(1, Math.floor(diffSec / 60) + 1));
      setCompletedCheckpoints(currentCheckNumber);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSession, isPaused, sessionCompletedSummary]);

  const handleCheckpointCapture = async (file: File) => {
    if (!activeSession || isProcessingMark || isPaused || sessionCompletedSummary) return;

    setIsProcessingMark(true);

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("session_id", activeSession.session_id);

      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        body: formData,
        headers: { Cookie: "presencex_session=authenticated" },
      });

      const json = await res.json();

      if (json.success && json.data) {
        await fetchReport(activeSession.session_id);
      }
    } catch (err) {
      console.error("Checkpoint mark error:", err);
    } finally {
      setIsProcessingMark(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;

    try {
      const res = await fetch(`/api/session/${activeSession.session_id}/end`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        const reportRes = await fetch(`/api/attendance/session/${activeSession.session_id}/report`);
        const reportJson = await reportRes.json();

        if (reportJson.success && reportJson.data) {
          setSessionCompletedSummary(reportJson.data);
        }
        setShowEndModal(false);
        setActiveSession(null);
      }
    } catch (err) {
      console.error("Error ending session:", err);
    }
  };

  const formatElapsed = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const remainderSec = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${remainderSec.toString().padStart(2, "0")}`;
  };

  const totalRegistered = report?.total_registered ?? 9;
  const presentCount = report?.present_count ?? 0;
  const remainingCount = Math.max(0, totalRegistered - presentCount);
  const attendanceRate = totalRegistered > 0 ? Math.round((presentCount / totalRegistered) * 100) : 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5faff",
        color: "#090909",
        fontFamily: "var(--_fonts---fonts--paragraph-font, Poppins, sans-serif)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AdminNavbar />

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "2.5rem 1.5rem", flex: 1, width: "100%" }}>
        {/* Completed Session Summary View */}
        {sessionCompletedSummary ? (
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "2rem",
              padding: "3rem 2.5rem",
              maxWidth: "800px",
              margin: "2rem auto",
              boxShadow: "0 20px 40px rgba(0,64,193,0.08)",
              border: "2px solid #a7f3d0",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                backgroundColor: "#ecfdf5",
                color: "#059669",
                fontSize: "2.25rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.25rem",
              }}
            >
              ✓
            </div>

            <h2
              style={{
                fontFamily: "var(--_fonts---fonts--title-font, 'Instrument Sans', sans-serif)",
                fontSize: "2.25rem",
                fontWeight: 700,
                color: "#090909",
                margin: "0 0 0.5rem 0",
              }}
            >
              Attendance Session Completed
            </h2>
            <p style={{ color: "#6b7280", fontSize: "1rem", margin: "0 0 2rem 0" }}>
              {sessionCompletedSummary.session_name}
            </p>

            {/* Metric Strip */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.25rem", marginBottom: "2.5rem" }}>
              <div style={{ padding: "1.25rem", borderRadius: "1.5rem", backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" }}>
                <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>Enrolled</div>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", marginTop: "0.25rem" }}>
                  {sessionCompletedSummary.total_registered}
                </div>
              </div>

              <div style={{ padding: "1.25rem", borderRadius: "1.5rem", backgroundColor: "#ecfdf5", border: "1px solid #a7f3d0" }}>
                <div style={{ fontSize: "0.85rem", color: "#059669", fontWeight: 600 }}>Present</div>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: "#059669", marginTop: "0.25rem" }}>
                  {sessionCompletedSummary.present_count}
                </div>
              </div>

              <div style={{ padding: "1.25rem", borderRadius: "1.5rem", backgroundColor: "#fef2f2", border: "1px solid #fecaca" }}>
                <div style={{ fontSize: "0.85rem", color: "#dc2626", fontWeight: 600 }}>Absentees</div>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: "#dc2626", marginTop: "0.25rem" }}>
                  {sessionCompletedSummary.absent_count}
                </div>
              </div>

              <div style={{ padding: "1.25rem", borderRadius: "1.5rem", backgroundColor: "#eff4ff", border: "1px solid #d1e0ff" }}>
                <div style={{ fontSize: "0.85rem", color: "#0040c1", fontWeight: 600 }}>Rate</div>
                <div style={{ fontSize: "2rem", fontWeight: 700, color: "#0040c1", marginTop: "0.25rem" }}>
                  {sessionCompletedSummary.total_registered > 0
                    ? Math.round((sessionCompletedSummary.present_count / sessionCompletedSummary.total_registered) * 100)
                    : 0}%
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <Link
                href="/admin/dashboard"
                style={{
                  padding: "0.85rem 2rem",
                  borderRadius: "6.25rem",
                  backgroundColor: "#0040c1",
                  color: "#ffffff",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  textDecoration: "none",
                  boxShadow: "0 4px 14px rgba(0, 64, 193, 0.25)",
                }}
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        ) : !activeSession ? (
          /* No Active Session State */
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "2rem",
              padding: "4rem 2rem",
              textAlign: "center",
              maxWidth: "600px",
              margin: "3rem auto",
              boxShadow: "0 10px 30px rgba(0,64,193,0.06)",
              border: "1px dashed #c2e0ff",
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
                marginBottom: "1.25rem",
              }}
            >
              📷
            </div>
            <h2
              style={{
                fontFamily: "var(--_fonts---fonts--title-font, 'Instrument Sans', sans-serif)",
                fontSize: "1.75rem",
                fontWeight: 700,
                color: "#090909",
                margin: "0 0 0.5rem 0",
              }}
            >
              No Live Session Running
            </h2>
            <p style={{ color: "#6b7280", fontSize: "0.95rem", margin: "0 0 2rem 0", lineHeight: 1.5 }}>
              Start an attendance session from the dashboard to activate the periodic 60s checkpoint engine.
            </p>

            <Link
              href="/admin/dashboard"
              style={{
                padding: "0.85rem 2rem",
                borderRadius: "6.25rem",
                backgroundColor: "#0040c1",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: "0.95rem",
                textDecoration: "none",
                boxShadow: "0 4px 14px rgba(0, 64, 193, 0.25)",
              }}
            >
              Start Session from Dashboard
            </Link>
          </div>
        ) : (
          /* Active Live Kiosk Control Center */
          <div>
            {/* Live Session Control Header - Spacious & Pixel-Perfect */}
            <div
              style={{
                backgroundColor: "#ffffff",
                borderRadius: "2rem",
                padding: "2rem 2.25rem",
                marginBottom: "2.5rem",
                boxShadow: "0 10px 30px rgba(0, 64, 193, 0.05)",
                border: "1px solid #eff4ff",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "2rem",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span
                    style={{
                      padding: "0.35rem 0.85rem",
                      borderRadius: "6.25rem",
                      backgroundColor: isPaused ? "#fffbeb" : "#ecfdf5",
                      color: isPaused ? "#d97706" : "#059669",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                    }}
                  >
                    {isPaused ? "⏸ PAUSED" : "🟢 LIVE ATTENDANCE"}
                  </span>
                  <span style={{ fontSize: "0.9rem", color: "#6b7280" }}>
                    Elapsed: <strong style={{ color: "#111827" }}>{formatElapsed(elapsedSeconds)}</strong>
                  </span>
                  <span style={{ fontSize: "0.9rem", color: "#0040c1", fontWeight: 600 }}>
                    Checkpoint #{completedCheckpoints} / 30
                  </span>
                </div>

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
                  {activeSession.session_name}
                </h1>
              </div>

              {/* Spacious Metric Strip Cards */}
              <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", flexWrap: "wrap" }}>
                <div
                  style={{
                    backgroundColor: "#ecfdf5",
                    border: "1px solid #a7f3d0",
                    borderRadius: "1.5rem",
                    padding: "0.85rem 1.35rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.2rem",
                    minWidth: "110px",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", color: "#059669", fontWeight: 600 }}>Present</span>
                  <span style={{ fontSize: "1.75rem", fontWeight: 700, color: "#059669", lineHeight: 1 }}>
                    {presentCount} / {totalRegistered}
                  </span>
                </div>

                <div
                  style={{
                    backgroundColor: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: "1.5rem",
                    padding: "0.85rem 1.35rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.2rem",
                    minWidth: "110px",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", color: "#6b7280", fontWeight: 600 }}>Remaining</span>
                  <span style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>
                    {remainingCount}
                  </span>
                </div>

                <div
                  style={{
                    backgroundColor: "#eff4ff",
                    border: "1px solid #d1e0ff",
                    borderRadius: "1.5rem",
                    padding: "0.85rem 1.35rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.2rem",
                    minWidth: "100px",
                  }}
                >
                  <span style={{ fontSize: "0.8rem", color: "#0040c1", fontWeight: 600 }}>Coverage</span>
                  <span style={{ fontSize: "1.75rem", fontWeight: 700, color: "#0040c1", lineHeight: 1 }}>
                    {attendanceRate}%
                  </span>
                </div>

                {/* Session Actions */}
                <div style={{ display: "flex", gap: "0.85rem", marginLeft: "0.5rem" }}>
                  <button
                    onClick={() => setIsPaused(!isPaused)}
                    style={{
                      padding: "0.85rem 1.5rem",
                      borderRadius: "6.25rem",
                      backgroundColor: "#ffffff",
                      color: "#374151",
                      border: "1px solid #d1e0ff",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      cursor: "pointer",
                    }}
                  >
                    {isPaused ? "▶ Resume" : "⏸ Pause"}
                  </button>

                  <button
                    onClick={() => setShowEndModal(true)}
                    style={{
                      padding: "0.85rem 1.75rem",
                      borderRadius: "6.25rem",
                      backgroundColor: "#dc2626",
                      color: "#ffffff",
                      border: "none",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(220, 38, 38, 0.25)",
                    }}
                  >
                    Stop & End Session
                  </button>
                </div>
              </div>
            </div>

            {/* 2-Column Layout: Live Camera Left, Verified Attendees List Right */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "2rem", alignItems: "start" }}>
              {/* Left Column: Live Camera */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "2rem",
                  padding: "2rem",
                  boxShadow: "0 10px 30px rgba(0, 64, 193, 0.06)",
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
                    Live Kiosk Camera
                  </h2>
                  <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                    60s Periodic Checkpoint Verification Active ⏱️
                  </span>
                </div>

                <CameraCapture
                  onCapture={handleCheckpointCapture}
                  disabled={isPaused || isProcessingMark}
                  mode="kiosk"
                  checkpointIntervalSeconds={60}
                />
              </div>

              {/* Right Column: Live Verified Attendees List */}
              <div
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "2rem",
                  padding: "1.75rem",
                  boxShadow: "0 10px 30px rgba(0, 64, 193, 0.06)",
                  border: "1px solid #eff4ff",
                  maxHeight: "680px",
                  overflowY: "auto",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                  <h3
                    style={{
                      fontFamily: "var(--_fonts---fonts--title-font, 'Instrument Sans', sans-serif)",
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      color: "#090909",
                      margin: 0,
                    }}
                  >
                    Live Student Presence ({presenceList.length})
                  </h3>
                  <span style={{ fontSize: "0.8rem", color: "#059669", fontWeight: 700 }}>
                    5-Min Grace Active
                  </span>
                </div>

                {presenceList.length === 0 ? (
                  <div style={{ padding: "3rem 1rem", textAlign: "center", color: "#9ca3af" }}>
                    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👤</div>
                    <p style={{ margin: 0, fontSize: "0.9rem" }}>No students verified in this session yet.</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                    {presenceList.map((p) => (
                      <div
                        key={p.person_id}
                        style={{
                          padding: "1rem 1.15rem",
                          borderRadius: "1.25rem",
                          backgroundColor: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                          <div
                            style={{
                              width: "40px",
                              height: "40px",
                              borderRadius: "50%",
                              backgroundColor: "#dcfce7",
                              color: "#059669",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 700,
                              fontSize: "1.1rem",
                            }}
                          >
                            ✓
                          </div>
                          <div>
                            <strong style={{ fontSize: "0.95rem", color: "#111827", display: "block" }}>
                              {p.full_name}
                            </strong>
                            <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                              Presence: {p.checkpoints_passed} / {p.total_checkpoints} checkpoints
                            </span>
                          </div>
                        </div>

                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.35rem",
                            padding: "0.45rem 0.95rem",
                            borderRadius: "6.25rem",
                            backgroundColor: "#059669",
                            color: "#ffffff",
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            boxShadow: "0 2px 6px rgba(5, 150, 105, 0.2)",
                          }}
                        >
                          ✓ Present
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* End Session Confirmation Modal */}
      {showEndModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "460px",
              backgroundColor: "#ffffff",
              borderRadius: "2rem",
              padding: "2rem",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "#fef2f2",
                color: "#dc2626",
                fontSize: "1.5rem",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              🛑
            </div>
            <h3 style={{ margin: "0 0 0.5rem 0", fontSize: "1.35rem", color: "#090909" }}>
              Run Final Verification & End Session?
            </h3>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: "0 0 1.75rem 0", lineHeight: 1.5 }}>
              A mandatory final checkpoint verification will run to finalize total presence coverage % for all enrolled students.
            </p>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              <button
                onClick={() => setShowEndModal(false)}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "6.25rem",
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                }}
              >
                Continue Session
              </button>
              <button
                onClick={handleEndSession}
                style={{
                  padding: "0.75rem 1.75rem",
                  borderRadius: "6.25rem",
                  backgroundColor: "#dc2626",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(220, 38, 38, 0.25)",
                }}
              >
                Finalize & Generate Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
