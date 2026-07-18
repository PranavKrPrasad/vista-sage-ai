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
  name: "create_reminder",
  title: "Create reminder",
  description: "Create a new reminder for the signed-in VEERU user.",
  inputSchema: {
    title: z.string().trim().min(1).max(200).describe("What to be reminded about."),
    notes: z.string().max(2000).optional(),
    due_at: z.string().datetime().optional().describe("ISO 8601 UTC datetime; omit for no due date."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async ({ title, notes, due_at }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await client(ctx.getToken()!)
      .from("reminders")
      .insert({ user_id: ctx.getUserId()!, title, notes: notes ?? null, due_at: due_at ?? null })
      .select("id, title, notes, due_at, completed, created_at")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Created reminder ${data.id}` }],
      structuredContent: { reminder: data },
    };
  },
});
