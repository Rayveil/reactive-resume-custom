import { ORPCError } from "@orpc/client";
import { type } from "@orpc/server";
import { AISDKError, type UIMessage } from "ai";
import { OllamaError } from "ai-sdk-ollama";
import z, { flattenError, ZodError } from "zod";

import { jobMatchOutputSchema } from "@/schema/job-match";
import { jobResultSchema } from "@/schema/jobs";
import { type ResumeData, resumeDataSchema } from "@/schema/resume/data";
import { tailorOutputSchema } from "@/schema/tailor";

import { protectedProcedureInProduction, publicProcedure } from "../context";
import { aiCredentialsSchema, aiProviderSchema, aiService, fileInputSchema } from "../services/ai";

type AIProvider = z.infer<typeof aiProviderSchema>;

export const aiRouter = {
  testConnection: protectedProcedureInProduction
    .route({
      method: "POST",
      path: "/ai/test-connection",
      operationId: "testAiConnection",
      summary: "Test AI provider connection",
      description:
        "Validates the connection to an AI provider by sending a simple test prompt. Requires the provider type, model name, API key, and an optional base URL. Supported providers: OpenAI, Anthropic, Google Gemini, Ollama, Vercel AI Gateway, Alibaba Qwen (千问), and DeepSeek. Requires authentication.",
      successDescription: "The AI provider connection was successful.",
    })
    .input(
      z.object({
        provider: aiProviderSchema,
        model: z.string(),
        apiKey: z.string(),
        baseURL: z.string(),
      }),
    )
    .errors({
      BAD_GATEWAY: {
        message: "The AI provider returned an error or is unreachable.",
        status: 502,
      },
    })
    .handler(async ({ input }) => {
      try {
        return await aiService.testConnection(input);
      } catch (error) {
        if (error instanceof AISDKError || error instanceof OllamaError) {
          throw new ORPCError("BAD_GATEWAY", { message: error.message });
        }
        throw error;
      }
    }),

  parsePdf: publicProcedure
    .route({
      method: "POST",
      path: "/ai/parse-pdf",
      operationId: "parseResumePdf",
      summary: "Parse a PDF file into resume data",
      description:
        "Extracts structured resume data from a PDF file using the specified AI provider. The file should be sent as a base64-encoded string along with AI provider credentials. Returns a complete ResumeData object. Requires authentication.",
      successDescription: "The PDF was successfully parsed into structured resume data.",
    })
    .input(
      z.object({
        ...aiCredentialsSchema.shape,
        file: fileInputSchema,
      }),
    )
    .errors({
      BAD_GATEWAY: {
        message: "The AI provider returned an error or is unreachable.",
        status: 502,
      },
      BAD_REQUEST: {
        message: "The AI returned an improperly formatted structure.",
        status: 400,
      },
    })
    .handler(async ({ input }): Promise<ResumeData> => {
      try {
        return await aiService.parsePdf(input);
      } catch (error) {
        if (error instanceof AISDKError) {
          throw new ORPCError("BAD_GATEWAY", { message: error.message });
        }
        if (error instanceof ZodError) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Invalid resume data structure",
            cause: flattenError(error),
          });
        }
        throw error;
      }
    }),

  parseDocx: publicProcedure
    .route({
      method: "POST",
      path: "/ai/parse-docx",
      operationId: "parseResumeDocx",
      summary: "Parse a DOCX file into resume data",
      description:
        "Extracts structured resume data from a DOCX or DOC file using the specified AI provider. The file should be sent as a base64-encoded string along with AI provider credentials and the document's media type. Returns a complete ResumeData object. Requires authentication.",
      successDescription: "The DOCX was successfully parsed into structured resume data.",
    })
    .input(
      z.object({
        ...aiCredentialsSchema.shape,
        file: fileInputSchema,
        mediaType: z.enum([
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ]),
      }),
    )
    .errors({
      BAD_GATEWAY: {
        message: "The AI provider returned an error or is unreachable.",
        status: 502,
      },
      BAD_REQUEST: {
        message: "The AI returned an improperly formatted structure.",
        status: 400,
      },
    })
    .handler(async ({ input }) => {
      try {
        return await aiService.parseDocx(input);
      } catch (error) {
        if (error instanceof AISDKError) {
          throw new ORPCError("BAD_GATEWAY", { message: error.message });
        }
        if (error instanceof ZodError) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Invalid resume data structure",
            cause: flattenError(error),
          });
        }
        throw error;
      }
    }),

  chat: protectedProcedureInProduction
    .route({
      method: "POST",
      path: "/ai/chat",
      operationId: "aiChat",
      summary: "Chat with AI to modify resume",
      description:
        "Streams a chat response from the configured AI provider. The LLM can call the patch_resume tool to generate JSON Patch operations that modify the resume. Requires authentication and AI provider credentials.",
    })
    .input(
      type<{
        provider: AIProvider;
        model: string;
        apiKey: string;
        baseURL: string;
        messages: UIMessage[];
        resumeData: ResumeData;
      }>(),
    )
    .handler(async ({ input }) => {
      try {
        return await aiService.chat(input);
      } catch (error) {
        if (error instanceof AISDKError || error instanceof OllamaError) {
          throw new ORPCError("BAD_GATEWAY", { message: error.message });
        }
        throw error;
      }
    }),

  tailorResume: protectedProcedureInProduction
    .route({
      method: "POST",
      path: "/ai/tailor-resume",
      operationId: "tailorResume",
      summary: "Auto-tailor resume for a job posting",
      description:
        "Uses AI to automatically tailor a resume for a specific job posting. Rewrites the summary, adjusts experience descriptions, and curates skills for ATS optimization. Returns structured modifications as a simplified output object. Requires authentication and AI credentials.",
      successDescription: "Structured tailoring output returned successfully.",
    })
    .input(
      z.object({
        ...aiCredentialsSchema.shape,
        resumeData: resumeDataSchema,
        job: jobResultSchema,
      }),
    )
    .output(tailorOutputSchema)
    .errors({
      BAD_GATEWAY: {
        message: "The AI provider returned an error or is unreachable.",
        status: 502,
      },
      BAD_REQUEST: {
        message: "The AI returned an improperly formatted structure.",
        status: 400,
      },
    })
    .handler(async ({ input }) => {
      try {
        return await aiService.tailorResume(input);
      } catch (error) {
        if (error instanceof AISDKError || error instanceof OllamaError) {
          throw new ORPCError("BAD_GATEWAY", { message: error.message });
        }

        if (error instanceof ZodError) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Invalid resume data structure",
            cause: flattenError(error),
          });
        }

        throw error;
      }
    }),

  matchJobCv: publicProcedure
    .route({
      method: "POST",
      path: "/ai/match-job-cv",
      operationId: "matchJobCv",
      summary: "Analyze how well a resume matches a job description",
      description:
        "Parses a job description and resume text with the selected AI provider, computes a weighted match score, and returns an explainable matching report. Requires AI provider credentials.",
      successDescription: "Structured job-cv matching output returned successfully.",
    })
    .input(
      z.object({
        ...aiCredentialsSchema.shape,
        jobDescription: z.string().min(1),
        resumeText: z.string().min(1),
      }),
    )
    .output(jobMatchOutputSchema)
    .errors({
      BAD_GATEWAY: {
        message: "The AI provider returned an error or is unreachable.",
        status: 502,
      },
      BAD_REQUEST: {
        message: "The AI returned an improperly formatted structure.",
        status: 400,
      },
    })
    .handler(async ({ input }) => {
      try {
        return await aiService.matchJobCv(input);
      } catch (error) {
        if (error instanceof AISDKError || error instanceof OllamaError) {
          throw new ORPCError("BAD_GATEWAY", { message: error.message });
        }

        if (error instanceof ZodError) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Invalid job match data structure",
            cause: flattenError(error),
          });
        }

        throw error;
      }
    }),
};
