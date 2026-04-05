import axios from "axios";
import { config } from "../../config/env";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class EmbeddingService {
  private requestTimestamps: number[] = [];
  private dailyBucketDay = "";
  private dailyCount = 0;
  private lastRequestAt = 0;

  private async enforceRateLimit(): Promise<void> {
    const rpm = Math.max(1, config.googleAi.embeddingRpm || 60);
    const rpd = Math.max(1, config.googleAi.embeddingRpd || 1000);
    const minIntervalMs = Math.max(0, config.googleAi.embeddingMinIntervalMs || 0);
    const now = Date.now();
    const dayKey = new Date(now).toISOString().slice(0, 10);

    if (this.dailyBucketDay !== dayKey) {
      this.dailyBucketDay = dayKey;
      this.dailyCount = 0;
    }
    if (this.dailyCount >= rpd) {
      throw new Error(`Embedding daily quota guard reached (${this.dailyCount}/${rpd})`);
    }

    if (minIntervalMs > 0 && this.lastRequestAt > 0) {
      const sinceLastMs = now - this.lastRequestAt;
      if (sinceLastMs < minIntervalMs) {
        await sleep(minIntervalMs - sinceLastMs);
      }
    }

    const windowStart = Date.now() - 60_000;
    this.requestTimestamps = this.requestTimestamps.filter((t) => t >= windowStart);
    if (this.requestTimestamps.length >= rpm) {
      const waitMs = this.requestTimestamps[0] + 60_000 - Date.now();
      if (waitMs > 0) {
        await sleep(waitMs);
      }
      const nextWindowStart = Date.now() - 60_000;
      this.requestTimestamps = this.requestTimestamps.filter(
        (t) => t >= nextWindowStart,
      );
    }
  }

  private buildEmbeddingText(input: {
    title?: string;
    summary?: string;
    tags?: string[];
    source?: string;
  }): string {
    const parts = [
      input.title || "",
      input.summary || "",
      (input.tags || []).join(" "),
      input.source || "",
    ]
      .map((p) => p.trim())
      .filter(Boolean);
    return parts.join("\n").slice(0, 8000);
  }

  async embedText(text: string): Promise<number[] | null> {
    const apiKey = config.googleAi.apiKey;
    if (!apiKey) {
      return null;
    }
    const normalized = text.trim();
    if (!normalized) {
      return null;
    }

    await this.enforceRateLimit();

    const model = config.googleAi.embeddingModel;
    const url = `${config.googleAi.apiUrl}/models/${encodeURIComponent(model)}:embedContent?key=${encodeURIComponent(apiKey)}`;
    const response = await axios.post(
      url,
      {
        content: {
          parts: [{ text: normalized }],
        },
        taskType: "RETRIEVAL_DOCUMENT",
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 20000,
      },
    );

    this.lastRequestAt = Date.now();
    this.requestTimestamps.push(this.lastRequestAt);
    this.dailyCount++;

    const values = response.data?.embedding?.values;
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error("Empty embedding values from Google API");
    }
    return values as number[];
  }

  async embedOpportunity(input: {
    title?: string;
    summary?: string;
    tags?: string[];
    source?: string;
  }): Promise<number[] | null> {
    const text = this.buildEmbeddingText(input);
    if (!text) {
      return null;
    }
    return this.embedText(text);
  }

  cosineSimilarity(a: number[], b: number[]): number {
    if (!a.length || !b.length || a.length !== b.length) return -1;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    if (normA === 0 || normB === 0) return -1;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }
}

export const embeddingService = new EmbeddingService();
