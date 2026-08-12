"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
          padding: "0.75rem 1.25rem",
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
            style={{ height: "26px", width: "auto" }}
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

        {/* Desktop Nav Links */}
        <nav className="px-desktop-nav" style={{ alignItems: "center", gap: "0.6rem" }}>
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

        {/* Desktop Logout Button */}
        <button
          onClick={handleLogout}
          className="px-desktop-logout"
          style={{
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

        {/* Mobile Hamburger Toggle Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="px-mobile-hamburger-btn"
          aria-label="Toggle navigation menu"
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            backgroundColor: isMobileMenuOpen ? "#eff4ff" : "#f9fafb",
            border: "1px solid #d1e0ff",
            color: "#0040c1",
            fontSize: "1.25rem",
            display: "none",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
          }}
        >
          {isMobileMenuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile Drawer Navigation Menu */}
      {isMobileMenuOpen && (
        <div
          className="px-mobile-drawer"
          style={{
            backgroundColor: "#ffffff",
            borderTop: "1px solid #eff4ff",
            padding: "1rem 1.25rem 1.5rem 1.25rem",
            boxShadow: "0 10px 25px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            gap: "0.6rem",
          }}
        >
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMobileMenuOpen(false)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.85rem 1.25rem",
                  minHeight: "48px",
                  borderRadius: "1rem",
                  fontSize: "0.95rem",
                  fontWeight: 600,
                  textDecoration: "none",
                  backgroundColor: isActive ? "#0040c1" : "#f9fafb",
                  color: isActive ? "#ffffff" : "#374151",
                  border: `1px solid ${isActive ? "#0040c1" : "#e5e7eb"}`,
                  boxShadow: isActive ? "0 4px 12px rgba(0, 64, 193, 0.2)" : "none",
                }}
              >
                <span style={{ fontSize: "1.1rem" }}>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => {
              setIsMobileMenuOpen(false);
              handleLogout();
            }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.85rem 1.25rem",
              minHeight: "48px",
              marginTop: "0.4rem",
              borderRadius: "1rem",
              backgroundColor: "#fef2f2",
              color: "#dc2626",
              border: "1px solid #fecaca",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <span>Logout</span>
            <span>🚪</span>
          </button>
        </div>
      )}

      <style jsx>{`
        @media screen and (min-width: 768px) {
          :global(.px-desktop-nav) {
            display: flex !important;
          }
          :global(.px-desktop-logout) {
            display: inline-flex !important;
          }
          :global(.px-mobile-hamburger-btn) {
            display: none !important;
          }
          :global(.px-mobile-drawer) {
            display: none !important;
          }
        }
        @media screen and (max-width: 767px) {
          :global(.px-desktop-nav) {
            display: none !important;
          }
          :global(.px-desktop-logout) {
            display: none !important;
          }
          :global(.px-mobile-hamburger-btn) {
            display: flex !important;
          }
        }
      `}</style>
    </header>
  );
}
