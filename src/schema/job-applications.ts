import z from "zod";

// ===== 基础类型 =====

export const skillSchema = z.object({
  id: z.string(),
  name: z.string(),
  level: z.enum(["beginner", "intermediate", "advanced", "expert"]).optional(),
  yearsOfExperience: z.number().optional(),
});

export const workExperienceSchema = z.object({
  id: z.string(),
  company: z.string(),
  position: z.string(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  description: z.string(),
  keySkills: z.array(z.string()).optional(),
});

export const educationSchema = z.object({
  id: z.string(),
  institution: z.string(),
  degree: z.string(),
  field: z.string(),
  graduationDate: z.string(),
  gpa: z.string().optional(),
});

export const certificationSchema = z.object({
  id: z.string(),
  name: z.string(),
  issuer: z.string(),
  dateObtained: z.string(),
  expirationDate: z.string().nullable(),
  url: z.string().optional(),
});

export const projectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  technologies: z.array(z.string()).optional(),
  url: z.string().optional(),
  startDate: z.string(),
  endDate: z.string().nullable(),
});

// ===== 用户个人信息 =====

export const userProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  location: z.string(),
  headline: z.string(),
  summary: z.string(),
  skills: z.array(skillSchema),
  experience: z.array(workExperienceSchema),
  education: z.array(educationSchema),
  projects: z.array(projectSchema).optional(),
  certifications: z.array(certificationSchema).optional(),
  createdAt: z.date().transform((d) => d.toISOString()),
  updatedAt: z.date().transform((d) => d.toISOString()),
});

export type UserProfile = z.infer<typeof userProfileSchema>;

// ===== 职位发布 =====

export const jobPostingSchema = z.object({
  id: z.string(),
  title: z.string(),
  company: z.string(),
  description: z.string(),
  url: z.string().optional(),
  postedAt: z.date().transform((d) => d.toISOString()),
  tags: z.array(z.string()).optional(),
  source: z.enum(["manual", "imported"]).optional(),
  createdAt: z.date().transform((d) => d.toISOString()),
});

export type JobPosting = z.infer<typeof jobPostingSchema>;

// ===== 解析后的 JD =====

export const parsedJDRequirementSchema = z.object({
  name: z.string(),
  importance: z.enum(["required", "desired", "nice_to_have"]),
  yearsRequired: z.number().optional(),
});

export const parsedJDSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  title: z.string(),
  company: z.string(),
  requirements: z.object({
    skills: z.array(parsedJDRequirementSchema),
    experience: z.array(
      z.object({
        description: z.string(),
        yearsRequired: z.number(),
      }),
    ),
    education: z.array(
      z.object({
        level: z.string(), // Bachelor, Master, etc.
        field: z.string().optional(),
      }),
    ),
    responsibilities: z.array(z.string()).optional(),
  }),
  keywords: z.array(z.string()).optional(),
  seniority: z.enum(["junior", "mid", "senior", "lead"]).optional(),
  compensationRange: z
    .object({
      min: z.number(),
      max: z.number(),
      currency: z.string(),
    })
    .optional(),
  extractedAt: z.date().transform((d) => d.toISOString()),
});

export type ParsedJD = z.infer<typeof parsedJDSchema>;

// ===== 匹配分析 =====

export const matchAnalysisSchema = z.object({
  id: z.string(),
  jobId: z.string(),
  userId: z.string(),
  overallScore: z.number().min(0).max(100),
  skillMatches: z.object({
    matched: z.array(z.string()),
    missing: z.array(z.string()),
    strengths: z.array(z.string()),
  }),
  experienceGaps: z.array(z.string()),
  educationGaps: z.array(z.string()),
  strengths: z.array(z.string()),
  recommendations: z.array(z.string()),
  analysisAt: z.date().transform((d) => d.toISOString()),
});

export type MatchAnalysis = z.infer<typeof matchAnalysisSchema>;

// ===== 优化简历 =====

export const optimizedResumeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  jobId: z.string(),
  baseResumeId: z.string(),
  content: z.object({
    summary: z.string(),
    headline: z.string(),
    experience: z.array(
      z.object({
        ...workExperienceSchema.shape,
        relevanceScore: z.number().min(0).max(100).optional(),
        optimizedDescription: z.string().optional(),
      }),
    ),
    skills: z.array(
      z.object({
        name: z.string(),
        relevance: z.enum(["high", "medium", "low"]),
      }),
    ),
    customSections: z
      .array(
        z.object({
          title: z.string(),
          content: z.string(),
        }),
      )
      .optional(),
  }),
  generatedAt: z.date().transform((d) => d.toISOString()),
  version: z.number(),
});

export type OptimizedResume = z.infer<typeof optimizedResumeSchema>;

// ===== 评分结果 =====

export const evaluationResultSchema = z.object({
  id: z.string(),
  resumeId: z.string(),
  jobId: z.string(),
  finalScore: z.number().min(0).max(100),
  breakdown: z.object({
    skillsAlignment: z.number().min(0).max(100),
    experienceAlignment: z.number().min(0).max(100),
    keywordsOptimization: z.number().min(0).max(100),
    educationMatch: z.number().min(0).max(100),
  }),
  aiFeedback: z.string(),
  suggestions: z.array(z.string()),
  readyToApply: z.boolean(),
  evaluatedAt: z.date().transform((d) => d.toISOString()),
});

export type EvaluationResult = z.infer<typeof evaluationResultSchema>;

// ===== 投递记录 =====

export const applicationRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  jobId: z.string(),
  resumeId: z.string(),
  appliedAt: z.date().transform((d) => d.toISOString()),
  status: z.enum(["pending", "applied", "viewed", "rejected", "interview", "offer"]),
  feedback: z.string().optional(),
  followUpAt: z
    .date()
    .transform((d) => d.toISOString())
    .optional(),
  source: z.enum(["manual", "auto-generated"]),
  notes: z.string().optional(),
});

export type ApplicationRecord = z.infer<typeof applicationRecordSchema>;

// ===== 应用会话（多步工作流） =====

export const applicationSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  jobId: z.string(),
  currentStep: z.enum(["parse_jd", "analyze", "generate", "evaluate", "apply", "completed"]),
  results: z.object({
    parsedJD: parsedJDSchema.optional(),
    matchAnalysis: matchAnalysisSchema.optional(),
    optimizedResume: optimizedResumeSchema.optional(),
    evaluation: evaluationResultSchema.optional(),
    applicationRecord: applicationRecordSchema.optional(),
  }),
  errors: z.array(z.string()).optional(),
  createdAt: z.date().transform((d) => d.toISOString()),
  completedAt: z
    .date()
    .transform((d) => d.toISOString())
    .optional(),
  updatedAt: z.date().transform((d) => d.toISOString()),
});

export type ApplicationSession = z.infer<typeof applicationSessionSchema>;

// ===== 统计数据 =====

export const applicationStatsSchema = z.object({
  userId: z.string(),
  totalApplications: z.number(),
  appliedThisWeek: z.number(),
  appliedThisMonth: z.number(),
  averageMatchScore: z.number().min(0).max(100),
  responseRate: z.number().min(0).max(100),
  successRate: z.number().min(0).max(100),
  topCompanies: z.array(
    z.object({
      company: z.string(),
      count: z.number(),
    }),
  ),
  topPositions: z.array(
    z.object({
      position: z.string(),
      count: z.number(),
    }),
  ),
  lastUpdated: z.date().transform((d) => d.toISOString()),
});

export type ApplicationStats = z.infer<typeof applicationStatsSchema>;
