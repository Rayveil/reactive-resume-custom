import z from "zod";

import type { ResumeData } from "@/schema/resume/data";

import {
  MLModulesManager,
  type CompleteMLAnalysis,
  type SkillGapAnalysis,
  type ImprovementRecommendation,
} from "./ml-modules";
import {
  getResumeFromMemory,
  searchResumeMemory,
  textToEmbedding,
  cosineSimilarity,
  type AgentMemoryEntry,
  type SearchResult,
} from "./shared-memory";

/**
 * ===== ENHANCED HR AGENT WITH ML MODULES =====
 *
 * A Resume-Job Matching Analyzer combining 6-dimensional evaluation with ML semantic analysis
 * Purpose: Analyze each user's resume against a target job, providing structured output
 * for downstream resume modification assistant to generate improvement recommendations
 *
 * NOT for: HR recruitment screening or candidate filtering
 * FOR: Job seekers optimizing their resumes against target positions
 *
 * Features:
 * - 6 dimension HR evaluation (industry, skills, education, salary, location, personality)
 * - ML semantic matching (resume vs job description similarity)
 * - Detailed skill gap analysis (missing, matched, bonus skills)
 * - Hybrid scoring (semantic 70% + skills 30%)
 * - AI-powered improvement recommendations (LLM or rule-based)
 * - Batch processing (evaluate all user's resumes against one job)
 */

export enum HRAgentStatus {
  IDLE = "idle",
  ANALYZING = "analyzing",
  RATING = "rating",
  COMPLETED = "completed",
  FAILED = "failed",
}

// ===== EXTENDED OUTPUT STRUCTURE WITH ML ANALYSIS =====

export interface DimensionScore {
  dimension: "industry" | "skills" | "education" | "salary" | "location" | "personality";
  score: number;
  weight: number;
  explanation: string;
  matchedItems?: string[];
  unmatchedItems?: string[];
}

export interface MLInsights {
  // Semantic matching
  semanticScore: number; // 0-100
  semanticExplanation: string;

  // Skill gap analysis
  skillGap: {
    matchedSkills: string[];
    missingSkills: string[];
    bonusSkills: string[];
    skillCoverage: number; // 0-100
    gapPriority: "critical" | "high" | "medium" | "low";
  };

  // Hybrid scoring
  mlScore: number; // Final ML score (0-100)
  mlScoreTier: "excellent" | "good" | "qualified" | "unqualified";
  scoreBreakdown: {
    semanticComponent: number;
    skillComponent: number;
    formula: string;
  };

  // AI recommendations
  improvements: {
    recommendations: ImprovementRecommendation[];
    summary: string;
    estimatedScoreIncrease: number;
    priorities: string[];
  };

  // Metadata
  usedLLM: boolean;
  analysisTimestamp: Date;
}

export interface EnhancedHRAssessmentResult {
  // Original HR fields
  memoryId: string;
  resumeBasics: {
    name: string;
    headline: string;
    email: string;
    location: string;
  };
  jdTitle: string;
  jdKeywords: string[];
  dimensionScores: DimensionScore[];
  initialSemanticRelevance: number;
  metadataKeyInfoMatching: number;
  comprehensiveScore: number;
  llmEvaluation: string;
  suggestions: string[];

  // New ML fields
  mlAnalysis: MLInsights;

  // Combined insights
  combinedRecommendations: string[];
  overallAssessment: string;

  // Metadata
  timestamp: Date;
  status: HRAgentStatus;
}

// ===== HELPER FUNCTIONS (from original HRAgent) =====

function extractKeywords(text: string, keywords: string[]): string[] {
  return keywords.filter((k) => text.includes(k.toLowerCase()));
}

async function parseJobDescription(input: any): Promise<{
  industry: string[];
  requiredSkills: string[];
  requiredEducation: string;
  salaryRange: { min: number; max: number; currency: string };
  locations: string[];
  personalityTraits: string[];
  jdVector: number[];
  jdKeywords: string[];
}> {
  const description = input.description.toLowerCase();

  const industry = input.industry
    ? [input.industry]
    : extractKeywords(description, [
        "tech",
        "finance",
        "healthcare",
        "education",
        "manufacturing",
        "retail",
        "software",
        "data",
      ]);

  const requiredSkills =
    input.requiredSkills ||
    extractKeywords(description, ["python", "java", "javascript", "react", "sql", "docker", "kubernetes"]);

  const requiredEducation = input.requiredEducation || "bachelor";

  const salaryRange = input.salaryRange || { min: 40000, max: 150000, currency: "USD" };

  const locations = input.location
    ? [input.location]
    : extractKeywords(description, ["remote", "us", "new york", "sf", "london"]);

  const personalityTraits =
    input.personalityTraits || extractKeywords(description, ["leadership", "creativity", "teamwork", "communication"]);

  const jdText = [input.title, description, requiredSkills.join(" ")].join(" ");
  const jdVector = textToEmbedding(jdText);
  const jdKeywords = requiredSkills.slice(0, 10);

  return {
    industry,
    requiredSkills,
    requiredEducation,
    salaryRange,
    locations,
    personalityTraits,
    jdVector,
    jdKeywords,
  };
}

function resumeDataToText(data: ResumeData): string {
  const parts: string[] = [];
  if (data.basics) {
    parts.push(data.basics.name || "", data.basics.headline || "", data.basics.location || "");
  }
  if ((data as any).sections) {
    const s = (data as any).sections;
    if (s.experience?.items)
      parts.push(...s.experience.items.map((i: any) => [i.company, i.position, i.location, i.description].join(" ")));
    if (s.skills?.items) parts.push(...s.skills.items.map((i: any) => i.name));
    if (s.education?.items) parts.push(...s.education.items.map((i: any) => [i.school, i.degree, i.area].join(" ")));
  }
  return parts.filter(Boolean).join(" ");
}

// ===== SCORING FUNCTIONS =====

function scoreIndustry(jdIndustries: string[], resumeText: string): DimensionScore {
  const matched = jdIndustries.filter((ind) => resumeText.toLowerCase().includes(ind.toLowerCase()));
  const score = (matched.length / Math.max(jdIndustries.length, 1)) * 100;
  return {
    dimension: "industry",
    score: Math.min(100, Math.round(score)),
    weight: 0.35,
    explanation: `${matched.length} of ${jdIndustries.length} industries matched.`,
    matchedItems: matched,
    unmatchedItems: jdIndustries.filter((i) => !matched.includes(i)),
  };
}

function scoreSkills(jdSkills: string[], resumeData: ResumeData, bonusMultiplier = 1.1): DimensionScore {
  const skillsSection = (resumeData as any).sections?.skills?.items || [];
  const resumeSkillsText = [
    ...skillsSection.map((s: any) => s.name?.toLowerCase() || ""),
    resumeDataToText(resumeData).toLowerCase(),
  ].join(" ");

  let matched = 0;
  for (const skill of jdSkills) {
    if (resumeSkillsText.includes(skill.toLowerCase())) {
      matched++;
    }
  }

  let score = (matched / Math.max(jdSkills.length, 1)) * 100;
  if (matched > jdSkills.length) {
    score = Math.min(100, score * bonusMultiplier);
  }

  return {
    dimension: "skills",
    score: Math.round(score),
    weight: 0.35,
    explanation: `${matched} of ${jdSkills.length} required skills found.`,
    matchedItems: jdSkills.filter((s) => resumeSkillsText.includes(s.toLowerCase())),
    unmatchedItems: jdSkills.filter((s) => !resumeSkillsText.includes(s.toLowerCase())),
  };
}

function scoreEducation(jdEducation: string, resumeData: ResumeData): DimensionScore {
  const educationSection = (resumeData as any).sections?.education?.items || [];
  const resumeEducationText = educationSection.map((e: any) => [e.degree, e.area].join(" ").toLowerCase()).join(" ");

  let score = 0;
  const explanation: string[] = [];

  if (jdEducation.toLowerCase().includes("bachelor")) {
    if (
      resumeEducationText.includes("bachelor") ||
      resumeEducationText.includes("master") ||
      resumeEducationText.includes("phd")
    ) {
      score = 100;
      explanation.push("Has required Bachelor's degree or higher.");
    } else if (resumeEducationText.includes("associate") || resumeEducationText.includes("diploma")) {
      score = 50;
      explanation.push("Has Associate/Diploma, below Bachelor requirement.");
    } else {
      score = 0;
      explanation.push("No Bachelor's degree found.");
    }
  }

  return {
    dimension: "education",
    score: Math.min(100, score),
    weight: 0.1,
    explanation: explanation.join(" "),
  };
}

function scoreSalary(jdSalary: { min: number; max: number; currency: string }, resumeData: ResumeData): DimensionScore {
  return {
    dimension: "salary",
    score: 75,
    weight: 0.05,
    explanation: "Salary expectations not directly evaluated from resume.",
  };
}

function scoreLocation(jdLocations: string[], resumeData: ResumeData): DimensionScore {
  const resumeLocation = resumeData.basics?.location || "";
  const matched = jdLocations.filter((loc) => resumeLocation.toLowerCase().includes(loc.toLowerCase()));
  const score = matched.length > 0 ? 100 : jdLocations.includes("remote") ? 80 : 50;

  return {
    dimension: "location",
    score: Math.round(score),
    weight: 0.05,
    explanation: matched.length > 0 ? `Located in ${matched.join(", ")}.` : "Location not specified or not matched.",
    matchedItems: matched,
    unmatchedItems: jdLocations.filter((l) => !matched.includes(l)),
  };
}

function scorePersonality(jdTraits: string[], resumeData: ResumeData): DimensionScore {
  const resumeText = resumeDataToText(resumeData).toLowerCase();
  const matched = jdTraits.filter((trait) => resumeText.includes(trait.toLowerCase()));
  const score = (matched.length / Math.max(jdTraits.length, 1)) * 100;

  return {
    dimension: "personality",
    score: Math.round(score),
    weight: 0.05,
    explanation: `${matched.length} of ${jdTraits.length} personality traits found in resume.`,
    matchedItems: matched,
    unmatchedItems: jdTraits.filter((t) => !matched.includes(t)),
  };
}

// ===== MAIN ENHANCED AGENT CLASS =====

export class EnhancedHRAgent {
  private status: HRAgentStatus = HRAgentStatus.IDLE;
  private mlManager: MLModulesManager;

  constructor(config?: { semanticWeight?: number; skillWeight?: number }) {
    this.mlManager = new MLModulesManager(config);
  }

  getStatus(): HRAgentStatus {
    return this.status;
  }

  /**
   * Evaluate ONE resume against ONE job description
   * Analyzes 6 dimensions + ML semantic matching, returns scores and recommendations
   * Output feeds into resume modification assistant for creating improvement plans
   */
  async evaluateResume(jdInput: any, memoryId: string, useLLM = false): Promise<EnhancedHRAssessmentResult> {
    this.status = HRAgentStatus.ANALYZING;

    try {
      // === STAGE 1: Parse JD ===
      const parsedJD = await parseJobDescription(jdInput);

      // === Get resume from memory ===
      const allResumes = await getResumeFromMemory();
      const resumeEntry = allResumes.find((e) => e.memoryId === memoryId);
      if (!resumeEntry) {
        throw new Error(`Resume with memoryId ${memoryId} not found.`);
      }

      const resumeData = resumeEntry.data;
      const resumeText = resumeDataToText(resumeData);

      // === STAGE 2: HR Evaluation (original) ===
      const resumeVector =
        resumeEntry.embeddings && resumeEntry.embeddings.length > 0
          ? resumeEntry.embeddings
          : textToEmbedding(resumeText);
      const initialSemanticRelevance = cosineSimilarity(parsedJD.jdVector, resumeVector);

      this.status = HRAgentStatus.RATING;

      const dimensionScores: DimensionScore[] = [
        scoreIndustry(parsedJD.industry, resumeText),
        scoreSkills(parsedJD.requiredSkills, resumeData, 1.1),
        scoreEducation(parsedJD.requiredEducation, resumeData),
        scoreSalary(parsedJD.salaryRange, resumeData),
        scoreLocation(parsedJD.locations, resumeData),
        scorePersonality(parsedJD.personalityTraits, resumeData),
      ];

      const metadataKeyInfoMatching = dimensionScores.reduce((sum, ds) => sum + (ds.score / 100) * ds.weight, 0) * 100;
      const comprehensiveScore = initialSemanticRelevance * 0.3 + metadataKeyInfoMatching * 0.7;

      // === STAGE 3: ML Analysis ===
      const mlAnalysis = await this.mlManager.analyzeMatch(resumeData, jdInput, useLLM);

      // === STAGE 4: Combine insights ===
      const combinedRecommendations = this.generateCombinedRecommendations(dimensionScores, mlAnalysis, jdInput);

      const overallAssessment = this.generateOverallAssessment(
        resumeData,
        comprehensiveScore,
        mlAnalysis.scoring.finalScore,
        dimensionScores,
      );

      const llmEvaluation = generateEvaluation(
        jdInput.title || "Position",
        resumeData,
        dimensionScores,
        comprehensiveScore,
      );
      const suggestions = generateSuggestions(dimensionScores, jdInput);

      this.status = HRAgentStatus.COMPLETED;

      return {
        // Original fields
        memoryId,
        resumeBasics: {
          name: resumeData.basics?.name || "Unknown",
          headline: resumeData.basics?.headline || "",
          email: resumeData.basics?.email || "",
          location: resumeData.basics?.location || "",
        },
        jdTitle: jdInput.title || "Untitled Position",
        jdKeywords: parsedJD.jdKeywords,
        dimensionScores,
        initialSemanticRelevance: Math.round(initialSemanticRelevance * 100) / 100,
        metadataKeyInfoMatching: Math.round(metadataKeyInfoMatching * 100) / 100,
        comprehensiveScore: Math.round(comprehensiveScore * 100) / 100,
        llmEvaluation,
        suggestions,

        // ML Analysis
        mlAnalysis: {
          semanticScore: mlAnalysis.semantic.semanticScore,
          semanticExplanation: mlAnalysis.semantic.reasoning,
          skillGap: mlAnalysis.skillGap,
          mlScore: mlAnalysis.scoring.finalScore,
          mlScoreTier: mlAnalysis.scoring.matchTier,
          scoreBreakdown: {
            semanticComponent: mlAnalysis.matchScoreBreakdown.semanticComponent.contribution,
            skillComponent: mlAnalysis.matchScoreBreakdown.skillComponent.contribution,
            formula: mlAnalysis.matchScoreBreakdown.formula,
          },
          improvements: mlAnalysis.improvements,
          usedLLM: mlAnalysis.improvements.usedLLM,
          analysisTimestamp: new Date(),
        },

        // Combined
        combinedRecommendations,
        overallAssessment,

        // Metadata
        timestamp: new Date(),
        status: this.status,
      };
    } catch (error) {
      this.status = HRAgentStatus.FAILED;
      throw error;
    }
  }

  /**
   * Batch process ALL user's resumes against ONE job description
   * Evaluates each resume in memoryIds, returns results sorted by match score (highest first)
   * Use case: Find the best matching resume(s) that need optimization for this job
   */
  async evaluateMultipleResumes(
    jdInput: any,
    memoryIds?: string[],
    useLLM = false,
  ): Promise<EnhancedHRAssessmentResult[]> {
    const resumes = await getResumeFromMemory();
    const targetIds = memoryIds || resumes.map((r) => r.memoryId);

    const results: EnhancedHRAssessmentResult[] = [];
    for (const memoryId of targetIds) {
      try {
        const result = await this.evaluateResume(jdInput, memoryId, useLLM);
        results.push(result);
      } catch (e) {
        console.error(`Failed to evaluate resume ${memoryId}:`, e);
      }
    }

    // Sort by ML score (primary) then HR score (secondary)
    results.sort((a, b) => {
      const mlDiff = b.mlAnalysis.mlScore - a.mlAnalysis.mlScore;
      return mlDiff !== 0 ? mlDiff : b.comprehensiveScore - a.comprehensiveScore;
    });

    return results;
  }

  /**
   * Search for matching resumes
   */
  async findMatchingResumes(jdInput: any, topK = 10): Promise<SearchResult[]> {
    const queryText = [jdInput.title, jdInput.description, (jdInput.requiredSkills || []).join(" ")].join(" ");
    return await searchResumeMemory(queryText, topK);
  }

  // ===== HELPER METHODS =====

  private generateCombinedRecommendations(
    dimensionScores: DimensionScore[],
    mlAnalysis: CompleteMLAnalysis,
    jdInput: any,
  ): string[] {
    const recommendations: string[] = [];

    // Add top HR recommendations
    const lowDimensions = dimensionScores
      .filter((s) => s.score < 70)
      .sort((a, b) => a.score - b.score)
      .slice(0, 2);

    for (const dim of lowDimensions) {
      if (dim.unmatchedItems && dim.unmatchedItems.length > 0) {
        recommendations.push(`Strengthen ${dim.dimension}: ${dim.unmatchedItems.slice(0, 2).join(", ")}`);
      }
    }

    // Add top ML recommendations
    const mlRecs = mlAnalysis.improvements.recommendations.slice(0, 2);
    for (const rec of mlRecs) {
      recommendations.push(`${rec.suggestion} (Priority: ${rec.priority})`);
    }

    // Add skill gap recommendations
    if (mlAnalysis.skillGap.missingSkills.length > 0) {
      recommendations.push(`Key skills to develop: ${mlAnalysis.skillGap.missingSkills.slice(0, 3).join(", ")}`);
    }

    return recommendations.slice(0, 5);
  }

  private generateOverallAssessment(
    resumeData: ResumeData,
    hrScore: number,
    mlScore: number,
    dimensionScores: DimensionScore[],
  ): string {
    const avgScore = (hrScore + mlScore) / 2;

    let tier = "Poor Match";
    if (avgScore >= 85) tier = "Excellent Match";
    else if (avgScore >= 75) tier = "Strong Match";
    else if (avgScore >= 60) tier = "Moderate Match";

    const strengths = dimensionScores
      .filter((s) => s.score >= 80)
      .map((s) => s.dimension)
      .slice(0, 2);

    const weaknesses = dimensionScores
      .filter((s) => s.score < 50)
      .map((s) => s.dimension)
      .slice(0, 2);

    return (
      `${tier} (HR: ${Math.round(hrScore)}, ML: ${Math.round(mlScore)}). ` +
      `Strengths: ${strengths.join(", ") || "None identified"}. ` +
      `Areas to improve: ${weaknesses.join(", ") || "None identified"}.`
    );
  }
}

// ===== HELPER EVALUATION FUNCTIONS =====

function generateEvaluation(
  positionTitle: string,
  resumeData: ResumeData,
  scores: DimensionScore[],
  overallScore: number,
): string {
  const topStrengths = scores
    .filter((s) => s.score >= 80)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => `${s.dimension} (${s.score}/100)`);

  const improvements = scores
    .filter((s) => s.score < 50)
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map((s) => `${s.dimension} needs improvement (${s.score}/100)`);

  return `
HR Assessment for "${positionTitle}":
Candidate: ${resumeData.basics?.name || "Candidate"}
Overall Score: ${Math.round(overallScore)}%

Strengths: ${topStrengths.length > 0 ? topStrengths.join(", ") : "None identified"}
Improvements: ${improvements.length > 0 ? improvements.join(", ") : "None identified"}

${overallScore >= 80 ? "Excellent match." : overallScore >= 60 ? "Good match." : "Moderate match."}
  `.trim();
}

function generateSuggestions(scores: DimensionScore[], jdInput: any): string[] {
  const suggestions: string[] = [];

  const lowScores = scores.filter((s) => s.score < 70);
  for (const score of lowScores) {
    if (score.dimension === "skills" && score.unmatchedItems) {
      suggestions.push(`Develop skills: ${score.unmatchedItems.slice(0, 3).join(", ")}`);
    } else if (score.dimension === "education") {
      suggestions.push("Highlight relevant education credentials");
    } else if (score.dimension === "industry") {
      suggestions.push(`Emphasize experience in: ${jdInput.industry || "target field"}`);
    }
  }

  return suggestions.slice(0, 3);
}

// Export
export { textToEmbedding, cosineSimilarity, searchResumeMemory, getResumeFromMemory };
export type { EnhancedHRAssessmentResult, MLInsights };
