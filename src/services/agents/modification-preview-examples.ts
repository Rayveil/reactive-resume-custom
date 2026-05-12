/**
 * Resume Modification Integration Example
 * Shows how to use the modification preview system in a complete workflow
 * 展示在完整工作流中如何使用修改预览系统
 */

import type { ResumeData } from "@/schema/resume/data";

import type { ImprovementRecommendation } from "./ml-modules/improvement-generator";

import {
  generateModificationPreviews,
  applyModifications,
  getAcceptedModifications,
  generateModificationAuditLog,
  type ModificationPreviewSet,
} from "./modification-preview";

/**
 * 示例 1: 完整的修改流程
 * Example 1: Complete modification workflow from improvements to modified resume
 */
export async function exampleCompleteWorkflow() {
  // 假设这些数据来自 ML 分析阶段
  const sampleResume: ResumeData = {
    picture: {
      hidden: false,
      url: "",
      size: 80,
      rotation: 0,
      aspectRatio: 1,
      borderRadius: 0,
      borderColor: "rgba(0, 0, 0, 0.5)",
      borderWidth: 0,
      shadowColor: "rgba(0, 0, 0, 0.5)",
      shadowWidth: 0,
    },
    basics: {
      name: "John Doe",
      headline: "Software Engineer",
      email: "john@example.com",
      phone: "+1234567890",
      location: "San Francisco, CA",
      website: { url: "https://johndoe.com", label: "Website" },
      customFields: [],
    },
    summary: {
      title: "Professional Summary",
      columns: 1,
      hidden: false,
      content: "Experienced software engineer with 5 years of backend development.",
    },
    sections: {
      profiles: {
        title: "Profiles",
        columns: 1,
        hidden: false,
        items: [],
      },
      experience: {
        title: "Experience",
        columns: 1,
        hidden: false,
        items: [
          {
            id: "exp-1",
            hidden: false,
            company: "Tech Company",
            position: "Senior Backend Engineer",
            location: "San Francisco",
            period: "2020 - Present",
            website: { url: "https://tech.com", label: "tech.com" },
            description: "Built APIs and managed databases.",
            roles: [],
          },
        ],
      },
      education: {
        title: "Education",
        columns: 1,
        hidden: false,
        items: [],
      },
      projects: {
        title: "Projects",
        columns: 1,
        hidden: false,
        items: [],
      },
      skills: {
        title: "Skills",
        columns: 1,
        hidden: false,
        items: [
          {
            id: "skill-1",
            hidden: false,
            icon: "",
            name: "Python",
            proficiency: "Advanced",
            level: 4,
            keywords: [],
          },
          {
            id: "skill-2",
            hidden: false,
            icon: "",
            name: "JavaScript",
            proficiency: "Advanced",
            level: 4,
            keywords: [],
          },
        ],
      },
      languages: {
        title: "Languages",
        columns: 1,
        hidden: false,
        items: [],
      },
      interests: {
        title: "Interests",
        columns: 1,
        hidden: false,
        items: [],
      },
      awards: {
        title: "Awards",
        columns: 1,
        hidden: false,
        items: [],
      },
      certifications: {
        title: "Certifications",
        columns: 1,
        hidden: false,
        items: [],
      },
      publications: {
        title: "Publications",
        columns: 1,
        hidden: false,
        items: [],
      },
      volunteer: {
        title: "Volunteer",
        columns: 1,
        hidden: false,
        items: [],
      },
      references: {
        title: "References",
        columns: 1,
        hidden: false,
        items: [],
      },
    },
    customSections: [],
    metadata: {
      template: "onyx",
      layout: {
        sidebarWidth: 35,
        pages: [
          {
            gapX: 14,
            gapY: 14,
            marginX: 14,
            marginY: 14,
            fullWidth: false,
            main: ["experience", "education"],
            sidebar: ["skills"],
          },
        ],
      },
      css: { enabled: false, value: "" },
      page: {
        gapX: 14,
        gapY: 14,
        marginX: 14,
        marginY: 14,
        format: "a4",
        locale: "en-US",
        hideIcons: false,
      },
      design: {
        level: { icon: "", type: "circle" },
        colors: {
          primary: "rgba(66, 100, 205, 1)",
          text: "rgba(0, 0, 0, 1)",
          background: "rgba(255, 255, 255, 1)",
        },
      },
      typography: {
        body: {
          fontFamily: "Inter",
          fontWeights: ["400"],
          fontSize: 11,
          lineHeight: 1.5,
        },
        heading: {
          fontFamily: "Inter",
          fontWeights: ["700"],
          fontSize: 14,
          lineHeight: 1.5,
        },
      },
      notes: "",
      extractedBy: "ml-analysis",
      extractedAt: new Date().toISOString(),
      source: "json",
      memoryId: "resume-123",
    },
  };

  const sampleImprovements: ImprovementRecommendation[] = [
    {
      category: "skill_gap",
      priority: "high",
      suggestion: "Add Kubernetes to your skills",
      reasoning: "Job description requires Kubernetes experience",
      implementation: "Add 'Kubernetes' to the skills section with 'Intermediate' proficiency",
      impact: "+8% match score",
      examples: ["Kubernetes orchestration and deployment", "Container networking and service management"],
    },
    {
      category: "semantic_alignment",
      priority: "high",
      suggestion: "Emphasize system design capabilities",
      reasoning: "Position description values system design skills",
      implementation: "Update experience description to highlight: 'Designed scalable microservices architecture'",
      impact: "+10% match score",
    },
    {
      category: "achievement_emphasis",
      priority: "medium",
      suggestion: "Add quantifiable achievements",
      reasoning: "Recruiters prefer metrics and measurable outcomes",
      implementation: "Enhance: 'Improved API response time by 40%' and 'Reduced database queries by 50%'",
      impact: "+5% match score",
    },
    {
      category: "formatting",
      priority: "low",
      suggestion: "Update contact information format",
      reasoning: "Modern ATS parsers prefer consistent formatting",
      implementation: "Add LinkedIn profile and GitHub links to contact section",
      impact: "+2% ATS score",
    },
  ];

  const jobInput = {
    title: "Senior Full Stack Engineer",
    company: "Google",
    description: "Looking for experienced full stack engineer...",
    requiredSkills: ["Python", "JavaScript", "Kubernetes", "AWS"],
  };

  // Step 1: Generate modification previews
  const previewSet = generateModificationPreviews(
    sampleImprovements,
    sampleResume,
    jobInput,
    sampleResume.metadata?.memoryId || "resume-123",
    "job-456",
  );

  console.log("📋 Generated Previews:", previewSet);
  console.log(`✅ Total modifications: ${previewSet.previews.length}`);
  console.log(`  - Skill gaps: ${previewSet.statistics.skillGapItems}`);
  console.log(`  - Alignment: ${previewSet.statistics.semanticAlignmentItems}`);
  console.log(`  - Achievements: ${previewSet.statistics.achievementEmphasisItems}`);

  // Step 2: User would review and accept/reject in UI
  // For this example, we'll accept high-priority items
  let updatedPreviewSet = previewSet;
  const toAccept = previewSet.previews.filter((p) => p.priority === "high" || p.priority === "critical");

  for (const preview of toAccept) {
    preview.status = "accepted";
    updatedPreviewSet.acceptedCount++;
  }

  console.log("\n🎯 After user selection:");
  console.log(`  - Accepted: ${updatedPreviewSet.acceptedCount}`);
  console.log(`  - Rejected: ${updatedPreviewSet.rejectedCount}`);
  console.log(
    `  - Pending: ${updatedPreviewSet.previews.length - updatedPreviewSet.acceptedCount - updatedPreviewSet.rejectedCount}`,
  );

  // Step 3: Apply accepted modifications
  const acceptedMods = getAcceptedModifications(updatedPreviewSet);
  const modifiedResume = applyModifications(sampleResume, acceptedMods);

  console.log("\n✨ Modified Resume Generated");
  console.log(
    `  - Skills count: ${sampleResume.sections.skills.items.length} → ${modifiedResume.sections.skills.items.length}`,
  );
  console.log(
    `  - New skills: ${modifiedResume.sections.skills.items
      .slice(sampleResume.sections.skills.items.length)
      .map((s: any) => s.name)
      .join(", ")}`,
  );

  // Step 4: Generate audit log
  const auditLog = generateModificationAuditLog(updatedPreviewSet, acceptedMods);
  console.log("\n📊 Audit Log:", auditLog);

  return {
    originalResume: sampleResume,
    modifiedResume,
    previewSet: updatedPreviewSet,
    auditLog,
  };
}

/**
 * 示例 2: 分类筛选和批量操作
 * Example 2: Category filtering and batch operations
 */
export function exampleCategoryFiltering(previewSet: ModificationPreviewSet) {
  // 只获取技能相关的修改
  const skillMods = previewSet.previews.filter((p) => p.category === "skill_gap");
  console.log(`\n🔧 Skill Gap Modifications (${skillMods.length}):`);
  skillMods.forEach((m) => console.log(`  - ${m.title} (${m.priority})`));

  // 按优先级分组
  const byPriority = {
    critical: previewSet.previews.filter((p) => p.priority === "critical"),
    high: previewSet.previews.filter((p) => p.priority === "high"),
    medium: previewSet.previews.filter((p) => p.priority === "medium"),
    low: previewSet.previews.filter((p) => p.priority === "low"),
  };

  console.log(`\n📊 By Priority:`);
  console.log(`  - Critical: ${byPriority.critical.length}`);
  console.log(`  - High: ${byPriority.high.length}`);
  console.log(`  - Medium: ${byPriority.medium.length}`);
  console.log(`  - Low: ${byPriority.low.length}`);

  return { skillMods, byPriority };
}

/**
 * 示例 3: 差异展示（用于 UI）
 * Example 3: Diff display for UI
 */
export function exampleDiffDisplay(preview: any) {
  const original = preview.modification.originalText || "(empty)";
  const updated = preview.modification.newText;

  return {
    before: original,
    after: updated,
    format: {
      beforeHTML: `<s>${escapeHtml(original)}</s>`,
      afterHTML: `<mark style="background: #c6f6d5; color: #22543d;">${escapeHtml(updated)}</mark>`,
    },
  };
}

/**
 * 示例 4: React Hook 集成
 * Example 4: Using with React Hook
 */
export async function exampleReactIntegration() {
  const code = `
// In your component:
import { useResumeModification } from '@/services/agents/use-resume-modification';
import { ResumeModificationPreview } from '@/components/resume-modification-preview';

export function JobApplicationFlow() {
  const { previewSet, generatePreviews, updatePreviewStatus, applyChanges, canApply } = 
    useResumeModification({ resume: myResume, jobId: 'job-456' });

  // After ML analysis generates improvements:
  const handleApplyImprovements = (improvements: ImprovementRecommendation[]) => {
    generatePreviews(improvements, jobData);
  };

  // Render the preview UI:
  return (
    <>
      {previewSet && (
        <ResumeModificationPreview
          previewSet={previewSet}
          onUpdate={(updated) => setPreviewSet(updated)}
          onApply={applyChanges}
        />
      )}
    </>
  );
}
`;

  console.log(code);
}

// Helper function
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Run examples when imported
if (typeof window !== "undefined" && (window as any).__DEBUG__) {
  console.log("🚀 Resume Modification Examples available");
  (window as any).examples = {
    completeWorkflow: exampleCompleteWorkflow,
    categoryFiltering: exampleCategoryFiltering,
    diffDisplay: exampleDiffDisplay,
  };
}
