# 📄 Reactive Resume 前端简历页面架构分析

## 🎯 简历页面功能总览

Reactive Resume的核心功能围绕简历的创建、编辑、查看和导出展开。

### 📋 主要页面类型

#### 1. **公开简历查看页面** (`/$username/$slug`)
- **文件**: `src/routes/$username/$slug.tsx`
- **功能**: 显示已发布的简历，支持PDF下载
- **组件**: `ResumePreview` + 下载按钮
- **路由**: 动态路由，基于用户名和简历slug

#### 2. **简历编辑器** (`/builder/$resumeId`)
- **文件**: `src/routes/builder/$resumeId/`
- **功能**: 完整的简历编辑界面
- **组件**: 侧边栏 + 预览区域 + 工具栏
- **子目录**:
  - `-components/`: 编辑器组件
  - `-sidebar/`: 左右侧边栏
  - `-store/`: 编辑器状态管理

#### 3. **仪表板** (`/dashboard`)
- **文件**: `src/routes/dashboard/`
- **功能**: 简历管理和用户设置
- **组件**: 简历列表、AI设置等

## 🔧 核心组件分析

### 📄 ResumePreview 组件
```typescript
// 简历预览组件 - 显示简历的实际内容
<ResumePreview className="space-y-4" pageClassName="print:w-full! w-full max-w-full" />
```

**功能**:
- 渲染简历的各个部分（个人信息、教育经历、工作经验等）
- 支持打印样式优化
- 响应式设计

### 🎨 编辑器架构

**左侧边栏** (`-sidebar/left/`):
- 简历内容编辑
- 章节管理（添加、删除、排序）
- 字段编辑

**右侧边栏** (`-sidebar/right/`):
- 样式设置（颜色、字体、布局）
- 导出选项（PDF、DOCX、JSON）
- 简历设置

**顶部工具栏** (`-components/header.tsx`):
- 保存、复制、删除操作
- 预览模式切换

## 🔄 数据流和状态管理

### 📊 状态管理架构

```typescript
// 简历数据存储
const useResumeStore = create<ResumeStore>()((set, get) => ({
  resume: null,
  isReady: false,
  initialize: (resume) => { /* 初始化逻辑 */ },
  update: (data) => { /* 更新逻辑 */ },
  save: () => { /* 保存逻辑 */ },
}));
```

### 🔗 API集成

**oRPC客户端**:
```typescript
// 数据获取
const { data: resume } = useQuery(
  orpc.resume.getBySlug.queryOptions({ input: { username, slug } })
);

// 数据保存
const { mutateAsync: updateResume } = useMutation(
  orpc.resume.update.mutationOptions()
);
```

## 🎨 UI组件层次

### 基础组件层
- **Button**: 操作按钮
- **Input/Textarea**: 表单控件
- **Card/Section**: 布局容器
- **Spinner**: 加载状态

### 业务组件层
- **ResumePreview**: 简历预览
- **SectionEditor**: 章节编辑器
- **ExportSection**: 导出选项
- **AIChat**: AI助手聊天

### 页面组件层
- **RouteComponent**: 页面级组件
- **Layout**: 页面布局

## 🚀 功能扩展点

### 1. **AI功能集成**
- 文件: `src/integrations/ai/`
- 功能: Qwen、DeepSeek等AI模型支持
- 扩展: 添加更多AI提供商

### 2. **导出功能**
- PDF导出: `src/integrations/orpc/services/printer.ts`
- DOCX导出: `src/utils/resume/docx.ts`
- JSON导出: 前端直接生成

### 3. **主题和样式**
- 颜色系统: CSS变量 + Tailwind
- 字体管理: Google Fonts + 本地字体
- 响应式设计: Tailwind breakpoints

## 📚 学习路径建议

### 阶段1: 理解基础结构
1. 查看 `src/routes/$username/$slug.tsx` - 简历查看页面
2. 查看 `src/components/resume/preview/index.tsx` - 预览组件
3. 查看 `src/components/resume/store/resume.ts` - 状态管理

### 阶段2: 探索编辑功能
1. 查看 `src/routes/builder/$resumeId/index.tsx` - 编辑器主页
2. 查看 `src/routes/builder/$resumeId/-sidebar/` - 侧边栏组件
3. 查看 `src/schema/resume/` - 数据结构定义

### 阶段3: 学习高级功能
1. 查看 `src/integrations/ai/` - AI功能实现
2. 查看 `src/integrations/orpc/` - API通信
3. 查看 `src/utils/` - 工具函数

## 🔍 调试和开发技巧

### 常用调试命令
```bash
# 查看组件状态
console.log('Resume data:', resume);

# 检查API调用
console.log('API response:', data);

# 调试样式问题
// 在浏览器DevTools中检查Tailwind类
```

### 开发环境设置
```bash
# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 代码检查
npm run lint
```

这个架构分析可以帮助您快速理解和修改简历相关的功能！