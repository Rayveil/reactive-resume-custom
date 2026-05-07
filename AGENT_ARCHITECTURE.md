# 智能体求职简历自动生成系统（多Agent架构）

## 系统目标

将 Reactive Resume 改造为基于 LLM 的多 Agent 系统，自动为用户生成并优化针对特定职位的简历。核心流程：**用户个人信息 + JD → Agent 链路 → 优化简历版本 + 投递记录**

---

## 核心 Agent 设计（5 个）

### 1. **JD 解析 Agent** (Requirement Parser)

- **输入**: 职位描述文本 (JD)
- **功能**:
  - 提取核心要求（必需/期望）
  - 分类技能、经验年限、行业领域、职责类型
  - 识别隐形需求（文化匹配、软技能）
- **输出**: 结构化需求对象 `ParsedJD`
- **技术**: LLM Prompt + JSON Schema

### 2. **简历匹配评估 Agent** (Resume Analyzer)

- **输入**: 用户简历 + 已解析 JD
- **功能**:
  - 逐项对标用户经历与 JD 需求
  - 计算匹配度（技能/经验/教育）
  - 识别缺口与优势
- **输出**: 匹配分析报告 `MatchAnalysis`
- **技术**: 余弦相似度 + LLM 评分

### 3. **简历优化生成 Agent** (Resume Generator)

- **输入**: 用户基础简历 + JD + 匹配分析
- **功能**:
  - 根据 JD 关键词重新组织内容
  - 强化相关经历描述（ATS 友好）
  - 调整措辞以提升匹配度
  - 保留核心诚信、避免过度包装
- **输出**: 针对职位的优化简历版本 `OptimizedResume`
- **技术**: LLM 多轮 Prompt + 版本管理

### 4. **简历评分 Agent** (Resume Evaluator)

- **输入**: 优化后简历 + JD
- **功能**:
  - 评估最终匹配分（0–100%）
  - 识别仍然存在的缺陷
  - 给出最后优化建议
- **输出**: 评分与反馈 `EvaluationResult`
- **技术**: LLM 评分 + 规则引擎

### 5. **投递记录管理 Agent** (Application Logger)

- **输入**: 生成的简历 + JD + 投递时间戳
- **功能**:
  - 记录投递历史
  - 管理简历版本（同一职位或不同职位）
  - 支持后续跟踪与反馈更新
- **输出**: 投递记录 & 统计数据
- **技术**: localStorage + 结构化数据模型

---

## 数据模型

### 核心实体

```typescript
// 1. 用户个人信息
type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  headline: string;
  summary: string;
  skills: Skill[];
  experience: WorkExperience[];
  education: Education[];
  projects?: Project[];
  certifications?: Certification[];
};

// 2. 职位描述 (原始 + 解析)
type JobPosting = {
  id: string;
  title: string;
  company: string;
  description: string;
  url?: string;
  postedAt: Date;
  tags?: string[]; // 如 "remote", "entry-level"
};

type ParsedJD = {
  id: string;
  jobId: string;
  requirements: {
    skills: { name: string; importance: "required" | "desired"; yearsRequired?: number }[];
    experience: { description: string; yearsRequired: number }[];
    education: { level: string; field?: string }[];
    responsibilities: string[];
  };
  compensationRange?: { min: number; max: number; currency: string };
  extractedAt: Date;
};

// 3. 匹配分析
type MatchAnalysis = {
  id: string;
  jobId: string;
  userId: string;
  overallScore: number; // 0-100
  skillMatches: {
    matched: string[]; // 用户具备
    missing: string[]; // 缺失
    strengths: string[]; // 超出预期
  };
  experienceGaps: string[];
  recommendations: string[];
  analysisAt: Date;
};

// 4. 优化简历版本
type OptimizedResume = {
  id: string;
  userId: string;
  jobId: string;
  baseResumeId: string;
  content: {
    summary: string; // 针对职位定制的摘要
    experience: WorkExperience[]; // 重新组织、强化相关项
    skills: { name: string; relevance: "high" | "medium" | "low" }[];
    sections?: CustomSection[];
  };
  generatedAt: Date;
  version: number;
};

// 5. 评分结果
type EvaluationResult = {
  id: string;
  resumeId: string;
  jobId: string;
  finalScore: number; // 0-100
  aisFeedback: string;
  suggestions: string[];
  readyToApply: boolean; // 评分 >= 70 ?
  evaluatedAt: Date;
};

// 6. 投递记录
type ApplicationRecord = {
  id: string;
  userId: string;
  jobId: string;
  resumeId: string; // 实际投递的简历 ID
  appliedAt: Date;
  status: "pending" | "applied" | "viewed" | "rejected" | "interview";
  feedback?: string;
  followUpAt?: Date;
  source?: "manual" | "auto-generated";
};

// 7. 应用会话 (多步骤工作流状态)
type ApplicationSession = {
  id: string;
  userId: string;
  jobId: string;
  currentStep: "parse_jd" | "analyze" | "generate" | "evaluate" | "apply";
  results: {
    parsedJD?: ParsedJD;
    matchAnalysis?: MatchAnalysis;
    optimizedResume?: OptimizedResume;
    evaluation?: EvaluationResult;
  };
  createdAt: Date;
  completedAt?: Date;
};
```

---

## Agent 工作流编排（Orchestration）

### 执行流程（链式调用）

```
用户投递意向 (JD URL / 文本)
  ↓
[1] JD 解析 Agent → ParsedJD
  ↓
[2] 简历匹配评估 Agent → MatchAnalysis
  ↓
  IF MatchAnalysis.overallScore < 50:
    → [4] 简历优化生成 Agent (激进模式)
  ELSE:
    → [4] 简历优化生成 Agent (增量模式)
  ↓
[4] 简历优化生成 Agent → OptimizedResume
  ↓
[5] 简历评估 Agent → EvaluationResult
  ↓
IF EvaluationResult.readyToApply:
  → [6] 投递记录管理 Agent → ApplicationRecord
  → 展示简历预览 + 投递确认
ELSE:
  → 展示反馈与建议 + 手动调整选项
```

### 错误处理与重试

- **超时**: LLM 调用超过 30s → 回退到历史版本
- **解析失败**: JD 文本格式异常 → 用户手工标注关键需求
- **低分重新生成**: 如果评分 < 50 → 自动尝试 2 次重新生成

---

## 存储方案（localStorage + 云备份）

### 分层存储

**本地层 (localStorage)**

- 用户基础简历 + 个人信息
- 最近 50 份投递记录
- 当前会话缓存（Agent 中间结果）

**云端备份层** (可选，Future)

- 完整投递历史
- 所有生成的简历版本
- 跨设备同步

**索引与查询**

- 按投递公司 / 职位 / 日期检索
- 支持 "同一职位多版本" 对比

---

## 前端整合点

### 新增页面 / 模块

1. **应用工作台** (`/dashboard/applications`)
   - 投递列表（表格/卡片）
   - 简历版本对比
   - 投递状态跟踪

2. **快速应用流程** (`/dashboard/applications/new`)
   - JD 输入框 / URL 导入
   - 实时匹配度展示
   - 优化简历预览
   - "确认投递" 按钮

3. **简历版本管理** (`/dashboard/applications/:jobId`)
   - 该职位的所有简历版本
   - Agent 分析报告
   - 编辑与重新生成

4. **投递统计仪表盘** (`/dashboard/statistics`)
   - 本周投递数
   - 平均匹配度
   - 回复率趋势

---

## 分阶段实现计划

### Phase 1: 架构 & 基础 Agent（1–2 周）

- [ ] 设计完整数据模型
- [ ] 实现数据存储层 (localStorage schema)
- [ ] 构建 Agent 基础框架 (ORPC 集成)
- [ ] 实现 JD 解析 Agent
- [ ] 简历匹配评估 Agent

**关键产出**: 可接收 JD 并生成匹配分析

### Phase 2: 优化与评分（1–2 周）

- [ ] 简历优化生成 Agent (with qwen3 prompt tuning)
- [ ] 简历评分 Agent
- [ ] Agent 链路编排与错误处理

**关键产出**: 完整 JD → 优化简历 的端到端流程

### Phase 3: 投递管理 & 前端（1–2 周）

- [ ] 投递记录管理 Agent
- [ ] 应用工作台 UI 页面
- [ ] 快速应用流程 UI
- [ ] 简历版本管理 UI

**关键产出**: 用户可通过 UI 完成 "输入 JD → 查看优化简历 → 记录投递"

### Phase 4: 优化 & 反馈循环（1 周）

- [ ] 投递反馈记录（面试/拒绝）
- [ ] 基于反馈的 Agent 策略调整
- [ ] 统计仪表盘
- [ ] 性能优化 & 缓存策略

**关键产出**: 闭环系统，支持用户反馈迭代

---

## 技术栈

| 层                | 技术                                | 备注                |
| ----------------- | ----------------------------------- | ------------------- |
| **LLM**           | qwen3 (Aliyun)                      | 解析、生成、评分    |
| **后端**          | Node.js + Nitro (现有)              | Agent 业务逻辑      |
| **前端**          | React 19 + TailwindCSS (现有)       | 新增工作台 UI       |
| **存储**          | localStorage + indexedDB (optional) | 本地数据 + 版本管理 |
| **队列** (Future) | Redis / Bull                        | 异步 Agent 任务     |

---

## 参考项目对标

| 项目                    | 借鉴点               | 改进                          |
| ----------------------- | -------------------- | ----------------------------- |
| **AIHawk**              | Agent 链路、错误恢复 | 仅需求解析 + 简历生成，不采集 |
| **LLM-Resume-Template** | Prompt 工程最佳实践  | 集成 qwen3，多语言支持        |
| **Hiring Agent**        | 评分标准、反馈模型   | 简化为二阶段（生成 → 评分）   |
| **LLM-Agent-Resume**    | 漏斗式 Agent 架构    | 采用相同的链式编排            |

---

## 预期成果

✅ 用户可以粘贴 JD → 系统自动生成针对职位优化的简历 → 查看匹配度评分与反馈 → 一键记录投递  
✅ 完整投递历史追踪与版本管理  
✅ 多 Agent 协作的 LLM 应用架构范例
