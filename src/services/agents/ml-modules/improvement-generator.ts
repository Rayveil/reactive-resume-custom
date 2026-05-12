/**
 * Improvement Suggestion Generator
 * Generates specific, actionable improvement suggestions for resume modification.
 */

import { generateText } from "ai";

import type { ResumeData } from "@/schema/resume/data";

import type { ScoreBreakdown } from "./scoring-engine";
import type { SkillGapAnalysis } from "./skill-gap-analyzer";

export interface ImprovementRecommendation {
  category: "skill_gap" | "semantic_alignment" | "achievement_emphasis" | "formatting" | "general";
  priority: "critical" | "high" | "medium" | "low";
  suggestion: string;
  reasoning: string;
  implementation: string;
  impact: string;
  examples?: string[];
}

export interface ImprovementResult {
  recommendations: ImprovementRecommendation[];
  summary: string;
  estimatedScoreIncrease: number;
  priorities: ImprovementRecommendation[];
  usedLLM: boolean;
}

const IMPROVEMENT_PROMPT_TEMPLATE = `You are an expert resume coach helping a candidate improve their resume for a specific job.

Candidate Profile:
- Current Skills: {currentSkills}
- Experience: {experience}
- Education: {education}
- Missing Skills: {missingSkills}
- Skill Coverage: {skillCoverage}%
- Semantic Match Score: {semanticScore}/100
- Current Match: {matchTier}

Target Position: {jobTitle}
- Required Skills: {jobSkills}
- Key Responsibilities: {jobResponsibilities}

Provide 3-5 specific, actionable recommendations to improve this candidate's match score.`;

export async function generateImprovements(
  resume: ResumeData,
  jobInput: any,
  skillGap: SkillGapAnalysis,
  scoreBreakdown: ScoreBreakdown,
  useLLM = false,
): Promise<ImprovementResult> {
  try {
    if (useLLM) {
      const llmResult = await generateImprovementsWithLLM(resume, jobInput, skillGap, scoreBreakdown);
      if (llmResult) return llmResult;
    }

    return generateFallbackImprovements(resume, jobInput, skillGap, scoreBreakdown);
  } catch (error) {
    console.error("Error generating improvements:", error);
    return generateFallbackImprovements(resume, jobInput, skillGap, scoreBreakdown);
  }
}

async function generateImprovementsWithLLM(
  resume: ResumeData,
  jobInput: any,
  skillGap: SkillGapAnalysis,
  scoreBreakdown: ScoreBreakdown,
): Promise<ImprovementResult | null> {
  try {
    const currentSkills = resume.sections?.skills?.items?.map((s: any) => s.name) || [];
    const experience =
      resume.sections?.experience?.items
        ?.map((e: any) => `${e.position} at ${e.company}`)
        .slice(0, 2)
        .join(", ") || "Not specified";
    const education =
      resume.sections?.education?.items?.map((e: any) => `${e.degree} in ${e.area}`).join(", ") || "Not specified";

    const prompt = IMPROVEMENT_PROMPT_TEMPLATE.replace("{currentSkills}", currentSkills.join(", "))
      .replace("{experience}", experience)
      .replace("{education}", education)
      .replace("{missingSkills}", skillGap.missingSkills.join(", "))
      .replace("{skillCoverage}", String(skillGap.skillCoverage))
      .replace("{semanticScore}", String(scoreBreakdown.semanticComponent.score))
      .replace("{matchTier}", scoreBreakdown.matchTier)
      .replace("{jobTitle}", jobInput.title || "target position")
      .replace("{jobSkills}", (jobInput.requiredSkills || []).join(", "))
      .replace("{jobResponsibilities}", jobInput.description || "");

    try {
      const result = await generateText({
        model: "gpt-4-turbo" as any,
        prompt,
        temperature: 0.7,
        maxTokens: 1000,
      });

      return parseLLMResponse(result.text);
    } catch (llmError) {
      console.error("LLM call failed:", llmError);
      return null;
    }
  } catch (error) {
    console.error("LLM improvement generation error:", error);
    return null;
  }
}

function parseLLMResponse(llmText: string): ImprovementResult | null {
  try {
    const recommendations: ImprovementRecommendation[] = [];
    const sections = llmText.split(/\n\d+\./).filter((section) => section.trim().length > 0);

    for (const section of sections.slice(0, 5)) {
      const categoryMatch = section.match(/\[([^\]]+)\]/);
      const category = (categoryMatch?.[1] || "general").toLowerCase();
      const lines = section.split("\n").filter((line) => line.trim().length > 0);
      const suggestion = lines[0]?.replace(/\[.*?\]/, "").trim() || "";
      const whyLine =
        lines
          .find((line) => line.includes("Why:"))
          ?.replace(/Why:/, "")
          .trim() || "";
      const howLine =
        lines
          .find((line) => line.includes("How:"))
          ?.replace(/How:/, "")
          .trim() || "";
      const impactLine =
        lines
          .find((line) => line.includes("Impact:"))
          ?.replace(/Impact:/, "")
          .trim() || "";

      if (suggestion) {
        recommendations.push({
          category: category as ImprovementRecommendation["category"],
          priority: "high",
          suggestion,
          reasoning: whyLine,
          implementation: howLine,
          impact: impactLine,
        });
      }
    }

    if (recommendations.length === 0) return null;

    return {
      recommendations,
      summary: `Generated ${recommendations.length} targeted improvement recommendations based on your profile.`,
      estimatedScoreIncrease: Math.min(25, recommendations.length * 5),
      priorities: recommendations.slice(0, 3),
      usedLLM: true,
    };
  } catch (error) {
    console.error("Error parsing LLM response:", error);
    return null;
  }
}

function generateFallbackImprovements(
  resume: ResumeData,
  jobInput: any,
  skillGap: SkillGapAnalysis,
  scoreBreakdown: ScoreBreakdown,
): ImprovementResult {
  const recommendations: ImprovementRecommendation[] = [];

  if (skillGap.missingSkills.length > 0) {
    const topMissing = skillGap.missingSkills.slice(0, 2);
    recommendations.push({
      category: "skill_gap",
      priority: "critical",
      suggestion: `Add ${topMissing.join(" and ")} to your skillset`,
      reasoning: `These are required skills for ${jobInput.title} that your resume doesn't mention`,
      implementation:
        `1. Take an online course (Coursera, Udemy, LinkedIn Learning)\n` +
        `2. Complete a small project demonstrating the skill\n` +
        `3. Add it to your resume's "Skills" section with relevant context`,
      impact: "+10-15 points on skill coverage",
      examples: [`"Completed ${topMissing[0]} project: [description]"`, `"Proficient in ${topMissing[0]} (2+ years)"`],
    });
  }

  if (scoreBreakdown.semanticComponent.score < 70) {
    recommendations.push({
      category: "semantic_alignment",
      priority: "high",
      suggestion: "Rewrite experience descriptions to match job responsibilities",
      reasoning: "Your current resume focuses on different areas than this job requires",
      implementation:
        `1. Review job description keywords\n` +
        `2. Rewrite bullet points using similar language and focus\n` +
        `3. Emphasize responsibilities that align with job duties\n` +
        `4. Include metrics/achievements from similar roles`,
      impact: "+10-20 points on semantic match",
      examples: [
        'From: "Developed web features" To: "Designed and implemented scalable backend APIs handling 10k+ requests"',
        'Include: "Led cross-functional team collaboration" if applying for leadership role',
      ],
    });
  }

  if (skillGap.matchedSkills.length > 0) {
    const topMatched = skillGap.matchedSkills.slice(0, 3);
    recommendations.push({
      category: "achievement_emphasis",
      priority: "high",
      suggestion: `Highlight your strong skills: ${topMatched.join(", ")}`,
      reasoning: "These skills align perfectly with the job; showcase them prominently",
      implementation:
        `1. Create a "Core Competencies" section featuring: ${topMatched.join(", ")}\n` +
        `2. In experience section, add 1-2 achievement bullets per skill\n` +
        `3. Use metrics: "Built X with ${topMatched[0]}, improving Y by Z%"`,
      impact: "+5-10 points (improved credibility)",
      examples: [
        `"Architected microservices using ${topMatched[0]}, reducing latency by 40%"`,
        `"Led ${topMatched[0]} migration for 100+ employee platform"`,
      ],
    });
  }

  if (skillGap.bonusSkills.length > 2) {
    recommendations.push({
      category: "achievement_emphasis",
      priority: "medium",
      suggestion: "Showcase extra skills to differentiate from other candidates",
      reasoning: "You have capabilities beyond the job requirements that could set you apart",
      implementation:
        `1. Create a "Certifications & Additional Skills" section\n` +
        `2. Highlight: ${skillGap.bonusSkills.slice(0, 3).join(", ")}\n` +
        `3. Explain relevance to role if not obvious`,
      impact: "+5 points (competitive advantage)",
    });
  }

  if (scoreBreakdown.finalScore < 75) {
    recommendations.push({
      category: "formatting",
      priority: "medium",
      suggestion: "Ensure resume ATS-friendly formatting and completeness",
      reasoning: "Many recruiters use ATS systems; proper formatting ensures your resume is parsed correctly",
      implementation:
        `1. Use standard section headers: Summary, Experience, Skills, Education\n` +
        `2. One skills section with all relevant competencies\n` +
        `3. Use common file format (PDF)\n` +
        `4. Avoid tables and graphics\n` +
        `5. Include relevant keywords from job posting`,
      impact: "+3-5 points (better visibility)",
    });
  }

  let estimatedIncrease = 0;
  for (const recommendation of recommendations) {
    if (recommendation.priority === "critical") estimatedIncrease += 15;
    else if (recommendation.priority === "high") estimatedIncrease += 10;
    else if (recommendation.priority === "medium") estimatedIncrease += 5;
  }

  return {
    recommendations,
    summary:
      `Identified ${recommendations.length} specific improvements to boost your match score. ` +
      `Following these recommendations could increase your score by ~${Math.min(estimatedIncrease, 25)} points.`,
    estimatedScoreIncrease: Math.min(estimatedIncrease, 25),
    priorities: recommendations.slice(0, 3),
    usedLLM: false,
  };
}
