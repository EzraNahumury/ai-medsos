import { getEnv, getOllamaApiKey, getOllamaHost } from "@/lib/env";
import { listRecent as listRecentAudit } from "@/server/repo/audit-log";
import {
  count as countComments,
  listAllForDashboard as listComments,
} from "@/server/repo/instagram-comment";
import {
  count as countMedia,
  listAllForDashboard as listMedia,
} from "@/server/repo/instagram-media";
import { listRecent as listMetrics } from "@/server/repo/media-metric";
import { listForDashboard as listAccounts } from "@/server/repo/social-account";
import { listRecent as listSyncJobs } from "@/server/repo/sync-job";
import {
  countPending,
  listRecent as listWebhookEvents,
} from "@/server/repo/webhook-event";

export type AiAgentChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type OllamaChatMessage = AiAgentChatMessage | {
  role: "system";
  content: string;
};

type OllamaChatResponse = {
  model?: string;
  message?: {
    role?: string;
    content?: string;
  };
  error?: string;
};

const MAX_HISTORY_MESSAGES = 12;
const MAX_CONTEXT_TEXT = 14000;

function clip(value: string | null | undefined, max = 280): string | null {
  if (!value) return null;
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function iso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function compactJson(value: unknown): string {
  const text = JSON.stringify(value);
  if (text.length <= MAX_CONTEXT_TEXT) return text;
  return `${text.slice(0, MAX_CONTEXT_TEXT)}...`;
}

function buildOllamaApiUrl(host: string, path: string): string {
  const trimmed = host.replace(/\/+$/, "");
  const base = trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function isOllamaCloudHost(host: string): boolean {
  try {
    const hostname = new URL(host).hostname;
    return hostname === "ollama.com" || hostname.endsWith(".ollama.com");
  } catch {
    return false;
  }
}

function modelForHost(host: string, configuredModel: string): string {
  if (isOllamaCloudHost(host) && configuredModel.endsWith("-cloud")) {
    return configuredModel.slice(0, -"-cloud".length);
  }
  return configuredModel;
}

async function buildInstagramDatabaseSnapshot() {
  const [
    accounts,
    media,
    comments,
    metrics,
    syncJobs,
    webhookEvents,
    auditLogs,
    totalMedia,
    totalComments,
    pendingWebhookEvents,
  ] = await Promise.all([
    listAccounts(),
    listMedia(undefined, 30),
    listComments(undefined, 30),
    listMetrics(20),
    listSyncJobs(15),
    listWebhookEvents(15),
    listRecentAudit(20),
    countMedia(),
    countComments(),
    countPending(),
  ]);

  const brandSummary = accounts.map((account) => ({
    brandName: account.brandName,
    username: account.username,
    igUserId: account.igUserId,
    tokenStatus: account.tokenStatus,
    followersCount: account.followersCount,
    mediaCount: account.mediaCount,
    lastProfileSyncAt: iso(account.lastProfileSyncAt),
    lastMediaSyncAt: iso(account.lastMediaSyncAt),
    lastInsightSyncAt: iso(account.lastInsightSyncAt),
    lastCommentSyncAt: iso(account.lastCommentSyncAt),
  }));

  return {
    generatedAt: new Date().toISOString(),
    counts: {
      connectedAccounts: accounts.length,
      totalMedia,
      totalComments,
      pendingWebhookEvents,
    },
    brandSummary,
    recentMedia: media.map((item) => ({
      id: item.id,
      brandName: item.socialAccountBrandName,
      username: item.username ?? item.socialAccountUsername,
      mediaType: item.mediaType,
      mediaProductType: item.mediaProductType,
      caption: clip(item.caption),
      timestamp: iso(item.timestamp),
      likeCount: item.likeCount,
      commentsCount: item.commentsCount,
      permalink: item.permalink,
    })),
    recentComments: comments.map((item) => ({
      id: item.id,
      brandName: item.socialAccountBrandName,
      username: item.username,
      text: clip(item.text),
      timestamp: iso(item.timestamp),
      likeCount: item.likeCount,
      sentiment: item.sentiment,
      intent: item.intent,
      needsHumanReview: item.needsHumanReview,
      mediaType: item.mediaType,
      mediaPermalink: item.mediaPermalink,
    })),
    recentMetricSnapshots: metrics.map((item) => ({
      id: item.id,
      instagramMediaId: item.instagramMediaId,
      reach: item.reach,
      impressions: item.impressions,
      likes: item.likes,
      comments: item.comments,
      shares: item.shares,
      saves: item.saves,
      views: item.views,
      plays: item.plays,
      totalInteractions: item.totalInteractions,
      engagementRate: item.engagementRate,
      collectedAt: iso(item.collectedAt),
    })),
    recentSyncJobs: syncJobs.map((item) => ({
      id: item.id,
      jobType: item.jobType,
      socialAccountId: item.socialAccountId,
      status: item.status,
      errorMessage: clip(item.errorMessage),
      createdAt: iso(item.createdAt),
      startedAt: iso(item.startedAt),
      finishedAt: iso(item.finishedAt),
    })),
    recentWebhookEvents: webhookEvents.map((item) => ({
      id: item.id,
      eventId: item.eventId,
      objectType: item.objectType,
      fieldName: item.fieldName,
      processingStatus: item.processingStatus,
      errorMessage: clip(item.errorMessage),
      receivedAt: iso(item.receivedAt),
      processedAt: iso(item.processedAt),
    })),
    recentAuditLogs: auditLogs.map((item) => ({
      id: item.id,
      actor: item.actor,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      status: item.status,
      message: clip(item.message),
      createdAt: iso(item.createdAt),
    })),
  };
}

function systemPrompt(snapshot: unknown): string {
  return [
    "Kamu adalah AI Agent untuk dashboard IG AI Command Center.",
    "Jawab dalam bahasa Indonesia kecuali user meminta bahasa lain.",
    "Analisis hanya berdasarkan snapshot database IG yang diberikan dan riwayat chat ini.",
    "Jangan mengarang angka, akun, status, atau insight yang tidak ada di snapshot.",
    "Kalau data belum tersedia, katakan data belum ada lalu sarankan sync atau langkah operasional yang relevan.",
    "Fokus pada ringkasan performa, anomali, prioritas tindakan, komentar, konten, webhook, dan kesehatan sync.",
    "Jika membuat tabel, gunakan markdown table yang valid: satu baris header, satu baris separator, lalu setiap baris data lengkap dalam satu baris.",
    "Untuk kolom permalink, letakkan URL di sel yang sama dan jangan pisahkan URL ke baris baru.",
    "Jangan menyebut atau menebak token, secret, env var, atau credential.",
    "",
    "SNAPSHOT_DATABASE_IG_JSON:",
    compactJson(snapshot),
  ].join("\n");
}

function normalizeHistory(messages: AiAgentChatMessage[]): AiAgentChatMessage[] {
  return messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .filter((message) => message.content.trim().length > 0)
    .slice(-MAX_HISTORY_MESSAGES)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 6000),
    }));
}

export async function runInstagramAgentChat(
  messages: AiAgentChatMessage[],
): Promise<{
  content: string;
  configuredModel: string;
  requestModel: string;
  host: string;
  contextGeneratedAt: string;
}> {
  const env = getEnv();
  const host = getOllamaHost();
  const apiKey = getOllamaApiKey();
  if (isOllamaCloudHost(host) && !apiKey) {
    throw new Error("OLLAMA_KEY is required when OLLAMA_HOST points to ollama.com.");
  }

  const snapshot = await buildInstagramDatabaseSnapshot();
  const requestModel = modelForHost(host, env.OLLAMA_MODEL);
  const ollamaMessages: OllamaChatMessage[] = [
    { role: "system", content: systemPrompt(snapshot) },
    ...normalizeHistory(messages),
  ];

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const res = await fetch(buildOllamaApiUrl(host, "/chat"), {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: requestModel,
      messages: ollamaMessages,
      stream: false,
      options: {
        temperature: 0.2,
      },
    }),
    cache: "no-store",
  });

  const raw = await res.text();
  let json: OllamaChatResponse | null = null;
  try {
    json = raw ? (JSON.parse(raw) as OllamaChatResponse) : null;
  } catch {
    json = { error: raw };
  }

  if (!res.ok) {
    const message = json?.error ?? raw.slice(0, 500) ?? `HTTP ${res.status}`;
    throw new Error(`Ollama API failed (${res.status}): ${message}`);
  }

  const content = json?.message?.content;
  if (!content) {
    throw new Error("Ollama API returned an empty response.");
  }

  return {
    content,
    configuredModel: env.OLLAMA_MODEL,
    requestModel: json?.model ?? requestModel,
    host,
    contextGeneratedAt: snapshot.generatedAt,
  };
}
