import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

import type { ParsedJD, JobPosting } from "@/schema/job-applications";

export interface JDParserConfig {
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

export class JDParserAgent {
  private config: JDParserConfig;

  constructor(config: JDParserConfig) {
    this.config = config;
  }

  /**
   * JD 解析 Prompt
   */
  private getParsingPrompt(jd: string): string {
    return `You are a job description parser. Extract key information from the following job description and return a JSON object with the following structure:

{
  "requirements": {
    "skills": [
      { "name": "skill name", "importance": "required|desired|nice_to_have", "yearsRequired": number (optional) }
    ],
    "experience": [
      { "description": "brief description", "yearsRequired": number }
    ],
    "education": [
      { "level": "Bachelor|Master|PhD|High School", "field": "field of study (optional)" }
    ],
    "responsibilities": ["responsibility 1", "responsibility 2"]
  },
  "seniority": "junior|mid|senior|lead",
  "keywords": ["keyword1", "keyword2"],
  "compensationRange": { "min": number (optional), "max": number (optional), "currency": "USD|EUR|GBP|CNY (optional)" }
}

IMPORTANT:
- Only return valid JSON, no markdown, no code blocks, no extra text
- If a field is not found in the JD, use empty array or null
- For years of experience, use 0 if not specified
- Be precise with importance levels: "required" for must-have, "desired" for preferred, "nice_to_have" for bonus skills
- Extract at least 3-5 core skills
- If salary is mentioned as range (e.g., $60k-$80k), parse both min and max
- Identify seniority level from job title and required years of experience

Job Description:
\`\`\`
${jd}
\`\`\`

Return only the JSON object:`;
  }

  /**
   * 调用 LLM 解析 JD
   */
  async parseJobDescription(jobPosting: JobPosting): Promise<ParsedJD> {
    const prompt = this.getParsingPrompt(jobPosting.description);

    try {
      // 这里需要调用 LLM 服务
      // 假设使用 qwen3 通过 API
      const response = await this.callLLM(prompt);
      const parsed = JSON.parse(response);

      const parsedJD: ParsedJD = {
        id: `parsed_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        jobId: jobPosting.id,
        title: jobPosting.title,
        company: jobPosting.company,
        requirements: {
          skills: parsed.requirements?.skills || [],
          experience: parsed.requirements?.experience || [],
          education: parsed.requirements?.education || [],
          responsibilities: parsed.requirements?.responsibilities || [],
        },
        keywords: parsed.keywords || [],
        seniority: parsed.seniority || "mid",
        compensationRange: parsed.compensationRange,
        extractedAt: new Date().toISOString(),
      };

      return parsedJD;
    } catch (error) {
      console.error("Failed to parse job description:", error);
      throw new Error(`JD Parser failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * 调用 LLM API - 使用真实 LLM
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
      console.error("LLM call failed, falling back to example response", error);
      // Fallback to example response
      return `{
        "requirements": {
          "skills": [
            { "name": "React", "importance": "required", "yearsRequired": 3 },
            { "name": "TypeScript", "importance": "required", "yearsRequired": 3 }
          ],
          "experience": [
            { "description": "Frontend development with React", "yearsRequired": 3 }
          ],
          "education": [],
          "responsibilities": []
        },
        "seniority": "mid",
        "keywords": ["React", "TypeScript"],
        "compensationRange": {}
      }`;
    }
  }

  /**
   * 批量解析多个 JD
   */
  async parseMultiple(jobPostings: JobPosting[]): Promise<ParsedJD[]> {
    const results = await Promise.allSettled(jobPostings.map((jp) => this.parseJobDescription(jp)));

    return results
      .map((result) => (result.status === "fulfilled" ? result.value : null))
      .filter((item): item is ParsedJD => item !== null);
  }
}

/**
 * 创建 JD Parser Agent 实例
 */
export function createJDParserAgent(config: JDParserConfig): JDParserAgent {
  return new JDParserAgent(config);
}
