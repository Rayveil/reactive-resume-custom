// Types for webpage generation feature

export type WebpageTemplate = "modern" | "professional" | "creative";
export type PromptLanguage = "en" | "zh-CN";

export interface WebpageGeneratorConfig {
  template: WebpageTemplate;
  title?: string;
  description?: string;
  targetRole?: string;
  additionalContent?: string;
  includePhoto?: boolean;
  colorScheme?: "blue" | "purple" | "green" | "slate";
}

export interface GeneratedWebpage {
  html: string;
  css: string;
  template: WebpageTemplate;
  generatedAt: string;
}

export interface WebpageExportOptions {
  filename?: string;
  format: "html" | "zip"; // zip includes images
}
