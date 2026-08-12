"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";

export type CameraCycleState =
  | "INITIALIZING"
  | "READY"
  | "NO_FACE"
  | "FACES_DETECTED"
  | "ANALYZING"
  | "RESULT_READY"
  | "EXTREME_DARK"
  | "DENIED";

export interface DetectedFaceBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  status?: "recognized" | "unknown" | "low_quality" | "spoof_suspected";
  distance?: number | null;
}

interface CameraCaptureProps {
  onCapture: (file: File, qualityScore?: number) => void;
  disabled?: boolean;
  capturedPreviewUrl?: string | null;
  testImageFile?: File | null;
  mode?: "single" | "multi" | "kiosk";
  overlayBoxes?: DetectedFaceBox[];
  checkpointIntervalSeconds?: number;
}

export default function CameraCapture({
  onCapture,
  disabled = false,
  capturedPreviewUrl = null,
  testImageFile = null,
  mode = "kiosk",
  overlayBoxes = [],
  checkpointIntervalSeconds = 60,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Persistent Stream Ownership - Only initialized ONCE on mount
  const streamRef = useRef<MediaStream | null>(null);
  const isInitializingRef = useRef<boolean>(false);

  const [cycleState, setCycleState] = useState<CameraCycleState>("INITIALIZING");
  const [isCameraReady, setIsCameraReady] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [nextCheckSeconds, setNextCheckSeconds] = useState<number>(checkpointIntervalSeconds);
  const [qualityScore, setQualityScore] = useState<number>(0);
  const [isAnalyzingState, setIsAnalyzingState] = useState<boolean>(false);

  const analysisIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isAnalyzingRef = useRef<boolean>(false);
  const lastCheckpointTimeRef = useRef<number>(0);

  // Execute Checkpoint Verification Capture Action
  const triggerCapture = useCallback(() => {
    if (disabled || isAnalyzingRef.current) return;

    isAnalyzingRef.current = true;
    setIsAnalyzingState(true);
    setCycleState("ANALYZING");
    lastCheckpointTimeRef.current = Date.now();
    setNextCheckSeconds(checkpointIntervalSeconds);

    if (testImageFile) {
      onCapture(testImageFile, qualityScore);
      isAnalyzingRef.current = false;
      setIsAnalyzingState(false);
      return;
    }

    if (!videoRef.current || !canvasRef.current) {
      isAnalyzingRef.current = false;
      setIsAnalyzingState(false);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      isAnalyzingRef.current = false;
      setIsAnalyzingState(false);
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          isAnalyzingRef.current = false;
          setIsAnalyzingState(false);
          return;
        }
        const file = new File([blob], `checkpoint_${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file, qualityScore);

        setTimeout(() => {
          isAnalyzingRef.current = false;
          setIsAnalyzingState(false);
        }, 1500);
      },
      "image/jpeg",
      0.92
    );
  }, [disabled, checkpointIntervalSeconds, onCapture, qualityScore, testImageFile]);

  // 1. STRICT IDEMPOTENT CAMERA INITIALIZATION (Executes ONCE on page mount)
  useEffect(() => {
    let isMounted = true;
    lastCheckpointTimeRef.current = Date.now();

    if (testImageFile) {
      queueMicrotask(() => {
        if (isMounted) {
          setIsCameraReady(true);
          setCycleState("READY");
          setQualityScore(92);
        }
      });
      return;
    }

    if (streamRef.current || isInitializingRef.current) {
      return;
    }

    isInitializingRef.current = true;

    const startPersistentCamera = async () => {
      setCycleState("INITIALIZING");
      setErrorMessage(null);

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: false,
        });

        if (!isMounted) return;
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }

        setIsCameraReady(true);
        setCycleState("NO_FACE");
        isInitializingRef.current = false;
        lastCheckpointTimeRef.current = Date.now();
      } catch (err: unknown) {
        if (!isMounted) return;
        console.error("[CAMERA] MediaStream error:", err);
        isInitializingRef.current = false;
        setIsCameraReady(false);
        setCycleState("DENIED");
        const e = err as Error;
        setErrorMessage(
          e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError"
            ? "Camera permission denied. Please allow camera access in browser settings."
            : "Camera hardware unavailable or in use by another application."
        );
      }
    };

    startPersistentCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      isInitializingRef.current = false;
    };
  }, [testImageFile]);

  // 2. Periodic Checkpoint Countdown Timer (60s Interval)
  useEffect(() => {
    if (!isCameraReady || disabled || mode !== "kiosk") return;

    countdownTimerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastCheckpointTimeRef.current) / 1000);
      const remaining = Math.max(0, checkpointIntervalSeconds - elapsed);
      setNextCheckSeconds(remaining);

      if (remaining === 0 && !isAnalyzingRef.current) {
        triggerCapture();
      }
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [isCameraReady, disabled, mode, checkpointIntervalSeconds, triggerCapture]);

  // Multi-Face Overlay Canvas Drawing
  useEffect(() => {
    if (!overlayCanvasRef.current || !videoRef.current) return;
    const overlay = overlayCanvasRef.current;
    const octx = overlay.getContext("2d");
    if (!octx) return;

    const vWidth = videoRef.current.videoWidth || 640;
    const vHeight = videoRef.current.videoHeight || 480;

    if (overlay.width !== vWidth || overlay.height !== vHeight) {
      overlay.width = vWidth;
      overlay.height = vHeight;
    }

    octx.clearRect(0, 0, vWidth, vHeight);

    if (overlayBoxes && overlayBoxes.length > 0) {
      overlayBoxes.forEach((box, idx) => {
        const isRec = box.status === "recognized";
        octx.strokeStyle = isRec ? "#059669" : "#dc2626";
        octx.lineWidth = 3;
        octx.setLineDash([]);

        const mirroredX = vWidth - (box.x + box.w);
        octx.strokeRect(mirroredX, box.y, box.w, box.h);

        octx.fillStyle = isRec ? "rgba(5, 150, 105, 0.9)" : "rgba(220, 38, 38, 0.9)";
        const labelText = box.label ? `${isRec ? "✓" : "✕"} ${box.label}` : `Face #${idx + 1}`;
        octx.font = "bold 14px Poppins, sans-serif";
        const textWidth = octx.measureText(labelText).width;

        octx.fillRect(mirroredX, Math.max(0, box.y - 28), textWidth + 16, 26);
        octx.fillStyle = "#ffffff";
        octx.fillText(labelText, mirroredX + 8, Math.max(18, box.y - 10));
      });
    }
  }, [overlayBoxes]);

  // 3. FRAME DETECTOR LOOP (Runs every 250ms for live skin/luminance tracking)
  const analyzeFrame = useCallback(() => {
    if (disabled || isAnalyzingRef.current || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    if (video.readyState < 2 || video.paused || video.ended) return;

    const canvas = canvasRef.current;
    const width = 320;
    const height = 240;

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, width, height);

    let imageData: ImageData;
    try {
      imageData = ctx.getImageData(0, 0, width, height);
    } catch {
      return;
    }

    const data = imageData.data;
    let totalLuminance = 0;
    let skinPixelCount = 0;
    const step = 6;

    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const i = (y * width + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuminance += luminance;

        if (r > 35 && g > 20 && b > 10 && r > g) {
          skinPixelCount++;
        }
      }
    }

    const totalSampled = (width / step) * (height / step);
    const avgBrightness = totalSampled > 0 ? totalLuminance / totalSampled : 100;
    const lowLightDetected = avgBrightness < 45;

    if (avgBrightness < 15) {
      setQualityScore(10);
      setCycleState("EXTREME_DARK");
      return;
    }

    const skinRatio = totalSampled > 0 ? skinPixelCount / totalSampled : 0;

    if (skinRatio < 0.018) {
      setQualityScore(15);
      setCycleState("NO_FACE");
      return;
    }

    const estFaces = Math.max(1, overlayBoxes.length > 0 ? overlayBoxes.length : Math.ceil(skinRatio / 0.08));
    setQualityScore(lowLightDetected ? 72 : 92);

    if (!isAnalyzingRef.current) {
      setCycleState(estFaces > 1 || mode === "multi" ? "FACES_DETECTED" : "READY");
    }
  }, [disabled, mode, overlayBoxes.length]);

  useEffect(() => {
    if (!isCameraReady) return;

    analysisIntervalRef.current = setInterval(() => {
      analyzeFrame();
    }, 250);

    return () => {
      if (analysisIntervalRef.current) clearInterval(analysisIntervalRef.current);
    };
  }, [isCameraReady, analyzeFrame]);

  // SINGLE SOURCE OF TRUTH STATUS HUD
  const getStatusHUD = () => {
    if (disabled || isAnalyzingState) {
      return {
        icon: "⚡",
        text: "Verifying enrolled faces checkpoint...",
        borderColor: "#0040c1",
        bgColor: "rgba(0, 64, 193, 0.95)",
      };
    }

    switch (cycleState) {
      case "INITIALIZING":
        return {
          icon: "⏳",
          text: "Initializing camera stream...",
          borderColor: "#93c5fd",
          bgColor: "rgba(15, 23, 42, 0.85)",
        };
      case "NO_FACE":
        return {
          icon: "👤",
          text: `Live monitoring • Next checkpoint in ${nextCheckSeconds}s`,
          borderColor: "#0040c1",
          bgColor: "rgba(0, 64, 193, 0.95)",
        };
      case "FACES_DETECTED":
      case "READY":
        return {
          icon: "🟢",
          text: `Live monitoring • Next checkpoint in ${nextCheckSeconds}s`,
          borderColor: "var(--color-success, #059669)",
          bgColor: "rgba(5, 150, 105, 0.95)",
        };
      case "EXTREME_DARK":
        return {
          icon: "🌙",
          text: "Pitch black — Turn on a light.",
          borderColor: "var(--color-danger, #dc2626)",
          bgColor: "rgba(220, 38, 38, 0.9)",
        };
      default:
        return {
          icon: "⚠️",
          text: errorMessage || "Camera hardware unavailable.",
          borderColor: "var(--color-danger, #dc2626)",
          bgColor: "rgba(220, 38, 38, 0.9)",
        };
    }
  };

  const hud = getStatusHUD();

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: "640px",
        margin: "0 auto",
        borderRadius: "2rem",
        overflow: "hidden",
        backgroundColor: "#111827",
        boxShadow: `0 20px 40px -15px rgba(0, 64, 193, 0.2), 0 0 0 3px ${hud.borderColor}`,
        fontFamily: "var(--_fonts---fonts--paragraph-font, Poppins, sans-serif)",
        transition: "box-shadow 0.3s ease",
      }}
    >
      <canvas ref={canvasRef} style={{ display: "none" }} />

      <div
        style={{
          position: "relative",
          width: "100%",
          paddingTop: "66.66%",
          backgroundColor: "#090909",
        }}
      >
        {/* PERSISTENT UNTOUCHED VIDEO ELEMENT */}
        <video
          ref={videoRef}
          playsInline
          muted
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: isCameraReady && !testImageFile ? "block" : "none",
            transform: "scaleX(-1)",
          }}
        />

        {/* OVERLAY CANVAS FOR MULTI-FACE BOUNDING BOXES */}
        <canvas
          ref={overlayCanvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 4,
          }}
        />

        {capturedPreviewUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capturedPreviewUrl}
            alt="Captured Preview"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              zIndex: 10,
            }}
          />
        )}

        {/* Floating HUD Feedback Banner */}
        {cycleState !== "DENIED" && (
          <div
            style={{
              position: "absolute",
              top: "1rem",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 15,
              padding: "0.6rem 1.35rem",
              borderRadius: "6.25rem",
              backgroundColor: hud.bgColor,
              color: "#ffffff",
              fontSize: "0.9rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              boxShadow: "0 10px 25px rgba(0,0,0,0.3)",
              backdropFilter: "blur(6px)",
              transition: "all 0.3s ease",
            }}
          >
            <span>{hud.icon}</span>
            <span>{hud.text}</span>
          </div>
        )}

        {/* Hardware / Permission Denial Screen */}
        {cycleState === "DENIED" && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              padding: "2rem",
              textAlign: "center",
              backgroundColor: "rgba(17, 24, 39, 0.95)",
              zIndex: 12,
            }}
          >
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                backgroundColor: "rgba(220, 38, 38, 0.15)",
                color: "#ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.5rem",
                fontWeight: "bold",
                marginBottom: "1rem",
              }}
            >
              ✕
            </div>
            <p style={{ margin: "0 0 1rem 0", fontSize: "0.9rem", color: "#f3f4f6", lineHeight: 1.5 }}>
              {errorMessage}
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: "0.75rem 1.75rem",
                borderRadius: "6.25rem",
                backgroundColor: "#0040c1",
                color: "#ffffff",
                border: "none",
                fontSize: "0.9rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Checkpoint Status Control Bar */}
      <div
        style={{
          padding: "1rem 1.5rem",
          backgroundColor: "#111827",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          color: "#9ca3af",
          fontSize: "0.85rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span
            style={{
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              backgroundColor: disabled ? "#0040c1" : "#10b981",
            }}
          />
          <span>
            {disabled
              ? "Checkpoint verification in progress..."
              : `Periodic 60s Checkpoint Engine • Next in ${nextCheckSeconds}s`}
          </span>
        </div>

        <button
          onClick={triggerCapture}
          disabled={disabled || isAnalyzingState}
          style={{
            padding: "0.5rem 1.15rem",
            borderRadius: "6.25rem",
            backgroundColor: "#374151",
            color: "#ffffff",
            border: "none",
            fontSize: "0.8rem",
            fontWeight: 600,
            cursor: disabled || isAnalyzingState ? "not-allowed" : "pointer",
          }}
        >
          ⚡ Verify Now
        </button>
      </div>
    </div>
  );
}
