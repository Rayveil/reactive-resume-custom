import type { ResumeData } from "@/schema/resume/data";

import { saveResumeToMemory, type AgentMemoryEntry } from "./shared-memory";

export enum AgentStatus {
  IDLE = "idle",
  EXTRACTING = "extracting",
  COMPLETED = "completed",
  FAILED = "failed",
}

export type ResumeExtractionSource = "pdf_upload" | "docx_upload";

export interface ResumeExtractionAgentOutput {
  source: ResumeExtractionSource;
  type: "resume";
  data: ResumeData;
  timestamp: Date;
  status: AgentStatus;
}

export class ResumeInfoExtractionAgent {
  private status: AgentStatus = AgentStatus.IDLE;

  getStatus(): AgentStatus {
    return this.status;
  }

  /**
   * Shared-memory write entrypoint for parsed resume data.
   */
  async saveToMemory(resumeData: ResumeData, source: ResumeExtractionSource = "pdf_upload"): Promise<AgentMemoryEntry> {
    return await saveResumeToMemory(resumeData, source);
  }

  async extract(
    source: ResumeExtractionSource,
    extractor: () => Promise<ResumeData>,
  ): Promise<ResumeExtractionAgentOutput> {
    this.status = AgentStatus.EXTRACTING;

    try {
      const parsedResumeData = await extractor();
      const savedEntry = await this.saveToMemory(parsedResumeData, source);

      // Use saved data (with injected metadata) for downstream consumers
      const dataWithMeta = savedEntry.data;

      this.status = AgentStatus.COMPLETED;

      return {
        source,
        type: "resume",
        data: dataWithMeta,
        timestamp: new Date(),
        status: this.status,
      };
    } catch (error) {
      this.status = AgentStatus.FAILED;
      throw error;
    }
  }
}
