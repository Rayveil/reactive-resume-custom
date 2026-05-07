import type { MatchAnalysis, ParsedJD, UserProfile, OptimizedResume } from "@/schema/job-applications";

import { tokenizeJobMatchText, cosineSimilarity } from "@/utils/job-match-helpers";

interface MatchAnalyzerConfig {
  skillWeights?: {
    exact: number;
    partial: number;
    category: number;
  };
  experienceWeight?: number;
  educationWeight?: number;
}

export class ResumeMatcherAgent {
  private config: MatchAnalyzerConfig;

  constructor(config: MatchAnalyzerConfig = {}) {
    this.config = {
      skillWeights: {
        exact: 1.0,
        partial: 0.7,
        category: 0.5,
        ...config.skillWeights,
      },
      experienceWeight: config.experienceWeight ?? 0.35,
      educationWeight: config.educationWeight ?? 0.15,
    };
  }

  /**
   * 分析用户简历与职位的匹配度
   */
  async analyzeMatch(profile: UserProfile, parsedJD: ParsedJD, jobId: string): Promise<MatchAnalysis> {
    const skillMatches = this.matchSkills(profile, parsedJD);
    const experienceAnalysis = this.matchExperience(profile, parsedJD);
    const educationAnalysis = this.matchEducation(profile, parsedJD);

    // 计算总体分数（加权平均）
    const skillScore = skillMatches.score;
    const experienceScore = experienceAnalysis.score;
    const educationScore = educationAnalysis.score;

    const totalWeight = this.config.skillWeights!.exact + this.config.experienceWeight! + this.config.educationWeight!;

    const overallScore = Math.round(
      ((skillScore * this.config.skillWeights!.exact +
        experienceScore * this.config.experienceWeight! +
        educationScore * this.config.educationWeight!) /
        totalWeight) *
        100,
    );

    // 生成建议
    const recommendations = this.generateRecommendations(
      skillMatches,
      experienceAnalysis,
      educationAnalysis,
      overallScore,
    );

    const analysis: MatchAnalysis = {
      id: `match_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      jobId,
      userId: profile.id,
      overallScore: Math.min(100, Math.max(0, overallScore)),
      skillMatches: {
        matched: skillMatches.matched,
        missing: skillMatches.missing,
        strengths: skillMatches.strengths,
      },
      experienceGaps: experienceAnalysis.gaps,
      educationGaps: educationAnalysis.gaps,
      strengths: [...skillMatches.strengths, ...experienceAnalysis.strengths, ...educationAnalysis.strengths],
      recommendations,
      analysisAt: new Date().toISOString(),
    };

    return analysis;
  }

  /**
   * 匹配技能
   */
  private matchSkills(
    profile: UserProfile,
    parsedJD: ParsedJD,
  ): {
    score: number;
    matched: string[];
    missing: string[];
    strengths: string[];
  } {
    const requiredSkills = parsedJD.requirements.skills.filter((s) => s.importance === "required");
    const desiredSkills = parsedJD.requirements.skills.filter((s) => s.importance === "desired");
    const allSkills = [...requiredSkills, ...desiredSkills];

    const profileSkillNames = profile.skills.map((s) => s.name.toLowerCase());
    const matched: string[] = [];
    const missing: string[] = [];
    const strengths: string[] = [];

    for (const jdSkill of allSkills) {
      const skillLower = jdSkill.name.toLowerCase();

      // 精确匹配
      if (profileSkillNames.some((ps) => ps === skillLower)) {
        matched.push(jdSkill.name);
        if (jdSkill.importance === "required") {
          strengths.push(`Has required skill: ${jdSkill.name}`);
        }
      }
      // 部分匹配（关键词相似）
      else if (profileSkillNames.some((ps) => ps.includes(skillLower) || skillLower.includes(ps))) {
        matched.push(`${jdSkill.name} (partial)`);
      }
      // 缺失
      else {
        missing.push(jdSkill.name);
      }
    }

    // 计算分数
    const requiredMatched = matched.filter((m) => requiredSkills.some((rs) => m.includes(rs.name))).length;
    const requiredTotal = requiredSkills.length;
    const desiredMatched = matched.filter((m) => desiredSkills.some((ds) => m.includes(ds.name))).length;
    const desiredTotal = desiredSkills.length;

    const score =
      (requiredTotal > 0 ? (requiredMatched / requiredTotal) * 0.7 : 0) +
      (desiredTotal > 0 ? (desiredMatched / desiredTotal) * 0.3 : 0);

    return { score, matched, missing, strengths };
  }

  /**
   * 匹配工作经验
   */
  private matchExperience(
    profile: UserProfile,
    parsedJD: ParsedJD,
  ): {
    score: number;
    gaps: string[];
    strengths: string[];
  } {
    const requiredExperience = parsedJD.requirements.experience;
    const profileExperience = profile.experience;

    const gaps: string[] = [];
    const strengths: string[] = [];

    // 检查年限
    const totalYears = profileExperience.reduce((sum, exp) => {
      const start = new Date(exp.startDate).getFullYear();
      const end = exp.endDate ? new Date(exp.endDate).getFullYear() : new Date().getFullYear();
      return sum + (end - start);
    }, 0);

    let experienceScore = 0;
    for (const reqExp of requiredExperience) {
      if (totalYears >= reqExp.yearsRequired) {
        strengths.push(`Meets experience requirement: ${reqExp.description}`);
        experienceScore += 1 / requiredExperience.length;
      } else {
        gaps.push(`${reqExp.description} (requires ${reqExp.yearsRequired} years)`);
      }
    }

    return {
      score: Math.min(1, experienceScore),
      gaps,
      strengths,
    };
  }

  /**
   * 匹配教育背景
   */
  private matchEducation(
    profile: UserProfile,
    parsedJD: ParsedJD,
  ): {
    score: number;
    gaps: string[];
    strengths: string[];
  } {
    const requiredEducation = parsedJD.requirements.education;
    const profileEducation = profile.education;

    const gaps: string[] = [];
    const strengths: string[] = [];

    const educationLevelMap = {
      "High School": 1,
      Associate: 2,
      Bachelor: 3,
      Master: 4,
      PhD: 5,
    };

    let educationScore = 0;
    for (const reqEdu of requiredEducation) {
      const required = educationLevelMap[reqEdu.level as keyof typeof educationLevelMap] || 3;

      // 检查是否有满足条件的教育背景
      const hasMatching = profileEducation.some((edu) => {
        const userLevel = educationLevelMap[edu.degree as keyof typeof educationLevelMap] || 0;
        const fieldMatch = reqEdu.field ? edu.field.toLowerCase().includes(reqEdu.field.toLowerCase()) : true;
        return userLevel >= required && fieldMatch;
      });

      if (hasMatching) {
        strengths.push(`Has required education: ${reqEdu.level}${reqEdu.field ? ` in ${reqEdu.field}` : ""}`);
        educationScore += 1 / requiredEducation.length;
      } else {
        gaps.push(`${reqEdu.level}${reqEdu.field ? ` in ${reqEdu.field}` : ""} required`);
      }
    }

    return {
      score: Math.min(1, educationScore),
      gaps,
      strengths,
    };
  }

  /**
   * 生成建议
   */
  private generateRecommendations(skills: any, experience: any, education: any, overallScore: number): string[] {
    const recommendations: string[] = [];

    if (overallScore >= 80) {
      recommendations.push("Strong match! Ready to apply.");
    } else if (overallScore >= 60) {
      recommendations.push("Good match. Consider highlighting relevant experience.");
    } else {
      recommendations.push("Fair match. Consider gaining more experience in key areas.");
    }

    if (skills.missing.length > 0) {
      recommendations.push(
        `Missing skills: ${skills.missing.slice(0, 3).join(", ")}. Consider adding related projects or certifications.`,
      );
    }

    if (experience.gaps.length > 0) {
      recommendations.push(`Experience gap: ${experience.gaps[0]} Consider emphasizing transferable skills.`);
    }

    if (education.gaps.length > 0) {
      recommendations.push(
        `Education gap: ${education.gaps[0]} This may or may not be a blocker depending on company policy.`,
      );
    }

    return recommendations;
  }
}

/**
 * 创建简历匹配分析 Agent
 */
export function createResumeMatcherAgent(config?: MatchAnalyzerConfig): ResumeMatcherAgent {
  return new ResumeMatcherAgent(config);
}

// ===== 辅助函数（需要从 job-match.ts 导入或定义）=====

function cosineSimilarity(leftTokens: string[], rightTokens: string[]): number {
  if (leftTokens.length === 0 || rightTokens.length === 0) return 0;

  const left = new Map<string, number>();
  const right = new Map<string, number>();

  for (const token of leftTokens) {
    left.set(token, (left.get(token) ?? 0) + 1);
  }
  for (const token of rightTokens) {
    right.set(token, (right.get(token) ?? 0) + 1);
  }

  const allTokens = new Set([...left.keys(), ...right.keys()]);
  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (const token of allTokens) {
    const lv = left.get(token) ?? 0;
    const rv = right.get(token) ?? 0;
    dotProduct += lv * rv;
    leftMagnitude += lv * lv;
    rightMagnitude += rv * rv;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}
