export interface AntiSpoofCheckResult {
  passed: boolean;
  status:
    | "LIVE_VERIFIED"
    | "NO_FACE"
    | "SCREEN_SPOOF_DETECTED"
    | "PHOTO_SPOOF_DETECTED"
    | "HAND_OBSTRUCTION"
    | "MASK_COVERED"
    | "FACE_TOO_FAR"
    | "FACE_TOO_CLOSE"
    | "LOW_LIGHT"
    | "MULTIPLE_FACES"
    | "UNKNOWN_FACE";
  badgeText: string;
  badgeBg: string;
  badgeColor: string;
  borderColor: string;
  message: string;
}

export type VerificationContext = {
  faceCount: number;
  faceQuality?: number;
  livenessStatus?: string;
  phoneDetected?: boolean;
  screenDetected?: boolean;
  handOcclusion?: boolean;
  lowLight?: boolean;
  faceTooSmall?: boolean;
  faceTooLarge?: boolean;
  poseInvalid?: boolean;
  matchStatus?: "RECOGNIZED" | "UNKNOWN" | "NO_FACE" | "SPOOF_SUSPECTED";
  matchedName?: string;
};

export function getVerificationMessage(context: VerificationContext): {
  badgeText: string;
  badgeBg: string;
  badgeColor: string;
  borderColor: string;
  message: string;
} {
  // 1. Camera Error / No Face Detected
  if (context.faceCount === 0) {
    return {
      badgeText: "📷 NO FACE DETECTED",
      badgeBg: "#f3f4f6",
      badgeColor: "#4b5563",
      borderColor: "#e5e7eb",
      message: "👀 No face detected. Please step into the camera frame.",
    };
  }

  // 2. Multiple faces in single-face mode
  if (context.faceCount > 1) {
    return {
      badgeText: "👥 MULTIPLE FACES DETECTED",
      badgeBg: "#fffbe6",
      badgeColor: "#d48806",
      borderColor: "#ffe58f",
      message: "👥 Multiple faces detected. Please keep only one person in frame.",
    };
  }

  // 3. Screen / Mobile Phone Spoof Detected
  if (context.phoneDetected || context.screenDetected) {
    return {
      badgeText: "📱 SCREEN / MOBILE DETECTED",
      badgeBg: "#fff2f0",
      badgeColor: "#ff4d4f",
      borderColor: "#ffccc7",
      message: "📱 Screen detected. Please keep your mobile phone away and show your live face.",
    };
  }

  // 4. Hand / Obstruction Covering Face
  if (context.handOcclusion) {
    return {
      badgeText: "✋ HAND OBSTRUCTION DETECTED",
      badgeBg: "#fff7e6",
      badgeColor: "#d46b08",
      borderColor: "#ffd591",
      message: "✋ Please move your hand away from your face.",
    };
  }

  // 5. Low Light / Dark Environment
  if (context.lowLight) {
    return {
      badgeText: "💡 LOW LIGHT DETECTED",
      badgeBg: "#f5f5f5",
      badgeColor: "#595959",
      borderColor: "#d9d9d9",
      message: "💡 Low light detected. Please move to a brighter area.",
    };
  }

  // 6. Face Proximity / Distance checks
  if (context.faceTooSmall) {
    return {
      badgeText: "👤 FACE TOO FAR",
      badgeBg: "#e6f7ff",
      badgeColor: "#0958d9",
      borderColor: "#91caff",
      message: "👤 Please move a little closer to the camera.",
    };
  }
  if (context.faceTooLarge) {
    return {
      badgeText: "📸 FACE TOO CLOSE",
      badgeBg: "#e6f7ff",
      badgeColor: "#0958d9",
      borderColor: "#91caff",
      message: "📸 Please move slightly back.",
    };
  }

  // 7. Sideways Pose
  if (context.poseInvalid) {
    return {
      badgeText: "↔️ SIDEWAYS POSE",
      badgeBg: "#fffbe6",
      badgeColor: "#d48806",
      borderColor: "#ffe58f",
      message: "↔️ Please look directly at the camera.",
    };
  }

  // 8. Confirmed Biometric Match
  if (context.matchStatus === "RECOGNIZED" && context.matchedName) {
    return {
      badgeText: "✓ CONFIRMED MATCH",
      badgeBg: "#ecfdf5",
      badgeColor: "#059669",
      borderColor: "#a7f3d0",
      message: `✓ Live face verified — ${context.matchedName}.`,
    };
  }

  // 9. Unknown Live Face
  return {
    badgeText: "⚠️ UNKNOWN FACE",
    badgeBg: "#fff2f0",
    badgeColor: "#dc2626",
    borderColor: "#fca5a5",
    message: "❓ Face detected, but this person is not enrolled in the directory.",
  };
}

export function evaluateAntiSpoofing(params: {
  facesDetected: number;
  bbox?: { x: number; y: number; w: number; h: number };
  frameWidth?: number;
  frameHeight?: number;
  brightness?: number;
  isLowLight?: boolean;
  hasScreenReflection?: boolean;
  hasHandObstruction?: boolean;
  isSpoofPhoto?: boolean;
  isSpoofScreen?: boolean;
}): AntiSpoofCheckResult {
  // 1. No Face Detected
  if (params.facesDetected === 0) {
    return {
      passed: false,
      status: "NO_FACE",
      badgeText: "👀 NO FACE DETECTED",
      badgeBg: "#f3f4f6",
      badgeColor: "#4b5563",
      borderColor: "#e5e7eb",
      message: "👀 No face detected. Please step into the camera frame.",
    };
  }

  // 2. Multiple faces in single-face mode
  if (params.facesDetected > 1) {
    return {
      passed: false,
      status: "MULTIPLE_FACES",
      badgeText: "👥 MULTIPLE FACES DETECTED",
      badgeBg: "#fffbe6",
      badgeColor: "#d48806",
      borderColor: "#ffe58f",
      message: "👥 Multiple faces detected. Please keep only one person in frame.",
    };
  }

  // 3. Screen / Mobile Device Anti-Spoofing
  if (params.isSpoofScreen || params.hasScreenReflection) {
    return {
      passed: false,
      status: "SCREEN_SPOOF_DETECTED",
      badgeText: "📱 SCREEN / MOBILE DETECTED",
      badgeBg: "#fff2f0",
      badgeColor: "#ff4d4f",
      borderColor: "#ffccc7",
      message: "📱 Screen detected. Please keep your mobile phone away and show your live face.",
    };
  }

  // 4. Printed Photo Anti-Spoofing
  if (params.isSpoofPhoto) {
    return {
      passed: false,
      status: "PHOTO_SPOOF_DETECTED",
      badgeText: "🖼️ PRINTED PHOTO DETECTED",
      badgeBg: "#fff2f0",
      badgeColor: "#ff4d4f",
      borderColor: "#ffccc7",
      message: "🖼️ Photo detected instead of a live person. Please show your live face.",
    };
  }

  // 5. Hand / Physical Obstruction Covering Face
  if (params.hasHandObstruction) {
    return {
      passed: false,
      status: "HAND_OBSTRUCTION",
      badgeText: "✋ HAND OBSTRUCTION DETECTED",
      badgeBg: "#fff7e6",
      badgeColor: "#d46b08",
      borderColor: "#ffd591",
      message: "✋ Please move your hand away from your face.",
    };
  }

  // 6. Low Light / Dark Environment
  if (params.isLowLight || (params.brightness != null && params.brightness < 40)) {
    return {
      passed: false,
      status: "LOW_LIGHT",
      badgeText: "💡 LOW LIGHT DETECTED",
      badgeBg: "#f5f5f5",
      badgeColor: "#595959",
      borderColor: "#d9d9d9",
      message: "💡 Low light detected. Please move to a brighter area.",
    };
  }

  // 7. Face Size & Proximity Distance Checks
  if (params.bbox && params.frameWidth && params.frameWidth > 0) {
    const faceRatio = params.bbox.w / params.frameWidth;
    if (faceRatio < 0.15) {
      return {
        passed: false,
        status: "FACE_TOO_FAR",
        badgeText: "👤 FACE TOO FAR",
        badgeBg: "#e6f7ff",
        badgeColor: "#0958d9",
        borderColor: "#91caff",
        message: "👤 Please move a little closer to the camera.",
      };
    }
    if (faceRatio > 0.75) {
      return {
        passed: false,
        status: "FACE_TOO_CLOSE",
        badgeText: "📸 FACE TOO CLOSE",
        badgeBg: "#e6f7ff",
        badgeColor: "#0958d9",
        borderColor: "#91caff",
        message: "📸 Please move slightly back.",
      };
    }
  }

  // 8. Passed Liveness & Anti-Spoofing Checks
  return {
    passed: true,
    status: "LIVE_VERIFIED",
    badgeText: "🛡️ LIVE FACE CONFIRMED",
    badgeBg: "#ecfdf5",
    badgeColor: "#059669",
    borderColor: "#a7f3d0",
    message: "✓ Live face verified successfully.",
  };
}
