import z from "zod";

export const applicationStatusSchema = z.enum([
  "draft", // 草稿、未投递
  "submitted", // 已投递
  "reviewed", // 已被查看
  "interviewing", // 面试中
  "offer", // 已获得offer
  "rejected", // 已拒绝
  "withdrawn", // 已撤回
]);

export const jobSourceSchema = z.enum([
  "manual", // 手动输入
  "linkedin", // LinkedIn
  "indeed", // Indeed
  "glassdoor", // Glassdoor
  "zhipin", // BOSS直聘
  "lagou", // 拉勾
  "other", // 其他
]);

/**
 * 职位描述解析后的结构化数据
 */
export const parsedJobDescriptionSchema = z.object({
  title: z.string(),
  company: z.string(),
  level: z.string().optional(), // e.g., "Senior", "Mid-level"
  requiredSkills: z.array(z.string()),
  niceToHaveSkills: z.array(z.string()),
  responsibilities: z.array(z.string()),
  qualifications: z.array(z.string()),
  yearsOfExperience: z.number().optional(),
  salary: z.string().optional(),
  location: z.string().optional(),
  jobType: z.string().optional(), // "Full-time", "Contract", etc.
  keywords: z.array(z.string()),
});

/**
 * 简历匹配评估结果
 */
export const resumeMatchAssessmentSchema = z.object({
  overallScore: z.number().min(0).max(100), // 0-100
  skillsMatch: z.number().min(0).max(100),
  experienceMatch: z.number().min(0).max(100),
  educationMatch: z.number().min(0).max(100),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  recommendations: z.array(z.string()), // 改进建议
  summary: z.string(), // 简短总结
});

/**
 * 为特定职位生成的定制简历
 */
export const customizedResumeSchema = z.object({
  id: z.string(),
  baseResumeId: z.string(), // 原始简历ID
  applicationId: z.string(),
  title: z.string().optional(), // 根据职位优化的职位名
  summary: z.string().optional(), // 根据职位优化的summary
  keywordsHighlighted: z.array(z.string()), // 突出的关键词
  optimizedBullets: z.record(z.string(), z.array(z.string())), // section -> optimized bullets
  tailoringNotes: z.string().optional(), // 定制说明
  generatedAt: z.date(),
});

/**
 * Agent 执行记录
 */
export const agentExecutionLogSchema = z.object({
  id: z.string(),
  applicationId: z.string(),
  agentType: z.enum([
    "jd_parser", // JD 解析 Agent
    "resume_matcher", // 简历匹配 Agent
    "resume_optimizer", // 简历优化 Agent
    "cover_letter_generator", // 求职信生成 Agent (Phase 2)
  ]),
  status: z.enum(["pending", "running", "success", "failed"]),
  input: z.record(z.any()),
  output: z.record(z.any()).optional(),
  error: z.string().optional(),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  duration: z.number().optional(), // 毫秒
});

/**
 * 求职应用记录（核心数据结构）
 */
export const applicationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  jobTitle: z.string(),
  company: z.string(),
  jobUrl: z.string().optional(),
  jobSource: jobSourceSchema,
  status: applicationStatusSchema,
  
  // 职位信息
  jobDescription: z.string(), // 原始JD文本
  parsedJobDescription: parsedJobDescriptionSchema.optional(), // 解析后的结构化数据
  
  // 简历信息
  baseResumeId: z.string(), // 使用的基础简历ID
  customizedResume: customizedResumeSchema.optional(), // 定制后的简历
  resumeMatchAssessment: resumeMatchAssessmentSchema.optional(), // 匹配评估
  
  // 投递信息
  appliedAt: z.date().optional(),
  appliedWithCustomResume: z.boolean().default(false), // 是否使用了定制简历投递
  
  // 跟进信息
  notes: z.string().optional(), // 用户备注
  tags: z.array(z.string()).default([]),
  interviews: z.array(z.object({
    date: z.date(),
    type: z.string(), // "phone", "video", "onsite"
    notes: z.string().optional(),
  })).default([]),
  
  // Agent 执行记录
  agentExecutionLogs: z.array(agentExecutionLogSchema).default([]),
  
  // 元数据
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().optional(),
});

export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;
export type JobSource = z.infer<typeof jobSourceSchema>;
export type ParsedJobDescription = z.infer<typeof parsedJobDescriptionSchema>;
export type ResumeMatchAssessment = z.infer<typeof resumeMatchAssessmentSchema>;
export type CustomizedResume = z.infer<typeof customizedResumeSchema>;
export type AgentExecutionLog = z.infer<typeof agentExecutionLogSchema>;
export type Application = z.infer<typeof applicationSchema>;
