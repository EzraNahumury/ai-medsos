/**
 * Phase-1 placeholder for Ollama integration. Real model calls will be
 * wired up in a later phase. For now these helpers return mock data so
 * callers can plug them in without crashing if Ollama is not running.
 */

import { getEnv } from "@/lib/env";

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

async function ollamaReachable(baseUrl: string): Promise<boolean> {
  try {
    const r = await fetch(`${baseUrl}/api/tags`, {
      method: "GET",
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
  const env = getEnv();
  const reachable = await ollamaReachable(env.OLLAMA_BASE_URL);
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
  const env = getEnv();
  const reachable = await ollamaReachable(env.OLLAMA_BASE_URL);
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
