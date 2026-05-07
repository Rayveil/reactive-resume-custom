import type {
  ApplicationSession,
  JobPosting,
  MatchAnalysis,
  OptimizedResume,
  ParsedJD,
  UserProfile,
  EvaluationResult,
  ApplicationRecord,
} from "@/schema/job-applications";

import {
  applicationSessionStorage,
  parsedJDStorage,
  matchAnalysisStorage,
  optimizedResumeStorage,
  evaluationStorage,
  applicationRecordStorage,
} from "@/services/application-storage";

import { JDParserAgent } from "./jd-parser-agent";
import { ResumeMatcherAgent } from "./resume-matcher-agent";

export interface AICredentials {
  provider: string;
  model: string;
  apiKey: string;
  baseURL?: string;
}

export interface OrchestratorConfig {
  aiCredentials: AICredentials;
  timeoutMs?: number;
  retryCount?: number;
}

/**
 * Agent Orchestrator 协调多个 Agent 完成应用工作流
 */
export class ApplicationOrchestrator {
  private config: OrchestratorConfig;
  private jdParserAgent: JDParserAgent;
  private resumeMatcherAgent: ResumeMatcherAgent;

  constructor(config: OrchestratorConfig) {
    this.config = {
      timeoutMs: 30000,
      retryCount: 2,
      ...config,
    };

    // Pass AI credentials to agents
    this.jdParserAgent = new JDParserAgent(config.aiCredentials);
    this.resumeMatcherAgent = new ResumeMatcherAgent();
  }

  /**
   * 创建新的应用工作流会话
   */
  async createApplicationSession(
    userId: string,
    jobPosting: JobPosting,
    userProfile: UserProfile,
  ): Promise<ApplicationSession> {
    const session: ApplicationSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      userId,
      jobId: jobPosting.id,
      currentStep: "parse_jd",
      results: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    applicationSessionStorage.add(session);
    return session;
  }

  /**
   * 执行完整的应用工作流
   */
  async executeApplicationWorkflow(
    userId: string,
    jobPosting: JobPosting,
    userProfile: UserProfile,
  ): Promise<ApplicationSession> {
    // 1. 创建会话
    let session = await this.createApplicationSession(userId, jobPosting, userProfile);

    try {
      // Step 1: 解析 JD
      console.log(`[Agent Orchestrator] Step 1: Parsing JD for job ${jobPosting.id}`);
      session = await this.runParsJDStep(session, jobPosting);

      if (!session.results.parsedJD) {
        throw new Error("Failed to parse JD");
      }

      // Step 2: 分析匹配度
      console.log(`[Agent Orchestrator] Step 2: Analyzing match for job ${jobPosting.id}`);
      session = await this.runAnalyzeStep(session, userProfile);

      if (!session.results.matchAnalysis) {
        throw new Error("Failed to analyze match");
      }

      // Step 3: 根据匹配度决定是否生成优化简历
      if (session.results.matchAnalysis.overallScore < 70) {
        console.log(`[Agent Orchestrator] Step 3: Generating optimized resume (low score)`);
        session = await this.runGenerateStep(session, userProfile, jobPosting);
      } else {
        console.log(`[Agent Orchestrator] Step 3: Skipping generation (high match score)`);
        // 创建最小化的优化简历
        session.results.optimizedResume = this.createMinimalOptimizedResume(session.results.parsedJD!, userProfile);
      }

      // Step 4: 评分
      console.log(`[Agent Orchestrator] Step 4: Evaluating resume`);
      session = await this.runEvaluateStep(session);

      // Step 5: 准备投递
      session.currentStep = "apply";
      session.updatedAt = new Date().toISOString();
      applicationSessionStorage.update(session.id, session);

      return session;
    } catch (error) {
      console.error(`[Agent Orchestrator] Workflow failed:`, error);
      session.errors = session.errors || [];
      session.errors.push(error instanceof Error ? error.message : "Unknown error");
      session.updatedAt = new Date().toISOString();
      applicationSessionStorage.update(session.id, session);
      throw error;
    }
  }

  /**
   * Step 1: 解析 JD
   */
  private async runParsJDStep(session: ApplicationSession, jobPosting: JobPosting): Promise<ApplicationSession> {
    try {
      // 检查是否已有缓存的解析结果
      let parsed = parsedJDStorage.getByJobId(jobPosting.id);

      if (!parsed) {
        parsed = await this.withTimeout(this.jdParserAgent.parseJobDescription(jobPosting), this.config.timeoutMs);
        parsedJDStorage.add(parsed);
      }

      session.results.parsedJD = parsed;
      session.currentStep = "analyze";
      session.updatedAt = new Date().toISOString();
      applicationSessionStorage.update(session.id, session);

      return session;
    } catch (error) {
      console.error("[Agent Orchestrator] Parse JD step failed:", error);
      throw error;
    }
  }

  /**
   * Step 2: 分析匹配度
   */
  private async runAnalyzeStep(session: ApplicationSession, userProfile: UserProfile): Promise<ApplicationSession> {
    if (!session.results.parsedJD) {
      throw new Error("Parsed JD not available");
    }

    try {
      const analysis = await this.withTimeout(
        this.resumeMatcherAgent.analyzeMatch(userProfile, session.results.parsedJD, session.jobId),
        this.config.timeoutMs,
      );

      matchAnalysisStorage.add(analysis);
      session.results.matchAnalysis = analysis;
      session.currentStep = "generate";
      session.updatedAt = new Date().toISOString();
      applicationSessionStorage.update(session.id, session);

      return session;
    } catch (error) {
      console.error("[Agent Orchestrator] Analyze step failed:", error);
      throw error;
    }
  }

  /**
   * Step 3: 生成优化简历
   */
  private async runGenerateStep(
    session: ApplicationSession,
    userProfile: UserProfile,
    jobPosting: JobPosting,
  ): Promise<ApplicationSession> {
    if (!session.results.parsedJD || !session.results.matchAnalysis) {
      throw new Error("Required data not available for resume generation");
    }

    try {
      // TODO: 实现真实的简历生成 Agent
      const optimized = this.createMinimalOptimizedResume(session.results.parsedJD, userProfile);

      optimizedResumeStorage.add(optimized);
      session.results.optimizedResume = optimized;
      session.currentStep = "evaluate";
      session.updatedAt = new Date().toISOString();
      applicationSessionStorage.update(session.id, session);

      return session;
    } catch (error) {
      console.error("[Agent Orchestrator] Generate step failed:", error);
      throw error;
    }
  }

  /**
   * Step 4: 评分简历
   */
  private async runEvaluateStep(session: ApplicationSession): Promise<ApplicationSession> {
    if (!session.results.optimizedResume || !session.results.parsedJD) {
      throw new Error("Required data not available for evaluation");
    }

    try {
      // TODO: 实现真实的简历评分 Agent
      const evaluation: EvaluationResult = {
        id: `eval_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        resumeId: session.results.optimizedResume.id,
        jobId: session.jobId,
        finalScore: Math.round(session.results.matchAnalysis?.overallScore ?? 0),
        breakdown: {
          skillsAlignment: 75,
          experienceAlignment: 70,
          keywordsOptimization: 80,
          educationMatch: 65,
        },
        aiFeedback: "Resume looks good for this position.",
        suggestions: [
          "Consider adding more detail about your relevant projects",
          "Emphasize metrics and quantifiable achievements",
        ],
        readyToApply: true,
        evaluatedAt: new Date().toISOString(),
      };

      evaluationStorage.add(evaluation);
      session.results.evaluation = evaluation;
      session.currentStep = "completed";
      session.completedAt = new Date().toISOString();
      session.updatedAt = new Date().toISOString();
      applicationSessionStorage.update(session.id, session);

      return session;
    } catch (error) {
      console.error("[Agent Orchestrator] Evaluate step failed:", error);
      throw error;
    }
  }

  /**
   * 创建最小化的优化简历（当匹配度已很高时）
   */
  private createMinimalOptimizedResume(parsedJD: ParsedJD, userProfile: UserProfile): OptimizedResume {
    return {
      id: `resume_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      userId: userProfile.id,
      jobId: parsedJD.jobId,
      baseResumeId: "base_resume_id", // TODO: 从用户配置中获取
      content: {
        summary: userProfile.summary,
        headline: userProfile.headline,
        experience: userProfile.experience,
        skills: userProfile.skills.map((s) => ({
          name: s.name,
          relevance: "high" as const,
        })),
      },
      generatedAt: new Date().toISOString(),
      version: 1,
    };
  }

  /**
   * 保存应用记录
   */
  async saveApplicationRecord(userId: string, session: ApplicationSession): Promise<ApplicationRecord> {
    if (!session.results.evaluation) {
      throw new Error("Evaluation result not available");
    }

    const record: ApplicationRecord = {
      id: `app_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      userId,
      jobId: session.jobId,
      resumeId: session.results.optimizedResume?.id || "unknown",
      appliedAt: new Date().toISOString(),
      status: "applied",
      source: "auto-generated",
    };

    applicationRecordStorage.add(record);
    return record;
  }

  /**
   * 带超时的 Promise
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs),
      ),
    ]);
  }
}

/**
 * 创建 Application Orchestrator
 */
export function createApplicationOrchestrator(config: OrchestratorConfig): ApplicationOrchestrator {
  return new ApplicationOrchestrator(config);
}
