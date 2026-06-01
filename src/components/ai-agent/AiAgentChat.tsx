"use client";

import {
  FormEvent,
  KeyboardEvent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";

type ChatMessage = {
  id?: number;
  conversationId?: number;
  role: "user" | "assistant";
  content: string;
  model?: string | null;
  createdAt?: string;
  pending?: boolean;
};

type Conversation = {
  id: number;
  title: string;
  createdByEmail: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  lastMessageAt?: string | null;
  messageCount?: number;
};

type ApiEnvelope<T> = {
  success: boolean;
  data: T | null;
  error: { message: string } | null;
};

type ChatResponse = ApiEnvelope<{
  conversation: Conversation;
  messages: ChatMessage[];
  reply: ChatMessage;
  model: string;
  requestModel: string;
  host: string;
  contextGeneratedAt: string;
}>;

type ConversationListResponse = ApiEnvelope<{
  conversations: Conversation[];
}>;

type ConversationDetailResponse = ApiEnvelope<{
  conversation: Conversation;
  messages: ChatMessage[];
}>;

const starterPrompts = [
  {
    title: "Ringkas akun",
    subtitle: "Kondisi semua brand sekarang",
    prompt: "Ringkas kondisi akun Instagram yang terhubung — jumlah follower, post terbaru, dan engagement rate.",
  },
  {
    title: "Prioritas konten",
    subtitle: "Yang perlu dijawab dulu",
    prompt: "Konten dan komentar apa yang perlu diprioritaskan minggu ini?",
  },
  {
    title: "Status sistem",
    subtitle: "Sync, webhook, error",
    prompt: "Apakah ada masalah sync atau webhook terbaru? Tampilkan audit log singkat.",
  },
  {
    title: "Insight performa",
    subtitle: "Post terbaik & terburuk",
    prompt: "Post mana yang paling viral dan paling sepi? Beri analisis singkat.",
  },
];

// ============================================================================
// Markdown rendering helpers (preserved)
// ============================================================================

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "paragraph"; text: string }
  | { type: "table"; rows: string[][] };

function stripFormatting(value: string): string {
  return value.replace(/\*\*/g, "").replace(/`/g, "").trim();
}

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.includes("|", 1);
}

function isTableDivider(line: string): boolean {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
}

function isLooseUrlLine(line: string): boolean {
  return /^\s*<?https?:\/\/[^>\s|]+>?\s*\|?\s*$/.test(line);
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/^</, "").replace(/>\s*\|?$/, "").replace(/\|$/, "");
}

function splitTableRow(line: string): string[] {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

function parseMarkdown(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();
    if (!trimmed) {
      index++;
      continue;
    }

    if (isTableRow(line)) {
      const tableLines: string[] = [];
      while (index < lines.length) {
        const current = lines[index];
        if (isTableRow(current)) {
          tableLines.push(current);
          index++;
          continue;
        }
        if (tableLines.length > 0 && isLooseUrlLine(current)) {
          const last = tableLines[tableLines.length - 1].replace(/\|\s*$/, "");
          tableLines[tableLines.length - 1] = `${last} | ${normalizeUrl(current)} |`;
          index++;
          continue;
        }
        break;
      }

      const rows = tableLines
        .filter((row) => !isTableDivider(row))
        .map(splitTableRow)
        .filter((row) => row.some((cell) => cell.length > 0));

      if (rows.length > 1) {
        const maxCells = Math.max(...rows.map((row) => row.length));
        blocks.push({
          type: "table",
          rows: rows.map((row) => [
            ...row,
            ...Array.from({ length: maxCells - row.length }, () => ""),
          ]),
        });
      } else if (rows.length === 1) {
        blocks.push({ type: "paragraph", text: rows[0].join(" | ") });
      }
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      blocks.push({
        type: "heading",
        level: Math.min(heading[1].length, 4),
        text: stripFormatting(heading[2]),
      });
      index++;
      continue;
    }

    if (/^(\d+\.|[-*])\s+/.test(trimmed)) {
      const ordered = /^\d+\.\s+/.test(trimmed);
      const items: string[] = [];
      while (index < lines.length) {
        const itemLine = lines[index].trim();
        const itemMatch = itemLine.match(ordered ? /^\d+\.\s+(.+)$/ : /^[-*]\s+(.+)$/);
        if (!itemMatch) break;
        items.push(itemMatch[1]);
        index++;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraph: string[] = [];
    while (index < lines.length) {
      const current = lines[index];
      const currentTrimmed = current.trim();
      if (
        !currentTrimmed ||
        isTableRow(current) ||
        /^(#{1,4})\s+/.test(currentTrimmed) ||
        /^(\d+\.|[-*])\s+/.test(currentTrimmed)
      ) {
        break;
      }
      paragraph.push(currentTrimmed);
      index++;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern =
    /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)]+\)|<https?:\/\/[^>\s]+>|https?:\/\/[^\s)]+)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    const token = match[0];

    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={`${match.index}-strong`} className="font-semibold text-[color:var(--fg)]">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code key={`${match.index}-code`} className="kbd">
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      const markdownLink = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)]+)\)$/);
      const href = markdownLink ? markdownLink[2] : normalizeUrl(token);
      const label = markdownLink ? markdownLink[1] : href.replace(/^https?:\/\//, "");
      nodes.push(
        <a
          key={`${match.index}-link`}
          href={href}
          target="_blank"
          rel="noreferrer"
          className="text-[color:var(--accent)] underline underline-offset-2 hover:opacity-80"
        >
          {label}
        </a>,
      );
    }
    cursor = match.index + token.length;
  }

  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

function extractUrl(value: string): string | null {
  const match = value.match(/<?(https?:\/\/[^>\s|]+)>?/);
  return match ? normalizeUrl(match[1]) : null;
}

function isNumericColumn(header: string): boolean {
  const clean = stripFormatting(header).toLowerCase();
  return [
    "#", "id", "likes", "komentar", "total interaksi",
    "reach", "impressions", "shares", "saves", "views",
  ].some((label) => clean.includes(label));
}

function formatHistoryDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" });
}

function AssistantTable({ rows }: { rows: string[][] }) {
  const [header, ...body] = rows;
  return (
    <div className="my-4 overflow-x-auto rounded-lg border border-[color:var(--border)]">
      <table className="w-full min-w-[640px] border-collapse text-left text-xs">
        <thead className="bg-[color:var(--bg-elev-2)] text-fg-muted">
          <tr>
            {header.map((cell, index) => (
              <th
                key={`${cell}-${index}`}
                className={`border-b border-[color:var(--border)] px-3 py-2 font-semibold ${
                  isNumericColumn(cell) ? "text-right" : "text-left"
                }`}
              >
                {stripFormatting(cell)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr
              key={`${row.join("-")}-${rowIndex}`}
              className="border-b border-[color:var(--border-soft)] last:border-b-0 hover:bg-[color:var(--bg-elev-2)]"
            >
              {row.map((cell, cellIndex) => {
                const headerText = header[cellIndex] ?? "";
                const url = extractUrl(cell);
                const numeric = isNumericColumn(headerText);
                return (
                  <td
                    key={`${cell}-${cellIndex}`}
                    className={`align-top px-3 py-2 ${
                      numeric ? "text-right tabular-nums mono" : "text-left"
                    }`}
                  >
                    {url && stripFormatting(headerText).toLowerCase().includes("permalink") ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-md border border-[color:var(--border)] px-2 py-0.5 text-xs text-[color:var(--accent)] hover:bg-[color:var(--bg-elev-3)]"
                      >
                        Open
                      </a>
                    ) : (
                      renderInline(cell)
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AssistantContent({ content }: { content: string }) {
  const blocks = parseMarkdown(content);
  return (
    <div className="space-y-3 text-sm leading-6">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const HeadingTag = block.level <= 2 ? "h2" : "h3";
          return (
            <HeadingTag
              key={`${block.type}-${index}`}
              className="pt-1 text-base font-semibold text-[color:var(--fg)]"
            >
              {block.text}
            </HeadingTag>
          );
        }
        if (block.type === "table") {
          return <AssistantTable key={`${block.type}-${index}`} rows={block.rows} />;
        }
        if (block.type === "list") {
          const ListTag = block.ordered ? "ol" : "ul";
          return (
            <ListTag
              key={`${block.type}-${index}`}
              className={`space-y-1 ${block.ordered ? "list-decimal" : "list-disc"} pl-5`}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${item}-${itemIndex}`}>{renderInline(item)}</li>
              ))}
            </ListTag>
          );
        }
        return <p key={`${block.type}-${index}`}>{renderInline(block.text)}</p>;
      })}
    </div>
  );
}

// ============================================================================
// Main component
// ============================================================================

export default function AiAgentChat() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meta, setMeta] = useState<{
    model: string;
    requestModel: string;
    contextGeneratedAt: string;
  } | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch("/api/ai-agent/conversations", { cache: "no-store" });
        const json = (await res.json()) as ConversationListResponse;
        if (cancelled || !json.success || !json.data) return;
        setConversations(json.data.conversations);
        const latest = json.data.conversations[0];
        if (!latest) return;

        const detailRes = await fetch(`/api/ai-agent/conversations/${latest.id}`, {
          cache: "no-store",
        });
        const detail = (await detailRes.json()) as ConversationDetailResponse;
        if (cancelled || !detail.success || !detail.data) return;
        setActiveConversationId(latest.id);
        setMessages(detail.data.messages);
      } catch {
        if (!cancelled) setError("Gagal memuat riwayat chat.");
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [input]);

  async function refreshConversations() {
    const res = await fetch("/api/ai-agent/conversations", { cache: "no-store" });
    const json = (await res.json()) as ConversationListResponse;
    if (json.success && json.data) setConversations(json.data.conversations);
  }

  async function loadConversation(id: number) {
    if (loading || loadingConversation) return;
    setLoadingConversation(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai-agent/conversations/${id}`, { cache: "no-store" });
      const json = (await res.json()) as ConversationDetailResponse;
      if (!res.ok || !json.success || !json.data) {
        setError(json.error?.message ?? "Gagal memuat chat.");
        return;
      }
      setActiveConversationId(id);
      setMessages(json.data.messages);
      setMeta(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat chat.");
    } finally {
      setLoadingConversation(false);
    }
  }

  function startNewChat() {
    if (loading) return;
    setActiveConversationId(null);
    setMessages([]);
    setInput("");
    setError(null);
    setMeta(null);
  }

  async function deleteConversation(id: number) {
    if (loading) return;
    try {
      const res = await fetch(`/api/ai-agent/conversations/${id}`, { method: "DELETE" });
      const json = (await res.json()) as ApiEnvelope<{ deleted: boolean }>;
      if (!res.ok || !json.success) {
        setError(json.error?.message ?? "Gagal menghapus chat.");
        return;
      }
      await refreshConversations();
      if (activeConversationId === id) startNewChat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus chat.");
    }
  }

  async function sendText(text: string) {
    const content = text.trim();
    if (!content || loading) return;

    const optimistic: ChatMessage = {
      role: "user",
      content,
      pending: true,
      createdAt: new Date().toISOString(),
    };
    setMessages((current) => [...current, optimistic]);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/ai-agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversationId,
          message: content,
        }),
      });
      const json = (await res.json()) as ChatResponse;
      if (!res.ok || !json.success || !json.data) {
        const message = json.error?.message ?? "AI agent failed";
        setError(message);
        setMessages((current) => [
          ...current.filter((item) => !item.pending),
          { role: "assistant", content: `Gagal menjalankan AI agent: ${message}` },
        ]);
        return;
      }

      const data = json.data;
      setActiveConversationId(data.conversation.id);
      setMeta({
        model: data.model,
        requestModel: data.requestModel,
        contextGeneratedAt: data.contextGeneratedAt,
      });
      setMessages((current) => [
        ...current.filter((item) => !item.pending),
        ...data.messages,
      ]);
      await refreshConversations();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setMessages((current) => [
        ...current.filter((item) => !item.pending),
        { role: "assistant", content: `Gagal menjalankan AI agent: ${message}` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendText(input);
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendText(input);
    }
  }

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const showEmptyState = messages.length === 0 && !loadingConversation;

  return (
    <div className="flex h-[calc(100vh-9rem)] min-h-[600px] overflow-hidden rounded-2xl border border-[color:var(--border)] bg-[color:var(--bg-elev-1)] shadow-[var(--shadow-elev)]">
      {/* Conversations sidebar */}
      <aside className="hidden w-72 shrink-0 border-r border-[color:var(--border)] bg-[color:var(--bg)] lg:flex lg:flex-col">
        <div className="border-b border-[color:var(--border)] p-3">
          <button
            type="button"
            className="btn btn-secondary w-full"
            onClick={startNewChat}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New chat
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {conversations.length === 0 ? (
            <p className="px-3 py-6 text-xs text-muted text-center">
              No conversations yet.
            </p>
          ) : (
            <div className="space-y-0.5">
              {conversations.map((conversation) => {
                const active = conversation.id === activeConversationId;
                return (
                  <div
                    key={conversation.id}
                    className={`group flex items-start gap-2 rounded-lg px-2.5 py-2 transition-colors ${
                      active
                        ? "bg-[color:var(--accent-soft)] border border-[color:var(--border-strong)]"
                        : "border border-transparent hover:bg-[color:var(--bg-elev-2)]"
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => void loadConversation(conversation.id)}
                    >
                      <div className="truncate text-sm font-medium">{conversation.title}</div>
                      <div className="mt-0.5 text-[10px] text-faint">
                        {formatHistoryDate(conversation.lastMessageAt ?? conversation.updatedAt)}
                        {conversation.messageCount ? ` · ${conversation.messageCount} msg` : ""}
                      </div>
                    </button>
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 transition-opacity rounded p-1 text-faint hover:text-[color:var(--danger)] hover:bg-[color:var(--danger)]/10"
                      onClick={() => void deleteConversation(conversation.id)}
                      title="Delete chat"
                      aria-label="Delete chat"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3">
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      {/* Chat area */}
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center justify-between border-b border-[color:var(--border)] px-5 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-[color:var(--accent)] flex items-center justify-center text-white shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
                <circle cx="12" cy="12" r="3.5" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-[color:var(--fg)]">AI Agent</h1>
                <span className="badge badge-info badge-dot">Ollama Cloud</span>
              </div>
              <div className="text-xs text-[color:var(--fg-muted)] truncate">
                {activeConversation?.title ?? "Instagram database assistant"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm lg:hidden"
              onClick={startNewChat}
            >
              New
            </button>
            {meta && (
              <div className="hidden xl:flex flex-col items-end text-[10px] text-faint mono">
                <div>{meta.requestModel}</div>
                <div>{new Date(meta.contextGeneratedAt).toLocaleString()}</div>
              </div>
            )}
          </div>
        </header>

        {error && (
          <div className="border-b border-[color:var(--danger)]/30 bg-[color:var(--danger)]/10 px-5 py-2.5 text-sm text-[color:var(--danger)] fade-in">
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-5">
            {loadingConversation && (
              <div className="flex items-center gap-2 text-sm text-muted">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 spin">
                  <path d="M21 12a9 9 0 1 1-6.2-8.55" />
                </svg>
                Loading chat history…
              </div>
            )}

            {showEmptyState && (
              <div className="flex min-h-[480px] flex-col items-center justify-center text-center fade-in">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[color:var(--accent-soft)] text-[color:var(--accent)]">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                    <path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
                    <circle cx="12" cy="12" r="3.5" />
                  </svg>
                </div>
                <h2 className="text-2xl font-semibold text-[color:var(--fg)]">How can I help you today?</h2>
                <p className="mt-2 max-w-md text-sm text-[color:var(--fg-muted)]">
                  Saya bisa analisis database Instagram kamu — engagement, sentiment komentar,
                  performa konten, status sync. Mulai dengan salah satu pertanyaan di bawah.
                </p>
                <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl w-full">
                  {starterPrompts.map((p) => (
                    <button
                      key={p.title}
                      type="button"
                      className="card card-hover bg-[color:var(--bg-elev-2)] p-4 text-left group"
                      onClick={() => void sendText(p.prompt)}
                      disabled={loading}
                    >
                      <div className="text-sm font-medium">{p.title}</div>
                      <div className="text-xs text-muted mt-0.5">{p.subtitle}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={message.id ?? `${message.role}-${index}`}
                className={`flex gap-3 fade-in ${
                  message.role === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    message.role === "user"
                      ? "bg-[color:var(--bg-elev-3)] border border-[color:var(--border)] text-[color:var(--fg-soft)]"
                      : "bg-[color:var(--accent)] text-white"
                  }`}
                >
                  {message.role === "user" ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <circle cx="12" cy="8" r="3.5" />
                      <path d="M4 20c1.2-4 4.2-6 8-6s6.8 2 8 6" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                      <path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
                      <circle cx="12" cy="12" r="3.5" />
                    </svg>
                  )}
                </div>
                <div
                  className={`rounded-2xl px-4 py-3 max-w-[85%] text-[color:var(--fg)] ${
                    message.role === "user"
                      ? "bg-[color:var(--accent-soft)] border border-[rgba(79,70,229,0.18)]"
                      : "bg-[color:var(--bg-elev-2)] border border-[color:var(--border)]"
                  } ${message.pending ? "opacity-60" : ""}`}
                >
                  {message.role === "assistant" ? (
                    <AssistantContent content={message.content} />
                  ) : (
                    <div className="whitespace-pre-wrap text-sm leading-6">{message.content}</div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 fade-in">
                <div className="w-8 h-8 rounded-lg bg-[color:var(--accent)] text-white flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path d="M12 3v3M12 18v3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M3 12h3M18 12h3M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
                    <circle cx="12" cy="12" r="3.5" />
                  </svg>
                </div>
                <div className="rounded-2xl bg-[color:var(--bg-elev-2)] border border-[color:var(--border)] px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--accent)] animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--accent)] animate-pulse [animation-delay:200ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--accent)] animate-pulse [animation-delay:400ms]" />
                    <span className="text-xs text-[color:var(--fg-muted)] ml-2">Analyzing database…</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-[color:var(--border)] px-5 py-4 bg-[color:var(--bg)]">
          <form className="mx-auto max-w-3xl" onSubmit={onSubmit}>
            <div className="relative card bg-[color:var(--bg-elev-2)] focus-within:border-[color:var(--accent)] focus-within:shadow-[0_0_0_3px_var(--accent-soft)] transition-shadow">
              <textarea
                ref={textareaRef}
                className="w-full bg-transparent border-0 outline-none resize-none px-4 py-3 pr-14 text-sm placeholder:text-faint"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Tanya AI Agent tentang Instagram database…"
                disabled={loading}
                rows={1}
              />
              <button
                type="submit"
                className="absolute right-2 bottom-2 w-9 h-9 rounded-lg bg-[color:var(--accent)] hover:bg-[color:var(--accent-strong)] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-white transition-colors"
                disabled={loading || input.trim().length === 0}
                aria-label="Send"
              >
                {loading ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 spin">
                    <path d="M21 12a9 9 0 1 1-6.2-8.55" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <path d="M22 2 11 13" />
                    <path d="M22 2 15 22 11 13 2 9z" />
                  </svg>
                )}
              </button>
            </div>
            <div className="flex items-center justify-between mt-2 px-1">
              <p className="text-[10px] text-faint">
                <span className="kbd">Enter</span> to send · <span className="kbd">Shift+Enter</span> for newline
              </p>
              {meta && (
                <p className="text-[10px] text-faint mono">
                  {meta.requestModel}
                </p>
              )}
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
