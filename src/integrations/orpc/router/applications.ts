import z from "zod";

import {
  applicationRecordSchema,
  applicationSessionSchema,
  jobPostingSchema,
  userProfileSchema,
} from "@/schema/job-applications";

import { protectedProcedure } from "../context";
import { applicationsProcedures } from "../services/applications";

// ===== 输入/输出 Schema =====

const AICredentialsSchema = z.object({
  provider: z.string(),
  model: z.string(),
  apiKey: z.string(),
  baseURL: z.string().optional(),
});

const GetUserProfileOutputSchema = userProfileSchema;

const SaveUserProfileInputSchema = z.object({
  profile: userProfileSchema,
});

const SaveUserProfileOutputSchema = z.object({
  success: z.boolean(),
  profile: userProfileSchema,
});

const AnalyzeJobInputSchema = z.object({
  title: z.string().min(1, "Job title is required"),
  company: z.string().min(1, "Company name is required"),
  description: z.string().min(10, "Job description must be at least 10 characters"),
  url: z.string().url("Invalid URL").optional(),
  location: z.string().optional(),
  aiCredentials: AICredentialsSchema,
});

const AnalyzeJobOutputSchema = z.object({
  sessionId: z.string(),
  currentStep: z.string(),
  parsedJD: z.any().optional(),
  matchAnalysis: z.any().optional(),
  createdAt: z.string(),
});

const GetApplicationSessionInputSchema = z.object({
  sessionId: z.string().min(1),
});

const GetApplicationSessionOutputSchema = applicationSessionSchema;

const GetApplicationRecordsInputSchema = z.object({
  userId: z.string().optional(),
  jobId: z.string().optional(),
});

const GetApplicationRecordsOutputSchema = z.array(applicationRecordSchema);

const SubmitApplicationInputSchema = z.object({
  sessionId: z.string().min(1),
  aiCredentials: AICredentialsSchema,
});

const SubmitApplicationOutputSchema = applicationRecordSchema;

const ApplicationStatsOutputSchema = z.object({
  totalApplications: z.number(),
  sessionsInProgress: z.number(),
  completedSessions: z.number(),
});

// ===== Router 定义 =====

export const applicationsRouter = {
  // 获取当前用户简历
  getUserProfile: protectedProcedure
    .route({
      method: "GET",
      path: "/applications/profile",
      tags: ["Applications"],
      operationId: "getUserProfile",
      summary: "Get user profile",
      description: "Retrieves the current user's resume profile",
    })
    .output(GetUserProfileOutputSchema)
    .handler(async () => {
      const handler = applicationsProcedures.getUserProfile().handler;
      return await handler();
    }),

  // 保存用户简历
  saveUserProfile: protectedProcedure
    .route({
      method: "POST",
      path: "/applications/profile",
      tags: ["Applications"],
      operationId: "saveUserProfile",
      summary: "Save user profile",
      description: "Saves or updates the current user's resume profile",
    })
    .input(SaveUserProfileInputSchema)
    .output(SaveUserProfileOutputSchema)
    .handler(async ({ input }) => {
      const handler = applicationsProcedures.saveUserProfile().handler;
      return await handler(input);
    }),

  // 分析职位并执行工作流
  analyzeJob: protectedProcedure
    .route({
      method: "POST",
      path: "/applications/analyze",
      tags: ["Applications"],
      operationId: "analyzeJob",
      summary: "Analyze job posting",
      description:
        "Analyzes a job posting against user profile and runs the full application workflow (parse JD, match analysis, resume generation if needed)",
    })
    .input(AnalyzeJobInputSchema)
    .output(AnalyzeJobOutputSchema)
    .handler(async ({ input }) => {
      const handler = applicationsProcedures.analyzeJob().handler;
      return await handler(input);
    }),

  // 获取应用会话
  getApplicationSession: protectedProcedure
    .route({
      method: "GET",
      path: "/applications/session/:sessionId",
      tags: ["Applications"],
      operationId: "getApplicationSession",
      summary: "Get application session",
      description: "Retrieves the details of a specific application workflow session",
    })
    .input(GetApplicationSessionInputSchema)
    .output(GetApplicationSessionOutputSchema)
    .handler(async ({ input }) => {
      const handler = applicationsProcedures.getApplicationSession().handler;
      return await handler(input);
    }),

  // 获取应用记录列表
  getApplicationRecords: protectedProcedure
    .route({
      method: "GET",
      path: "/applications/records",
      tags: ["Applications"],
      operationId: "getApplicationRecords",
      summary: "Get application records",
      description: "Retrieves a list of submitted applications, optionally filtered by user or job",
    })
    .input(GetApplicationRecordsInputSchema)
    .output(GetApplicationRecordsOutputSchema)
    .handler(async ({ input }) => {
      const handler = applicationsProcedures.getApplicationRecords().handler;
      return await handler(input);
    }),

  // 提交应用
  submitApplication: protectedProcedure
    .route({
      method: "POST",
      path: "/applications/submit",
      tags: ["Applications"],
      operationId: "submitApplication",
      summary: "Submit application",
      description: "Submits an application after workflow completion, creating an application record",
    })
    .input(
      z.object({
        sessionId: z.string().min(1),
        aiCredentials: AICredentialsSchema,
      }),
    )
    .output(SubmitApplicationOutputSchema)
    .handler(async ({ input }) => {
      const handler = applicationsProcedures.submitApplication().handler;
      return await handler(input as any);
    }),

  // 获取应用统计
  getApplicationStats: protectedProcedure
    .route({
      method: "GET",
      path: "/applications/stats",
      tags: ["Applications"],
      operationId: "getApplicationStats",
      summary: "Get application statistics",
      description: "Retrieves statistics about user applications and workflow sessions",
    })
    .output(ApplicationStatsOutputSchema)
    .handler(async () => {
      const handler = applicationsProcedures.getApplicationStats().handler;
      return await handler();
    }),

  // 清空数据（仅用于开发）
  clearApplicationData: protectedProcedure
    .route({
      method: "POST",
      path: "/applications/clear",
      tags: ["Applications"],
      operationId: "clearApplicationData",
      summary: "Clear all application data",
      description: "(Development only) Clears all stored application data",
    })
    .handler(async () => {
      const handler = applicationsProcedures.clearApplicationData().handler;
      return await handler();
    }),
};
