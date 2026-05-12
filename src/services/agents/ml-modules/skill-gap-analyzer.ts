/**
 * Skill Gap Analysis Module
 * Identifies missing skills, skill overlap, and categorizes gaps for resume improvement.
 */

export interface SkillGapAnalysis {
  matchedSkills: string[];
  missingSkills: string[];
  weakSkills: string[];
  bonusSkills: string[];
  skillCoverage: number;
  gapPriority: "critical" | "high" | "medium" | "low";
}

function normalizeSkill(skill: string): string {
  return skill.toLowerCase().trim().replace(/\s+/g, "").replace(/\./g, "").replace(/\+/g, "p").replace(/[#]/g, "sharp");
}

function isSimilarSkill(skill1: string, skill2: string): boolean {
  const norm1 = normalizeSkill(skill1);
  const norm2 = normalizeSkill(skill2);
  if (norm1 === norm2) return true;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
  return false;
}

export function analyzeSkillGap(jobSkills: string[], resumeSkills: string[]): SkillGapAnalysis {
  const matched: string[] = [];
  const missing: string[] = [];
  const bonus: string[] = [];

  for (const jobSkill of jobSkills) {
    let foundMatch = false;
    for (const resumeSkill of resumeSkills) {
      if (isSimilarSkill(jobSkill, resumeSkill)) {
        matched.push(jobSkill);
        foundMatch = true;
        break;
      }
    }

    if (!foundMatch) {
      missing.push(jobSkill);
    }
  }

  for (const resumeSkill of resumeSkills) {
    let isRequired = false;
    for (const jobSkill of jobSkills) {
      if (isSimilarSkill(resumeSkill, jobSkill)) {
        isRequired = true;
        break;
      }
    }

    if (!isRequired) {
      bonus.push(resumeSkill);
    }
  }

  const skillCoverage = jobSkills.length > 0 ? Math.round((matched.length / jobSkills.length) * 100) : 100;

  let gapPriority: "critical" | "high" | "medium" | "low" = "low";
  if (skillCoverage < 30) gapPriority = "critical";
  else if (skillCoverage < 60) gapPriority = "high";
  else if (skillCoverage < 85) gapPriority = "medium";

  return {
    matchedSkills: matched,
    missingSkills: missing,
    weakSkills: matched.slice(0, Math.ceil(matched.length * 0.3)),
    bonusSkills: bonus,
    skillCoverage,
    gapPriority,
  };
}

export function generateSkillGapSuggestions(gap: SkillGapAnalysis, jobTitle: string): string[] {
  const suggestions: string[] = [];

  if (gap.missingSkills.length > 0) {
    const topMissing = gap.missingSkills.slice(0, 3);
    suggestions.push(
      `Add missing required skills to resume: ${topMissing.join(", ")}. ` +
        `Consider taking online courses or completing projects that demonstrate these skills.`,
    );
  }

  if (gap.skillCoverage < 60) {
    suggestions.push(
      `Your current skills cover only ${gap.skillCoverage}% of ${jobTitle} requirements. ` +
        `Prioritize acquiring the most critical missing skills before applying.`,
    );
  } else if (gap.skillCoverage < 85) {
    suggestions.push(
      `You have good foundation (${gap.skillCoverage}% coverage) but some gaps remain. ` +
        `Strengthen: ${gap.missingSkills.slice(0, 2).join(", ")}.`,
    );
  }

  if (gap.matchedSkills.length > 0) {
    const topMatched = gap.matchedSkills.slice(0, 3);
    suggestions.push(
      `Emphasize your existing skills in the resume: ${topMatched.join(", ")}. ` +
        `Include specific project examples or achievements demonstrating mastery.`,
    );
  }

  if (gap.bonusSkills.length > 3) {
    suggestions.push(
      `You have ${gap.bonusSkills.length} extra skills beyond requirements. ` +
        `Highlight top differentiators: ${gap.bonusSkills.slice(0, 2).join(", ")} ` +
        `to stand out from other candidates.`,
    );
  }

  suggestions.push(
    `Resume Action: Add a separate "Skills" section listing all relevant competencies. ` +
      `Order by relevance to ${jobTitle}, with proficiency levels (e.g., 5+ years, intermediate).`,
  );

  return suggestions;
}

export function calculateSkillMatchPercentage(gap: SkillGapAnalysis, bonusMultiplier = 1.1): number {
  let score = gap.skillCoverage;

  if (gap.bonusSkills.length > 0) {
    score = Math.min(100, score * bonusMultiplier);
  }

  return score;
}
