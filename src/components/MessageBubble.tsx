import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkBreaks from "remark-breaks";
import rehypeKatex from "rehype-katex";
import { Sparkles, Copy, Check } from "lucide-react";
import { useState } from "react";
import { EMOTION_META, type Emotion } from "@/lib/emotion-detector";

export type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  emotion?: string | null;
  image_url?: string | null;
  generated_images?: string[];
  created_at: string;
};

function CodeBlock({ inline, className, children }: any) {
  const [copied, setCopied] = useState(false);
  const lang = /language-(\w+)/.exec(className || "")?.[1];
  const code = String(children).replace(/\n$/, "");

  if (inline) {
    return <code className="rounded bg-muted/60 px-1.5 py-0.5 text-[0.85em] font-mono">{children}</code>;
  }

  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="group relative my-3 overflow-hidden rounded-lg border border-border/60 bg-background/60">
      <div className="flex items-center justify-between border-b border-border/40 bg-muted/30 px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{lang || "code"}</span>
        <button
          onClick={copy}
          className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:text-foreground transition"
          aria-label="Copy code"
        >
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-xs leading-relaxed">
        <code className={className}>{code}</code>
      </pre>
    </div>
  );
}

export function MessageBubble({ msg }: { msg: ChatMsg }) {
  const isUser = msg.role === "user";
  const time = new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
      <div className={`min-w-0 max-w-[92%] sm:max-w-[85%] ${isUser ? "ml-6 sm:ml-12" : "mr-6 sm:mr-12"}`}>
        <div className={`overflow-hidden rounded-2xl px-4 py-3 ${isUser ? "bg-primary/15 border border-primary/30" : "glass"}`}>
          {msg.image_url && (
            <img src={msg.image_url} alt="Attached" className="mb-2 max-h-60 rounded-lg object-cover" />
          )}
          {msg.generated_images && msg.generated_images.length > 0 && (
            <div className="mb-2 space-y-2">
              {msg.generated_images.map((imgUrl, idx) => (
                <div key={idx} className="group relative">
                  <img src={imgUrl} alt={`Generated ${idx + 1}`} className="max-h-96 w-full rounded-lg object-contain border border-border/30" />
                  <a href={imgUrl} download={`veeru-image-${idx + 1}.png`}
                    className="absolute bottom-2 right-2 rounded-lg bg-background/80 px-3 py-1.5 text-xs font-medium opacity-0 backdrop-blur transition group-hover:opacity-100">
                    ⬇ Download
                  </a>
                  <div className="absolute top-2 left-2 flex items-center gap-1 rounded-lg bg-background/80 px-2 py-1 text-xs backdrop-blur">
                    <Sparkles className="h-3 w-3 text-primary" /> AI Generated
                  </div>
                </div>
              ))}
            </div>
          )}
          {msg.content && (
            <div className="prose prose-sm prose-invert max-w-none break-words [overflow-wrap:anywhere] prose-p:my-2 prose-pre:p-0 prose-pre:bg-transparent prose-pre:my-0 prose-table:my-3 prose-headings:mt-3 prose-headings:mb-2 prose-li:my-0.5">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath, remarkBreaks]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code: CodeBlock as any,
                  table: ({ children }) => (
                    <div className="my-3 overflow-x-auto rounded-lg border border-border/40">
                      <table className="w-full text-sm">{children}</table>
                    </div>
                  ),
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noreferrer" className="text-primary underline-offset-2 hover:underline">{children}</a>
                  ),
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          )}
          {!msg.content && !msg.generated_images?.length && (
            <span className="inline-flex gap-1">
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary/70" />
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary/70" style={{ animationDelay: "0.15s" }} />
              <span className="h-2 w-2 animate-pulse rounded-full bg-primary/70" style={{ animationDelay: "0.3s" }} />
            </span>
          )}
        </div>
        <div className={`mt-1 text-xs text-muted-foreground ${isUser ? "text-right" : "text-left"}`}>
          {isUser ? "You" : "VEERU"} · {time}
          {msg.emotion && isUser && ` · ${EMOTION_META[msg.emotion as Emotion]?.emoji ?? ""}`}
        </div>
      </div>
    </div>
  );
}
