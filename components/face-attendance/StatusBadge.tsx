"use client";

import React from "react";

export type StatusType =
  | "marked"
  | "already_marked"
  | "no_match"
  | "spoof_detected"
  | "no_face_detected"
  | "error";

interface StatusBadgeProps {
  status: StatusType;
  customMessage?: string;
  size?: "sm" | "md" | "lg";
}

export default function StatusBadge({
  status,
  customMessage,
  size = "md",
}: StatusBadgeProps) {
  let bgColor = "var(--color-success-bg, #ecfdf5)";
  let textColor = "var(--color-success, #059669)";
  let borderColor = "var(--color-success-border, #a7f3d0)";
  let defaultLabel = "Attendance Marked ✓";

  switch (status) {
    case "marked":
      bgColor = "var(--color-success-bg, #ecfdf5)";
      textColor = "var(--color-success, #059669)";
      borderColor = "var(--color-success-border, #a7f3d0)";
      defaultLabel = "Attendance Marked ✓";
      break;
    case "already_marked":
      bgColor = "var(--color-warning-bg, #fffbeb)";
      textColor = "var(--color-warning, #d97706)";
      borderColor = "var(--color-warning-border, #fde68a)";
      defaultLabel = "Already Marked Today";
      break;
    case "no_match":
      bgColor = "var(--color-danger-bg, #fef2f2)";
      textColor = "var(--color-danger, #dc2626)";
      borderColor = "var(--color-danger-border, #fecaca)";
      defaultLabel = "Face Not Recognized";
      break;
    case "spoof_detected":
      bgColor = "var(--color-danger-bg, #fef2f2)";
      textColor = "var(--color-danger, #dc2626)";
      borderColor = "var(--color-danger-border, #fecaca)";
      defaultLabel = "Spoof Attempt Detected ⚠️";
      break;
    case "no_face_detected":
      bgColor = "var(--color-warning-bg, #fffbeb)";
      textColor = "var(--color-warning, #d97706)";
      borderColor = "var(--color-warning-border, #fde68a)";
      defaultLabel = "No Face Detected";
      break;
    case "error":
      bgColor = "var(--color-danger-bg, #fef2f2)";
      textColor = "var(--color-danger, #dc2626)";
      borderColor = "var(--color-danger-border, #fecaca)";
      defaultLabel = "System Error";
      break;
  }

  const padding = size === "sm" ? "0.35rem 0.85rem" : size === "lg" ? "0.85rem 2rem" : "0.5rem 1.25rem";
  const fontSize = size === "sm" ? "0.8rem" : size === "lg" ? "1.1rem" : "0.95rem";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.5rem",
        padding,
        fontSize,
        fontWeight: 600,
        borderRadius: "6.25rem",
        backgroundColor: bgColor,
        color: textColor,
        border: `1px solid ${borderColor}`,
        fontFamily: "var(--_fonts---fonts--paragraph-font, Poppins, sans-serif)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
      }}
    >
      {customMessage || defaultLabel}
    </span>
  );
}
