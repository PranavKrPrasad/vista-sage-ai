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
  const [faceDetected, setFaceDetected] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const historyRef = useRef<{ emo: Emotion; conf: number }[]>([]);
  const noFaceRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setStatus("idle");
      setEmotion(null);
      setFaceDetected(false);
      historyRef.current = [];
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        setStatus("loading");
        await loadModels();
        if (cancelled) return;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 480, height: 360, facingMode: "user" },
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
              .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
              .withFaceExpressions();
            if (result?.expressions) {
              noFaceRef.current = 0;
              setFaceDetected(true);
              const entries = Object.entries(result.expressions) as [Emotion, number][];
              entries.sort((a, b) => b[1] - a[1]);
              const [topEmo, topConf] = entries[0];

              // Bias against over-triggering "neutral" — neutral wins only if clearly dominant
              let chosen: [Emotion, number] = [topEmo, topConf];
              if (topEmo === "neutral" && entries[1] && entries[1][1] > 0.25) {
                chosen = entries[1];
              }

              // Smooth across last 5 frames
              historyRef.current.push({ emo: chosen[0], conf: chosen[1] });
              if (historyRef.current.length > 5) historyRef.current.shift();
              const totals: Partial<Record<Emotion, number>> = {};
              for (const h of historyRef.current) totals[h.emo] = (totals[h.emo] || 0) + h.conf;
              const sorted = Object.entries(totals).sort((a, b) => (b[1] as number) - (a[1] as number));
              const [bestEmo, bestSum] = sorted[0];
              setEmotion(bestEmo as Emotion);
              setConfidence((bestSum as number) / historyRef.current.length);
            } else {
              noFaceRef.current += 1;
              if (noFaceRef.current >= 2) {
                setFaceDetected(false);
                setEmotion(null);
                historyRef.current = [];
              }
            }
          } catch {
            // ignore per-frame errors
          }
        }, 700);
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

  return { videoRef, emotion, confidence, faceDetected, status, error };
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
