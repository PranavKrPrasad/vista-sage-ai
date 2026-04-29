// Browser SpeechRecognition wrapper. Returns a hook with start/stop/transcript.
import { useEffect, useRef, useState } from "react";

type SR = any;

export function useSpeechRecognition(language = "en-US") {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [supported, setSupported] = useState(false);
  const recRef = useRef<SR | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    setSupported(true);
    const r = new SR();
    r.continuous = false;
    r.interimResults = true;
    r.lang = language;

    r.onresult = (e: any) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interimText += res[0].transcript;
      }
      if (finalText) setTranscript((t) => (t + " " + finalText).trim());
      setInterim(interimText);
    };
    r.onend = () => {
      setListening(false);
      setInterim("");
    };
    r.onerror = () => {
      setListening(false);
      setInterim("");
    };
    recRef.current = r;
    return () => {
      try { r.stop(); } catch {}
    };
  }, [language]);

  const start = () => {
    if (!recRef.current) return;
    setTranscript("");
    setInterim("");
    try {
      recRef.current.start();
      setListening(true);
    } catch {}
  };
  const stop = () => {
    try { recRef.current?.stop(); } catch {}
    setListening(false);
  };
  const reset = () => { setTranscript(""); setInterim(""); };

  return { listening, transcript, interim, supported, start, stop, reset };
}
