/\*\*

- Resume Modification Preview System - Integration Guide
- 简历修改预览系统 - 集成指南
-
- 快速开始 | Quick Start
  \*/

// ============================================
// 核心概念 | Core Concepts
// ============================================

/\*\*

- 修改预览系统包含 4 个核心模块：
-
- 1.  modification-preview.ts
- - 将 ImprovementRecommendation[] 转换为修改预览项
- - 管理接受/拒绝状态
- - 应用修改到 ResumeData
-
- 2.  resume-modification-preview.tsx
- - React 组件展示所有修改
- - 删除线原文 + 绿色高亮新内容
- - 接受/拒绝按钮
- - 按优先级和类别筛选
-
- 3.  use-resume-modification.ts
- - React Hook 集中管理状态
- - 简化与组件的集成
-
- 4.  modification-preview-examples.ts
- - 完整工作流示例
- - 测试和调试参考
    \*/

// ============================================
// 工作流 | Workflow
// ============================================

/\*\*

- 完整流程：
-
- Stage 1: ML Analysis (hr-agent-with-ml.ts)
- ↓
- 输出: ImprovementRecommendation[]
- {
-     category: 'skill_gap' | 'semantic_alignment' | 'achievement_emphasis' | 'formatting'
-     priority: 'critical' | 'high' | 'medium' | 'low'
-     suggestion: string
-     reasoning: string
-     implementation: string
-     impact: string
- }
-
- Stage 2: Generate Preview (modification-preview.ts)
- ↓
- generateModificationPreviews(
-     recommendations: ImprovementRecommendation[],
-     resume: ResumeData,
-     jobInput: any,
-     resumeId: string,
-     jobId: string
- ) → ModificationPreviewSet
-
- Stage 3: User Review (resume-modification-preview.tsx)
- ↓
- 用户逐条查看修改：
- - 原文（删除线）
- - 新内容（绿色高亮）
- - 原因、实施方法、预期效果
- - 接受 / 拒绝按钮
- - 按类别筛选
-
- Stage 4: Apply Changes (modification-preview.ts)
- ↓
- applyModifications(
-     originalResume: ResumeData,
-     acceptedModifications: ModificationPreviewItem[]
- ) → ResumeData (新的、已修改的简历)
  \*/

// ============================================
// 基础用法 | Basic Usage
// ============================================

/\*
// 方式 1: 使用 Hook（推荐用于 React 组件）
import { useResumeModification } from '@/services/agents/use-resume-modification';
import { ResumeModificationPreview } from '@/components/resume-modification-preview';

export function JobApplicationPage() {
const resume = /_ ... _/;
const jobId = 'job-456';

const {
previewSet,
generatePreviews,
applyChanges,
canApply,
stats,
} = useResumeModification({ resume, jobId });

// 在 ML 分析完成后调用：
const handleMLAnalysisComplete = (improvements: ImprovementRecommendation[]) => {
generatePreviews(improvements, jobData);
};

return (
<div>
{previewSet && (
<ResumeModificationPreview
previewSet={previewSet}
onUpdate={(updated) => setPreviewSet(updated)}
onApply={applyChanges}
/>
)}
{canApply && <button onClick={applyChanges}>Apply {stats.accepted} Changes</button>}
</div>
);
}
\*/

// 方式 2: 直接使用函数（用于后端或非 React）
import {
generateModificationPreviews,
applyModifications,
getAcceptedModifications,
updateModificationStatus,
acceptAllModifications,
rejectAllModifications,
} from '@/services/agents/modification-preview';

/\*
async function processModifications(
improvements: ImprovementRecommendation[],
resume: ResumeData,
jobInput: any,
jobId: string,
) {
// Step 1: 生成预览
let previewSet = generateModificationPreviews(
improvements,
resume,
jobInput,
resume.metadata?.memoryId || 'resume-id',
jobId
);

// Step 2: 用户接受/拒绝（这里自动接受 high/critical）
for (const preview of previewSet.previews) {
if (preview.priority === 'high' || preview.priority === 'critical') {
previewSet = updateModificationStatus(previewSet, preview.id, 'accepted');
}
}

// Step 3: 获取已接受的修改
const acceptedMods = getAcceptedModifications(previewSet);

// Step 4: 应用修改
const modifiedResume = applyModifications(resume, acceptedMods);

return {
originalResume: resume,
modifiedResume,
changesSummary: {
total: previewSet.previews.length,
accepted: acceptedMods.length,
rejected: previewSet.previews.length - acceptedMods.length,
}
};
}
\*/

// ============================================
// 修改类型 | Modification Types
// ============================================

/\*\*

- skill_gap
- 描述: 添加缺失的技能
- 转换: resume.sections.skills.items → 添加新的 SkillItem
- 例: { name: 'Kubernetes', proficiency: 'Intermediate', level: 3 }
  \*/

/\*\*

- semantic_alignment
- 描述: 优化工作描述文本以更好地匹配 JD
- 转换: resume.sections.experience.items[x].description → 更新文本
- 例: 从 "Built APIs" → "Architected scalable microservices APIs"
  \*/

/\*\*

- achievement_emphasis
- 描述: 强化成就展示，添加量化指标
- 转换: resume.sections.experience.items[x].description → 强调文本
- 例: 添加 "Improved response time by 40%"
  \*/

/\*\*

- formatting
- 描述: 格式化和排版优化
- 转换: 各种格式优化（较少直接改变内容）
- 例: 更新联系方式格式、优化排版
  \*/

// ============================================
// 修改预览项结构 | ModificationPreviewItem Structure
// ============================================

/_
interface ModificationPreviewItem {
id: string; // 唯一 ID
recommendationId: string; // 对应的建议 ID
category: 'skill_gap' | 'semantic_alignment' | 'achievement_emphasis' | 'formatting' | 'general';
priority: 'critical' | 'high' | 'medium' | 'low';
title: string; // 修改标题
reasoning: string; // 为什么要做这个修改
implementation: string; // 如何实施
impact: string; // 预期效果/影响
status: 'pending' | 'accepted' | 'rejected'; // 用户状态
examples?: string[]; // 示例
modification: {
targetType: 'skill' | 'experience' | 'summary' | 'headline' | 'general';
targetId?: string; // 针对特定项目的修改
originalText?: string; // 原文
newText: string; // 新内容
diffType: 'add' | 'update' | 'remove' | 'emphasize';
};
}
_/

// ============================================
// UI 组件 Props | Component Props
// ============================================

/\*
interface ResumeModificationPreviewProps {
previewSet: ModificationPreviewSet; // 修改预览集合
onUpdate: (updated: ModificationPreviewSet) => void; // 状态变化回调
onApply: () => void; // 应用修改回调
isLoading?: boolean; // 加载状态
}

// 使用示例:
<ResumeModificationPreview
previewSet={previewSet}
onUpdate={(updated) => {
// 处理状态变化
setPreviewSet(updated);
}}
onApply={() => {
// 应用修改
const newResume = applyModifications(resume, getAcceptedModifications(previewSet));
// 保存或上传新简历
}}
isLoading={isSaving}
/>
\*/

// ============================================
// Hook 返回值 | Hook Return Value
// ============================================

/\*
interface UseResumeModificationReturn {
// 状态
currentResume: ResumeData | null; // 应用修改后的新简历
previewSet: ModificationPreviewSet | null; // 当前预览集合
originalResume: ResumeData; // 原始简历
isApplying: boolean; // 应用中...
error: string | null; // 错误信息

// 方法
generatePreviews: (improvements: ImprovementRecommendation[], jobInput: any) => void;
updatePreviewStatus: (previewId: string, status: 'accepted' | 'rejected') => void;
applyChanges: () => void;
resetChanges: () => void;
exportAuditLog: () => string;

// 辅助
canApply: boolean; // 是否可以应用（已接受 > 0）
stats: {
total: number;
accepted: number;
rejected: number;
pending: number;
};
}
\*/

// ============================================
// 集成到 Orchestrator
// ============================================

/\*
// 在 orchestrator.ts 中：

export async function runModificationStep(
session: ApplicationSession,
userProfile: UserProfile,
) {
const mlAnalysisResult = session.results.mlAnalysis;
const improvements = mlAnalysisResult?.improvements || [];

// Step 1: 生成预览
const previewSet = generateModificationPreviews(
improvements,
userProfile,
session.results.parsedJD,
userProfile.id,
session.jobId
);

// Step 2: 存储预览供 UI 使用
session.results.modificationPreviews = previewSet;

// Step 3: 用户在 UI 中审查和选择
// ... UI 操作发生在这里 ...

// Step 4: 后续应用（基于用户选择）
if (session.userAcceptedModifications?.length > 0) {
const modifiedResume = applyModifications(
userProfile,
session.userAcceptedModifications
);
session.results.optimizedResume = modifiedResume;
}

return session;
}
\*/

// ============================================
// 常见场景 | Common Scenarios
// ============================================

/\*\*

- 场景 1: 只接受高优先级修改
  \*/
  function acceptHighPriority(previewSet) {
  let updated = previewSet;
  for (const preview of updated.previews) {
  if (preview.priority === 'critical' || preview.priority === 'high') {
  updated = updateModificationStatus(updated, preview.id, 'accepted');
  }
  }
  return updated;
  }

/\*\*

- 场景 2: 只接受特定类别的修改
  \*/
  function acceptCategory(previewSet, category) {
  let updated = previewSet;
  for (const preview of updated.previews) {
  if (preview.category === category) {
  updated = updateModificationStatus(updated, preview.id, 'accepted');
  }
  }
  return updated;
  }

/\*\*

- 场景 3: 导出修改报告
  \*/
  function exportModificationReport(previewSet, acceptedMods) {
  return {
  timestamp: new Date().toISOString(),
  totalRecommendations: previewSet.previews.length,
  acceptedCount: acceptedMods.length,
  changes: acceptedMods.map(m => ({
  category: m.category,
  priority: m.priority,
  title: m.title,
  originalText: m.modification.originalText,
  newText: m.modification.newText,
  })),
  };
  }

// ============================================
// 数据持久化 | Data Persistence
// ============================================

/\*
// 保存修改历史
export interface ModificationHistory {
id: string;
resumeId: string;
jobId: string;
previewSet: ModificationPreviewSet;
appliedAt?: Date;
createdResume?: ResumeData;
auditLog: string;
}

// 在数据库中存储 ModificationHistory
async function saveModificationHistory(
history: ModificationHistory,
db: Database
) {
await db.insert(ModificationHistory).values({
id: history.id,
resumeId: history.resumeId,
jobId: history.jobId,
previewSet: JSON.stringify(history.previewSet),
appliedAt: history.appliedAt,
createdResume: history.createdResume ? JSON.stringify(history.createdResume) : null,
auditLog: history.auditLog,
});
}
\*/

// ============================================
// 故障排除 | Troubleshooting
// ============================================

/\*\*

- 问题: "No modifications to apply"
- 原因: 没有被接受的修改
- 解决: 检查 previewSet.acceptedCount，确保至少接受了一个修改
  \*/

/\*\*

- 问题: "Modified resume is missing fields"
- 原因: applyModifications 在转换时出错
- 解决: 检查 modification.targetId 是否正确，确保目标字段存在
  \*/

/\*\*

- 问题: "UI 不显示修改"
- 原因: previewSet 为 null
- 解决: 确保调用了 generatePreviews 并获得了有效的结果
  \*/

export { };
