import Handlebars from "handlebars";

import webpageGeneratorSystemPrompt from "@/integrations/ai/prompts/webpage-generator-system.md?raw";
import webpageGeneratorSystemPromptZhCN from "@/integrations/ai/prompts/webpage-generator-system.zh-CN.md?raw";

import type { PromptLanguage, WebpageTemplate, WebpageGeneratorConfig, GeneratedWebpage } from "../-types/webpage";

import { moderneTemplate, professionalTemplate, creativeTemplate } from "./templates";

// Profile data types
interface ProfileData {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  website?: string;
  summary?: string;
  skills?: Array<{ name: string; keywords?: string[] }>;
  experience?: Array<{
    jobTitle?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
    summary?: string;
  }>;
  education?: Array<{
    studyType?: string;
    fieldOfStudy?: string;
    institution?: string;
    endDate?: string;
  }>;
  projects?: Array<{
    name?: string;
    description?: string;
    website?: string;
  }>;
  languages?: Array<{
    name?: string;
    fluency?: string;
  }>;
  certifications?: Array<{
    name?: string;
    issuer?: string;
  }>;
}

const profileSourceStorageKey = "dashboard.profile.source";

export class WebpageGenerator {
  private config: WebpageGeneratorConfig;
  private profileData?: ProfileData;

  constructor(config: Partial<WebpageGeneratorConfig> = {}, profileData?: ProfileData) {
    this.config = {
      template: "modern",
      title: "My Resume",
      description: "Professional Resume",
      targetRole: "",
      additionalContent: "",
      includePhoto: true,
      colorScheme: "blue",
      ...config,
    };
    this.profileData = profileData;
  }

  /**
   * Collect profile data from localStorage or use provided data
   */
  private collectData(): ProfileData {
    if (this.profileData) {
      return this.profileData;
    }

    try {
      // Only attempt to access localStorage in browser environment
      if (typeof window !== "undefined" && window.localStorage) {
        const profileJson = localStorage.getItem(profileSourceStorageKey);
        if (profileJson) {
          return JSON.parse(profileJson);
        }
      }
    } catch (error) {
      console.error("Failed to collect profile data:", error);
    }

    return this.getDefaultData();
  }

  private getDefaultData(): ProfileData {
    return {
      fullName: "Your Name",
      email: "your.email@example.com",
      phone: "",
      location: "",
      website: "",
      summary: "Professional Summary",
      skills: [],
      experience: [],
      education: [],
      projects: [],
      languages: [],
      certifications: [],
    };
  }

  private escapeCsv(value: unknown): string {
    const normalized =
      typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? value
        : value == null
          ? ""
          : JSON.stringify(value);

    const raw = String(normalized).replaceAll("\r\n", " ").replaceAll("\n", " ").trim();
    const escaped = raw.replaceAll('"', '""');
    return `"${escaped}"`;
  }

  private toCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
    const header = headers.join(",");
    if (rows.length === 0) {
      return `${header}\n${headers.map(() => this.escapeCsv("")).join(",")}`;
    }

    const lines = rows.map((row) => headers.map((key) => this.escapeCsv(row[key])).join(","));
    return [header, ...lines].join("\n");
  }

  private buildAboutCsv(data: ProfileData): string {
    const educationRows = (data.education ?? []).map((item, index) => ({
      id: index + 1,
      degree: item.studyType ?? "",
      fieldOfStudy: item.fieldOfStudy ?? "",
      institution: item.institution ?? "",
      endDate: item.endDate ?? "",
      details: "",
    }));

    const activityRows = (data.experience ?? []).map((item, index) => ({
      id: index + 1,
      role: item.jobTitle ?? "",
      organization: item.company ?? "",
      period: [item.startDate ?? "", item.endDate ?? ""].filter(Boolean).join(" - "),
      description: item.summary ?? "",
      tags: "",
    }));

    const educationCsv = this.toCsv(
      ["id", "degree", "fieldOfStudy", "institution", "endDate", "details"],
      educationRows,
    );
    const activitiesCsv = this.toCsv(["id", "role", "organization", "period", "description", "tags"], activityRows);

    return ["[education]", educationCsv, "", "[activities]", activitiesCsv].join("\n");
  }

  private buildProjectCsv(data: ProfileData): string {
    const projectRows = (data.projects ?? []).map((item, index) => ({
      id: index + 1,
      slug: (item.name ?? `project-${index + 1}`)
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/^-|-$/g, ""),
      title: item.name ?? "",
      summary: item.description ?? "",
      website: item.website ?? "",
      floatTitle: item.name ?? "",
      content: item.description ?? "",
    }));

    return this.toCsv(["id", "slug", "title", "summary", "website", "floatTitle", "content"], projectRows);
  }

  private deriveTargetRole(data: ProfileData): string {
    if (this.config.targetRole?.trim()) {
      return this.config.targetRole.trim();
    }

    const firstSkillCategory = data.skills?.[0]?.name?.trim();
    if (firstSkillCategory) {
      return `${firstSkillCategory} Professional`;
    }

    return "";
  }

  public getInitialPrompt(language: PromptLanguage = "en"): string {
    const data = this.collectData();
    const sourceTemplate = language === "zh-CN" ? webpageGeneratorSystemPromptZhCN : webpageGeneratorSystemPrompt;
    const template = Handlebars.compile(sourceTemplate, { noEscape: true });

    return template({
      NAME: data.fullName ?? "",
      TARGET_ROLE: this.deriveTargetRole(data),
      SUMMARY: data.summary ?? "",
      ABOUT_CSV: this.buildAboutCsv(data),
      PROJECT_CSV: this.buildProjectCsv(data),
      ADDITIONAL_CONTENT: this.config.additionalContent ?? "",
    });
  }

  /**
   * Get template by name
   */
  private getTemplate(template: WebpageTemplate): string {
    switch (template) {
      case "modern":
        return moderneTemplate();
      case "professional":
        return professionalTemplate();
      case "creative":
        return creativeTemplate();
      default:
        return moderneTemplate();
    }
  }

  /**
   * Generate base CSS with Tailwind utilities
   */
  private getBaseCSS(): string {
    return `
      <link href="https://cdn.tailwindcss.com" rel="stylesheet">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        
        * {
          font-family: 'Inter', sans-serif;
        }

        /* Color schemes */
        .color-scheme-blue { --primary: #3b82f6; --secondary: #1e40af; }
        .color-scheme-purple { --primary: #8b5cf6; --secondary: #6d28d9; }
        .color-scheme-green { --primary: #10b981; --secondary: #047857; }
        .color-scheme-slate { --primary: #64748b; --secondary: #334155; }

        /* Smooth animations */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .fade-in {
          animation: fadeIn 0.6s ease-out forwards;
        }

        /* Print styles */
        @media print {
          body { margin: 0; padding: 0; }
          .no-print { display: none; }
        }

        /* Responsive typography */
        h1 { font-size: 2.25rem; font-weight: 700; letter-spacing: -0.025em; }
        h2 { font-size: 1.5rem; font-weight: 600; margin-top: 2rem; margin-bottom: 1rem; color: #111827; }
        h3 { font-size: 1.125rem; font-weight: 600; color: #1f2937; }
        
        a { color: #2563eb; text-decoration: none; }
        a:hover { text-decoration: underline; }
        
        .section-divider {
          margin-top: 2rem;
          margin-bottom: 2rem;
          border-top: 1px solid #e5e7eb;
        }
      </style>
    `;
  }

  /**
   * Main generation method
   */
  public generate(): GeneratedWebpage {
    const data = this.collectData();
    const templateHtml = this.getTemplate(this.config.template);
    const css = this.getBaseCSS();

    // Register Handlebars helpers
    this.registerHelpers();

    // Compile template
    const template = Handlebars.compile(templateHtml);
    const compiledHtml = template({
      ...data,
      config: this.config,
      colorClass: `color-scheme-${this.config.colorScheme}`,
      generatedAt: new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    });

    return {
      html: compiledHtml,
      css: css,
      template: this.config.template,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Register custom Handlebars helpers
   */
  private registerHelpers() {
    Handlebars.registerHelper("formatDate", (date: string) => {
      if (!date) return "";
      const d = new Date(date);
      return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      });
    });

    Handlebars.registerHelper("if_eq", function (this: any, a: any, b: any, opts: any) {
      return a === b ? opts.fn(this) : opts.inverse(this);
    });

    Handlebars.registerHelper("if_gt", function (this: any, a: any, b: any, opts: any) {
      return a > b ? opts.fn(this) : opts.inverse(this);
    });

    Handlebars.registerHelper("join", (array: string[], separator: string = ", ") => {
      return array ? array.join(separator) : "";
    });

    Handlebars.registerHelper("truncate", (str: string, length: number = 100) => {
      return str && str.length > length ? str.substring(0, length) + "..." : str;
    });
  }

  /**
   * Export as standalone HTML file
   */
  public exportHTML(): Blob {
    const webpage = this.generate();
    const fullHTML = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${this.config.title || "Resume"}</title>
        <meta name="description" content="${this.config.description || "Professional Resume"}">
        ${webpage.css}
      </head>
      <body style="color-scheme: light;">
        ${webpage.html}
      </body>
      </html>
    `;

    return new Blob([fullHTML], { type: "text/html" });
  }

  /**
   * Download the webpage (client-side only)
   */
  public download(filename?: string) {
    if (typeof window === "undefined") {
      throw new Error("Download is only available in browser environment");
    }

    const blob = this.exportHTML();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `resume-${this.config.template}-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Get preview HTML for iframe
   */
  public getPreviewHTML(): string {
    const webpage = this.generate();
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Preview</title>
        ${webpage.css}
      </head>
      <body style="color-scheme: light; background-color: #f9fafb;">
        <div style="max-width: 56rem; margin: 1rem auto; background-color: white; border-radius: 0.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          ${webpage.html}
        </div>
      </body>
      </html>
    `;
  }
}
