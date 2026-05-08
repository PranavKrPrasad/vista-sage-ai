// Mints a short-lived Deepgram API key for browser-side STT WebSocket.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const DEEPGRAM_API_KEY = Deno.env.get("DEEPGRAM_API_KEY");
    if (!DEEPGRAM_API_KEY) throw new Error("DEEPGRAM_API_KEY not configured");

    // Look up project id
    const projRes = await fetch("https://api.deepgram.com/v1/projects", {
      headers: { Authorization: `Token ${DEEPGRAM_API_KEY}` },
    });
    if (!projRes.ok) throw new Error(`Deepgram projects ${projRes.status}`);
    const projJson = await projRes.json();
    const projectId = projJson.projects?.[0]?.project_id;
    if (!projectId) throw new Error("No Deepgram project");

    // Create a temp key valid 60s with member scope
    const keyRes = await fetch(`https://api.deepgram.com/v1/projects/${projectId}/keys`, {
      method: "POST",
      headers: { Authorization: `Token ${DEEPGRAM_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        comment: "veeru-ephemeral",
        scopes: ["usage:write"],
        time_to_live_in_seconds: 120,
      }),
    });
    if (!keyRes.ok) {
      const t = await keyRes.text();
      throw new Error(`Deepgram key error: ${keyRes.status} ${t}`);
    }
    const keyJson = await keyRes.json();
    return new Response(JSON.stringify({ key: keyJson.key }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("deepgram-token error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
