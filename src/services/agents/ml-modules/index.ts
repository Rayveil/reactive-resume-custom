/**
 * ML Modules Integration & Index
 * Unified facade for semantic matching, skill gap analysis, scoring, and improvements.
 */

import type { ResumeData } from "@/schema/resume/data";

import { generateImprovements, type ImprovementRecommendation, type ImprovementResult } from "./improvement-generator";
import {
  calculateScoreBreakdown,
  generateImprovementPlan,
  MATCH_TIER_THRESHOLDS,
  type ScoreBreakdown,
} from "./scoring-engine";
import {
  extractResumeText,
  extractJobText,
  calculateSemanticSimilarity,
  computeHybridMatchScore,
  DEFAULT_SEMANTIC_CONFIG,
  type SemanticMatchResult,
  type SemanticMatchConfig,
} from "./semantic-matcher";
import {
  analyzeSkillGap,
  generateSkillGapSuggestions,
  calculateSkillMatchPercentage,
  type SkillGapAnalysis,
} from "./skill-gap-analyzer";

export interface CompleteMLAnalysis {
  semantic: SemanticMatchResult;
  skillGap: SkillGapAnalysis;
  scoring: ScoreBreakdown;
  matchScoreBreakdown: {
    semanticComponent: number;
    skillComponent: number;
    finalScore: number;
    formula: string;
  };
  improvements: ImprovementResult;
  metadata: {
    analysisTimestamp: Date;
    resumeId?: string;
    jobId?: string;
    analysisVersion: string;
  };
}

export class MLModulesManager {
  private config: SemanticMatchConfig;

  constructor(config: Partial<SemanticMatchConfig> = {}) {
    this.config = { ...DEFAULT_SEMANTIC_CONFIG, ...config };
  }

  async analyzeMatch(resume: ResumeData, jobInput: any, useLLM = false): Promise<CompleteMLAnalysis> {
    try {
      const semantic = await calculateSemanticSimilarity(resume, jobInput, this.config);

      const resumeSkills = resume.sections?.skills?.items?.map((s: any) => s.name) || [];
      const jobSkills = jobInput.requiredSkills || [];
      const skillGap = analyzeSkillGap(jobSkills, resumeSkills);
      const skillMatchPercent = calculateSkillMatchPercentage(skillGap, 1.1);

      const finalScore = computeHybridMatchScore(semantic.semanticSimilarity, skillMatchPercent, this.config);
      const scoreBreakdown = calculateScoreBreakdown(semantic.semanticScore, skillGap, this.config);
      const improvements = await generateImprovements(resume, jobInput, skillGap, scoreBreakdown, useLLM);

      const semanticComponent = (semantic.semanticSimilarity * 100 * this.config.semanticWeight) / 100;
      const skillComponent = (skillMatchPercent * this.config.skillWeight) / 100;

      return {
        semantic,
        skillGap,
        scoring: scoreBreakdown,
        matchScoreBreakdown: {
          semanticComponent: Math.round(semanticComponent * 10) / 10,
          skillComponent: Math.round(skillComponent * 10) / 10,
          finalScore: Math.round(finalScore * 10) / 10,
          formula: `(${Math.round(semantic.semanticSimilarity * 100)} × 0.7) + (${skillMatchPercent} × 0.3) = ${finalScore.toFixed(1)}`,
        },
        improvements,
        metadata: {
          analysisTimestamp: new Date(),
          analysisVersion: "1.0-placify-inspired",
        },
      };
    } catch (error) {
      console.error("Error in ML analysis pipeline:", error);
      throw error;
    }
  }

  getConfig(): SemanticMatchConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<SemanticMatchConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export {
  extractResumeText,
  extractJobText,
  calculateSemanticSimilarity,
  computeHybridMatchScore,
  DEFAULT_SEMANTIC_CONFIG,
  type SemanticMatchResult,
  type SemanticMatchConfig,
  analyzeSkillGap,
  generateSkillGapSuggestions,
  calculateSkillMatchPercentage,
  type SkillGapAnalysis,
  calculateScoreBreakdown,
  generateImprovementPlan,
  MATCH_TIER_THRESHOLDS,
  type ScoreBreakdown,
  generateImprovements,
  type ImprovementRecommendation,
  type ImprovementResult,
};

export async function quickAnalyze(resume: ResumeData, jobInput: any, useLLM = false): Promise<CompleteMLAnalysis> {
  const manager = new MLModulesManager();
  return manager.analyzeMatch(resume, jobInput, useLLM);
}
