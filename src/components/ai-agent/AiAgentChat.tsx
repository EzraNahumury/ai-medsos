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
  "Ringkas kondisi akun IG sekarang.",
  "Konten dan komentar apa yang perlu diprioritaskan?",
  "Ada masalah sync atau webhook terbaru?",
];

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
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
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
        <strong key={`${match.index}-strong`} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code
          key={`${match.index}-code`}
          className="rounded border border-[color:var(--border)] bg-[color:var(--card)] px-1 py-0.5 text-xs"
        >
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
          className="text-[color:var(--accent)] underline underline-offset-2"
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
    "#",
    "id",
    "likes",
    "komentar",
    "total interaksi",
    "reach",
    "impressions",
    "shares",
    "saves",
    "views",
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
    <div className="my-4 overflow-x-auto rounded-md border border-[color:var(--border)]">
      <table className="w-full min-w-[720px] border-collapse text-left text-xs">
        <thead className="bg-[color:var(--card)] text-[color:var(--muted)]">
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
              className="border-b border-[color:var(--border)] last:border-b-0"
            >
              {row.map((cell, cellIndex) => {
                const headerText = header[cellIndex] ?? "";
                const url = extractUrl(cell);
                const numeric = isNumericColumn(headerText);
                return (
                  <td
                    key={`${cell}-${cellIndex}`}
                    className={`align-top px-3 py-2 ${
                      numeric ? "text-right tabular-nums" : "text-left"
                    }`}
                  >
                    {url && stripFormatting(headerText).toLowerCase().includes("permalink") ? (
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex rounded-md border border-[color:var(--border)] px-2 py-1 text-xs text-[color:var(--accent)] hover:bg-[color:var(--border)]/30"
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
              className="pt-1 text-base font-semibold text-white"
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
      const res = await fetch(`/api/ai-agent/conversations/${id}`, {
        cache: "no-store",
      });
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
      const res = await fetch(`/api/ai-agent/conversations/${id}`, {
        method: "DELETE",
      });
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

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId,
  );
  const showEmptyState = messages.length === 0 && !loadingConversation;

  return (
    <div className="flex h-[calc(100vh-7rem)] min-h-[600px] overflow-hidden rounded-lg border border-[color:var(--border)] bg-[color:var(--background)]">
      <aside className="hidden w-72 shrink-0 border-r border-[color:var(--border)] bg-[color:var(--card)] lg:flex lg:flex-col">
        <div className="border-b border-[color:var(--border)] p-4">
          <button type="button" className="btn btn-secondary w-full" onClick={startNewChat}>
            + Chat Baru
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {conversations.length === 0 ? (
            <p className="px-2 py-4 text-sm text-[color:var(--muted)]">
              Belum ada riwayat chat.
            </p>
          ) : (
            <div className="space-y-1">
              {conversations.map((conversation) => {
                const active = conversation.id === activeConversationId;
                return (
                  <div
                    key={conversation.id}
                    className={`group flex items-center gap-2 rounded-md border px-2 py-2 ${
                      active
                        ? "border-[color:var(--accent)] bg-[color:var(--background)]"
                        : "border-transparent hover:border-[color:var(--border)] hover:bg-[color:var(--background)]/60"
                    }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 text-left"
                      onClick={() => void loadConversation(conversation.id)}
                    >
                      <div className="truncate text-sm font-medium">{conversation.title}</div>
                      <div className="mt-1 text-xs text-[color:var(--muted)]">
                        {formatHistoryDate(conversation.lastMessageAt ?? conversation.updatedAt)}
                        {conversation.messageCount ? ` · ${conversation.messageCount} pesan` : ""}
                      </div>
                    </button>
                    <button
                      type="button"
                      className="rounded px-2 py-1 text-xs text-red-300 opacity-70 hover:bg-red-500/10 hover:opacity-100"
                      onClick={() => void deleteConversation(conversation.id)}
                      title="Hapus chat"
                      aria-label="Hapus chat"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[color:var(--border)] px-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold">AI Agent</h1>
              <span className="text-xs text-[color:var(--muted)]">IG Database Assistant</span>
            </div>
            {activeConversation && (
              <div className="max-w-[60vw] truncate text-xs text-[color:var(--muted)]">
                {activeConversation.title}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="btn btn-secondary lg:hidden" onClick={startNewChat}>
              Chat Baru
            </button>
            {meta && (
              <div className="hidden text-right text-xs text-[color:var(--muted)] md:block">
                <div>{meta.requestModel}</div>
                <div>{new Date(meta.contextGeneratedAt).toLocaleString()}</div>
              </div>
            )}
          </div>
        </header>

        {error && (
          <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mx-auto flex max-w-5xl flex-col gap-4">
            {loadingConversation && (
              <div className="text-sm text-[color:var(--muted)]">Memuat riwayat chat...</div>
            )}

            {showEmptyState && (
              <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[color:var(--accent)] text-2xl text-white">
                  AI
                </div>
                <h2 className="text-2xl font-semibold">AI Agent</h2>
                <p className="mt-2 max-w-xl text-sm text-[color:var(--muted)]">
                  Mulai chat baru atau lanjutkan riwayat dari panel kiri.
                  Jawaban memakai konteks database Instagram yang tersimpan.
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {starterPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void sendText(prompt)}
                      disabled={loading}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={message.id ?? `${message.role}-${index}`}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`rounded-lg border px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "max-w-[82%] whitespace-pre-wrap border-[color:var(--accent)] bg-[color:var(--accent)] text-white"
                      : "w-full max-w-full border-[color:var(--border)] bg-[color:var(--card)] text-[color:var(--foreground)]"
                  } ${message.pending ? "opacity-70" : ""}`}
                >
                  {message.role === "assistant" ? (
                    <AssistantContent content={message.content} />
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] px-4 py-3 text-sm text-[color:var(--muted)]">
                  Menganalisis database...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="shrink-0 border-t border-[color:var(--border)] p-4">
          <form className="mx-auto flex max-w-5xl items-end gap-3" onSubmit={onSubmit}>
            <textarea
              className="input min-h-14 resize-none"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Tanya AI Agent..."
              disabled={loading}
            />
            <button
              type="submit"
              className="btn btn-primary h-10 shrink-0"
              disabled={loading || input.trim().length === 0}
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
