"use client";

import React, { useState, useEffect, useCallback } from "react";
import AdminNavbar from "@/components/face-attendance/AdminNavbar";
import CameraCapture from "@/components/face-attendance/CameraCapture";
import Link from "next/link";

interface RegisteredPerson {
  person_id: string;
  full_name: string;
  role: string;
  model_name?: string;
  created_at: string;
}

export default function AdminRegisterPage() {
  const [personId, setPersonId] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("student");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [capturedPreviewUrl, setCapturedPreviewUrl] = useState<string | null>(null);

  const [successData, setSuccessData] = useState<{
    person_id: string;
    full_name: string;
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [registeredPeople, setRegisteredPeople] = useState<RegisteredPerson[]>([]);
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);

  const fetchRegisteredPeople = useCallback(async () => {
    setIsLoadingPeople(true);
    try {
      const res = await fetch("/api/face/list");
      const json = await res.json();
      if (json.success && json.data && json.data.registered_persons) {
        setRegisteredPeople(json.data.registered_persons);
      }
    } catch (err) {
      console.error("Error fetching registered people:", err);
    } finally {
      setIsLoadingPeople(false);
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

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFullName(val);
    if (!personId || personId === fullName.toLowerCase().replace(/[^a-z0-9]/g, "_")) {
      setPersonId(val.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_"));
    }
  };

  const handleCapture = async (file: File) => {
    if (!fullName.trim() || !personId.trim()) {
      setErrorMessage("Please enter both Full Name and Person ID before capturing photo.");
      return;
    }

    setErrorMessage(null);
    const previewUrl = URL.createObjectURL(file);
    setCapturedPreviewUrl(previewUrl);

    await submitRegistration(file);
  };

  const submitRegistration = async (file: File) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append("image", file);
      formData.append("person_id", personId.trim());
      formData.append("full_name", fullName.trim());
      formData.append("role", role);

      const res = await fetch("/api/face/register", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (json.success) {
        setSuccessData({
          person_id: json.data.person_id,
          full_name: json.data.full_name || fullName,
        });
        await fetchRegisteredPeople();
      } else {
        if (json.error === "spoof_detected") {
          setErrorMessage("Anti-Spoof Rejection: Please use a live camera face, not a photo or screen display.");
        } else if (json.error === "no_face_detected") {
          setErrorMessage("No face detected in photo. Please align face inside frame and retry.");
        } else {
          setErrorMessage(json.error || "Failed to register face.");
        }
      }
    } catch (err) {
      setErrorMessage("Network error occurred while registering face.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setPersonId("");
    setFullName("");
    setRole("student");
    if (capturedPreviewUrl) {
      URL.revokeObjectURL(capturedPreviewUrl);
      setCapturedPreviewUrl(null);
    }
    setSuccessData(null);
    setErrorMessage(null);
    setIsSubmitting(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5faff",
        fontFamily: "var(--_fonts---fonts--paragraph-font, Poppins, sans-serif)",
      }}
    >
      <AdminNavbar />

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "2.5rem 1.5rem" }}>
        {/* Title Header */}
        <div style={{ marginBottom: "2rem" }}>
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
            Face Enrollment Portal
          </h1>
          <p style={{ margin: "0.35rem 0 0 0", color: "#6b7280", fontSize: "0.95rem" }}>
            Register student or staff face embeddings into the PresenceX AI system.
          </p>
        </div>

        {/* 2-Column Enrollment Workspace */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "2rem",
            alignItems: "start",
            marginBottom: "3.5rem",
          }}
        >
          {/* Left Form / Success Details */}
          <div
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "2rem",
              padding: "2rem",
              boxShadow: "0 10px 30px rgba(0, 64, 193, 0.08)",
              border: "1px solid #eff4ff",
            }}
          >
            <h2
              style={{
                fontFamily: "var(--_fonts---fonts--title-font, 'Instrument Sans', sans-serif)",
                fontSize: "1.35rem",
                fontWeight: 600,
                color: "#090909",
                margin: "0 0 1.5rem 0",
              }}
            >
              Person Details
            </h2>

            {errorMessage && (
              <div
                style={{
                  marginBottom: "1.5rem",
                  padding: "1rem 1.25rem",
                  borderRadius: "1rem",
                  backgroundColor: "var(--color-danger-bg, #fef2f2)",
                  border: "1px solid var(--color-danger-border, #fecaca)",
                  color: "var(--color-danger, #dc2626)",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                }}
              >
                ⚠️ {errorMessage}
              </div>
            )}

            {successData ? (
              <div
                style={{
                  padding: "2rem 1.5rem",
                  textAlign: "center",
                  borderRadius: "1.5rem",
                  backgroundColor: "var(--color-success-bg, #ecfdf5)",
                  border: "1px solid var(--color-success-border, #a7f3d0)",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    borderRadius: "50%",
                    backgroundColor: "var(--color-success, #059669)",
                    color: "#ffffff",
                    fontSize: "1.75rem",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    marginBottom: "1rem",
                  }}
                >
                  ✓
                </div>
                <h3
                  style={{
                    margin: "0 0 0.5rem 0",
                    color: "var(--color-success, #059669)",
                    fontSize: "1.25rem",
                    fontWeight: 700,
                  }}
                >
                  Registration Successful!
                </h3>
                <p style={{ margin: "0 0 1.25rem 0", color: "#374151", fontSize: "0.95rem" }}>
                  Face embedding stored for <strong>{successData.full_name}</strong> (ID:{" "}
                  <code>{successData.person_id}</code>).
                </p>

                {/* Enrollment Verification Checklist */}
                <div
                  style={{
                    backgroundColor: "#ffffff",
                    borderRadius: "1rem",
                    padding: "1rem 1.25rem",
                    textAlign: "left",
                    fontSize: "0.85rem",
                    color: "#374151",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    marginBottom: "1.5rem",
                    border: "1px solid #d1fae5",
                  }}
                >
                  <div style={{ color: "#059669", fontWeight: 600 }}>✓ Face captured successfully</div>
                  <div style={{ color: "#059669", fontWeight: 600 }}>✓ Anti-spoofing passed (Live Face)</div>
                  <div style={{ color: "#059669", fontWeight: 600 }}>✓ ArcFace 512-d embedding generated</div>
                  <div style={{ color: "#059669", fontWeight: 600 }}>✓ Database record stored in SQLite</div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                  <button
                    onClick={handleReset}
                    style={{
                      padding: "0.75rem 1.5rem",
                      borderRadius: "6.25rem",
                      backgroundColor: "#0040c1",
                      color: "#ffffff",
                      border: "none",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontSize: "0.9rem",
                    }}
                  >
                    Register Another Person
                  </button>
                  <Link
                    href="/admin/face-test"
                    style={{
                      padding: "0.75rem 1.5rem",
                      borderRadius: "6.25rem",
                      backgroundColor: "#ffffff",
                      color: "#0040c1",
                      border: "1px solid #0040c1",
                      fontWeight: 600,
                      textDecoration: "none",
                      fontSize: "0.9rem",
                    }}
                  >
                    Test Recognition 🧪
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={handleNameChange}
                    placeholder="e.g. Mohit Raj"
                    required
                    style={{
                      width: "100%",
                      padding: "0.85rem 1.15rem",
                      borderRadius: "1rem",
                      border: "1px solid #d1e0ff",
                      fontSize: "0.95rem",
                      outline: "none",
                      backgroundColor: "#f9f9f9",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Person ID (Unique Slug) *
                  </label>
                  <input
                    type="text"
                    value={personId}
                    onChange={(e) => setPersonId(e.target.value)}
                    placeholder="e.g. mohit_raj"
                    required
                    style={{
                      width: "100%",
                      padding: "0.85rem 1.15rem",
                      borderRadius: "1rem",
                      border: "1px solid #d1e0ff",
                      fontSize: "0.95rem",
                      outline: "none",
                      backgroundColor: "#f9f9f9",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.85rem",
                      fontWeight: 600,
                      color: "#374151",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Role
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "0.85rem 1.15rem",
                      borderRadius: "1rem",
                      border: "1px solid #d1e0ff",
                      fontSize: "0.95rem",
                      outline: "none",
                      backgroundColor: "#f9f9f9",
                    }}
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty / Staff</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div
                  style={{
                    padding: "1rem",
                    borderRadius: "1rem",
                    backgroundColor: "#eff4ff",
                    fontSize: "0.85rem",
                    color: "#0040c1",
                    lineHeight: 1.4,
                  }}
                >
                  💡 <strong>Instructions:</strong> Enter details, align face inside camera bounds, and click <strong>Capture Face</strong> when all quality indicators pass.
                </div>
              </form>
            )}
          </div>

          {/* Right Live Camera Viewport */}
          <div>
            <h2
              style={{
                fontFamily: "var(--_fonts---fonts--title-font, 'Instrument Sans', sans-serif)",
                fontSize: "1.35rem",
                fontWeight: 600,
                color: "#090909",
                margin: "0 0 1rem 0",
              }}
            >
              Live Enrollment Camera
            </h2>
            <CameraCapture
              onCapture={handleCapture}
              disabled={isSubmitting || !!successData}
              capturedPreviewUrl={capturedPreviewUrl}
            />
          </div>
        </div>

        {/* Registered People Database Section */}
        <div
          style={{
            backgroundColor: "#ffffff",
            borderRadius: "2rem",
            padding: "2rem",
            boxShadow: "0 10px 30px rgba(0, 64, 193, 0.06)",
            border: "1px solid #eff4ff",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1.5rem",
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: "var(--_fonts---fonts--title-font, 'Instrument Sans', sans-serif)",
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  color: "#090909",
                  margin: 0,
                }}
              >
                Registered People & Face Embeddings
              </h2>
              <p style={{ margin: "0.25rem 0 0 0", color: "#6b7280", fontSize: "0.85rem" }}>
                Database records verified in SQLite database.
              </p>
            </div>

            <span
              style={{
                padding: "0.35rem 0.85rem",
                borderRadius: "6.25rem",
                backgroundColor: "#eff4ff",
                color: "#0040c1",
                fontSize: "0.85rem",
                fontWeight: 700,
              }}
            >
              {registeredPeople.length} Registered
            </span>
          </div>

          {isLoadingPeople ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "#9ca3af", fontSize: "0.9rem" }}>
              Loading registered faces from database...
            </div>
          ) : registeredPeople.length === 0 ? (
            <div
              style={{
                padding: "2.5rem 1.5rem",
                textAlign: "center",
                borderRadius: "1.5rem",
                backgroundColor: "#f9fafb",
                border: "1px dashed #d1e0ff",
              }}
            >
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>👤</div>
              <h3 style={{ margin: "0 0 0.25rem 0", color: "#374151", fontSize: "1.1rem" }}>
                No Faces Enrolled Yet
              </h3>
              <p style={{ color: "#6b7280", fontSize: "0.9rem", margin: 0 }}>
                Use the form above to register your first student or faculty member.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.25rem" }}>
              {registeredPeople.map((person) => (
                <div
                  key={person.person_id}
                  style={{
                    padding: "1.25rem",
                    borderRadius: "1.25rem",
                    backgroundColor: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                        <span
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            backgroundColor: "#eff4ff",
                            color: "#0040c1",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 700,
                            fontSize: "1rem",
                          }}
                        >
                          👤
                        </span>
                        <div>
                          <strong style={{ fontSize: "1rem", color: "#111827" }}>{person.full_name}</strong>
                          <div style={{ fontSize: "0.8rem", color: "#6b7280", fontFamily: "monospace" }}>
                            ID: {person.person_id}
                          </div>
                        </div>
                      </div>

                      <span
                        style={{
                          padding: "0.2rem 0.6rem",
                          borderRadius: "6.25rem",
                          backgroundColor: "var(--color-success-bg, #ecfdf5)",
                          color: "var(--color-success, #059669)",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        ● Registered
                      </span>
                    </div>

                    <div style={{ fontSize: "0.85rem", color: "#4b5563", marginTop: "0.85rem", display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                      <div>
                        Role: <strong style={{ textTransform: "capitalize", color: "#111827" }}>{person.role}</strong>
                      </div>
                      <div>
                        Face Model: <code>{person.model_name || "ArcFace"}</code>
                      </div>
                      <div>
                        Enrolled: {new Date(person.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: "1.25rem", paddingTop: "0.85rem", borderTop: "1px solid #e5e7eb" }}>
                    <Link
                      href="/admin/face-test"
                      style={{
                        display: "inline-block",
                        width: "100%",
                        padding: "0.6rem",
                        borderRadius: "6.25rem",
                        backgroundColor: "#ffffff",
                        color: "#0040c1",
                        border: "1px solid #d1e0ff",
                        textAlign: "center",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                        textDecoration: "none",
                      }}
                    >
                      Test Face Recognition 🧪
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
