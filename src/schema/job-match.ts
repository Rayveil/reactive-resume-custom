import z from "zod";

export const jobMatchItemCategorySchema = z.enum([
  "skill",
  "experience",
  "education",
  "responsibility",
  "project",
  "other",
]);

export const jobMatchSourceItemSchema = z.object({
  id: z.string(),
  category: jobMatchItemCategorySchema,
  text: z.string(),
  importance: z.number().int().min(1).max(3),
  keywords: z.array(z.string()).catch([]),
  evidence: z.array(z.string()).catch([]),
});

export const jobMatchSourceSchema = z.object({
  title: z.string().nullable().catch(null),
  summary: z.string().nullable().catch(null),
  items: z.array(jobMatchSourceItemSchema).catch([]),
});

export const jobMatchWeightsSchema = z.object({
  skills: z.number().min(0).max(1),
  experience: z.number().min(0).max(1),
  semantic: z.number().min(0).max(1),
});

export const jobMatchScoreBreakdownSchema = z.object({
  skills: z.number().min(0).max(100),
  experience: z.number().min(0).max(100),
  semantic: z.number().min(0).max(100),
});

export const jobMatchMatchSchema = z.object({
  jdId: z.string(),
  resumeId: z.string().nullable().catch(null),
  category: jobMatchItemCategorySchema,
  jdText: z.string(),
  resumeText: z.string().nullable().catch(null),
  score: z.number(),
  matched: z.boolean(),
  evidence: z.array(z.string()).catch([]),
});

export const jobMatchExplanationSchema = z.object({
  explanation: z.string(),
  strengths: z.array(z.string()).catch([]),
  weaknesses: z.array(z.string()).catch([]),
  suggestions: z.array(z.string()).catch([]),
  whyLow: z.string(),
});

export const jobMatchOutputSchema = z.object({
  matchScore: z.number(),
  weights: jobMatchWeightsSchema,
  subScores: jobMatchScoreBreakdownSchema,
  parsedJob: jobMatchSourceSchema,
  parsedResume: jobMatchSourceSchema,
  matches: z.array(jobMatchMatchSchema),
  gaps: z.object({
    required: z.array(z.string()).catch([]),
    desired: z.array(z.string()).catch([]),
  }),
  explanation: z.string(),
  strengths: z.array(z.string()).catch([]),
  weaknesses: z.array(z.string()).catch([]),
  suggestions: z.array(z.string()).catch([]),
});

export type JobMatchItemCategory = z.infer<typeof jobMatchItemCategorySchema>;
export type JobMatchSourceItem = z.infer<typeof jobMatchSourceItemSchema>;
export type JobMatchSource = z.infer<typeof jobMatchSourceSchema>;
export type JobMatchWeights = z.infer<typeof jobMatchWeightsSchema>;
export type JobMatchScoreBreakdown = z.infer<typeof jobMatchScoreBreakdownSchema>;
export type JobMatchMatch = z.infer<typeof jobMatchMatchSchema>;
export type JobMatchExplanation = z.infer<typeof jobMatchExplanationSchema>;
export type JobMatchOutput = z.infer<typeof jobMatchOutputSchema>;
