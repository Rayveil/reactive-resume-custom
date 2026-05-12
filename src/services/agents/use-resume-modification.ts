/**
 * Resume Modification Hook
 * Integration point for the complete modification workflow:
 * improvements → previews → apply → new resume
 */

import { useState, useCallback } from "react";

import type { ResumeData } from "@/schema/resume/data";

import type { ImprovementRecommendation, ImprovementResult } from "./ml-modules/improvement-generator";

import {
  generateModificationPreviews,
  applyModifications,
  getAcceptedModifications,
  generateModificationAuditLog,
  type ModificationPreviewSet,
  type ModificationPreviewItem,
} from "./modification-preview";

interface UseResumeModificationProps {
  resume: ResumeData;
  jobId: string;
}

export interface UseResumeModificationReturn {
  // State
  currentResume: ResumeData | null;
  previewSet: ModificationPreviewSet | null;
  originalResume: ResumeData;
  isApplying: boolean;
  error: string | null;

  // Actions
  generatePreviews: (improvements: ImprovementRecommendation[], jobInput: any) => void;
  updatePreviewStatus: (previewId: string, status: "accepted" | "rejected") => void;
  applyChanges: () => void;
  resetChanges: () => void;
  exportAuditLog: () => string;

  // UI Helpers
  canApply: boolean;
  stats: {
    total: number;
    accepted: number;
    rejected: number;
    pending: number;
  };
}

/**
 * Main hook for resume modification workflow
 */
export function useResumeModification({ resume, jobId }: UseResumeModificationProps): UseResumeModificationReturn {
  const [currentResume, setCurrentResume] = useState<ResumeData | null>(null);
  const [previewSet, setPreviewSet] = useState<ModificationPreviewSet | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate modification previews from recommendations
  const generatePreviews = useCallback(
    (improvements: ImprovementRecommendation[], jobInput: any) => {
      try {
        setError(null);
        const resumeId = resume.metadata?.memoryId || `resume_${Date.now()}`;
        const previews = generateModificationPreviews(improvements, resume, jobInput, resumeId, jobId);
        setPreviewSet(previews);
        setCurrentResume(null); // Reset applied resume
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to generate previews";
        setError(message);
        console.error("Preview generation error:", err);
      }
    },
    [resume, jobId],
  );

  // Update individual preview status
  const updatePreviewStatus = useCallback((previewId: string, status: "accepted" | "rejected") => {
    setPreviewSet((prev) => {
      if (!prev) return null;

      const preview = prev.previews.find((p) => p.id === previewId);
      if (!preview) return prev;

      const updated = { ...prev };
      const oldStatus = preview.status;

      // Update the preview status
      preview.status = status;

      // Update counters
      if (oldStatus !== status) {
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
    });
  }, []);

  // Apply accepted modifications to generate new resume
  const applyChanges = useCallback(async () => {
    if (!previewSet) {
      setError("No preview set available");
      return;
    }

    try {
      setIsApplying(true);
      setError(null);

      // Get only accepted modifications
      const acceptedMods = getAcceptedModifications(previewSet);

      if (acceptedMods.length === 0) {
        setError("No modifications selected. Please accept at least one change.");
        setIsApplying(false);
        return;
      }

      // Apply modifications to original resume
      const modifiedResume = applyModifications(resume, acceptedMods);
      setCurrentResume(modifiedResume);

      // Simulate network delay (remove in production)
      await new Promise((resolve) => setTimeout(resolve, 500));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to apply modifications";
      setError(message);
      console.error("Apply modifications error:", err);
    } finally {
      setIsApplying(false);
    }
  }, [previewSet, resume]);

  // Reset to original resume
  const resetChanges = useCallback(() => {
    setCurrentResume(null);
    setPreviewSet(null);
    setError(null);
  }, []);

  // Export audit log as JSON string
  const exportAuditLog = useCallback(() => {
    if (!previewSet) return "";

    const acceptedMods = getAcceptedModifications(previewSet);
    const auditLog = generateModificationAuditLog(previewSet, acceptedMods);

    return JSON.stringify(auditLog, null, 2);
  }, [previewSet]);

  // Calculate stats
  const stats = {
    total: previewSet?.previews.length ?? 0,
    accepted: previewSet?.acceptedCount ?? 0,
    rejected: previewSet?.rejectedCount ?? 0,
    pending: previewSet ? previewSet.previews.length - previewSet.acceptedCount - previewSet.rejectedCount : 0,
  };

  return {
    currentResume,
    previewSet,
    originalResume: resume,
    isApplying,
    error,
    generatePreviews,
    updatePreviewStatus,
    applyChanges,
    resetChanges,
    exportAuditLog,
    canApply: (previewSet?.acceptedCount ?? 0) > 0,
    stats,
  };
}

/**
 * Complete workflow example for integration
 * 完整工作流示例
 */
export async function runModificationWorkflow(
  resume: ResumeData,
  improvements: ImprovementRecommendation[],
  jobId: string,
  jobInput: any,
): Promise<{
  originalResume: ResumeData;
  modifiedResume: ResumeData;
  auditLog: string;
}> {
  // Step 1: Generate previews
  const previewSet = generateModificationPreviews(
    improvements,
    resume,
    jobInput,
    resume.metadata?.memoryId || "",
    jobId,
  );

  // Step 2: Auto-accept high-priority items (customize logic as needed)
  let updatedPreviewSet = previewSet;
  for (const preview of updatedPreviewSet.previews) {
    if (preview.priority === "critical" || preview.priority === "high") {
      preview.status = "accepted";
      updatedPreviewSet.acceptedCount++;
    }
  }

  // Step 3: Apply accepted modifications
  const acceptedMods = getAcceptedModifications(updatedPreviewSet);
  const modifiedResume = applyModifications(resume, acceptedMods);

  // Step 4: Generate audit log
  const auditLog = generateModificationAuditLog(updatedPreviewSet, acceptedMods);

  return {
    originalResume: resume,
    modifiedResume,
    auditLog: JSON.stringify(auditLog, null, 2),
  };
}
