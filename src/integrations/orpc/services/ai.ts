import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { streamToEventIterator } from "@orpc/server";
import {
  convertToModelMessages,
  createGateway,
  generateText,
  Output,
  stepCountIs,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { createOllama } from "ai-sdk-ollama";
import { jsonrepair } from "jsonrepair";
import { extractRawText as extractDocxRawText } from "mammoth";
import { PDFParse } from "pdf-parse";
import { match } from "ts-pattern";
import z, { flattenError } from "zod";

import type { JobResult } from "@/schema/jobs";
import type { ResumeData } from "@/schema/resume/data";

import chatSystemPromptTemplate from "@/integrations/ai/prompts/chat-system.md?raw";
import docxParserSystemPrompt from "@/integrations/ai/prompts/docx-parser-system.md?raw";
import docxParserUserPrompt from "@/integrations/ai/prompts/docx-parser-user.md?raw";
import jobMatchSystemPromptTemplate from "@/integrations/ai/prompts/job-match-system.md?raw";
import pdfParserSystemPrompt from "@/integrations/ai/prompts/pdf-parser-system.md?raw";
import pdfParserUserPrompt from "@/integrations/ai/prompts/pdf-parser-user.md?raw";
import webpageGeneratorSystemPromptTemplate from "@/integrations/ai/prompts/webpage-generator-system.md?raw";
import tailorSystemPromptTemplate from "@/integrations/ai/prompts/tailor-system.md?raw";
import {
  executePatchResume,
  patchResumeDescription,
  patchResumeInputSchema,
} from "@/integrations/ai/tools/patch-resume";
import {
  jobMatchExplanationSchema,
  jobMatchOutputSchema,
  jobMatchSourceSchema,
  type JobMatchExplanation,
  type JobMatchOutput,
  type JobMatchSource,
} from "@/schema/job-match";
import { defaultResumeData, resumeDataSchema } from "@/schema/resume/data";
import { type TailorOutput, tailorOutputSchema } from "@/schema/tailor";
import { scoreJobMatch } from "@/utils/job-match";
import { isObject } from "@/utils/sanitize";

const aiExtractionTemplate = {
  ...defaultResumeData,
  basics: {
    ...defaultResumeData.basics,
    customFields: [{ id: "", icon: "", text: "", link: "" }],
  },
  sections: {
    ...defaultResumeData.sections,
    profiles: {
      ...defaultResumeData.sections.profiles,
      items: [{ id: "", hidden: false, icon: "", network: "", username: "", website: { url: "", label: "" } }],
    },
    experience: {
      ...defaultResumeData.sections.experience,
      items: [
        {
          id: "",
          hidden: false,
          company: "",
          position: "",
          location: "",
          period: "",
          website: { url: "", label: "" },
          description: "",
        },
      ],
    },
    education: {
      ...defaultResumeData.sections.education,
      items: [
        {
          id: "",
          hidden: false,
          school: "",
          degree: "",
          area: "",
          grade: "",
          location: "",
          period: "",
          website: { url: "", label: "" },
          description: "",
        },
      ],
    },
    projects: {
      ...defaultResumeData.sections.projects,
      items: [{ id: "", hidden: false, name: "", period: "", website: { url: "", label: "" }, description: "" }],
    },
    skills: {
      ...defaultResumeData.sections.skills,
      items: [{ id: "", hidden: false, icon: "", name: "", proficiency: "", level: 0, keywords: [] }],
    },
    languages: {
      ...defaultResumeData.sections.languages,
      items: [{ id: "", hidden: false, language: "", fluency: "", level: 0 }],
    },
    interests: {
      ...defaultResumeData.sections.interests,
      items: [{ id: "", hidden: false, icon: "", name: "", keywords: [] }],
    },
    awards: {
      ...defaultResumeData.sections.awards,
      items: [
        { id: "", hidden: false, title: "", awarder: "", date: "", website: { url: "", label: "" }, description: "" },
      ],
    },
    certifications: {
      ...defaultResumeData.sections.certifications,
      items: [
        { id: "", hidden: false, title: "", issuer: "", date: "", website: { url: "", label: "" }, description: "" },
      ],
    },
    publications: {
      ...defaultResumeData.sections.publications,
      items: [
        { id: "", hidden: false, title: "", publisher: "", date: "", website: { url: "", label: "" }, description: "" },
      ],
    },
    volunteer: {
      ...defaultResumeData.sections.volunteer,
      items: [
        {
          id: "",
          hidden: false,
          organization: "",
          location: "",
          period: "",
          website: { url: "", label: "" },
          description: "",
        },
      ],
    },
    references: {
      ...defaultResumeData.sections.references,
      items: [
        { id: "", hidden: false, name: "", position: "", website: { url: "", label: "" }, phone: "", description: "" },
      ],
    },
  },
};

/**
 * Merges two objects recursively, filling in missing properties in the target object
 * with values from the source object, but does not overwrite existing properties in the target
 * unless the source provides a defined, non-null value.
 *
 * Both target and source must be plain objects (Record<string, unknown>).
 * This function does not mutate either argument; returns a new object.
 *
 * @param target - The object to merge into (existing values take precedence)
 * @param source - The object providing default values
 * @returns The merged object
 */
function mergeDefaults<T extends Record<string, unknown>, S extends Record<string, unknown>>(
  target: T,
  source: S,
): T & S {
  if (!isObject(target) || !isObject(source)) {
    // Use source value if defined (non-null, non-undefined), else fallback to target
    return (source !== undefined && source !== null ? source : target) as T & S;
  }

  const output: Record<string, unknown> = { ...target };

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    if (sourceValue === undefined || sourceValue === null) {
      continue;
    }
    const targetValue = target[key];

    if (isObject(sourceValue) && isObject(targetValue)) {
      output[key] = mergeDefaults(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>);
    } else if (isObject(sourceValue) && (targetValue === undefined || targetValue === null)) {
      // Fill with source object only if target does not have it
      output[key] = sourceValue;
    } else if (!isObject(sourceValue)) {
      output[key] = sourceValue;
    } else if (targetValue === undefined) {
      output[key] = sourceValue;
    }
  }

  return output as T & S;
}

function logAndRethrow(context: string, error: unknown): never {
  if (error instanceof Error) {
    console.error(`${context}:`, error);
    throw error;
  }

  console.error(`${context}:`, error);
  throw new Error(`An unknown error occurred during ${context}.`);
}

function parseAndValidateResumeJson(resultText: string): ResumeData {
  let jsonString = resultText;
  const firstCurly = jsonString.indexOf("{");
  const firstSquare = jsonString.indexOf("[");
  const lastCurly = jsonString.lastIndexOf("}");
  const lastSquare = jsonString.lastIndexOf("]");

  let firstIndex = -1;
  if (firstCurly !== -1 && firstSquare !== -1) {
    firstIndex = Math.min(firstCurly, firstSquare);
  } else {
    firstIndex = Math.max(firstCurly, firstSquare);
  }
  const lastIndex = Math.max(lastCurly, lastSquare);

  if (firstIndex !== -1 && lastIndex !== -1 && lastIndex >= firstIndex) {
    jsonString = jsonString.substring(firstIndex, lastIndex + 1);
  }

  let parsedJson: unknown;

  try {
    const repairedJson = jsonrepair(jsonString);
    parsedJson = JSON.parse(repairedJson);
  } catch (error: unknown) {
    console.error("Unknown error during resume JSON parsing:", error);
    throw new Error("An unknown error occurred while parsing AI output.");
  }

  const mergedData = mergeDefaults(defaultResumeData, isObject(parsedJson) ? parsedJson : {});
  const normalizedData = normalizeResumeDataForSchema(mergedData);

  const strictResult = resumeDataSchema.safeParse({
    ...normalizedData,
    customSections: [],
    picture: defaultResumeData.picture,
    metadata: defaultResumeData.metadata,
  });

  if (strictResult.success) {
    return strictResult.data;
  }

  console.error("Zod validation failed during resume parsing (strict pass):", flattenError(strictResult.error));

  // Fallback pass: keep only safe top-level data and defaults for complex sections.
  const parsedObject = isObject(parsedJson) ? parsedJson : {};
  const fallbackData = {
    ...defaultResumeData,
    basics: mergeDefaults(
      defaultResumeData.basics as Record<string, unknown>,
      isObject(parsedObject.basics) ? (parsedObject.basics as Record<string, unknown>) : {},
    ),
    sections: normalizeResumeDataForSchema(
      mergeDefaults(
        defaultResumeData.sections as Record<string, unknown>,
        isObject(parsedObject.sections) ? (parsedObject.sections as Record<string, unknown>) : {},
      ),
    ),
    customSections: [],
    picture: defaultResumeData.picture,
    metadata: defaultResumeData.metadata,
  };

  const fallbackResult = resumeDataSchema.safeParse(fallbackData);

  if (fallbackResult.success) {
    return fallbackResult.data;
  }

  console.error("Zod validation failed during resume parsing (fallback pass):", flattenError(fallbackResult.error));
  return defaultResumeData;
}

const sectionRequiredFieldMap = {
  profiles: "network",
  experience: "company",
  education: "school",
  projects: "name",
  skills: "name",
  languages: "language",
  interests: "name",
  awards: "title",
  certifications: "title",
  publications: "title",
  volunteer: "organization",
  references: "name",
} as const;

type SectionKey = keyof typeof sectionRequiredFieldMap;

function normalizeResumeDataForSchema(data: Record<string, unknown>) {
  if (!isObject(data)) return data;
  if (!isObject(data.sections)) return data;

  const normalizedSections: Record<string, unknown> = { ...data.sections };

  for (const sectionKey of Object.keys(sectionRequiredFieldMap) as SectionKey[]) {
    const section = normalizedSections[sectionKey];
    if (!isObject(section)) continue;
    if (!Array.isArray(section.items)) continue;

    const itemTemplate = aiExtractionTemplate.sections[sectionKey].items[0] as Record<string, unknown>;
    const requiredField = sectionRequiredFieldMap[sectionKey];

    const normalizedItems = section.items
      .filter((item): item is Record<string, unknown> => isObject(item))
      .map((item) => mergeDefaults(itemTemplate, item))
      .filter((item) => {
        const requiredValue = item[requiredField];
        if (typeof requiredValue !== "string") return false;
        return requiredValue.trim().length > 0;
      })
      .map((item) => {
        const normalizedItem = { ...item };
        if (typeof normalizedItem.id !== "string" || normalizedItem.id.trim().length === 0) {
          normalizedItem.id = crypto.randomUUID();
        }
        if (typeof normalizedItem.hidden !== "boolean") {
          normalizedItem.hidden = false;
        }
        return normalizedItem;
      });

    normalizedSections[sectionKey] = { ...section, items: normalizedItems };
  }

  return { ...data, sections: normalizedSections };
}

export const aiProviderSchema = z.enum([
  "ollama",
  "openai",
  "gemini",
  "anthropic",
  "vercel-ai-gateway",
  "qwen",
  "deepseek",
]);

type AIProvider = z.infer<typeof aiProviderSchema>;

type GetModelInput = {
  provider: AIProvider;
  model: string;
  apiKey: string;
  baseURL: string;
};

const MAX_AI_FILE_BYTES = 10 * 1024 * 1024; // 10MB
const MAX_AI_FILE_BASE64_CHARS = Math.ceil((MAX_AI_FILE_BYTES * 4) / 3) + 4;
const MAX_RESUME_EXTRACTION_TEXT_CHARS = 120_000;

function getModel(input: GetModelInput) {
  const { provider, model, apiKey } = input;
  const baseURL = input.baseURL || undefined;

  return match(provider)
    .with("openai", () => createOpenAI({ apiKey, baseURL }).responses(model))
    .with("ollama", () => createOllama({ apiKey, baseURL }).languageModel(model))
    .with("anthropic", () => createAnthropic({ apiKey, baseURL }).languageModel(model))
    .with("vercel-ai-gateway", () => createGateway({ apiKey, baseURL }).languageModel(model))
    .with("gemini", () => createGoogleGenerativeAI({ apiKey, baseURL }).languageModel(model))
    .with("qwen", () =>
      createOpenAI({
        apiKey,
        baseURL: baseURL || "https://dashscope.aliyuncs.com/compatible-mode/v1",
      }).responses(model),
    )
    .with("deepseek", () =>
      createOpenAI({
        apiKey,
        baseURL: baseURL || "https://api.deepseek.com/v1",
      }).chat(model),
    )
    .exhaustive();
}

export const aiCredentialsSchema = z.object({
  provider: aiProviderSchema,
  model: z.string(),
  apiKey: z.string(),
  baseURL: z.string(),
});

export const fileInputSchema = z.object({
  name: z.string(),
  data: z.string().max(MAX_AI_FILE_BASE64_CHARS, "File is too large. Maximum size is 10MB."), // base64 encoded
});

function getFileBuffer(file: z.infer<typeof fileInputSchema>): Buffer {
  return Buffer.from(file.data, "base64");
}

function normalizeExtractedText(text: string): string {
  const normalizedText = text.split("\u0000").join("").replace(/\r\n/g, "\n").trim();

  if (normalizedText.length <= MAX_RESUME_EXTRACTION_TEXT_CHARS) {
    return normalizedText;
  }

  return normalizedText.slice(0, MAX_RESUME_EXTRACTION_TEXT_CHARS).trimEnd();
}

function buildTextOnlyResumeParsingMessages({
  systemPrompt,
  userPrompt,
  extractedText,
  sourceLabel,
  fileName,
}: {
  systemPrompt: string;
  userPrompt: string;
  extractedText: string;
  sourceLabel: string;
  fileName: string;
}) {
  return [
    {
      role: "system" as const,
      content:
        systemPrompt +
        "\n\nIMPORTANT: You must return ONLY raw valid JSON. Do not return markdown, do not return explanations. Just the JSON object. Use the following JSON as a template and fill in the extracted values. For arrays, you MUST use the exact key names shown in the template (e.g. use 'description' instead of 'summary', 'website' instead of 'url'):\n\n" +
        JSON.stringify(aiExtractionTemplate, null, 2),
    },
    {
      role: "user" as const,
      content:
        `${userPrompt}\n\n` +
        `The following ${sourceLabel} was extracted from the file ${fileName}. Use only this text as the source of truth.\n\n` +
        "```text\n" +
        extractedText +
        "\n```",
    },
  ];
}

async function extractPdfText(file: z.infer<typeof fileInputSchema>): Promise<string> {
  const parser = new PDFParse({ data: getFileBuffer(file) });

  try {
    const result = await parser.getText();
    const extractedText = normalizeExtractedText(result.text ?? "");

    if (extractedText.length === 0) {
      throw new Error("The PDF file did not contain any extractable text.");
    }

    return extractedText;
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(file: z.infer<typeof fileInputSchema>): Promise<string> {
  const result = await extractDocxRawText({ buffer: getFileBuffer(file) });
  const extractedText = normalizeExtractedText(result.value ?? "");

  if (extractedText.length === 0) {
    throw new Error("The DOCX file did not contain any extractable text.");
  }

  return extractedText;
}

function supportsLocalResumeTextExtraction(provider: AIProvider): boolean {
  return provider === "deepseek" || provider === "qwen";
}

type TestConnectionInput = z.infer<typeof aiCredentialsSchema>;

async function testConnection(input: TestConnectionInput): Promise<boolean> {
  const RESPONSE_OK = "1";

  const result = await generateText({
    model: getModel(input),
    messages: [{ role: "user", content: `Respond with only ${RESPONSE_OK}` }],
  });

  return result.text.trim() === RESPONSE_OK;
}

type ParsePdfInput = z.infer<typeof aiCredentialsSchema> & {
  file: z.infer<typeof fileInputSchema>;
};

function buildResumeParsingMessages({
  systemPrompt,
  userPrompt,
  file,
  mediaType,
}: {
  systemPrompt: string;
  userPrompt: string;
  file: z.infer<typeof fileInputSchema>;
  mediaType: string;
}) {
  return [
    {
      role: "system" as const,
      content:
        systemPrompt +
        "\n\nIMPORTANT: You must return ONLY raw valid JSON. Do not return markdown, do not return explanations. Just the JSON object. Use the following JSON as a template and fill in the extracted values. For arrays, you MUST use the exact key names shown in the template (e.g. use 'description' instead of 'summary', 'website' instead of 'url'):\n\n" +
        JSON.stringify(aiExtractionTemplate, null, 2),
    },
    {
      role: "user" as const,
      content: [
        { type: "text" as const, text: userPrompt },
        { type: "file" as const, data: file.data, mediaType, filename: file.name },
      ],
    },
  ];
}

async function parseResumeFromExtractedText({
  model,
  file,
  mediaType,
  systemPrompt,
  userPrompt,
}: {
  model: ReturnType<typeof getModel>;
  file: z.infer<typeof fileInputSchema>;
  mediaType: string;
  systemPrompt: string;
  userPrompt: string;
}): Promise<ResumeData> {
  const extractedText = mediaType === "application/pdf" ? await extractPdfText(file) : await extractDocxText(file);

  const result = await generateText({
    model,
    messages: buildTextOnlyResumeParsingMessages({
      systemPrompt,
      userPrompt,
      extractedText,
      sourceLabel: mediaType === "application/pdf" ? "PDF text" : "DOCX text",
      fileName: file.name,
    }),
  }).catch((error: unknown) => logAndRethrow("Failed to generate the text with the model", error));

  return parseAndValidateResumeJson(result.text);
}

async function parsePdf(input: ParsePdfInput): Promise<ResumeData> {
  if (supportsLocalResumeTextExtraction(input.provider)) {
    return parseResumeFromExtractedText({
      model: getModel(input),
      file: input.file,
      mediaType: "application/pdf",
      systemPrompt: pdfParserSystemPrompt,
      userPrompt: pdfParserUserPrompt,
    });
  }

  const model = getModel(input);

  const result = await generateText({
    model,
    messages: buildResumeParsingMessages({
      systemPrompt: pdfParserSystemPrompt,
      userPrompt: pdfParserUserPrompt,
      file: input.file,
      mediaType: "application/pdf",
    }),
  }).catch((error: unknown) => logAndRethrow("Failed to generate the text with the model", error));

  return parseAndValidateResumeJson(result.text);
}

type ParseDocxInput = z.infer<typeof aiCredentialsSchema> & {
  file: z.infer<typeof fileInputSchema>;
  mediaType: "application/msword" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
};

async function parseDocx(input: ParseDocxInput): Promise<ResumeData> {
  if (supportsLocalResumeTextExtraction(input.provider)) {
    if (input.mediaType === "application/msword") {
      throw new Error(
        "DeepSeek and Qwen direct import currently support DOCX files only. Please convert the DOC file to DOCX first.",
      );
    }

    return parseResumeFromExtractedText({
      model: getModel(input),
      file: input.file,
      mediaType: input.mediaType,
      systemPrompt: docxParserSystemPrompt,
      userPrompt: docxParserUserPrompt,
    });
  }

  const model = getModel(input);

  const result = await generateText({
    model,
    messages: buildResumeParsingMessages({
      systemPrompt: docxParserSystemPrompt,
      userPrompt: docxParserUserPrompt,
      file: input.file,
      mediaType: input.mediaType,
    }),
  }).catch((error: unknown) => logAndRethrow("Failed to generate the text with the model", error));

  return parseAndValidateResumeJson(result.text);
}

function buildChatSystemPrompt(resumeData: ResumeData): string {
  return chatSystemPromptTemplate.replace("{{RESUME_DATA}}", JSON.stringify(resumeData, null, 2));
}

type ChatInput = z.infer<typeof aiCredentialsSchema> & {
  messages: UIMessage[];
  resumeData: ResumeData;
};

async function chat(input: ChatInput) {
  const model = getModel(input);
  const systemPrompt = buildChatSystemPrompt(input.resumeData);

  const result = streamText({
    model,
    system: systemPrompt,
    messages: await convertToModelMessages(input.messages),
    tools: {
      patch_resume: tool({
        description: patchResumeDescription,
        inputSchema: patchResumeInputSchema,
        execute: async ({ operations }) => executePatchResume(input.resumeData, operations),
      }),
    },
    stopWhen: stepCountIs(3),
  });

  return streamToEventIterator(result.toUIMessageStream());
}

function formatJobHighlights(highlights: Record<string, string[]> | null): string {
  if (!highlights) return "None provided.";
  return Object.entries(highlights)
    .map(([key, values]) => `${key}:\n${values.map((v) => `- ${v}`).join("\n")}`)
    .join("\n\n");
}

function buildTailorSystemPrompt(resumeData: ResumeData, job: JobResult): string {
  return tailorSystemPromptTemplate
    .replace("{{RESUME_DATA}}", JSON.stringify(resumeData, null, 2))
    .replace("{{JOB_TITLE}}", job.job_title)
    .replace("{{COMPANY}}", job.employer_name)
    .replace("{{JOB_DESCRIPTION}}", job.job_description || "No description provided.")
    .replace("{{JOB_HIGHLIGHTS}}", formatJobHighlights(job.job_highlights))
    .replace("{{JOB_SKILLS}}", (job.job_required_skills || []).join(", ") || "None specified.");
}

type BuildWebpageGeneratorPromptInput = {
  name: string;
  targetRole: string;
  summary: string;
  aboutCsv: string;
  projectCsv: string;
  additionalContent?: string;
};

function buildWebpageGeneratorSystemPrompt(input: BuildWebpageGeneratorPromptInput): string {
  return webpageGeneratorSystemPromptTemplate
    .replace("{{NAME}}", input.name)
    .replace("{{TARGET_ROLE}}", input.targetRole)
    .replace("{{SUMMARY}}", input.summary)
    .replace("{{ABOUT_CSV}}", input.aboutCsv)
    .replace("{{PROJECT_CSV}}", input.projectCsv)
    .replace("{{ADDITIONAL_CONTENT}}", input.additionalContent ?? "");
}

type TailorResumeInput = z.infer<typeof aiCredentialsSchema> & {
  resumeData: ResumeData;
  job: JobResult;
};

async function tailorResume(input: TailorResumeInput): Promise<TailorOutput> {
  const model = getModel(input);
  const systemPrompt = buildTailorSystemPrompt(input.resumeData, input.job);

  const result = await generateText({
    model,
    output: Output.object({ schema: tailorOutputSchema }),
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Please tailor this resume for the ${input.job.job_title} position at ${input.job.employer_name}. Optimize for ATS compatibility and relevance.`,
      },
    ],
  });

  if (result.output == null) {
    throw new Error("AI returned no structured tailoring output.");
  }

  return tailorOutputSchema.parse(result.output);
}

function buildJobMatchExtractionPrompt(mode: "JOB_DESCRIPTION" | "RESUME"): string {
  return jobMatchSystemPromptTemplate.replace("{{MODE}}", mode);
}

async function extractJobMatchSource(
  model: ReturnType<typeof getModel>,
  mode: "JOB_DESCRIPTION" | "RESUME",
  text: string,
): Promise<JobMatchSource> {
  const result = await generateText({
    model,
    output: Output.object({ schema: jobMatchSourceSchema }),
    messages: [
      { role: "system", content: buildJobMatchExtractionPrompt(mode) },
      { role: "user", content: text },
    ],
  });

  if (result.output == null) {
    throw new Error(`AI returned no structured ${mode.toLowerCase()} output.`);
  }

  return jobMatchSourceSchema.parse(result.output);
}

function buildJobMatchExplanationPrompt(input: {
  job: JobMatchSource;
  resume: JobMatchSource;
  analysis: ReturnType<typeof scoreJobMatch>;
}): string {
  const missingSummary = input.analysis.gaps.required.length > 0 ? input.analysis.gaps.required.join("; ") : "None";
  const desiredSummary = input.analysis.gaps.desired.length > 0 ? input.analysis.gaps.desired.join("; ") : "None";

  return [
    "You are writing an explainable AI report for a job-cv matching system.",
    "Return only JSON.",
    "Schema: { explanation: string, strengths: string[], weaknesses: string[], suggestions: string[], whyLow: string }",
    "",
    `Match score: ${input.analysis.matchScore}%`,
    `Weights: ${JSON.stringify(input.analysis.weights)}`,
    `Sub-scores: ${JSON.stringify(input.analysis.subScores)}`,
    `Required gaps: ${missingSummary}`,
    `Desired gaps: ${desiredSummary}`,
    `Top strengths: ${input.analysis.strengths.join("; ") || "None"}`,
    `Top weaknesses: ${input.analysis.weaknesses.join("; ") || "None"}`,
    `JD summary: ${input.job.summary ?? "N/A"}`,
    `Resume summary: ${input.resume.summary ?? "N/A"}`,
    "",
    "Write concise, factual, and actionable feedback. Focus on why the score is high or low, what is missing, and how the resume can be improved.",
  ].join("\n");
}

async function explainJobMatch(input: {
  model: ReturnType<typeof getModel>;
  job: JobMatchSource;
  resume: JobMatchSource;
  analysis: ReturnType<typeof scoreJobMatch>;
}): Promise<JobMatchExplanation> {
  const result = await generateText({
    model: input.model,
    output: Output.object({ schema: jobMatchExplanationSchema }),
    messages: [
      { role: "system", content: buildJobMatchExplanationPrompt(input) },
      {
        role: "user",
        content: JSON.stringify(
          {
            parsedJob: input.job,
            parsedResume: input.resume,
            analysis: input.analysis,
          },
          null,
          2,
        ),
      },
    ],
  });

  if (result.output == null) {
    throw new Error("AI returned no job match explanation.");
  }

  return jobMatchExplanationSchema.parse(result.output);
}

type MatchJobCvInput = z.infer<typeof aiCredentialsSchema> & {
  jobDescription: string;
  resumeText: string;
};

async function matchJobCv(input: MatchJobCvInput): Promise<JobMatchOutput> {
  const model = getModel(input);
  const [parsedJob, parsedResume] = await Promise.all([
    extractJobMatchSource(model, "JOB_DESCRIPTION", input.jobDescription),
    extractJobMatchSource(model, "RESUME", input.resumeText),
  ]);

  const analysis = scoreJobMatch(parsedJob, parsedResume);
  const explanation = await explainJobMatch({ model, job: parsedJob, resume: parsedResume, analysis });

  return jobMatchOutputSchema.parse({
    ...analysis,
    parsedJob,
    parsedResume,
    explanation: explanation.explanation,
    strengths: explanation.strengths.length > 0 ? explanation.strengths : analysis.strengths,
    weaknesses: explanation.weaknesses.length > 0 ? explanation.weaknesses : analysis.weaknesses,
    suggestions: explanation.suggestions,
  });
}

export const aiService = {
  chat,
  buildWebpageGeneratorSystemPrompt,
  matchJobCv,
  parseDocx,
  parsePdf,
  tailorResume,
  testConnection,
};
