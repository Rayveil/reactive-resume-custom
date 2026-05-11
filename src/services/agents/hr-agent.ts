import z from "zod";

import type { ResumeData } from "@/schema/resume/data";

import {
  getResumeFromMemory,
  searchResumeMemory,
  textToEmbedding,
  cosineSimilarity,
  type AgentMemoryEntry,
  type SearchResult,
} from "./shared-memory";

/**
 * ===== HR AGENT - Multi-Dimensional Resume-Job Matching =====
 *
 * 3-Stage Evaluation Model:
 * Stage 1: Intent Parsing & Structuring (parse JD into 6 hard conditions)
 * Stage 2: Multi-Dimensional Scoring (6 weighted dimensions, each 0-100)
 * Stage 3: Comprehensive Scoring (formula-driven aggregation)
 */

export enum HRAgentStatus {
  IDLE = "idle",
  ANALYZING = "analyzing",
  RATING = "rating",
  COMPLETED = "completed",
  FAILED = "failed",
}

// ===== INPUT & OUTPUT STRUCTURES =====

export interface JobDescriptionInput {
  title?: string;
  description: string;
  industry?: string;
  requiredSkills?: string[];
  requiredEducation?: string;
  salaryRange?: { min: number; max: number; currency?: string };
  location?: string;
  personalityTraits?: string[];
  rawStructured?: Record<string, unknown>;
}

export interface DimensionScore {
  dimension: "industry" | "skills" | "education" | "salary" | "location" | "personality";
  score: number; // 0-100
  weight: number; // percentage as decimal (e.g., 0.35 for 35%)
  explanation: string;
  matchedItems?: string[];
  unmatchedItems?: string[];
}

export interface HRAssessmentResult {
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
  initialSemanticRelevance: number; // cosine similarity
  metadataKeyInfoMatching: number; // weighted sum of 6 dimensions
  comprehensiveScore: number; // final score: semantic × 0.3 + metadata × 0.7
  llmEvaluation: string; // LLM-generated comprehensive evaluation
  suggestions: string[]; // optimization suggestions
  timestamp: Date;
  status: HRAgentStatus;
}

// ===== HELPER FUNCTIONS =====

/**
 * Parse natural language JD into 6 hard conditions (Stage 1)
 * Uses simple keyword extraction + LLM for structured parsing
 */
async function parseJobDescription(input: JobDescriptionInput): Promise<{
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

  // Extract structured fields or use defaults
  const industry = input.industry
    ? [input.industry]
    : extractKeywords(description, [
        "tech",
        "finance",
        "healthcare",
        "education",
        "manufacturing",
        "retail",
        "consulting",
        "energy",
        "media",
      ]);
  const requiredSkills =
    input.requiredSkills ||
    extractKeywords(description, [
      "javascript",
      "python",
      "react",
      "typescript",
      "sql",
      "aws",
      "docker",
      "kubernetes",
      "node",
      "java",
      "go",
      "rust",
      "leadership",
      "communication",
    ]);
  const requiredEducation =
    input.requiredEducation ||
    (description.includes("bachelor") ? "bachelor" : description.includes("master") ? "master" : "high school");
  const location = input.location
    ? [input.location]
    : extractKeywords(description, [
        "remote",
        "san francisco",
        "new york",
        "london",
        "singapore",
        "beijing",
        "shanghai",
        "hybrid",
      ]);
  const personalityTraits =
    input.personalityTraits ||
    extractKeywords(description, [
      "collaborative",
      "innovative",
      "detail-oriented",
      "proactive",
      "analytical",
      "creative",
      "independent",
    ]);

  // Parse salary (basic)
  let salaryRange = input.salaryRange || { min: 0, max: 0, currency: "USD" };
  if (!salaryRange.min) {
    const salaryMatch = description.match(/\$?(\d+)([km]?)\s*(?:to|-)\s*\$?(\d+)([km]?)/i);
    if (salaryMatch) {
      const min =
        parseInt(salaryMatch[1]) *
        (salaryMatch[2]?.toLowerCase() === "k" ? 1 : salaryMatch[2]?.toLowerCase() === "m" ? 1000 : 1);
      const max =
        parseInt(salaryMatch[3]) *
        (salaryMatch[4]?.toLowerCase() === "k" ? 1 : salaryMatch[4]?.toLowerCase() === "m" ? 1000 : 1);
      salaryRange = { min, max, currency: "USD" };
    }
  }

  // Vectorize JD
  const jdText = [input.title || "", input.description, requiredSkills.join(" "), personalityTraits.join(" ")].join(
    " ",
  );
  const jdVector = textToEmbedding(jdText);
  const jdKeywords = extractKeywords(jdText, undefined, 20);

  return {
    industry,
    requiredSkills,
    requiredEducation,
    salaryRange: salaryRange || { min: 0, max: 999999, currency: "USD" },
    locations: location,
    personalityTraits,
    jdVector,
    jdKeywords,
  };
}

function extractKeywords(text: string, options?: string[], limit = 10): string[] {
  if (options) {
    return options.filter((opt) => text.includes(opt.toLowerCase()));
  }
  // simple tokenization
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 3);
  return [...new Set(tokens)].slice(0, limit);
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

// ===== SCORING FUNCTIONS (Stage 2) =====

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

  // Base score + bonus for exceeding required
  let score = (matched / Math.max(jdSkills.length, 1)) * 100;
  if (matched > jdSkills.length) {
    score = Math.min(100, score * bonusMultiplier);
  }

  return {
    dimension: "skills",
    score: Math.round(score),
    weight: 0.35,
    explanation: `${matched} of ${jdSkills.length} required skills found (with ${matched > jdSkills.length ? "bonus" : "no bonus"}).`,
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
  } else if (jdEducation.toLowerCase().includes("master")) {
    if (resumeEducationText.includes("master") || resumeEducationText.includes("phd")) {
      score = 100;
      explanation.push("Has required Master's degree or higher.");
    } else if (resumeEducationText.includes("bachelor")) {
      score = 50;
      explanation.push("Has Bachelor's, below Master requirement.");
    } else {
      score = 0;
      explanation.push("No Master's degree found.");
    }
  } else {
    score = educationSection.length > 0 ? 80 : 50;
    explanation.push("Educational background meets standard requirements.");
  }

  return {
    dimension: "education",
    score: Math.min(100, score),
    weight: 0.1,
    explanation: explanation.join(" "),
  };
}

function scoreSalary(
  jdSalaryRange: { min: number; max: number; currency: string },
  resumeData: ResumeData,
): DimensionScore {
  // Try to extract salary from resume summary or custom fields
  const resumeText = resumeDataToText(resumeData).toLowerCase();
  const customFields = (resumeData as any).basics?.customFields || [];
  const salaryFieldText = customFields
    .map((f: any) => f.text)
    .join(" ")
    .toLowerCase();
  const allText = [resumeText, salaryFieldText].join(" ");

  const salaryMatch = allText.match(/\$?(\d+)([km]?)/);
  let resumeSalary = 0;
  if (salaryMatch) {
    resumeSalary =
      parseInt(salaryMatch[1]) *
      (salaryMatch[2]?.toLowerCase() === "k" ? 1 : salaryMatch[2]?.toLowerCase() === "m" ? 1000 : 1);
  }

  let score = 0;
  const explanation: string[] = [];

  if (resumeSalary === 0) {
    score = 50;
    explanation.push("No salary information found in resume.");
  } else if (resumeSalary >= jdSalaryRange.min && resumeSalary <= jdSalaryRange.max) {
    score = 100;
    explanation.push(`Salary ${resumeSalary} is within JD range [${jdSalaryRange.min}, ${jdSalaryRange.max}].`);
  } else if (resumeSalary < jdSalaryRange.min) {
    score = Math.max(0, 50 - Math.floor((jdSalaryRange.min - resumeSalary) / 10000));
    explanation.push(`Salary ${resumeSalary} is below JD minimum ${jdSalaryRange.min}.`);
  } else {
    score = Math.max(50, 100 - Math.floor((resumeSalary - jdSalaryRange.max) / 10000));
    explanation.push(`Salary ${resumeSalary} exceeds JD maximum ${jdSalaryRange.max}.`);
  }

  return {
    dimension: "salary",
    score: Math.min(100, score),
    weight: 0.1,
    explanation: explanation.join(" "),
  };
}

function scoreLocation(jdLocations: string[], resumeData: ResumeData): DimensionScore {
  const resumeLocation = (resumeData.basics?.location || "").toLowerCase();
  const matched = jdLocations.filter((loc) => resumeLocation.includes(loc.toLowerCase()));

  // Handle remote separately
  const isRemoteJD = jdLocations.some((l) => l.toLowerCase().includes("remote"));
  const isRemoteResume = resumeLocation.includes("remote") || resumeLocation.includes("worldwide");

  let score = 0;
  if (matched.length > 0) {
    score = 100;
  } else if (isRemoteJD && isRemoteResume) {
    score = 100;
  } else if (isRemoteJD && !isRemoteResume) {
    score = 30;
  } else if (!isRemoteJD && isRemoteResume) {
    score = 50;
  } else {
    score = 20;
  }

  return {
    dimension: "location",
    score: Math.min(100, score),
    weight: 0.05,
    explanation: `Resume location: "${resumeLocation}", JD locations: ${jdLocations.join(", ")}. Score: ${score}.`,
    matchedItems: [resumeLocation],
  };
}

function scorePersonality(jdTraits: string[], resumeData: ResumeData): DimensionScore {
  const summaryText = ((resumeData as any).summary?.content || "").toLowerCase();
  const descriptionTexts = [
    ...(((resumeData as any).sections?.experience?.items || []) as any[]).map(
      (e: any) => e.description?.toLowerCase() || "",
    ),
  ].join(" ");

  const allText = [summaryText, descriptionTexts].join(" ");

  const matched = jdTraits.filter((trait) => allText.includes(trait.toLowerCase()));
  const score = (matched.length / Math.max(jdTraits.length, 1)) * 100;

  return {
    dimension: "personality",
    score: Math.min(100, Math.round(score)),
    weight: 0.05,
    explanation: `${matched.length} of ${jdTraits.length} personality traits found.`,
    matchedItems: matched,
    unmatchedItems: jdTraits.filter((t) => !matched.includes(t)),
  };
}

// ===== MAIN AGENT CLASS =====

export class HRAgent {
  private status: HRAgentStatus = HRAgentStatus.IDLE;

  getStatus(): HRAgentStatus {
    return this.status;
  }

  /**
   * Evaluate a single resume against a job description
   * Stage 1: Parse JD into structured 6 hard conditions + vectorize
   * Stage 2: Score 6 dimensions
   * Stage 3: Aggregate using formula: semantic × 0.3 + metadata × 0.7
   */
  async evaluateResume(jdInput: JobDescriptionInput, memoryId: string): Promise<HRAssessmentResult> {
    this.status = HRAgentStatus.ANALYZING;

    try {
      // === STAGE 1: Intent Parsing ===
      const parsedJD = await parseJobDescription(jdInput);

      // === Get resume from memory ===
      const allResumes = await getResumeFromMemory();
      const resumeEntry = allResumes.find((e) => e.memoryId === memoryId);
      if (!resumeEntry) {
        throw new Error(`Resume with memoryId ${memoryId} not found in shared memory.`);
      }

      const resumeData = resumeEntry.data;
      const resumeText = resumeDataToText(resumeData);

      // === Calculate initial semantic relevance (cosine similarity) ===
      const resumeVector =
        resumeEntry.embeddings && resumeEntry.embeddings.length > 0
          ? resumeEntry.embeddings
          : textToEmbedding(resumeText);
      const initialSemanticRelevance = cosineSimilarity(parsedJD.jdVector, resumeVector);

      this.status = HRAgentStatus.RATING;

      // === STAGE 2: Multi-Dimensional Scoring ===
      const dimensionScores: DimensionScore[] = [
        scoreIndustry(parsedJD.industry, resumeText),
        scoreSkills(parsedJD.requiredSkills, resumeData, 1.1),
        scoreEducation(parsedJD.requiredEducation, resumeData),
        scoreSalary(parsedJD.salaryRange, resumeData),
        scoreLocation(parsedJD.locations, resumeData),
        scorePersonality(parsedJD.personalityTraits, resumeData),
      ];

      // === STAGE 3: Comprehensive Scoring ===
      // metadataKeyInfoMatching = Σ(score × weight) for all 6 dimensions
      const metadataKeyInfoMatching = dimensionScores.reduce((sum, ds) => sum + (ds.score / 100) * ds.weight, 0) * 100;

      // Comprehensive score = semantic × 0.3 + metadata × 0.7
      const comprehensiveScore = initialSemanticRelevance * 0.3 + metadataKeyInfoMatching * 0.7;

      // === Generate LLM Evaluation ===
      const llmEvaluation = generateEvaluation(
        jdInput.title || "Position",
        resumeData,
        dimensionScores,
        comprehensiveScore,
      );
      const suggestions = generateSuggestions(dimensionScores, jdInput);

      this.status = HRAgentStatus.COMPLETED;

      return {
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
        timestamp: new Date(),
        status: this.status,
      };
    } catch (error) {
      this.status = HRAgentStatus.FAILED;
      throw error;
    }
  }

  /**
   * Semantic search for matching resumes using shared-memory
   */
  async findMatchingResumes(jdInput: JobDescriptionInput, topK = 10): Promise<SearchResult[]> {
    const queryText = [jdInput.title, jdInput.description, (jdInput.requiredSkills || []).join(" ")].join(" ");
    return await searchResumeMemory(queryText, topK);
  }

  /**
   * Batch evaluate multiple resumes against a JD
   */
  async evaluateMultipleResumes(jdInput: JobDescriptionInput, memoryIds?: string[]): Promise<HRAssessmentResult[]> {
    const resumes = await getResumeFromMemory();
    const targetIds = memoryIds || resumes.map((r) => r.memoryId);

    const results: HRAssessmentResult[] = [];
    for (const memoryId of targetIds) {
      try {
        const result = await this.evaluateResume(jdInput, memoryId);
        results.push(result);
      } catch (e) {
        console.error(`Failed to evaluate resume ${memoryId}:`, e);
      }
    }

    // Sort by comprehensive score descending
    results.sort((a, b) => b.comprehensiveScore - a.comprehensiveScore);
    return results;
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

  const evaluation = `
Comprehensive HR Assessment for "${positionTitle}":

**Candidate**: ${resumeData.basics?.name || "Candidate"}
**Overall Match Score**: ${Math.round(overallScore * 100) / 100}%

**Strengths**:
${topStrengths.length > 0 ? topStrengths.map((s) => `- Strong in ${s}`).join("\n") : "- No strong matches identified"}

**Areas for Improvement**:
${improvements.length > 0 ? improvements.map((i) => `- ${i}`).join("\n") : "- No significant gaps"}

**Summary**:
${overallScore >= 80 ? "Excellent match - highly recommended for interview." : overallScore >= 60 ? "Good match - worth considering." : overallScore >= 40 ? "Moderate match - may require further screening." : "Poor match - limited fit for this role."}
`.trim();

  return evaluation;
}

function generateSuggestions(scores: DimensionScore[], jdInput: JobDescriptionInput): string[] {
  const suggestions: string[] = [];

  const lowScores = scores.filter((s) => s.score < 70);
  for (const score of lowScores) {
    if (score.dimension === "skills" && score.unmatchedItems) {
      suggestions.push(`Acquire or highlight skills: ${score.unmatchedItems.slice(0, 3).join(", ")}`);
    } else if (score.dimension === "education") {
      suggestions.push("Consider pursuing or highlighting relevant education credentials.");
    } else if (score.dimension === "industry") {
      suggestions.push(`Emphasize experience in target industries: ${jdInput.industry || "required field"}`);
    } else if (score.dimension === "location") {
      suggestions.push(`Be prepared to relocate or explore remote work for: ${jdInput.location || "target location"}`);
    }
  }

  if (suggestions.length === 0) {
    suggestions.push("Resume is well-aligned with the position. Prepare for interview.");
  }

  return suggestions.slice(0, 5);
}

// Export embedding helpers for use by other agents
export { textToEmbedding, cosineSimilarity, searchResumeMemory, getResumeFromMemory };
