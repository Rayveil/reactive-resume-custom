import type { HRReview, ParsedJD, UserProfile } from "@/schema/job-applications";

export interface HRReviewContext {
  jobId: string;
  userId: string;
  currentResumeText?: string;
}

export class HRReviewAgent {
  async review(
    profile: UserProfile,
    parsedJD: ParsedJD,
    matchScore: number,
    context: HRReviewContext,
  ): Promise<HRReview> {
    const requiredSkills = parsedJD.requirements.skills
      .filter((skill) => skill.importance === "required")
      .map((skill) => skill.name);

    const missingSkills = requiredSkills.filter(
      (skill) => !profile.skills.some((profileSkill) => profileSkill.name.toLowerCase() === skill.toLowerCase()),
    );

    const experienceShortage = parsedJD.requirements.experience.some((req) => {
      const totalYears = profile.experience.reduce((sum, exp) => {
        const start = new Date(exp.startDate).getFullYear();
        const end = exp.endDate ? new Date(exp.endDate).getFullYear() : new Date().getFullYear();
        return sum + Math.max(0, end - start);
      }, 0);
      return totalYears < req.yearsRequired;
    });

    const blockers: string[] = [];
    if (missingSkills.length >= 3) {
      blockers.push(`缺少关键技能: ${missingSkills.slice(0, 3).join("、")}`);
    }
    if (experienceShortage) {
      blockers.push("工作年限与岗位要求存在明显差距");
    }

    const score = Math.max(0, Math.min(100, Math.round(matchScore)));
    const decision = score < 45 || blockers.length >= 2 ? "reject" : score < 75 ? "optimize" : "pass";
    const reliability = decision === "pass" ? 82 : decision === "optimize" ? 78 : 72;

    const improvementPoints = [
      ...missingSkills.slice(0, 5).map((skill) => `补强或前置展示技能: ${skill}`),
      ...(experienceShortage ? ["用可量化项目和转化技能补足经验差距"] : []),
      "在简历摘要中直接复用岗位关键词以提升 ATS 命中率",
    ];

    const suggestedChanges =
      decision === "reject"
        ? ["当前简历与岗位匹配度偏低，建议先补齐关键技能后再投递", "如果有相关项目，请补充到简历最前面作为替代证明"]
        : [
            "重写 Summary，突出岗位相关经验与关键词",
            "将最相关的 2-3 个项目/经历上移到前面",
            "为每段经历加入指标、成果和岗位关键术语",
          ];

    return {
      id: `hr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      jobId: context.jobId,
      userId: context.userId,
      decision,
      score,
      reliability,
      summary:
        decision === "reject"
          ? "HR_agent 认为当前简历存在明显阻塞项，先补齐关键技能再继续。"
          : decision === "optimize"
            ? "HR_agent 认为岗位可以争取，但需要针对性优化简历。"
            : "HR_agent 认为简历已达到可投递标准。",
      blockingReasons: blockers,
      improvementPoints,
      suggestedChanges,
      reviewedAt: new Date().toISOString() as any,
    };
  }
}

export function createHRReviewAgent(): HRReviewAgent {
  return new HRReviewAgent();
}
