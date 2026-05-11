# 简历-岗位匹配集成指南

这份指南的目标很简单：3 分钟内看懂如何把 ML 模块接到现有分析流程里，把它当作一个虚拟的评估器，专门分析一份简历和一个岗位的匹配情况，并把结果交给未来的简历修改助手使用。

## 先看结论

新的 `EnhancedHRAgent` 会把两套能力合在一起，但它不是在模拟真实 HR 招聘筛选，而是在模拟一个“岗位匹配分析器”：

- 原始 HRAgent 的 6 维评估：行业、技能、教育、薪资、地点、性格
- ML 模块的语义匹配：简历和职位描述的深度相似度
- ML 模块的技能差距分析：缺什么、匹配了什么、额外有什么
- ML 模块的混合评分：语义 70% + 技能 30%
- ML 模块的建议生成：LLM 优先，规则兜底

如果你只想先跑起来，直接看下面的快速开始。输出结果的目标不是“决定录不录用”，而是“告诉求职者这份简历和这个岗位差在哪里，以及该怎么改”。

## 3 分钟快速开始

### 1. 导入增强版 Agent

```typescript
import { EnhancedHRAgent } from "@/services/agents/hr-agent-with-ml";

const agent = new EnhancedHRAgent();
```

### 2. 评估一份简历与一个岗位的匹配

```typescript
const jobInput = {
  title: "Senior Backend Developer",
  description: "Looking for experienced backend developer...",
  requiredSkills: ["Python", "Docker", "Kubernetes", "AWS"],
  requiredEducation: "bachelor",
  location: "San Francisco",
};

const result = await agent.evaluateResume(jobInput, memoryId, false);

console.log("HR Score:", result.comprehensiveScore);
console.log("ML Score:", result.mlAnalysis.mlScore);
console.log("Tier:", result.mlAnalysis.mlScoreTier);
console.log("Missing Skills:", result.mlAnalysis.skillGap.missingSkills);
```

### 3. 批量评估该用户的多份简历与同一个岗位

实现高效率的批量人岗匹配与自动排名。它通过一次异步调用，让 AI 引擎并发处理多份简历（memoryIds 是一个简历ID数组），并直接返回按匹配度从高到低排好序的结果，帮助求职者或hragent快速锁定 Top 5 的简历。（指挥大脑进行"大规模人才海选"的指令。它用最简洁的方式，向虚拟hr（hr_agent）展示了如何从现有的简历池中，快速、精准地捞出最匹配岗位的那几版简历。）

```typescript
const results = await agent.evaluateMultipleResumes(jobInput, memoryIds, false);

const topCandidates = results.slice(0, 5);
topCandidates.forEach((r) => {
  console.log(`${r.resumeBasics.name}: ML ${r.mlAnalysis.mlScore} | HR ${r.comprehensiveScore}`);
});
```

## 你会得到什么

每次分析都会返回两层结果：

- 虚拟评估层结果：综合评分、维度评分、整体评价、建议
- ML 层结果：语义分数、技能差距、最终 ML 分数、建议、是否使用 LLM

如果你只想快速看匹配程度，用 ML 分数即可。如果你想给后续简历修改助手提供输入，用两个结果一起看。

## 常用模式

### 模式 1：先算匹配，再生成修改方向

适合你先处理一大批简历，再找出每份简历最应该改哪里。做简历优化指导。虚拟（HR评估agent）已经有一批可用简历，想先排除掉完全不符合硬性要求的简历，然后针对剩下的最优的一个，告诉求职者，"这个简历还缺哪些技能，补上就能投递简历了"。

```typescript
const results = await agent.evaluateMultipleResumes(jobInput);
const goodMatches = results.filter((r) => r.comprehensiveScore >= 75);

for (const match of goodMatches) {
  console.log(match.resumeBasics.name);
  console.log("匹配分数:", match.comprehensiveScore);
  console.log("ML 分数:", match.mlAnalysis.mlScore);
  console.log("缺失技能:", match.mlAnalysis.skillGap.missingSkills.join(", "));
}
```

### 模式 2：生成给简历修改助手的详细报告

适合你输出给后续的简历修改助手，让它据此自动生成修改建议、优化方向和重写内容。

```typescript
const result = await agent.evaluateResume(jobInput, memoryId, true);

const report = `
## 简历-岗位匹配报告

**简历所属人:** ${result.resumeBasics.name}
**职位:** ${result.jdTitle}
**评估时间:** ${result.timestamp.toLocaleDateString()}

### 综合评分
- 虚拟评估分: ${result.comprehensiveScore}/100
- ML 评分: ${result.mlAnalysis.mlScore}/100 (${result.mlAnalysis.mlScoreTier})
- 总体: ${result.overallAssessment}

### 技能分析
- 匹配技能: ${result.mlAnalysis.skillGap.matchedSkills.join(", ") || "无"}
- 缺失技能: ${result.mlAnalysis.skillGap.missingSkills.join(", ") || "无"}
- 额外技能: ${result.mlAnalysis.skillGap.bonusSkills.join(", ") || "无"}
- 覆盖率: ${result.mlAnalysis.skillGap.skillCoverage}%

### 改进建议
${result.combinedRecommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}

### 虚拟评估说明
${result.llmEvaluation}
`;

console.log(report);
```

## 输出结构重点

你最常会用到的是这些字段：

```typescript
result.comprehensiveScore; // 虚拟评估分 / 匹配分
result.mlAnalysis.semanticScore; // 语义相似度
result.mlAnalysis.skillGap; // 技能差距详情
result.mlAnalysis.mlScore; // 最终 ML 分数
result.mlAnalysis.mlScoreTier; // excellent | good | qualified | unqualified
result.mlAnalysis.improvements; // AI 建议
result.combinedRecommendations; // 合并后的建议
result.overallAssessment; // 一句话总结
```

## 配置方式

如果你想调整权重，可以在创建实例时传入配置：

```typescript
const techAgent = new EnhancedHRAgent({
  semanticWeight: 0.5,
  skillWeight: 0.5,
});

const leadershipAgent = new EnhancedHRAgent({
  semanticWeight: 0.8,
  skillWeight: 0.2,
});
```

## 是否启用 LLM

- `false`：使用规则建议，速度更快，适合批量筛选
- `true`：使用 LLM 建议，质量更高，适合输出详细反馈

```typescript
const fastResult = await agent.evaluateResume(jobInput, memoryId, false);
const richResult = await agent.evaluateResume(jobInput, memoryId, true);
```

## 性能预期

| 操作                | 时间   | 说明               |
| ------------------- | ------ | ------------------ |
| 单个评估（无 LLM）  | ~100ms | HR + ML 计算       |
| 单个评估（有 LLM）  | ~2-3s  | 包含 API 调用      |
| 批量评估 100 个简历 | ~10s   | 视机器和数据量而定 |
| 搜索匹配简历        | ~50ms  | 快速检索           |

## 常见用途

### 面向简历修改助手的前置分析

```typescript
const analyzeForRewriteAssistant = async (jobId, resumeIds) => {
  const job = await getJobDescription(jobId);
  const results = await agent.evaluateMultipleResumes(job, resumeIds);

  for (const result of results) {
    await sendToResumeRewriteAssistant({
      resumeId: result.memoryId,
      matchScore: result.comprehensiveScore,
      mlScore: result.mlAnalysis.mlScore,
      missingSkills: result.mlAnalysis.skillGap.missingSkills,
      recommendations: result.combinedRecommendations,
    });
  }
};
```

### 生成求职者可读反馈

```typescript
const feedback = {
  score: result.mlAnalysis.mlScore,
  tier: result.mlAnalysis.mlScoreTier,
  strengths: result.mlAnalysis.skillGap.matchedSkills,
  improve: result.mlAnalysis.skillGap.missingSkills,
  tips: result.combinedRecommendations.slice(0, 3),
};

await sendCandidateFeedback(result.resumeBasics.email, feedback);
```

## 故障排除

- 如果 ML 分数低但虚拟评估分高，通常是简历关键词很多，但细节深度不够
- 如果 LLM 建议不可用，系统会自动回退到规则建议
- 如果某些技能没识别，先检查技能写法是否有变体，例如 `node.js` 和 `nodejs`

## 集成清单

- 创建 `EnhancedHRAgent` 实例
- 准备 `JobDescriptionInput`
- 保证简历已经在 shared-memory 中
- 安装依赖：`pnpm add ai`
- 先测一份简历，再测多份简历
- 需要更好建议时再打开 LLM

## 下一步

1. 先跑 [hr-agent-with-ml.ts](hr-agent-with-ml.ts)
2. 再看 [integration-examples.ts](integration-examples.ts)
3. 如果要更细节，参考 [ml-modules/IMPLEMENTATION_GUIDE.md](ml-modules/IMPLEMENTATION_GUIDE.md)

---

如果你愿意，我下一步可以继续把 `integration-examples.ts` 改成“简历修改助手输入预处理示例”，这样就能直接喂给你未来要做的修改助手 agent。
