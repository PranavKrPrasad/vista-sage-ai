import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

export type Emotion = "happy" | "sad" | "angry" | "surprised" | "neutral" | "fearful" | "disgusted";

const MODEL_URL = "https://justadudewhohacks.github.io/face-api.js/models";

let modelPromise: Promise<void> | null = null;
function loadModels() {
  if (!modelPromise) {
    modelPromise = (async () => {
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
    })();
  }
  return modelPromise;
}

export function useEmotionDetector(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [confidence, setConfidence] = useState(0);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!enabled) {
      // cleanup
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setStatus("idle");
      setEmotion(null);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setStatus("loading");
        await loadModels();
        if (cancelled) return;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: "user" },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setStatus("ready");

        intervalRef.current = window.setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const result = await faceapi
              .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.5 }))
              .withFaceExpressions();
            if (result?.expressions) {
              const entries = Object.entries(result.expressions) as [Emotion, number][];
              entries.sort((a, b) => b[1] - a[1]);
              const [topEmo, topConf] = entries[0];
              setEmotion(topEmo);
              setConfidence(topConf);
            } else {
              setEmotion(null);
            }
          } catch {
            // ignore per-frame errors
          }
        }, 800);
      } catch (e: any) {
        if (cancelled) return;
        setStatus("error");
        setError(e?.message ?? "Camera access failed");
      }
    })();

    return () => {
      cancelled = true;
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [enabled]);

  return { videoRef, emotion, confidence, status, error };
}

export const EMOTION_META: Record<Emotion, { emoji: string; label: string; color: string }> = {
  happy: { emoji: "😊", label: "Happy", color: "oklch(0.80 0.18 90)" },
  sad: { emoji: "😢", label: "Sad", color: "oklch(0.65 0.15 240)" },
  angry: { emoji: "😠", label: "Angry", color: "oklch(0.65 0.24 25)" },
  surprised: { emoji: "😲", label: "Surprised", color: "oklch(0.78 0.18 320)" },
  neutral: { emoji: "😐", label: "Neutral", color: "oklch(0.72 0.04 240)" },
  fearful: { emoji: "😨", label: "Fearful", color: "oklch(0.65 0.18 290)" },
  disgusted: { emoji: "🤢", label: "Disgusted", color: "oklch(0.65 0.18 140)" },
};
