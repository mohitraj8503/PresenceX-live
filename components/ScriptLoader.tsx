"use client";

import { useEffect } from "react";

interface ScriptLoaderProps {
  scripts: string[];
}

export default function ScriptLoader({ scripts }: ScriptLoaderProps) {
  useEffect(() => {
    let active = true;

    async function loadScripts() {
      const loadScript = (src: string) => {
        return new Promise<void>((resolve, reject) => {
          if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
          }
          const script = document.createElement("script");
          script.src = src;
          script.async = false;
          script.onload = () => resolve();
          script.onerror = () => reject();
          document.body.appendChild(script);
        });
      };

      try {
        for (const src of scripts) {
          if (!active) return;
          await loadScript(src);
        }

        // Re-initialize theme animations, touch events, and interactions
        if (typeof window !== "undefined") {
          const w = window as unknown as {
            PresenceX?: {
              destroy: () => void;
              ready: () => void;
              require: (name: string) => { init: () => void } | undefined;
            };
          };
          if (w.PresenceX) {
            w.PresenceX.destroy();
            w.PresenceX.ready();
            w.PresenceX.require("ix2")?.init();
          }
        }
      } catch (err) {
        console.error("Failed to load theme and animation scripts", err);
      }
    }

    loadScripts();

    return () => {
      active = false;
      if (typeof window !== "undefined") {
        const w = window as unknown as { PresenceX?: { destroy: () => void } };
        if (w.PresenceX) {
          w.PresenceX.destroy();
        }
      }
    };
  }, [scripts]);

  return null;
}
