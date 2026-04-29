// Streaming chat client + TTS client.
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type Msg = { role: "user" | "assistant"; content: string };

export async function streamChat(opts: {
  messages: Msg[];
  emotion?: string | null;
  tone?: string;
  language?: string;
  memories?: string[];
  imageBase64?: string | null;
  onDelta: (chunk: string) => void;
  signal?: AbortSignal;
}) {
  const resp = await fetch(`${SUPABASE_URL}/functions/v1/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify({
      messages: opts.messages,
      emotion: opts.emotion,
      tone: opts.tone,
      language: opts.language,
      memories: opts.memories,
      imageBase64: opts.imageBase64,
    }),
    signal: opts.signal,
  });

  if (!resp.ok) {
    if (resp.status === 429) throw new Error("Rate limit reached. Please wait a moment.");
    if (resp.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
    throw new Error(`Chat failed (${resp.status})`);
  }
  if (!resp.body) throw new Error("No response body");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  let done = false;

  while (!done) {
    const { value, done: rd } = await reader.read();
    if (rd) break;
    buf += decoder.decode(value, { stream: true });

    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      let line = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line || line.startsWith(":")) continue;
      if (!line.startsWith("data: ")) continue;
      const json = line.slice(6).trim();
      if (json === "[DONE]") { done = true; break; }
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) opts.onDelta(content);
      } catch {
        // partial json
        buf = line + "\n" + buf;
        break;
      }
    }
  }
}

export async function speak(text: string, voiceId?: string): Promise<HTMLAudioElement | null> {
  try {
    const resp = await fetch(`${SUPABASE_URL}/functions/v1/tts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${SUPABASE_KEY}` },
      body: JSON.stringify({ text, voiceId }),
    });
    if (!resp.ok) return null;
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    await audio.play();
    audio.addEventListener("ended", () => URL.revokeObjectURL(url));
    return audio;
  } catch {
    return null;
  }
}

export { supabase };
