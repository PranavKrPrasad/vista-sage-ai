import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function client(token: string) {
  return createClient<Database>(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "add_memory",
  title: "Add memory",
  description: "Store a new long-term memory about the signed-in user for VEERU to recall in future conversations.",
  inputSchema: {
    content: z.string().trim().min(1).max(1000).describe("The fact or preference to remember."),
    category: z.string().max(60).optional().describe("Optional grouping like 'preferences', 'work', 'family'."),
    importance: z.number().int().min(1).max(10).optional().describe("1-10, higher is more important (default 5)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ content, category, importance }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await client(ctx.getToken())
      .from("memories")
      .insert({
        user_id: ctx.getUserId()!,
        content,
        category: category ?? "general",
        importance: importance ?? 5,
      })
      .select("id, content, category, importance, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Stored memory ${data.id}` }],
      structuredContent: { memory: data },
    };
  },
});
