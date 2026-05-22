/**
 * Phase-1 placeholder for Ollama integration. Real model calls will be
 * wired up in a later phase. For now these helpers return mock data so
 * callers can plug them in without crashing if Ollama is not running.
 */

import { getEnv, getOllamaApiKey, getOllamaHost } from "@/lib/env";

export type CommentAnalysis = {
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "UNKNOWN";
  intent: string;
  suggestedReply: string;
  needsHumanReview: boolean;
  model?: string;
  mock?: boolean;
};

export type MediaAnalysis = {
  summary: string;
  highlights: string[];
  model?: string;
  mock?: boolean;
};

function buildOllamaApiUrl(host: string, path: string): string {
  const trimmed = host.replace(/\/+$/, "");
  const base = trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

async function ollamaReachable(host: string, apiKey: string): Promise<boolean> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
  try {
    const r = await fetch(buildOllamaApiUrl(host, "/tags"), {
      method: "GET",
      headers,
      cache: "no-store",
    });
    return r.ok;
  } catch {
    return false;
  }
}

export async function analyzeCommentWithOllama(
  commentText: string,
): Promise<CommentAnalysis> {
  void commentText;
  const env = getEnv();
  const reachable = await ollamaReachable(getOllamaHost(), getOllamaApiKey());
  if (!reachable) {
    return {
      sentiment: "UNKNOWN",
      intent: "UNKNOWN",
      suggestedReply: "",
      needsHumanReview: true,
      mock: true,
    };
  }
  return {
    sentiment: "UNKNOWN",
    intent: "UNKNOWN",
    suggestedReply: "",
    needsHumanReview: true,
    model: env.OLLAMA_MODEL,
    mock: true,
  };
}

export async function analyzeMediaWithOllama(
  _media: unknown,
  _metrics: unknown,
  _comments: unknown,
): Promise<MediaAnalysis> {
  void _media;
  void _metrics;
  void _comments;
  const env = getEnv();
  const reachable = await ollamaReachable(getOllamaHost(), getOllamaApiKey());
  if (!reachable) {
    return {
      summary: "(Ollama not reachable — placeholder summary)",
      highlights: [],
      mock: true,
    };
  }
  return {
    summary: "(Placeholder summary — wiring in next phase)",
    highlights: [],
    model: env.OLLAMA_MODEL,
    mock: true,
  };
}
