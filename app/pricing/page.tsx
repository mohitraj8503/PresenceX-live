"use client";

import React, { useState, useEffect } from "react";
import AdminNavbar from "@/components/face-attendance/AdminNavbar";
import { useRouter } from "next/navigation";

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  popular?: boolean;
  color: string;
}

export default function PricingPage() {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState<string>("FREE_TRIAL");
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("UPI");

  useEffect(() => {
    fetch("/api/subscription/status")
      .then((res) => res.json())
      .then((json) => {
        if (json.success && json.data) {
          setCurrentPlan(json.data.plan_id || "FREE_TRIAL");
        }
      })
      .catch(() => {});
  }, []);

  const plans: Plan[] = [
    {
      id: "FREE_TRIAL",
      name: "Free Trial",
      price: "₹0",
      period: "14 Days",
      tagline: "Ideal for testing & initial camera validation",
      features: [
        "14-Day Full Access",
        "Up to 100 Enrolled Profiles",
        "Single Kiosk Mode",
        "Basic Attendance Reports",
        "Community Support",
      ],
      color: "#6b7280",
    },
    {
      id: "STARTER",
      name: "Starter",
      price: "₹2,499",
      period: "/ month",
      tagline: "Perfect for small institutes & coaching centers",
      features: [
        "Up to 500 Enrolled Students",
        "2 Active Live Kiosks",
        "Single Face Recognition",
        "CSV & Excel Reports",
        "Email Support",
      ],
      color: "#0040c1",
    },
    {
      id: "PROFESSIONAL",
      name: "Professional",
      price: "₹6,999",
      period: "/ month",
      popular: true,
      tagline: "Built for schools, colleges & universities",
      features: [
        "Up to 2,500 Enrolled Students",
        "Unlimited Live CCTV Kiosks",
        "Multi-Face Batch Recognition",
        "Bulk Photo Enrollment (ZIP + Filename)",
        "60s Periodic Checkpoint Engine",
        "5-min Restroom Grace Period Tracking",
        "Priority Support (24/7)",
      ],
      color: "#059669",
    },
    {
      id: "ENTERPRISE",
      name: "Enterprise",
      price: "₹14,999",
      period: "/ month",
      tagline: "Custom infrastructure for large campuses",
      features: [
        "Unlimited Student & Staff Roster",
        "Dedicated GPU AI Server Instance",
        "Multi-Gate Gatehouse CCTV Integration",
        "Custom ERP / School Software API",
        "Dedicated Account Manager & SLA",
      ],
      color: "#7c3aed",
    },
  ];

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan) return;

    setIsProcessing(true);
    try {
      const res = await fetch("/api/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan.id }),
      });

      const json = await res.json();
      if (json.success) {
        setSelectedPlan(null);
        router.push("/organization/dashboard?upgraded=true");
      }
    } catch (err) {
      console.error("Upgrade error:", err);
    } finally {
      setIsProcessing(false);
    }
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

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "3rem 1.5rem" }}>
        {/* Header */}
        <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 3.5rem auto" }}>
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
            ✦ PRESENCEX PLANS & PRICING
          </span>

          <h1
            style={{
              fontFamily: "var(--_fonts---fonts--title-font, 'Instrument Sans', sans-serif)",
              fontSize: "2.5rem",
              fontWeight: 700,
              color: "#090909",
              margin: "0.85rem 0 0.5rem 0",
              letterSpacing: "-0.02em",
            }}
          >
            Upgrade Your Campus Attendance Plan
          </h1>

          <p style={{ color: "#6b7280", fontSize: "1.05rem", lineHeight: 1.5, margin: 0 }}>
            Unlock multi-face CCTV recognition, bulk photo enrollment & unlimited kiosks for your school or college.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem", marginBottom: "3rem" }}>
          {plans.map((plan) => {
            const isCurrent = currentPlan === plan.id;
            return (
              <div
                key={plan.id}
                style={{
                  backgroundColor: "#ffffff",
                  borderRadius: "2rem",
                  padding: "2rem 1.5rem",
                  border: plan.popular ? "2px solid #059669" : "1px solid #eff4ff",
                  boxShadow: plan.popular
                    ? "0 12px 32px rgba(5, 150, 105, 0.12)"
                    : "0 8px 24px rgba(0, 64, 193, 0.04)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                }}
              >
                {plan.popular && (
                  <span
                    style={{
                      position: "absolute",
                      top: "-14px",
                      left: "50%",
                      transform: "translateX(-50%)",
                      backgroundColor: "#059669",
                      color: "#ffffff",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "0.25rem 0.85rem",
                      borderRadius: "6.25rem",
                      whiteSpace: "nowrap",
                    }}
                  >
                    MOST POPULAR FOR SCHOOLS
                  </span>
                )}

                <div>
                  <h3 style={{ fontSize: "1.3rem", fontWeight: 700, color: "#111827", margin: "0 0 0.35rem 0" }}>
                    {plan.name}
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "#6b7280", minHeight: "40px", margin: 0 }}>{plan.tagline}</p>

                  <div style={{ margin: "1.5rem 0" }}>
                    <span style={{ fontSize: "2.5rem", fontWeight: 800, color: "#111827" }}>{plan.price}</span>
                    <span style={{ fontSize: "0.9rem", color: "#6b7280", marginLeft: "0.35rem" }}>{plan.period}</span>
                  </div>

                  <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {plan.features.map((feat, idx) => (
                      <li key={idx} style={{ fontSize: "0.85rem", color: "#374151", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ color: plan.color, fontWeight: 700 }}>✓</span>
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>

                <div style={{ marginTop: "2rem" }}>
                  {isCurrent ? (
                    <button
                      disabled
                      style={{
                        width: "100%",
                        padding: "0.85rem",
                        borderRadius: "6.25rem",
                        backgroundColor: "#ecfdf5",
                        color: "#059669",
                        border: "1px solid #a7f3d0",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                      }}
                    >
                      Active Current Plan ✓
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedPlan(plan)}
                      style={{
                        width: "100%",
                        padding: "0.85rem",
                        borderRadius: "6.25rem",
                        backgroundColor: plan.color,
                        color: "#ffffff",
                        border: "none",
                        fontWeight: 700,
                        fontSize: "0.9rem",
                        cursor: "pointer",
                        boxShadow: "0 4px 14px rgba(0, 64, 193, 0.15)",
                      }}
                    >
                      Choose Plan & Upgrade ↗
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Checkout / Payment Modal */}
      {selectedPlan && (
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
            zIndex: 110,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "520px",
              backgroundColor: "#ffffff",
              borderRadius: "2rem",
              padding: "2.25rem",
              boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
              <h3 style={{ margin: 0, fontSize: "1.35rem", color: "#090909" }}>
                Confirm Upgrade to {selectedPlan.name}
              </h3>
              <button
                onClick={() => setSelectedPlan(null)}
                style={{ background: "none", border: "none", fontSize: "1.25rem", cursor: "pointer", color: "#6b7280" }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                backgroundColor: "#f5faff",
                borderRadius: "1.25rem",
                padding: "1.25rem",
                border: "1px solid #d1e0ff",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ fontSize: "1.1rem", color: "#111827" }}>{selectedPlan.name} Subscription</strong>
                  <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>Monthly Institution Billing</div>
                </div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "#0040c1" }}>
                  {selectedPlan.price}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: "0.5rem" }}>
                Select Payment Gateway
              </label>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                {["UPI", "Credit Card", "NetBanking"].map((method) => (
                  <button
                    key={method}
                    onClick={() => setPaymentMethod(method)}
                    style={{
                      flex: 1,
                      padding: "0.65rem",
                      borderRadius: "0.85rem",
                      backgroundColor: paymentMethod === method ? "#eff4ff" : "#f9fafb",
                      border: paymentMethod === method ? "2px solid #0040c1" : "1px solid #e5e7eb",
                      color: paymentMethod === method ? "#0040c1" : "#4b5563",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setSelectedPlan(null)}
                disabled={isProcessing}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "6.25rem",
                  backgroundColor: "transparent",
                  color: "#6b7280",
                  border: "none",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmUpgrade}
                disabled={isProcessing}
                style={{
                  padding: "0.75rem 2rem",
                  borderRadius: "6.25rem",
                  backgroundColor: "#059669",
                  color: "#ffffff",
                  border: "none",
                  fontWeight: 700,
                  fontSize: "0.95rem",
                  cursor: isProcessing ? "wait" : "pointer",
                  boxShadow: "0 4px 14px rgba(5, 150, 105, 0.25)",
                }}
              >
                {isProcessing ? "Activating Upgrade..." : `Pay & Activate ${selectedPlan.name} ⚡`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
