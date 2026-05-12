/**
 * Semantic Matching Engine
 * Provides semantic similarity matching between resume and job descriptions.
 */

import { textToEmbedding, cosineSimilarity } from "../shared-memory";

export interface SemanticMatchConfig {
  semanticWeight: number;
  skillWeight: number;
  embeddingDim: number;
  useTransformer: boolean;
}

export const DEFAULT_SEMANTIC_CONFIG: SemanticMatchConfig = {
  semanticWeight: 0.7,
  skillWeight: 0.3,
  embeddingDim: 128,
  useTransformer: false,
};

export interface SemanticMatchResult {
  semanticSimilarity: number;
  semanticScore: number;
  matchLogic: string;
  reasoning: string;
}

export function extractResumeText(resumeData: any): string {
  const parts: string[] = [];

  try {
    if (resumeData.basics) {
      parts.push(resumeData.basics.headline || "");
      parts.push(resumeData.basics.summary || "");
    }

    if (resumeData.summary?.content) {
      parts.push(resumeData.summary.content);
    }

    const experiences = resumeData.sections?.experience?.items || [];
    for (const exp of experiences) {
      parts.push(exp.position || "");
      parts.push(exp.company || "");
      parts.push(exp.description || "");
      if (exp.summary) parts.push(exp.summary);
    }

    const skills = resumeData.sections?.skills?.items || [];
    const skillNames = skills.map((s: any) => s.name).filter(Boolean);
    if (skillNames.length > 0) {
      parts.push(`Skills: ${skillNames.join(", ")}`);
    }

    const projects = resumeData.sections?.projects?.items || [];
    for (const proj of projects) {
      parts.push(proj.name || "");
      parts.push(proj.description || "");
    }

    const education = resumeData.sections?.education?.items || [];
    for (const edu of education) {
      parts.push(edu.degree || "");
      parts.push(edu.area || "");
    }
  } catch (error) {
    console.error("Error extracting resume text:", error);
  }

  return parts.filter((p) => p && p.trim().length > 0).join(" ");
}

export function extractJobText(jdInput: any): string {
  const parts: string[] = [];

  try {
    parts.push(jdInput.title || "");
    if (jdInput.company) parts.push(jdInput.company);
    parts.push(jdInput.description || "");

    if (Array.isArray(jdInput.requiredSkills)) {
      parts.push(`Required Skills: ${jdInput.requiredSkills.join(", ")}`);
    }

    if (Array.isArray(jdInput.requiredIndustry)) {
      parts.push(`Industry: ${jdInput.requiredIndustry.join(", ")}`);
    }

    if (Array.isArray(jdInput.personalityTraits)) {
      parts.push(`Traits: ${jdInput.personalityTraits.join(", ")}`);
    }

    if (jdInput.location) parts.push(jdInput.location);
  } catch (error) {
    console.error("Error extracting job text:", error);
  }

  return parts.filter((p) => p && p.trim().length > 0).join(" ");
}

export async function calculateSemanticSimilarity(
  resumeData: any,
  jdInput: any,
  _config: SemanticMatchConfig = DEFAULT_SEMANTIC_CONFIG,
): Promise<SemanticMatchResult> {
  try {
    const resumeText = extractResumeText(resumeData);
    const jobText = extractJobText(jdInput);

    if (!resumeText || !jobText) {
      return {
        semanticSimilarity: 0.3,
        semanticScore: 30,
        matchLogic: "Insufficient resume or job description data",
        reasoning: "Cannot calculate accurate similarity without sufficient text content",
      };
    }

    const resumeEmbed = textToEmbedding(resumeText);
    const jobEmbed = textToEmbedding(jobText);
    const similarity = cosineSimilarity(resumeEmbed, jobEmbed);
    const normalizedSimilarity = Math.max(0, Math.min(1, similarity));
    const semanticScore = Math.round(normalizedSimilarity * 100);

    return {
      semanticSimilarity: normalizedSimilarity,
      semanticScore,
      matchLogic: generateSemanticMatchLogic(normalizedSimilarity, resumeData, jdInput),
      reasoning:
        `Semantic similarity calculated by comparing resume content structure ` +
        `(experience, skills, education) with job description requirements. ` +
        `Score of ${semanticScore}/100 indicates ${getSimilarityInterpretation(semanticScore)} compatibility.`,
    };
  } catch (error) {
    console.error("Error calculating semantic similarity:", error);
    return {
      semanticSimilarity: 0.5,
      semanticScore: 50,
      matchLogic: "Using fallback semantic similarity",
      reasoning: "Error in similarity calculation; using conservative estimate",
    };
  }
}

function generateSemanticMatchLogic(similarity: number, resume: any, jd: any): string {
  const jobTitle = jd.title || "target position";
  const resumeHeadline = resume.basics?.headline || "current profile";

  if (similarity >= 0.8) {
    return `Your ${resumeHeadline} strongly aligns with ${jobTitle}. Content analysis shows good overlap in core responsibilities, skills, and experience level.`;
  }
  if (similarity >= 0.6) {
    return `Your ${resumeHeadline} moderately aligns with ${jobTitle}. Some experience overlap found, but skill gaps or different focus areas identified.`;
  }
  if (similarity >= 0.4) {
    return `Your ${resumeHeadline} has limited alignment with ${jobTitle}. Consider strengthening relevant experience or adding domain-specific skills.`;
  }

  return `Your ${resumeHeadline} shows weak alignment with ${jobTitle}. Significant skill gaps and experience differences exist. Recommend substantial resume updates.`;
}

function getSimilarityInterpretation(score: number): string {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "moderate";
  return "poor";
}

export function fallbackSemanticSimilarity(resumeText: string, jobText: string): number {
  try {
    const resumeTokens = new Set(resumeText.toLowerCase().match(/\b\w+\b/g) || []);
    const jobTokens = new Set(jobText.toLowerCase().match(/\b\w+\b/g) || []);

    const stopWords = new Set([
      "the",
      "a",
      "an",
      "and",
      "or",
      "in",
      "of",
      "to",
      "for",
      "is",
      "was",
      "be",
      "on",
      "with",
    ]);

    for (const word of stopWords) {
      resumeTokens.delete(word);
      jobTokens.delete(word);
    }

    const intersection = new Set([...resumeTokens].filter((x) => jobTokens.has(x)));
    const union = new Set([...resumeTokens, ...jobTokens]);
    const similarity = union.size > 0 ? intersection.size / union.size : 0;
    return Math.max(0, Math.min(1, similarity));
  } catch (error) {
    console.error("Error in fallback similarity:", error);
    return 0.5;
  }
}

export function computeHybridMatchScore(
  semanticSimilarity: number,
  skillMatchPercentage: number,
  config: SemanticMatchConfig = DEFAULT_SEMANTIC_CONFIG,
): number {
  const semanticComponent = semanticSimilarity * 100 * config.semanticWeight;
  const skillComponent = skillMatchPercentage * config.skillWeight;
  const finalScore = Math.round((semanticComponent + skillComponent) * 10) / 10;
  return Math.max(0, Math.min(100, finalScore));
}
