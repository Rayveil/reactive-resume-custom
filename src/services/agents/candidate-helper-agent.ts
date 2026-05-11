import type { CandidateRevision, ParsedJD, UserProfile, HRReview } from "@/schema/job-applications";

export interface ResumeRewriteAssistantInput {
  jobId: string;
  userId: string;
  currentResumeText?: string;
}

export class ResumeRewriteAssistantAgent {
  async buildRevision(
    profile: UserProfile,
    parsedJD: ParsedJD,
    hrReview: HRReview,
    input: ResumeRewriteAssistantInput,
  ): Promise<CandidateRevision> {
    const headline = `${profile.headline} | ${parsedJD.title}`;
    const revisedSummary = `${profile.summary}（已针对 ${parsedJD.company} 的 ${parsedJD.title} 岗位进行定向优化）`;

    const revisionNotes = [
      ...hrReview.improvementPoints.slice(0, 4),
      "建议用更直接的岗位语言替换通用描述",
      "如果当前简历内容过旧，优先保留最近 2-3 年最相关经历",
    ];

    const confidence = Math.max(55, Math.min(95, Math.round(hrReview.reliability + (hrReview.score >= 70 ? 8 : 0))));

    return {
      id: `cand_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      jobId: input.jobId,
      userId: input.userId,
      confidence,
      status: hrReview.decision === "reject" ? "needs_input" : "accepted",
      message:
        hrReview.decision === "reject"
          ? "当前简历不建议直接投递，我已经给出一版更有机会的修改方向，请先确认是否接受。"
          : "我已经基于 HR 建议生成了一版可投递的修改方案，请确认是否按这个方向继续。",
      revisedSummary,
      revisedHeadline: headline,
      revisionNotes,
      userApprovalQuestion:
        hrReview.decision === "reject"
          ? "这版修改方向会明显重构你的简历，你是否愿意先补强技能后再继续投递？"
          : "你是否接受这版更贴合岗位的修改方向？",
      createdAt: new Date().toISOString() as any,
    };
  }
}

export function createResumeRewriteAssistantAgent(): ResumeRewriteAssistantAgent {
  return new ResumeRewriteAssistantAgent();
}
