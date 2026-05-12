/**
 * Resume Modification Preview System
 * Converts improvement recommendations into structured modification previews
 * with acceptance/rejection states and apply logic.
 */

import { v4 as uuid } from "uuid";

import type { ResumeData, SectionItem } from "@/schema/resume/data";

import type { ImprovementRecommendation } from "./ml-modules/improvement-generator";

/**
 * 单个修改预览项
 */
export interface ModificationPreviewItem {
  id: string;
  recommendationId: string;
  category: ImprovementRecommendation["category"];
  priority: ImprovementRecommendation["priority"];
  title: string;
  reasoning: string;
  implementation: string;
  impact: string;
  // 修改的具体内容
  modification: {
    targetType: "skill" | "experience" | "summary" | "headline" | "general";
    targetId?: string; // 针对特定项目的修改
    originalText?: string;
    newText: string;
    diffType: "add" | "update" | "remove" | "emphasize";
  };
  // 状态
  status: "pending" | "accepted" | "rejected";
  examples?: string[];
}

/**
 * 修改预览集合
 */
export interface ModificationPreviewSet {
  id: string;
  resumeId: string;
  jobId: string;
  createdAt: Date;
  previews: ModificationPreviewItem[];
  acceptedCount: number;
  rejectedCount: number;
  statistics: {
    skillGapItems: number;
    semanticAlignmentItems: number;
    achievementEmphasisItems: number;
    formattingItems: number;
    generalItems: number;
  };
}

/**
 * 从 ImprovementRecommendation 数组生成修改预览项
 */
export function generateModificationPreviews(
  recommendations: ImprovementRecommendation[],
  resume: ResumeData,
  _jobInput: any,
  resumeId: string,
  jobId: string,
): ModificationPreviewSet {
  const previews: ModificationPreviewItem[] = [];
  const statistics = {
    skillGapItems: 0,
    semanticAlignmentItems: 0,
    achievementEmphasisItems: 0,
    formattingItems: 0,
    generalItems: 0,
  };

  for (const rec of recommendations) {
    let modification: ModificationPreviewItem["modification"];
    let targetId: string | undefined;

    switch (rec.category) {
      case "skill_gap": {
        // 提取建议中提到的技能名称
        const skillMatch =
          rec.implementation.match(/添加.*?["']([^"']+)["']/) || rec.implementation.match(/\b([A-Z][A-Za-z]+)\b/);
        const skillName = skillMatch ? skillMatch[1] : "New Skill";

        modification = {
          targetType: "skill",
          newText: skillName,
          diffType: "add",
          originalText: undefined,
        };
        statistics.skillGapItems++;
        break;
      }

      case "semantic_alignment": {
        // 找到最相关的工作经历来优化
        const experienceItem = resume.sections?.experience?.items?.[0] as SectionItem;
        if (experienceItem) {
          targetId = (experienceItem as any).id;
          const newDescription = generateEnhancedDescription((experienceItem as any).description, rec.implementation);
          modification = {
            targetType: "experience",
            targetId,
            originalText: (experienceItem as any).description,
            newText: newDescription,
            diffType: "update",
          };
        } else {
          modification = {
            targetType: "general",
            newText: rec.implementation,
            diffType: "update",
            originalText: "No experience found",
          };
        }
        statistics.semanticAlignmentItems++;
        break;
      }

      case "achievement_emphasis": {
        // 强化成就展示 - 优化体验描述
        const experienceItem = resume.sections?.experience?.items?.[0] as SectionItem;
        if (experienceItem) {
          targetId = (experienceItem as any).id;
          const enhancedDescription = emphasizeAchievements((experienceItem as any).description, rec.implementation);
          modification = {
            targetType: "experience",
            targetId,
            originalText: (experienceItem as any).description,
            newText: enhancedDescription,
            diffType: "emphasize",
          };
        } else {
          modification = {
            targetType: "general",
            newText: rec.implementation,
            diffType: "emphasize",
            originalText: "No achievements to enhance",
          };
        }
        statistics.achievementEmphasisItems++;
        break;
      }

      case "formatting": {
        // 格式化建议
        modification = {
          targetType: "general",
          newText: rec.implementation,
          diffType: "update",
          originalText: `Apply formatting: ${rec.reasoning}`,
        };
        statistics.formattingItems++;
        break;
      }

      case "general":
      default: {
        modification = {
          targetType: "general",
          newText: rec.implementation,
          diffType: "update",
          originalText: rec.reasoning,
        };
        statistics.generalItems++;
        break;
      }
    }

    const preview: ModificationPreviewItem = {
      id: uuid(),
      recommendationId: uuid(),
      category: rec.category,
      priority: rec.priority,
      title: rec.suggestion,
      reasoning: rec.reasoning,
      implementation: rec.implementation,
      impact: rec.impact,
      modification,
      status: "pending",
      examples: rec.examples,
    };

    previews.push(preview);
  }

  return {
    id: uuid(),
    resumeId,
    jobId,
    createdAt: new Date(),
    previews,
    acceptedCount: 0,
    rejectedCount: 0,
    statistics,
  };
}

/**
 * 更新修改项的状态
 */
export function updateModificationStatus(
  previewSet: ModificationPreviewSet,
  previewId: string,
  status: "accepted" | "rejected",
): ModificationPreviewSet {
  const updated = { ...previewSet };
  const preview = updated.previews.find((p) => p.id === previewId);

  if (preview) {
    const oldStatus = preview.status;
    preview.status = status;

    // 更新计数
    if (oldStatus === "pending") {
      if (status === "accepted") updated.acceptedCount++;
      if (status === "rejected") updated.rejectedCount++;
    } else if (oldStatus === "accepted" && status === "rejected") {
      updated.acceptedCount--;
      updated.rejectedCount++;
    } else if (oldStatus === "rejected" && status === "accepted") {
      updated.rejectedCount--;
      updated.acceptedCount++;
    }
  }

  return updated;
}

/**
 * 接受所有修改
 */
export function acceptAllModifications(previewSet: ModificationPreviewSet): ModificationPreviewSet {
  const updated = { ...previewSet };
  updated.previews = updated.previews.map((p) => (p.status === "pending" ? { ...p, status: "accepted" as const } : p));
  updated.acceptedCount = updated.previews.filter((p) => p.status === "accepted").length;
  updated.rejectedCount = updated.previews.filter((p) => p.status === "rejected").length;
  return updated;
}

/**
 * 拒绝所有修改
 */
export function rejectAllModifications(previewSet: ModificationPreviewSet): ModificationPreviewSet {
  const updated = { ...previewSet };
  updated.previews = updated.previews.map((p) => (p.status === "pending" ? { ...p, status: "rejected" as const } : p));
  updated.acceptedCount = updated.previews.filter((p) => p.status === "accepted").length;
  updated.rejectedCount = updated.previews.filter((p) => p.status === "rejected").length;
  return updated;
}

/**
 * 只获取已接受的修改
 */
export function getAcceptedModifications(previewSet: ModificationPreviewSet): ModificationPreviewItem[] {
  return previewSet.previews.filter((p) => p.status === "accepted");
}

/**
 * 应用已接受的修改到 ResumeData，生成新的简历
 */
export function applyModifications(
  originalResume: ResumeData,
  acceptedModifications: ModificationPreviewItem[],
): ResumeData {
  let modifiedResume = JSON.parse(JSON.stringify(originalResume)) as ResumeData;

  for (const mod of acceptedModifications) {
    const modification = mod.modification;

    switch (modification.targetType) {
      case "skill": {
        // 添加新技能
        if (modification.diffType === "add" && modifiedResume.sections?.skills) {
          const skillExists = modifiedResume.sections.skills.items.some((s: any) => s.name === modification.newText);
          if (!skillExists) {
            const newSkill = {
              id: uuid(),
              hidden: false,
              icon: "",
              name: modification.newText,
              proficiency: "Intermediate",
              level: 3,
              keywords: [],
            } as SectionItem;
            modifiedResume.sections.skills.items.push(newSkill as any);
          }
        }
        break;
      }

      case "experience": {
        // 更新或强调工作经历描述
        if (modification.targetId && modifiedResume.sections?.experience) {
          const expItem = modifiedResume.sections.experience.items.find(
            (e: any) => e.id === modification.targetId,
          ) as any;
          if (expItem) {
            if (modification.diffType === "update" || modification.diffType === "emphasize") {
              expItem.description = modification.newText;
            }
          }
        }
        break;
      }

      case "headline": {
        // 更新标题
        if (modifiedResume.basics) {
          modifiedResume.basics.headline = modification.newText;
        }
        break;
      }

      case "summary": {
        // 更新摘要
        if (modifiedResume.summary) {
          modifiedResume.summary.content = modification.newText;
        }
        break;
      }

      case "general":
      default: {
        // 一般性修改 - 可以记录到元数据
        if (modifiedResume.metadata) {
          modifiedResume.metadata.notes = `${modifiedResume.metadata.notes}\n[Modification] ${modification.newText}`;
        }
        break;
      }
    }
  }

  // 更新修改时间戳
  if (modifiedResume.metadata) {
    modifiedResume.metadata.extractedAt = new Date().toISOString();
  }

  return modifiedResume;
}

/**
 * 生成应用修改的审计日志
 */
export function generateModificationAuditLog(
  previewSet: ModificationPreviewSet,
  acceptedModifications: ModificationPreviewItem[],
): {
  timestamp: string;
  totalRecommendations: number;
  accepted: number;
  rejected: number;
  changes: Array<{
    title: string;
    category: string;
    priority: string;
  }>;
} {
  return {
    timestamp: new Date().toISOString(),
    totalRecommendations: previewSet.previews.length,
    accepted: acceptedModifications.length,
    rejected: previewSet.previews.length - acceptedModifications.length,
    changes: acceptedModifications.map((m) => ({
      title: m.title,
      category: m.category,
      priority: m.priority,
    })),
  };
}

// ===== 辅助函数 =====

/**
 * 基于实现建议生成增强的描述
 */
function generateEnhancedDescription(originalDescription: string, implementation: string): string {
  // 提取实现中的关键改进点
  const improvements = implementation.split(/[,;]/);
  if (improvements.length > 0) {
    // 简单的增强逻辑 - 可以根据需要扩展
    return `${originalDescription}\n\nKey highlights: ${improvements[0].trim()}`;
  }
  return originalDescription;
}

/**
 * 强化成就展示
 */
function emphasizeAchievements(originalDescription: string, implementation: string): string {
  // 在描述前添加强化语言
  const emphasisKeywords = ["Led", "Achieved", "Delivered", "Increased", "Improved", "Optimized"];
  const hasEmphasis = emphasisKeywords.some((kw) => originalDescription.includes(kw));

  if (!hasEmphasis) {
    // 提取数字和成就相关的词汇，强调展示
    const achievementPattern = /(?:增加|提升|优化|完成|交付).*?(?:\d+%?|[a-zA-Z]+)/g;
    if (achievementPattern.test(implementation)) {
      return `<strong>Key Achievement:</strong> ${implementation}\n\n${originalDescription}`;
    }
  }

  return originalDescription;
}
