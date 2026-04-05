# 🚀 Reactive Resume 开发协作流程

## 📋 完整工作流程图

```
本地开发机 (Windows)          GitHub仓库              服务器 (阿里云)
┌─────────────────────┐    ┌─────────────┐    ┌─────────────────────┐
│ 1. 修改代码文件     │    │             │    │                     │
│    - src/           │    │             │    │                     │
│    - 修改AI功能     │───▶│ 2. git push │───▶│ 3. git pull        │
│    - 测试功能       │    │    上传     │    │    下载最新代码     │
└─────────────────────┘    └─────────────┘    └─────────────────────┘
          ▲                        │                        │
          │                        ▼                        ▼
          │               ┌─────────────┐          ┌─────────────────────┐
          │               │ 4. 代码审查 │          │ 5. ./deploy.sh     │
          │               │    (可选)   │          │    重启服务         │
          │               └─────────────┘          └─────────────────────┘
          │                        ▲                        │
          └────────────────────────┴────────────────────────┘
                              协作完成 ✨
```

## 🔄 详细步骤说明

### 阶段1: 本地开发和修改

**位置**: 您的Windows电脑
**目的**: 修改代码，添加功能

```bash
# 1. 查看当前文件状态
git status

# 2. 如果看到修改的文件，添加它们
git add .

# 3. 提交修改到本地仓库
git commit -m "添加了新的AI功能"

# 4. 推送到GitHub
git push
```

### 阶段2: GitHub仓库同步

**位置**: https://github.com/luoruirui424-star/reactive-resume-custom.git
**目的**: 代码版本控制和备份

- 自动接收您的推送
- 保存所有历史版本
- 可以查看代码变化

### 阶段3: 服务器部署

**位置**: 阿里云服务器 (通过FinalShell)
**目的**: 运行您的应用

```bash
# 1. 进入项目目录
cd /root/reactive-resume-main/reactive-resume-main

# 2. 拉取最新代码
git pull origin main

# 3. 重新部署服务
./deploy.sh
```

## 💡 实际操作示例

### 示例: 添加新的AI模型

**第1步: 本地修改代码**
```bash
# 编辑文件
notepad src/integrations/ai/store.ts  # 添加新模型

# 测试修改
./dev-local.sh  # 本地运行测试
```

**第2步: 提交到Git**
```bash
git add src/integrations/ai/store.ts
git commit -m "添加DeepSeek AI模型支持"
git push
```

**第3步: 服务器更新**
```bash
# 在FinalShell中
cd /root/reactive-resume-main/reactive-resume-main
git pull origin main
./deploy.sh
```

## 🔧 常用命令速查表

### 本地开发机命令
```bash
git status          # 查看文件状态
git add .           # 添加所有修改
git commit -m "msg" # 提交修改
git push            # 推送到GitHub
./dev-local.sh      # 本地开发测试
```

### 服务器命令
```bash
git pull origin main # 拉取最新代码
./deploy.sh          # 重新部署
docker-compose logs  # 查看日志
```

## ⚡ 快速同步检查

### 检查本地和GitHub同步状态
```bash
git status          # 本地文件状态
git log --oneline   # 提交历史
```

### 检查服务器和GitHub同步状态
```bash
git remote -v       # 查看远程仓库
git fetch           # 获取最新信息
git status          # 比较本地和远程
```

## 🎯 最佳实践

1. **频繁提交**: 小修改就提交，不要等大块修改
2. **清晰描述**: commit信息要说明做了什么
3. **测试后推送**: 本地测试通过再推送到服务器
4. **备份重要文件**: 如.env配置文件

## ❓ 常见问题

**Q: 推送失败怎么办？**
A: 检查网络，确认GitHub仓库地址正确

**Q: 服务器更新失败怎么办？**
A: 检查服务器磁盘空间，确认Docker运行正常

**Q: 代码冲突怎么办？**
A: 如果服务器有本地修改，先备份再拉取

这样理解了吗？我们可以实际操作一次来验证流程！