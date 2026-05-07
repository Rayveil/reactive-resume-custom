import { createORPCMsw } from "@orpc/server";
import { z } from "zod";

import type { ApplicationRecord, ApplicationSession, JobPosting, UserProfile } from "@/schema/job-applications";

import {
  ApplicationOrchestrator,
  createApplicationOrchestrator,
  type AICredentials,
} from "@/services/agents/orchestrator";
import {
  userProfileStorage,
  jobPostingStorage,
  applicationSessionStorage,
  applicationRecordStorage,
} from "@/services/application-storage";

// ===== 输入/输出 Schema =====

const AICredentialsSchema = z.object({
  provider: z.string(),
  model: z.string(),
  apiKey: z.string(),
  baseURL: z.string().optional(),
});

const JobPostingInputSchema = z.object({
  title: z.string(),
  company: z.string(),
  description: z.string(),
  url: z.string().url().optional(),
  location: z.string().optional(),
  aiCredentials: AICredentialsSchema,
});

const AnalyzeJobResponseSchema = z.object({
  sessionId: z.string(),
  currentStep: z.string(),
  parsedJD: z.any().optional(),
  matchAnalysis: z.any().optional(),
  createdAt: z.string(),
});

const ApplicationSessionResponseSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  currentStep: z.string(),
  results: z.record(z.any()),
  createdAt: z.string(),
  completedAt: z.string().optional(),
});

const ApplicationRecordResponseSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  appliedAt: z.string(),
  status: z.string(),
});

// ===== Procedure 定义 =====

export const applicationsProcedures = {
  // 获取当前用户简历
  getUserProfile: () => ({
    async handler() {
      const profile = userProfileStorage.get();
      if (!profile) {
        throw new Error("User profile not found");
      }
      return profile;
    },
  }),

  // 保存或更新用户简历
  saveUserProfile: () => ({
    input: z.object({
      profile: z.any(), // UserProfile schema
    }),
    async handler(input: { profile: UserProfile }) {
      const saved = userProfileStorage.set(input.profile);
      if (!saved) {
        throw new Error("Failed to save user profile");
      }
      return { success: true, profile: input.profile };
    },
  }),

  // 解析并分析职位描述
  analyzeJob: () => ({
    input: JobPostingInputSchema,
    output: AnalyzeJobResponseSchema,
    async handler(input: any) {
      try {
        // 获取用户简历
        const userProfile = userProfileStorage.get();
        if (!userProfile) {
          throw new Error("User profile not found. Please set up your profile first.");
        }

        // 创建职位
        const jobPosting: JobPosting = {
          id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          title: input.title,
          company: input.company,
          description: input.description,
          url: input.url,
          location: input.location,
          postedAt: new Date().toISOString(),
        };

        // 保存职位
        jobPostingStorage.add(jobPosting);

        // 创建 Orchestrator 并执行工作流
        const config = {
          aiCredentials: {
            provider: input.aiCredentials.provider,
            model: input.aiCredentials.model,
            apiKey: input.aiCredentials.apiKey,
            baseURL: input.aiCredentials.baseURL,
          },
          timeoutMs: 60000,
          retryCount: 2,
        };

        const orchestrator = createApplicationOrchestrator(config);

        // 执行应用工作流
        const session = await orchestrator.executeApplicationWorkflow(userProfile.id, jobPosting, userProfile);

        // 返回结果
        return {
          sessionId: session.id,
          currentStep: session.currentStep,
          parsedJD: session.results.parsedJD,
          matchAnalysis: session.results.matchAnalysis,
          createdAt: session.createdAt,
        };
      } catch (error) {
        console.error("Failed to analyze job:", error);
        throw error instanceof Error ? error : new Error("Failed to analyze job");
      }
    },
  }),

  // 获取应用会话详情
  getApplicationSession: () => ({
    input: z.object({
      sessionId: z.string(),
    }),
    output: ApplicationSessionResponseSchema,
    async handler(input: { sessionId: string }) {
      const session = applicationSessionStorage.get(input.sessionId);
      if (!session) {
        throw new Error("Application session not found");
      }
      return session;
    },
  }),

  // 获取所有应用记录
  getApplicationRecords: () => ({
    input: z.object({
      userId: z.string().optional(),
      jobId: z.string().optional(),
    }),
    output: z.array(ApplicationRecordResponseSchema),
    async handler(input: { userId?: string; jobId?: string }) {
      let records: ApplicationRecord[] = [];

      if (input.userId) {
        records = applicationRecordStorage.getByUserId(input.userId);
      } else if (input.jobId) {
        records = applicationRecordStorage.getByJobId(input.jobId);
      } else {
        records = applicationRecordStorage.getAll();
      }

      return records;
    },
  }),

  // 提交应用（保存记录）
  submitApplication: () => ({
    input: z.object({
      sessionId: z.string(),
      aiCredentials: AICredentialsSchema,
    }),
    output: ApplicationRecordResponseSchema,
    async handler(input: { sessionId: string; aiCredentials: AICredentials }) {
      const session = applicationSessionStorage.get(input.sessionId);
      if (!session) {
        throw new Error("Application session not found");
      }

      const userProfile = userProfileStorage.get();
      if (!userProfile) {
        throw new Error("User profile not found");
      }

      try {
        const config = {
          aiCredentials: input.aiCredentials,
        };

        const orchestrator = createApplicationOrchestrator(config as any);
        const record = await orchestrator.saveApplicationRecord(userProfile.id, session);

        return record;
      } catch (error) {
        console.error("Failed to submit application:", error);
        throw error instanceof Error ? error : new Error("Failed to submit application");
      }
    },
  }),

  // 获取应用统计
  getApplicationStats: () => ({
    output: z.object({
      totalApplications: z.number(),
      sessionsInProgress: z.number(),
      completedSessions: z.number(),
    }),
    async handler() {
      const records = applicationRecordStorage.getAll();
      const sessions = applicationSessionStorage.getAll();
      const inProgress = sessions.filter((s) => s.currentStep !== "completed").length;
      const completed = sessions.filter((s) => s.currentStep === "completed").length;

      return {
        totalApplications: records.length,
        sessionsInProgress: inProgress,
        completedSessions: completed,
      };
    },
  }),

  // 清空所有应用数据（仅用于测试）
  clearApplicationData: () => ({
    async handler() {
      // 注意：在生产环境中应该受到保护
      applicationSessionStorage.clear();
      applicationRecordStorage.clear();
      return { success: true, message: "Application data cleared" };
    },
  }),
};

// ===== 创建路由器 =====

export function createApplicationsRouter() {
  const procedures = Object.entries(applicationsProcedures).reduce(
    (acc, [key, value]) => {
      acc[key] = value();
      return acc;
    },
    {} as Record<string, any>,
  );

  return createORPCMsw(procedures);
}
