import fs from "fs/promises";
import path from "path";

import type { ResumeData } from "@/schema/resume/data";

export type AgentMemoryType = "resume";

export interface AgentMemoryEntry {
  source: string;
  type: AgentMemoryType;
  data: ResumeData;
  timestamp: Date;
  memoryId: string;
  status: "completed" | "failed";
  embeddings: number[];
}

const sharedMemoryEntries: AgentMemoryEntry[] = [];

const PERSIST_DIR = path.join(process.cwd(), "data", "agent-memory");
const RESUME_PERSIST_FILE = path.join(PERSIST_DIR, "resumes.jsonl");

async function ensurePersistDir() {
  try {
    await fs.mkdir(PERSIST_DIR, { recursive: true });
  } catch {
    // ignore
  }
}

async function appendEntryToDisk(entry: AgentMemoryEntry) {
  try {
    await ensurePersistDir();
    const line = JSON.stringify({
      ...entry,
      timestamp: entry.timestamp.toISOString(),
    });
    await fs.appendFile(RESUME_PERSIST_FILE, line + "\n", { encoding: "utf8" });
  } catch (err) {
    // best-effort only; do not throw to avoid breaking agent flow
    console.error("Failed to persist memory entry:", err);
  }
}

async function loadFromDisk() {
  try {
    const data = await fs.readFile(RESUME_PERSIST_FILE, { encoding: "utf8" });
    const lines = data.split(/^\s*$/m).join("\n").split(/\r?\n/).filter(Boolean);
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as Omit<AgentMemoryEntry, "timestamp"> & { timestamp: string };
        sharedMemoryEntries.push({ ...parsed, timestamp: new Date(parsed.timestamp) });
      } catch {
        // skip malformed lines
      }
    }
  } catch {
    // file may not exist yet — that's fine
  }
}

// initialize from disk (fire-and-forget)
void loadFromDisk();

/**
 * Shared memory write interface for agents.
 * This can be replaced by vector DB + short/long-term memory backends later.
 */
export async function saveMemoryEntry(entry: AgentMemoryEntry): Promise<AgentMemoryEntry> {
  sharedMemoryEntries.push(entry);
  // Persist to disk for long-term memory (best-effort)
  void appendEntryToDisk(entry);
  // Notify listeners that a resume entry is ready
  try {
    for (const h of resumeReadyHandlers) {
      try {
        h(entry);
      } catch (e) {
        console.error("resumeReady handler failed:", e);
      }
    }
  } catch {
    // ignore
  }
  return entry;
}

type ResumeReadyHandler = (entry: AgentMemoryEntry) => void;
const resumeReadyHandlers: ResumeReadyHandler[] = [];

export function onResumeReady(handler: ResumeReadyHandler) {
  resumeReadyHandlers.push(handler);
  return () => {
    const idx = resumeReadyHandlers.indexOf(handler);
    if (idx >= 0) resumeReadyHandlers.splice(idx, 1);
  };
}

/**...resumeData.metadata
 * Shared memory read interface for other agents.
 */
export async function listMemoryEntries(type?: AgentMemoryType): Promise<AgentMemoryEntry[]> {
  if (!type) return [...sharedMemoryEntries];
  return sharedMemoryEntries.filter((entry) => entry.type === type);
}

/**
 * Convenience wrapper: save a ResumeData object to shared memory.
 * Sets the canonical shape and persists to disk.
 */
export async function saveResumeToMemory(
  resumeData: ResumeData,
  source = "pdf_upload",
  agentName = "ResumeInfoExtractionAgent",
) {
  const memoryId = (globalThis as any).crypto?.randomUUID
    ? (globalThis as any).crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(36).slice(2);

  // Clone and inject metadata so the stored entry contains agent provenance
  const meta = (resumeData as any).metadata ?? {};
  const dataWithMeta: ResumeData = {
    ...resumeData,
    metadata: {
      ...meta,
      extractedBy: agentName,
      extractedAt: new Date().toISOString(),
      source: source === "pdf_upload" ? "pdf" : source === "docx_upload" ? "docx" : String(source),
      memoryId,
    },
  };

  // compute lightweight embeddings for the resume text
  const text = resumeDataToText(dataWithMeta);
  const embeddings = textToEmbedding(text);

  const entry: AgentMemoryEntry = {
    source,
    type: "resume",
    data: dataWithMeta,
    timestamp: new Date(),
    memoryId,
    status: "completed",
    embeddings,
  };

  await saveMemoryEntry(entry);

  return entry;
}

/**
 * Convenience wrapper: retrieve all resume entries from memory (short + long-term).
 */
export async function getResumeFromMemory(): Promise<AgentMemoryEntry[]> {
  return await listMemoryEntries("resume");
}

// --- Simple lightweight embedding utilities (no external deps) ---
const EMBEDDING_DIM = 128;

function normalizeTextForEmbedding(text: string): string[] {
  return (
    text
      .toLowerCase()
      // keep letters/numbers and spaces
      .replace(/[^a-z0-9\s]+/g, " ")
      .split(/\s+/)
      .filter(Boolean)
  );
}

function hashStringToInt(s: string): number {
  // djb2
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

export function textToEmbedding(text: string, dim = EMBEDDING_DIM): number[] {
  const vec = Array.from({ length: dim }, () => 0);
  const tokens = normalizeTextForEmbedding(text);
  for (const t of tokens) {
    const idx = hashStringToInt(t) % dim;
    vec[idx] += 1;
  }
  // L2 normalize
  let norm = 0;
  for (let i = 0; i < dim; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  for (let i = 0; i < dim; i++) vec[i] = vec[i] / norm;
  return vec;
}

export function cosineSimilarity(a: number[], b: number[]) {
  let s = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}

export function resumeDataToText(data: ResumeData): string {
  const parts: string[] = [];
  try {
    const m = (data as any).metadata || {};
    if (data.basics) {
      parts.push(
        data.basics.name || "",
        data.basics.headline || "",
        data.basics.email || "",
        data.basics.location || "",
      );
      if (data.basics.customFields) parts.push(...data.basics.customFields.map((f: any) => f.text || ""));
    }
    if (data.summary && (data.summary as any).content) parts.push((data.summary as any).content || "");
    if (data.sections) {
      for (const key of Object.keys((data as any).sections || {})) {
        const section = (data as any).sections[key];
        if (!section || !Array.isArray(section.items)) continue;
        for (const item of section.items) {
          // collect common string fields
          for (const k of [
            "company",
            "position",
            "location",
            "period",
            "description",
            "name",
            "title",
            "school",
            "degree",
          ]) {
            if (typeof item[k] === "string") parts.push(item[k]);
          }
          // roles array
          if (Array.isArray(item.roles)) {
            for (const r of item.roles) {
              if (typeof r.position === "string") parts.push(r.position);
              if (typeof r.description === "string") parts.push(r.description);
            }
          }
        }
      }
    }
    if ((data as any).customSections && Array.isArray((data as any).customSections)) {
      for (const cs of (data as any).customSections) {
        if (Array.isArray(cs.items))
          for (const it of cs.items) if (typeof it.content === "string") parts.push(it.content);
      }
    }
    if (m && typeof m.notes === "string") parts.push(m.notes);
  } catch {
    // best-effort
  }
  return parts.filter(Boolean).join(" \n ");
}

export type SearchResult = { entry: AgentMemoryEntry; score: number };

/**
 * Semantic search over stored resume memories using lightweight embeddings.
 */
export async function searchResumeMemory(query: string, topK = 5): Promise<SearchResult[]> {
  const qEmb = textToEmbedding(query);
  const entries = await listMemoryEntries("resume");
  const results: SearchResult[] = [];
  for (const e of entries) {
    if (!e.embeddings || e.embeddings.length === 0) continue;
    const score = cosineSimilarity(qEmb, e.embeddings);
    results.push({ entry: e, score });
  }
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, topK);
}
