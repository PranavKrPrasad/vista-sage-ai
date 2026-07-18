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
  name: "list_reminders",
  title: "List reminders",
  description: "List the signed-in user's reminders. Optionally filter to only pending (not completed) items.",
  inputSchema: {
    pending_only: z.boolean().optional().describe("If true, only return reminders that are not completed."),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ pending_only, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = client(ctx.getToken()!)
      .from("reminders")
      .select("id, title, notes, due_at, completed, created_at")
      .order("due_at", { ascending: true, nullsFirst: false })
      .limit(limit ?? 50);
    if (pending_only) q = q.eq("completed", false);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { reminders: data },
    };
  },
});
