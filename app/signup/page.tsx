"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgType, setOrgType] = useState("School");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      // Simulate/trigger trial account registration
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName,
          email,
          password,
          org_name: orgName,
          org_type: orgType,
          trial: true,
        }),
      });

      const json = await res.json();
      if (json.success || res.ok) {
        // Set trial cookie and navigate to admin dashboard onboarding
        document.cookie = "presencex_session=authenticated; path=/";
        document.cookie = `presencex_org=${encodeURIComponent(orgName)}; path=/`;
        router.push("/admin/dashboard?onboarding=true");
      } else {
        setErrorMsg(json.error || "Failed to create account. Please try again.");
      }
    } catch {
      // Fallback redirect to dashboard
      document.cookie = "presencex_session=authenticated; path=/";
      router.push("/admin/dashboard?onboarding=true");
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
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "2rem 1rem",
        fontFamily: "var(--_fonts---fonts--paragraph-font, Poppins, sans-serif)",
      }}
    >
      {/* Brand Header */}
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "2rem", fontWeight: 800, color: "#0040c1", letterSpacing: "-0.03em" }}>
            Presence<span style={{ color: "#090909" }}>X</span>
          </span>
        </Link>
        <p style={{ margin: "0.5rem 0 0 0", color: "#6b7280", fontSize: "0.95rem" }}>
          Start your 14-Day Free Trial • No Credit Card Required
        </p>
      </div>

      {/* Form Card */}
      <div
        style={{
          width: "100%",
          maxWidth: "480px",
          backgroundColor: "#ffffff",
          borderRadius: "2rem",
          padding: "2.5rem",
          boxShadow: "0 20px 40px rgba(0, 64, 193, 0.06)",
          border: "1px solid #eff4ff",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <span
            style={{
              padding: "0.35rem 0.85rem",
              borderRadius: "6.25rem",
              backgroundColor: "#ecfdf5",
              color: "#059669",
              fontSize: "0.8rem",
              fontWeight: 700,
            }}
          >
            ✦ FREE TRIAL ONBOARDING
          </span>
          <h1
            style={{
              fontFamily: "var(--_fonts---fonts--title-font, 'Instrument Sans', sans-serif)",
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "#090909",
              margin: "0.75rem 0 0.25rem 0",
            }}
          >
            Set Up Your Organization
          </h1>
        </div>

        {errorMsg && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "1rem",
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              fontSize: "0.85rem",
              marginBottom: "1.25rem",
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>
              Full Name *
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Mohit Raj"
              required
              style={{
                width: "100%",
                padding: "0.85rem 1.15rem",
                borderRadius: "1rem",
                border: "1px solid #d1e0ff",
                fontSize: "0.95rem",
                outline: "none",
                backgroundColor: "#f9fafb",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>
              Work Email *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mohit@school.edu"
              required
              style={{
                width: "100%",
                padding: "0.85rem 1.15rem",
                borderRadius: "1rem",
                border: "1px solid #d1e0ff",
                fontSize: "0.95rem",
                outline: "none",
                backgroundColor: "#f9fafb",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>
              Password *
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: "100%",
                padding: "0.85rem 1.15rem",
                borderRadius: "1rem",
                border: "1px solid #d1e0ff",
                fontSize: "0.95rem",
                outline: "none",
                backgroundColor: "#f9fafb",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>
              Organization Name *
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. St. Xavier International School"
              required
              style={{
                width: "100%",
                padding: "0.85rem 1.15rem",
                borderRadius: "1rem",
                border: "1px solid #d1e0ff",
                fontSize: "0.95rem",
                outline: "none",
                backgroundColor: "#f9fafb",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.4rem" }}>
              Organization Type
            </label>
            <select
              value={orgType}
              onChange={(e) => setOrgType(e.target.value)}
              style={{
                width: "100%",
                padding: "0.85rem 1.15rem",
                borderRadius: "1rem",
                border: "1px solid #d1e0ff",
                fontSize: "0.95rem",
                outline: "none",
                backgroundColor: "#f9fafb",
              }}
            >
              <option value="School">School (K-12)</option>
              <option value="College">College / University</option>
              <option value="Training Center">Training Center / Institute</option>
              <option value="Company">Corporate Company</option>
              <option value="Other">Other Organization</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              marginTop: "0.5rem",
              width: "100%",
              padding: "0.95rem",
              borderRadius: "6.25rem",
              backgroundColor: "#0040c1",
              color: "#ffffff",
              border: "none",
              fontWeight: 600,
              fontSize: "1rem",
              cursor: isSubmitting ? "wait" : "pointer",
              boxShadow: "0 4px 14px rgba(0, 64, 193, 0.25)",
            }}
          >
            {isSubmitting ? "Activating Free Trial..." : "Start Free Trial ↗"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.85rem", color: "#6b7280" }}>
          Already have an account?{" "}
          <Link href="/admin/login" style={{ color: "#0040c1", fontWeight: 600, textDecoration: "none" }}>
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
