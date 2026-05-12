/**
 * Resume Modification Preview Component
 * Displays modification previews with strikethrough original, green highlighted new content,
 * and accept/reject buttons for each modification.
 */

"use client";

import { CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import type { ModificationPreviewItem, ModificationPreviewSet } from "@/services/agents/modification-preview";

import {
  updateModificationStatus,
  acceptAllModifications,
  rejectAllModifications,
} from "@/services/agents/modification-preview";

interface ResumeModificationPreviewProps {
  previewSet: ModificationPreviewSet;
  onUpdate: (updated: ModificationPreviewSet) => void;
  onApply: () => void;
  isLoading?: boolean;
}

/**
 * 主组件
 */
export function ResumeModificationPreview({
  previewSet,
  onUpdate,
  onApply,
  isLoading = false,
}: ResumeModificationPreviewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const filteredPreviews = filterCategory
    ? previewSet.previews.filter((p) => p.category === filterCategory)
    : previewSet.previews;

  const acceptedCount = previewSet.previews.filter((p) => p.status === "accepted").length;
  const rejectedCount = previewSet.previews.filter((p) => p.status === "rejected").length;

  const handleToggleStatus = (previewId: string, newStatus: "accepted" | "rejected") => {
    const updated = updateModificationStatus(previewSet, previewId, newStatus);
    onUpdate(updated);
  };

  const handleAcceptAll = () => {
    const updated = acceptAllModifications(previewSet);
    onUpdate(updated);
  };

  const handleRejectAll = () => {
    const updated = rejectAllModifications(previewSet);
    onUpdate(updated);
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4">
      {/* Header */}
      <div className="rounded-lg border border-blue-200 bg-linear-to-r from-blue-50 to-indigo-50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="mb-2 text-2xl font-bold text-gray-900">Simple Modification Preview</h2>
            <p className="text-gray-600">Review and approve personalized modifications for your resume</p>
          </div>
          <div className="text-right">
            <div className="mb-2 text-sm text-gray-500">Progress</div>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{acceptedCount}</div>
                <div className="text-xs text-gray-600">Accepted</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
                <div className="text-xs text-gray-600">Rejected</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-400">
                  {previewSet.previews.length - acceptedCount - rejectedCount}
                </div>
                <div className="text-xs text-gray-600">Pending</div>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-5 gap-2 text-xs">
          <div className="rounded border border-blue-100 bg-white p-2">
            <div className="font-semibold">{previewSet.statistics.skillGapItems}</div>
            <div className="text-gray-600">Skill Gaps</div>
          </div>
          <div className="rounded border border-blue-100 bg-white p-2">
            <div className="font-semibold">{previewSet.statistics.semanticAlignmentItems}</div>
            <div className="text-gray-600">Alignment</div>
          </div>
          <div className="rounded border border-blue-100 bg-white p-2">
            <div className="font-semibold">{previewSet.statistics.achievementEmphasisItems}</div>
            <div className="text-gray-600">Achievements</div>
          </div>
          <div className="rounded border border-blue-100 bg-white p-2">
            <div className="font-semibold">{previewSet.statistics.formattingItems}</div>
            <div className="text-gray-600">Formatting</div>
          </div>
          <div className="rounded border border-blue-100 bg-white p-2">
            <div className="font-semibold">{previewSet.statistics.generalItems}</div>
            <div className="text-gray-600">General</div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterCategory(null)}
          className={`rounded-full px-3 py-1 text-sm transition ${
            filterCategory === null ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          All ({previewSet.previews.length})
        </button>
        {Object.entries(previewSet.statistics).map(([key, count]) => (
          <button
            key={key}
            onClick={() => setFilterCategory(key.replace("Items", ""))}
            className={`rounded-full px-3 py-1 text-sm capitalize transition ${
              filterCategory === key.replace("Items", "")
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {key.replace(/([A-Z])/g, " $1").trim()} ({count})
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleAcceptAll}
          disabled={isLoading}
          className="rounded-lg bg-green-600 px-4 py-2 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Accept All
        </button>
        <button
          onClick={handleRejectAll}
          disabled={isLoading}
          className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Reject All
        </button>
        <button
          onClick={onApply}
          disabled={isLoading || acceptedCount === 0}
          className="ml-auto rounded-lg bg-indigo-600 px-4 py-2 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Applying..." : `Apply ${acceptedCount} Changes`}
        </button>
      </div>

      {/* Modifications List */}
      <div className="space-y-3">
        {filteredPreviews.length === 0 ? (
          <div className="rounded-lg bg-gray-50 py-8 text-center">
            <p className="text-gray-500">No modifications to display</p>
          </div>
        ) : (
          filteredPreviews.map((preview) => (
            <ModificationPreviewCard
              key={preview.id}
              preview={preview}
              isExpanded={expandedId === preview.id}
              onToggleExpand={() => setExpandedId(expandedId === preview.id ? null : preview.id)}
              onStatusChange={(status) => handleToggleStatus(preview.id, status)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * 单个修改预览卡片
 */
interface ModificationPreviewCardProps {
  preview: ModificationPreviewItem;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStatusChange: (status: "accepted" | "rejected") => void;
}

function ModificationPreviewCard({
  preview,
  isExpanded,
  onToggleExpand,
  onStatusChange,
}: ModificationPreviewCardProps) {
  const priorityColors = {
    critical: "bg-red-100 text-red-700 border-red-300",
    high: "bg-orange-100 text-orange-700 border-orange-300",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
    low: "bg-blue-100 text-blue-700 border-blue-300",
  };

  const categoryLabels = {
    skill_gap: "Skill Gap",
    semantic_alignment: "Alignment",
    achievement_emphasis: "Achievement",
    formatting: "Formatting",
    general: "General",
  };

  const statusColors = {
    pending: "border-gray-300 bg-white",
    accepted: "border-green-300 bg-green-50",
    rejected: "border-red-300 bg-red-50",
  };

  return (
    <div className={`rounded-lg border-2 transition ${statusColors[preview.status]}`}>
      {/* Card Header - Always Visible */}
      <div
        className="flex cursor-pointer items-start justify-between p-4 transition hover:bg-gray-50"
        onClick={onToggleExpand}
      >
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-3">
            <span className={`rounded border px-2 py-1 text-xs font-medium ${priorityColors[preview.priority]}`}>
              {preview.priority.toUpperCase()}
            </span>
            <span className="rounded border border-indigo-300 bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700">
              {categoryLabels[preview.category]}
            </span>
            {preview.status === "accepted" && <CheckCircle size={18} className="text-green-600" />}
            {preview.status === "rejected" && <XCircle size={18} className="text-red-600" />}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">{preview.title}</h3>
          <p className="mt-1 text-sm text-gray-600">{preview.reasoning}</p>
        </div>
        <button className="rounded p-2 transition hover:bg-gray-200">
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      </div>

      {/* Card Body - Expandable */}
      {isExpanded && (
        <div className="space-y-4 border-t bg-gray-50 p-4">
          {/* Before/After Diff */}
          <div>
            <h4 className="mb-2 font-semibold text-gray-900">Modification Preview</h4>
            <div className="space-y-2">
              {preview.modification.originalText && (
                <div className="rounded border border-gray-200 bg-white p-3">
                  <div className="mb-1 text-xs font-medium text-gray-500">Original:</div>
                  <div className="text-sm text-gray-700 line-through">{preview.modification.originalText}</div>
                </div>
              )}
              <div className="rounded border-2 border-green-300 bg-green-50 p-3">
                <div className="mb-1 text-xs font-medium text-green-700">New Content:</div>
                <div className="text-sm font-medium text-green-900">{preview.modification.newText}</div>
              </div>
            </div>
          </div>

          {/* Implementation & Impact */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded border border-gray-200 bg-white p-3">
              <div className="mb-1 text-xs font-medium text-gray-600">How to Apply:</div>
              <div className="text-sm text-gray-700">{preview.implementation}</div>
            </div>
            <div className="rounded border border-gray-200 bg-white p-3">
              <div className="mb-1 text-xs font-medium text-gray-600">Expected Impact:</div>
              <div className="text-sm text-gray-700">{preview.impact}</div>
            </div>
          </div>

          {/* Examples */}
          {preview.examples && preview.examples.length > 0 && (
            <div className="rounded border border-gray-200 bg-white p-3">
              <div className="mb-2 text-xs font-medium text-gray-600">Examples:</div>
              <ul className="space-y-1">
                {preview.examples.map((example, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="shrink-0 text-indigo-600">•</span>
                    <span>{example}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 border-t pt-2">
            <button
              onClick={() => onStatusChange("accepted")}
              className={`flex-1 rounded-lg px-4 py-2 font-medium transition ${
                preview.status === "accepted"
                  ? "bg-green-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-green-100"
              }`}
            >
              <CheckCircle className="mr-2 inline" size={16} />
              Accept
            </button>
            <button
              onClick={() => onStatusChange("rejected")}
              className={`flex-1 rounded-lg px-4 py-2 font-medium transition ${
                preview.status === "rejected" ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700 hover:bg-red-100"
              }`}
            >
              <XCircle className="mr-2 inline" size={16} />
              Reject
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ResumeModificationPreview;
