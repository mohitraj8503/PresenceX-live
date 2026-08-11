"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const redirectPath = searchParams.get("redirect") || "/admin/dashboard";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const json = await res.json();

      if (json.success) {
        router.push(redirectPath);
      } else {
        setErrorMsg("Invalid administrator password. Please try again.");
      }
    } catch (err) {
      setErrorMsg("Network error occurred during authentication.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f5faff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--_fonts---fonts--paragraph-font, Poppins, sans-serif)",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          backgroundColor: "#ffffff",
          borderRadius: "2rem",
          padding: "2.5rem",
          boxShadow: "0 20px 50px rgba(0, 64, 193, 0.1)",
          border: "1px solid #eff4ff",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              backgroundColor: "#eff4ff",
              color: "#0040c1",
              fontSize: "1.5rem",
              fontWeight: "bold",
              marginBottom: "1rem",
            }}
          >
            🔒
          </div>
          <h1
            style={{
              fontFamily: "var(--_fonts---fonts--title-font, 'Instrument Sans', sans-serif)",
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "#090909",
              margin: 0,
            }}
          >
            PresenceX Admin Login
          </h1>
          <p style={{ margin: "0.5rem 0 0 0", color: "#6b7280", fontSize: "0.9rem" }}>
            Enter system administrator password to access registration and kiosk portals.
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              marginBottom: "1.5rem",
              padding: "0.85rem 1rem",
              borderRadius: "1rem",
              backgroundColor: "var(--color-danger-bg, #fef2f2)",
              border: "1px solid var(--color-danger-border, #fecaca)",
              color: "var(--color-danger, #dc2626)",
              fontSize: "0.85rem",
              fontWeight: 500,
              textAlign: "center",
            }}
          >
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
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
              Admin Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
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

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: "100%",
              padding: "0.85rem 1.5rem",
              borderRadius: "6.25rem",
              backgroundColor: isSubmitting ? "#93c5fd" : "#0040c1",
              color: "#ffffff",
              border: "none",
              fontWeight: 600,
              fontSize: "0.95rem",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              boxShadow: "0 4px 15px rgba(0, 64, 193, 0.25)",
              marginTop: "0.5rem",
            }}
          >
            {isSubmitting ? "Authenticating..." : "Unlock Portal →"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div>Loading authentication...</div>}>
      <LoginForm />
    </Suspense>
  );
}
