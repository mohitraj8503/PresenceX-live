"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // Ignore fallback
    }
    document.cookie = "presencex_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/admin/login");
  };

  const navLinks = [
    { label: "Dashboard", href: "/admin/dashboard", icon: "📊" },
    { label: "Register Face", href: "/admin/register", icon: "👤" },
    { label: "Face Test Lab", href: "/admin/face-test", icon: "🧪" },
    { label: "Kiosk Mode", href: "/kiosk", icon: "📷" },
  ];

  return (
    <header
      style={{
        backgroundColor: "#ffffff",
        borderBottom: "1px solid #eff4ff",
        position: "sticky",
        top: 0,
        zIndex: 50,
        boxShadow: "0 4px 20px rgba(0, 64, 193, 0.03)",
        fontFamily: "var(--_fonts---fonts--paragraph-font, Poppins, sans-serif)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0.85rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {/* PresenceX Brand Logo */}
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            textDecoration: "none",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/main-logo.svg"
            alt="PresenceX Logo"
            style={{ height: "28px", width: "auto" }}
          />

          <span
            style={{
              padding: "0.2rem 0.6rem",
              borderRadius: "6.25rem",
              backgroundColor: "#eff4ff",
              color: "#0040c1",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.03em",
              border: "1px solid #c2e0ff",
            }}
          >
            AI Engine
          </span>
        </Link>

        {/* Center Nav Links */}
        <nav style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.6rem 1.25rem",
                  borderRadius: "6.25rem",
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  backgroundColor: isActive ? "#0040c1" : "transparent",
                  color: isActive ? "#ffffff" : "#4b5563",
                  transition: "all 0.15s ease",
                  boxShadow: isActive ? "0 4px 12px rgba(0, 64, 193, 0.2)" : "none",
                }}
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.55rem 1.15rem",
            borderRadius: "6.25rem",
            backgroundColor: "#f3f4f6",
            color: "#374151",
            border: "1px solid #e5e7eb",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
        >
          <span>Logout</span>
          <span>🚪</span>
        </button>
      </div>
    </header>
  );
}
