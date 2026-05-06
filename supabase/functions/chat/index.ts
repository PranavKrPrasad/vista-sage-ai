// Streaming chat with Lovable AI Gateway. Supports text + optional image.
// Adapts persona based on user emotion (face/voice/text).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, emotion, tone, language, memories, imageBase64 } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const memoryContext = (memories || []).length
      ? `\n\nLong-term memory about the user:\n${(memories as string[]).map((m, i) => `${i + 1}. ${m}`).join("\n")}`
      : "";

    const emotionContext = emotion
      ? `\n\nThe user's currently detected emotion is: ${emotion}. Adapt your response empathetically — if sad/angry/fearful, be gentle and supportive; if happy, match their energy; if neutral, be warm and helpful.`
      : "";

    const systemPrompt = `You are JARVIS, an advanced AI virtual assistant — intelligent, witty, calm, and proactive. ` +
      `Your communication tone should be: ${tone || "friendly"}. ` +
      `Respond in language: ${language || "en"}. ` +
      `You can help with conversation, answer questions, analyze images, generate images (the user can ask you to create/generate/draw images and it will be handled automatically), set reminders, perform web reasoning, and remember the user's preferences. ` +
      `When the user asks you to generate/create/draw an image, acknowledge the request enthusiastically. The image generation is handled by the frontend — just respond with a brief, relevant description. ` +
      `Keep responses concise and helpful. Use markdown when useful.${emotionContext}${memoryContext}`;

    // Build messages — last user msg can include image
    const apiMessages: any[] = [{ role: "system", content: systemPrompt }];
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i];
      const isLast = i === messages.length - 1;
      if (isLast && m.role === "user" && imageBase64) {
        apiMessages.push({
          role: "user",
          content: [
            { type: "text", text: m.content || "What's in this image?" },
            { type: "image_url", image_url: { url: imageBase64 } },
          ],
        });
      } else {
        apiMessages.push({ role: m.role, content: m.content });
      }
    }

    const model = imageBase64 ? "google/gemini-2.5-flash" : "google/gemini-3-flash-preview";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: apiMessages, stream: true }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit reached. Please wait a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add funds in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
