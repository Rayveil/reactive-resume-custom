import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

import type { OptimizedResume, ParsedJD, UserProfile } from "@/schema/job-applications";

export interface ResumeOptimizerConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseURL?: string;
}

interface GetModelInput {
  provider: string;
  model: string;
  apiKey: string;
  baseURL?: string;
}

/**
 * Create AI model instance from credentials
 */
function createModelFromCredentials(input: GetModelInput) {
  const { provider, model, apiKey, baseURL } = input;

  // For qwen, use OpenAI compatible endpoint
  if (provider === "qwen") {
    return createOpenAI({
      apiKey,
      baseURL: baseURL || "https://dashscope.aliyuncs.com/compatible-mode/v1",
    }).responses(model);
  }

  // For other OpenAI compatible providers
  return createOpenAI({
    apiKey,
    baseURL: baseURL || undefined,
  }).responses(model);
}

export class ResumeOptimizerAgent {
  private config: ResumeOptimizerConfig;

  constructor(config: ResumeOptimizerConfig) {
    this.config = config;
  }

  /**
   * 生成/优化简历以匹配职位描述
   */
  async optimizeResumeForJob(userProfile: UserProfile, parsedJD: ParsedJD, jobId: string): Promise<OptimizedResume> {
    try {
      const optimizationPrompt = this.buildOptimizationPrompt(userProfile, parsedJD);
      const optimizedContent = await this.callLLM(optimizationPrompt);

      const resume: OptimizedResume = {
        id: `resume_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        userId: userProfile.id,
        jobId,
        baseResumeId: "base_resume_id",
        content: {
          summary: this.extractSection(optimizedContent, "summary") || userProfile.summary,
          headline: this.extractSection(optimizedContent, "headline") || userProfile.headline,
          experience: userProfile.experience,
          skills: userProfile.skills.map((s) => ({
            name: s.name,
            relevance: this.isRelevantSkill(s.name, parsedJD) ? "high" : "medium",
          })),
        },
        generatedAt: new Date().toISOString(),
        version: 1,
      };

      return resume;
    } catch (error) {
      console.error("Resume optimization failed:", error);
      // Fallback: return minimal optimized resume
      return this.createMinimalOptimizedResume(userProfile, jobId);
    }
  }

  /**
   * 生成优化建议
   */
  async generateOptimizationSuggestions(userProfile: UserProfile, parsedJD: ParsedJD): Promise<string[]> {
    try {
      const prompt = `You are a resume optimization expert. Based on the following job description and user profile, provide 5-7 specific, actionable suggestions to improve the resume for this job.

Job Description Summary:
- Title: ${parsedJD.title}
- Company: ${parsedJD.company}
- Required Skills: ${parsedJD.requirements.skills.map((s) => s.name).join(", ")}
- Seniority: ${parsedJD.seniority}
- Keywords: ${parsedJD.keywords.join(", ")}

User Profile:
- Headline: ${userProfile.headline}
- Skills: ${userProfile.skills.map((s) => s.name).join(", ")}
- Experience: ${userProfile.experience.length} positions

Provide suggestions in JSON format:
{
  "suggestions": [
    "suggestion 1",
    "suggestion 2",
    ...
  ]
}

Be specific about which skills to highlight, what achievements to emphasize, and how to tailor the language for ATS optimization.
Return only valid JSON, no markdown.`;

      const response = await this.callLLM(prompt);
      const parsed = JSON.parse(response);
      return parsed.suggestions || [];
    } catch (error) {
      console.error("Failed to generate suggestions:", error);
      return [
        "Highlight skills that match the job description",
        "Use metrics and quantifiable achievements in experience descriptions",
        "Include relevant keywords from the job description",
      ];
    }
  }

  /**
   * 构建优化提示
   */
  private buildOptimizationPrompt(userProfile: UserProfile, parsedJD: ParsedJD): string {
    const requiredSkills = parsedJD.requirements.skills.map((s) => s.name).join(", ");
    const userSkills = userProfile.skills.map((s) => s.name).join(", ");
    const userExperience = userProfile.experience.map((e) => `${e.position} at ${e.company}`).join("; ");

    return `You are a professional resume optimizer. Optimize the following user resume to better match the job description.

JOB DESCRIPTION:
Title: ${parsedJD.title}
Company: ${parsedJD.company}
Seniority: ${parsedJD.seniority}
Required Skills: ${requiredSkills}
Key Keywords: ${parsedJD.keywords.join(", ")}
Responsibilities: ${parsedJD.requirements.responsibilities.join("; ")}

USER RESUME:
Name: ${userProfile.personalName || ""}
Headline: ${userProfile.headline}
Summary: ${userProfile.summary}
Current Skills: ${userSkills}
Experience: ${userExperience}

OPTIMIZE AND RETURN:
{
  "headline": "Updated headline emphasizing relevant skills",
  "summary": "Updated professional summary tailored to this role",
  "skillsToHighlight": ["skill1", "skill2"],
  "achievementsToEmphasize": [
    "specific achievement related to job requirements",
    "another relevant achievement"
  ],
  "keywordOptimization": ["keyword1", "keyword2"],
  "atsOptimizationTips": ["tip1", "tip2"]
}

Requirements:
- Return only valid JSON, no markdown
- Focus on matching the required skills and seniority level
- Maintain authenticity (no false claims)
- Emphasize transferable skills if there's a gap
- Include metrics and quantifiable results where possible`;
  }

  /**
   * 调用 LLM
   */
  private async callLLM(prompt: string): Promise<string> {
    try {
      const model = createModelFromCredentials(this.config);

      const result = await generateText({
        model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const text = result.text.trim();

      // Try to extract JSON from the response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return jsonMatch[0];
      }

      return text;
    } catch (error) {
      console.error("LLM call failed:", error);
      throw error;
    }
  }

  /**
   * 从优化结果中提取特定部分
   */
  private extractSection(content: string, section: string): string | null {
    try {
      const parsed = JSON.parse(content);
      return parsed[section] || null;
    } catch {
      return null;
    }
  }

  /**
   * 检查技能是否与职位相关
   */
  private isRelevantSkill(skillName: string, parsedJD: ParsedJD): boolean {
    const skillLower = skillName.toLowerCase();
    const requiredSkills = parsedJD.requirements.skills.map((s) => s.name.toLowerCase());
    const keywords = parsedJD.keywords.map((k) => k.toLowerCase());

    return (
      requiredSkills.some((s) => s === skillLower || s.includes(skillLower)) ||
      keywords.some((k) => k === skillLower || k.includes(skillLower))
    );
  }

  /**
   * 创建最小化的优化简历（降级方案）
   */
  private createMinimalOptimizedResume(userProfile: UserProfile, jobId: string): OptimizedResume {
    return {
      id: `resume_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      userId: userProfile.id,
      jobId,
      baseResumeId: "base_resume_id",
      content: {
        summary: userProfile.summary,
        headline: userProfile.headline,
        experience: userProfile.experience,
        skills: userProfile.skills.map((s) => ({
          name: s.name,
          relevance: "medium",
        })),
      },
      generatedAt: new Date().toISOString(),
      version: 1,
    };
  }
}

/**
 * 创建简历优化 Agent 实例
 */
export function createResumeOptimizerAgent(config: ResumeOptimizerConfig): ResumeOptimizerAgent {
  return new ResumeOptimizerAgent(config);
}
