/**
 * Hybrid Scoring Engine
 * Combines semantic similarity and skill overlap into a final match score.
 */

import type { SemanticMatchConfig } from "./semantic-matcher";
import type { SkillGapAnalysis } from "./skill-gap-analyzer";

import { DEFAULT_SEMANTIC_CONFIG } from "./semantic-matcher";

export interface ScoreBreakdown {
  semanticComponent: {
    score: number;
    weight: number;
    contribution: number;
    interpretation: string;
  };
  skillComponent: {
    score: number;
    weight: number;
    contribution: number;
    interpretation: string;
  };
  finalScore: number;
  matchTier: "excellent" | "good" | "qualified" | "unqualified";
  tierThresholds: Record<string, { min: number; max: number; description: string }>;
  reasoning: string;
}

export const MATCH_TIER_THRESHOLDS = {
  excellent: {
    min: 90,
    max: 100,
    description: "Excellent match - Highly recommended for interview. Strong alignment on most dimensions.",
  },
  good: {
    min: 80,
    max: 89,
    description: "Good match - Worth considering. Good alignment with some gaps.",
  },
  qualified: {
    min: 60,
    max: 79,
    description: "Qualified match - Basic alignment. Multiple gaps to address.",
  },
  unqualified: {
    min: 0,
    max: 59,
    description: "Unqualified match - Limited alignment. Significant gaps exist.",
  },
};

function getMatchTier(score: number): "excellent" | "good" | "qualified" | "unqualified" {
  if (score >= 90) return "excellent";
  if (score >= 80) return "good";
  if (score >= 60) return "qualified";
  return "unqualified";
}

function interpretSemanticScore(score: number): string {
  if (score >= 85) {
    return "Strong semantic alignment - Resume content and structure closely match job requirements";
  }
  if (score >= 70) {
    return "Good semantic alignment - Most resume experience relevant to job responsibilities";
  }
  if (score >= 50) {
    return "Moderate semantic alignment - Some relevant experience but gaps in specialization";
  }
  return "Weak semantic alignment - Resume focus differs significantly from job requirements";
}

function interpretSkillScore(score: number): string {
  if (score >= 85) {
    return "Excellent skill match - Resume includes most/all required skills";
  }
  if (score >= 70) {
    return "Good skill match - Resume covers majority of required skills";
  }
  if (score >= 50) {
    return "Moderate skill match - Resume covers half of required skills";
  }
  return "Weak skill match - Resume missing many required skills";
}

export function calculateScoreBreakdown(
  semanticScore: number,
  skillGap: SkillGapAnalysis,
  config: SemanticMatchConfig = DEFAULT_SEMANTIC_CONFIG,
): ScoreBreakdown {
  const skillScore = skillGap.skillCoverage;

  const semanticContribution = (semanticScore / 100) * config.semanticWeight * 100;
  const skillContribution = (skillScore / 100) * config.skillWeight * 100;
  const finalScore = Math.round((semanticContribution + skillContribution) * 10) / 10;

  const tier = getMatchTier(finalScore);

  return {
    semanticComponent: {
      score: semanticScore,
      weight: config.semanticWeight,
      contribution: Math.round(semanticContribution * 10) / 10,
      interpretation: interpretSemanticScore(semanticScore),
    },
    skillComponent: {
      score: skillScore,
      weight: config.skillWeight,
      contribution: Math.round(skillContribution * 10) / 10,
      interpretation: interpretSkillScore(skillScore),
    },
    finalScore,
    matchTier: tier,
    tierThresholds: MATCH_TIER_THRESHOLDS,
    reasoning: generateOverallReasoning(finalScore, tier, semanticScore, skillGap, config),
  };
}

function generateOverallReasoning(
  finalScore: number,
  tier: string,
  semanticScore: number,
  skillGap: SkillGapAnalysis,
  config: SemanticMatchConfig,
): string {
  const semanticPercent = Math.round(config.semanticWeight * 100);
  const skillPercent = Math.round(config.skillWeight * 100);

  let baseReasoning = `Your match score of ${finalScore}/100 is based on a hybrid formula (${semanticPercent}% semantic similarity + ${skillPercent}% skill overlap). `;

  if (tier === "excellent") {
    baseReasoning += `Your background strongly aligns with the position. You have excellent semantic match (${semanticScore}/100) and strong skill coverage (${skillGap.skillCoverage}%). You are well-prepared for this role.`;
  } else if (tier === "good") {
    baseReasoning += `Your background is well-aligned with the position. You have good semantic match (${semanticScore}/100) and solid skill coverage (${skillGap.skillCoverage}%). Address a few gaps to strengthen your application.`;
  } else if (tier === "qualified") {
    baseReasoning += `Your background has basic alignment with the position. You have moderate semantic match (${semanticScore}/100) and partial skill coverage (${skillGap.skillCoverage}%). Strengthen key skills before applying.`;
  } else {
    baseReasoning += `Your background has limited alignment with the position. Semantic match is ${semanticScore}/100 and skill coverage is only ${skillGap.skillCoverage}%. Significant preparation needed.`;
  }

  return baseReasoning;
}

export function generateImprovementPlan(scoreBreakdown: ScoreBreakdown, skillGap: SkillGapAnalysis): string[] {
  const improvements: string[] = [];

  if (scoreBreakdown.semanticComponent.score < 70) {
    improvements.push(
      "Improve semantic alignment: Rewrite your experience descriptions to directly address job responsibilities. Use keywords from job posting.",
    );
  }

  if (scoreBreakdown.skillComponent.score < 70 && skillGap.missingSkills.length > 0) {
    improvements.push(
      `Critical: Acquire missing skills (${skillGap.missingSkills.slice(0, 2).join(", ")}). Take courses or complete projects to demonstrate competency.`,
    );
  }

  if (scoreBreakdown.skillComponent.score < 85 && skillGap.weakSkills.length > 0) {
    improvements.push(
      `Strengthen weaker skills: Add specific examples of using ${skillGap.weakSkills[0]} in recent projects or roles.`,
    );
  }

  if (skillGap.bonusSkills.length > 3) {
    improvements.push(
      `Highlight differentiators: Emphasize your extra skills (${skillGap.bonusSkills.slice(0, 2).join(", ")}) to stand out from other candidates.`,
    );
  }

  if (scoreBreakdown.finalScore < 80) {
    const needsImprovement = 80 - scoreBreakdown.finalScore;
    improvements.push(
      `Target improvement: Increase your score by ${Math.ceil(needsImprovement)} points to reach 'Good' tier. Focus on highest-impact gaps first.`,
    );
  }

  return improvements;
}

export function validateScoreBreakdown(breakdown: ScoreBreakdown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (breakdown.semanticComponent.score < 0 || breakdown.semanticComponent.score > 100) {
    errors.push(`Semantic score out of range: ${breakdown.semanticComponent.score}`);
  }

  if (breakdown.skillComponent.score < 0 || breakdown.skillComponent.score > 100) {
    errors.push(`Skill score out of range: ${breakdown.skillComponent.score}`);
  }

  const expectedFinal = breakdown.semanticComponent.contribution + breakdown.skillComponent.contribution;
  if (Math.abs(expectedFinal - breakdown.finalScore) > 0.01) {
    errors.push("Final score calculation mismatch");
  }

  const tierDef = breakdown.tierThresholds[breakdown.matchTier];
  if (breakdown.finalScore < tierDef.min || breakdown.finalScore > tierDef.max) {
    errors.push(`Tier mismatch: Score ${breakdown.finalScore} doesn't match ${breakdown.matchTier} tier`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
