/**
 * 简历-岗位匹配与修改建议的集成示例
 * 目标是把每份简历与一个岗位做匹配分析，再把结果交给未来的简历修改助手
 */

import { EnhancedHRAgent } from "@/services/agents/hr-agent-with-ml";

// ===== 示例 1：快速简历匹配分析 - 批量评估用户的所有简历与目标岗位 =====

export async function quickResumeMatching() {
  const agent = new EnhancedHRAgent();

  const jobInput = {
    title: "Senior Backend Developer",
    description: "We are looking for an experienced backend developer with 5+ years of experience...",
    requiredSkills: ["Python", "Docker", "Kubernetes", "AWS", "PostgreSQL", "Redis"],
    requiredEducation: "bachelor",
    location: "Remote",
  };

  // 评估该用户的所有简历与同一个岗位的匹配情况，返回按匹配度从高到低排好序的结果
  const results = await agent.evaluateMultipleResumes(jobInput, undefined, false);

  // 按匹配分优先级分流：快速锁定最值得优化的简历
  const excellent = results.filter((r) => r.mlAnalysis.mlScore >= 75);
  const good = results.filter((r) => r.mlAnalysis.mlScore >= 60 && r.mlAnalysis.mlScore < 75);
  const needsWork = results.filter((r) => r.mlAnalysis.mlScore < 60);

  console.log(`\n【批量匹配分析结果】`);
  console.log(`高优先级优化对象: ${excellent.length}份 (匹配分 >= 75)`);
  console.log(`中优先级优化对象: ${good.length}份 (匹配分 60-74)`);
  console.log(`建议先不优先处理: ${needsWork.length}份 (匹配分 < 60)`);

  // 显示最值得优化的 5 份简历
  console.log(`\n【Top 5 最值得优化的简历】`);
  for (let i = 0; i < Math.min(5, results.length); i++) {
    const r = results[i];
    console.log(`${i + 1}. ${r.resumeBasics.name} - 匹配分 ${r.mlAnalysis.mlScore}/100 (${r.mlAnalysis.mlScoreTier})`);
    console.log(`   缺失技能: ${r.mlAnalysis.skillGap.missingSkills.slice(0, 2).join(", ") || "无"}`);
  }

  return { excellent, good, needsWork };
}

// ===== 示例 2：生成给简历修改助手的详细分析报告 =====

export async function prepareDetailedReportForRewriteAssistant(memoryId: string, jobInput: any) {
  const agent = new EnhancedHRAgent();
  const result = await agent.evaluateResume(jobInput, memoryId, true); // 启用 LLM 生成高质量建议

  const report = `
╔══════════════════════════════════════════════════════════════╗
║         简历-岗位匹配分析报告 (给简历修改助手的输入)        ║
╚══════════════════════════════════════════════════════════════╝

【基本信息】
名称: ${result.resumeBasics.name}
目标职位: ${result.jdTitle}
邮箱: ${result.resumeBasics.email}
地点: ${result.resumeBasics.location}

【匹配评分】
┌────────────────────────────────────┐
│ 虚拟评估分: ${String(result.comprehensiveScore).padEnd(5)} / 100  │
│ ML 匹配分:  ${String(result.mlAnalysis.mlScore).padEnd(5)} / 100  │
│ 优化等级:   ${result.mlAnalysis.mlScoreTier}         │
└────────────────────────────────────┘

【6 维虚拟评估维度】
${result.dimensionScores
  .map((d) => `• ${d.dimension.padEnd(12)} ${"█".repeat(Math.round(d.score / 10))}\ ${d.score}/100 - ${d.explanation}`)
  .join("\n")}

【技能匹配分析】
✓ 已有技能: ${result.mlAnalysis.skillGap.matchedSkills.join(", ") || "无"}
✗ 缺失技能: ${result.mlAnalysis.skillGap.missingSkills.join(", ") || "无"}
⊙ 额外优势: ${result.mlAnalysis.skillGap.bonusSkills.join(", ") || "无"}
覆盖率: ${result.mlAnalysis.skillGap.skillCoverage}%

【优化建议 (重点关注前 3 条)】
${result.combinedRecommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}

【AI 详细分析建议】
${result.mlAnalysis.improvements.recommendations
  .slice(0, 3)
  .map(
    (rec, i) => `
${i + 1}. ${rec.suggestion}
   • 优先级: ${rec.priority}
   • 实现方式: ${rec.implementation.split("\\n").slice(0, 2).join(" ")}
   • 预期影响: ${rec.impact}`,
  )
  .join("\n")}

【综合评价】
${result.overallAssessment}

【修改方向】
${result.llmEvaluation}

【生成信息】
生成时间: ${result.timestamp.toLocaleString()}
是否使用 AI: ${result.mlAnalysis.usedLLM ? "是" : "否 (使用规则生成)"}
`;

  return report;
}

// ===== 示例 3：批量处理该用户的所有简历 - 排序并优先级分级 =====

export async function batchMatchingWithProgress(jobInput: any, memoryIds: string[]) {
  const agent = new EnhancedHRAgent();
  const results: any[] = [];

  console.log(`\n开始批量评估 ${memoryIds.length} 份简历与目标岗位的匹配情况...\n`);

  for (let i = 0; i < memoryIds.length; i++) {
    const memoryId = memoryIds[i];
    try {
      const result = await agent.evaluateResume(jobInput, memoryId, false);
      results.push(result);

      // 显示进度条
      const progress = Math.round(((i + 1) / memoryIds.length) * 100);
      console.log(`[${"█".repeat(Math.round(progress / 5))}${"░".repeat(20 - Math.round(progress / 5))}] ${progress}%`);
    } catch (e) {
      console.error(`✗ 评估简历 ${memoryId} 失败:`, (e as Error).message);
    }
  }

  // 按匹配分从高到低排序
  results.sort((a, b) => b.mlAnalysis.mlScore - a.mlAnalysis.mlScore);

  // 统计各等级的简历数量
  const stats = {
    total: results.length,
    excellent: results.filter((r) => r.mlAnalysis.mlScore >= 90).length,
    good: results.filter((r) => r.mlAnalysis.mlScore >= 75).length,
    qualified: results.filter((r) => r.mlAnalysis.mlScore >= 60).length,
    needsWork: results.filter((r) => r.mlAnalysis.mlScore < 60).length,
    avgScore: results.reduce((s, r) => s + r.mlAnalysis.mlScore, 0) / results.length,
  };

  console.log(`\n【批量匹配分析完成】`);
  console.log(`总计分析: ${stats.total} 份`);
  console.log(`优秀 (90+): ${stats.excellent} 份 - 可直接投递`);
  console.log(`良好 (75-89): ${stats.good} 份 - 小优化后可投`);
  console.log(`及格 (60-74): ${stats.qualified} 份 - 需要优化`);
  console.log(`不足 (<60): ${stats.needsWork} 份 - 建议重点改进`);
  console.log(`平均匹配分: ${stats.avgScore.toFixed(1)}/100`);

  return { results, stats };
}

// ===== 示例 4：技能缺口分析 - 找出用户简历中最普遍的缺失技能 =====

export async function identifyCommonSkillGaps(memoryIds: string[], jobInput: any) {
  const agent = new EnhancedHRAgent();
  const allResults = await agent.evaluateMultipleResumes(jobInput, memoryIds, false);

  // 统计所有简历的缺失技能频率
  const skillGapFrequency = new Map<string, number>();
  const skillCoverageStats: number[] = [];

  for (const result of allResults) {
    for (const skill of result.mlAnalysis.skillGap.missingSkills) {
      skillGapFrequency.set(skill, (skillGapFrequency.get(skill) || 0) + 1);
    }
    skillCoverageStats.push(result.mlAnalysis.skillGap.skillCoverage);
  }

  // 按频率从高到低排序
  const sortedGaps = [...skillGapFrequency.entries()].sort((a, b) => b[1] - a[1]);

  console.log(`\n【技能缺口分析报告】`);
  console.log(`已分析: ${allResults.length} 份简历\n`);

  console.log("【最常见的缺失技能】(这些技能最值得学习和补充):");
  sortedGaps.slice(0, 10).forEach(([skill, count]) => {
    const percentage = Math.round((count / allResults.length) * 100);
    console.log(
      `${skill.padEnd(15)} ${"█".repeat(Math.round(percentage / 5))}${"░".repeat(20 - Math.round(percentage / 5))} ${percentage}% (${count}/${allResults.length} 份简历缺)`,
    );
  });

  console.log(`\n【技能覆盖率分布】`);
  console.log(`最低覆盖率: ${Math.min(...skillCoverageStats)}%`);
  console.log(`平均覆盖率: ${(skillCoverageStats.reduce((a, b) => a + b) / skillCoverageStats.length).toFixed(1)}%`);
  console.log(`最高覆盖率: ${Math.max(...skillCoverageStats)}%`);

  return {
    skillGaps: sortedGaps,
    coverageStats: {
      min: Math.min(...skillCoverageStats),
      avg: skillCoverageStats.reduce((a, b) => a + b) / skillCoverageStats.length,
      max: Math.max(...skillCoverageStats),
    },
  };
}

// ===== 示例 5：简历对比 - 查看多份简历的匹配情况对比表 =====

export async function compareMultipleResumes(memoryIds: string[], jobInput: any) {
  const agent = new EnhancedHRAgent();
  const results = await agent.evaluateMultipleResumes(jobInput, memoryIds, false);

  console.log(`\n【简历匹配对比表】\n`);

  // 创建对比表格
  const headers = ["简历名称", "虚拟评估分", "ML匹配分", "技能覆盖", "等级"];
  const rows = results.map((r) => [
    r.resumeBasics.name.substring(0, 15),
    `${r.comprehensiveScore}/100`.padStart(8),
    `${r.mlAnalysis.mlScore}/100`.padStart(8),
    `${r.mlAnalysis.skillGap.skillCoverage}%`.padStart(6),
    r.mlAnalysis.mlScoreTier.padEnd(10),
  ]);

  // 打印表格
  console.log(headers.map((h, i) => h.padEnd(i === headers.length - 1 ? 10 : 12)).join(" | "));
  console.log("-".repeat(80));

  for (const row of rows.slice(0, 10)) {
    console.log(row.map((cell, i) => cell.padEnd(i === row.length - 1 ? 10 : 12)).join(" | "));
  }

  return results.slice(0, 10);
}

// ===== 示例 6：为简历修改助手准备批量输入 - 核心集成点 =====

export async function batchSendToResumeRewriteAssistant(jobId: string, memoryIds: string[]) {
  const agent = new EnhancedHRAgent();

  // 从你的岗位系统获取职位描述（实现 getJobDescription）
  const jobInput = await getJobDescription(jobId);

  // 评估该用户的所有简历与该岗位的匹配情况
  const results = await agent.evaluateMultipleResumes(jobInput, memoryIds, false);

  // 准备给简历修改助手的结构化输入数据
  const rewriteAssistantPayload = results.map((r) => ({
    candidate_id: r.memoryId,
    job_id: jobId,
    match_score: Math.round(r.comprehensiveScore),
    ml_match_score: Math.round(r.mlAnalysis.mlScore),
    match_tier: r.mlAnalysis.mlScoreTier,
    missing_skills: r.mlAnalysis.skillGap.missingSkills,
    matched_skills: r.mlAnalysis.skillGap.matchedSkills,
    recommendations: r.combinedRecommendations.slice(0, 5), // 前 5 条建议
    timestamp: r.timestamp,
    analysis_complete: true,
  }));

  // 批量发送给简历修改助手 Agent 处理
  for (const payload of rewriteAssistantPayload) {
    await sendToResumeRewriteAssistant(payload);
  }

  console.log(`✓ 已发送 ${rewriteAssistantPayload.length} 份简历分析结果给简历修改助手，等待修改方案...`);

  return rewriteAssistantPayload;
}

// ===== 辅助函数（存根，需要实现） =====

async function getJobDescription(jobId: string): Promise<any> {
  // 实现你的岗位系统集成
  throw new Error("需要实现 getJobDescription");
}

async function sendToResumeRewriteAssistant(data: any): Promise<void> {
  // 实现你未来的简历修改助手接收接口
  console.log("发送给修改助手:", data);
}

// ===== 导出 =====

export default {
  quickResumeMatching,
  prepareDetailedReportForRewriteAssistant,
  batchMatchingWithProgress,
  identifyCommonSkillGaps,
  compareMultipleResumes,
  batchSendToResumeRewriteAssistant,
};
