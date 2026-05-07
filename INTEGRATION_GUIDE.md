# Quick Integration Guide - Phase 1 Complete ✅

## 🚀 Getting Started

### 1. **Database/Storage Already Set Up**
- No database migration needed for Phase 1
- Uses browser `localStorage` automatically
- Data persists across page reloads
- Backed by `src/services/application-storage.ts`

### 2. **Access the Demo Page**
```
URL: http://localhost:3000/dashboard/applications
```

### 3. **ORPC Endpoints Ready**
All endpoints are automatically available at:
```
POST   /api/applications/analyze              (Main workflow)
GET    /api/applications/profile              (Get resume)
POST   /api/applications/profile              (Save resume)
GET    /api/applications/session/:sessionId   (Get results)
GET    /api/applications/records              (List applications)
POST   /api/applications/submit               (Save application)
GET    /api/applications/stats                (Get stats)
```

### 4. **Next: Integrate Real LLM**

The system currently uses **mock LLM responses**. To use real qwen3:

#### Step 1: Update `src/services/agents/jd-parser-agent.ts`

Replace the `callLLM()` method with real API call:

```typescript
private async callLLM(prompt: string): Promise<string> {
  const response = await fetch("https://api.aliyun.com/v1/services/qwen", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: this.config.model,
      prompt,
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    throw new Error(`LLM API error: ${response.statusText}`);
  }

  const data = await response.json();
  return data.choices[0].text;
}
```

#### Step 2: Configure Environment Variables
Add to `.env`:
```
AI_PROVIDER=qwen
AI_MODEL=qwen-plus
AI_API_KEY=your_api_key_here
```

#### Step 3: Test Integration
```
1. Go to /dashboard/applications
2. Paste sample job description
3. Click "Analyze Job"
4. Check console for API responses
```

---

## 📁 File Structure

```
src/
├── services/
│   ├── application-storage.ts       ← localStorage wrapper
│   └── agents/
│       ├── jd-parser-agent.ts       ← Parse JD (needs LLM)
│       ├── resume-matcher-agent.ts  ← Score & match (ready)
│       └── orchestrator.ts          ← Workflow engine (ready)
├── integrations/orpc/
│   ├── services/applications.ts     ← Procedures
│   └── router/
│       ├── applications.ts          ← Routes
│       └── index.ts                 ← Registered
├── utils/
│   └── job-match-helpers.ts         ← Helper functions
└── routes/dashboard/
    └── applications/
        └── index.tsx                ← Demo page
```

---

## 🧪 Testing Checklist

### 1. Storage Layer
```typescript
// Test in browser console
import { userProfileStorage } from "@/services/application-storage";

const profile = {
  id: "user_1",
  headline: "Senior React Dev",
  summary: "...",
  // ... full profile
};

userProfileStorage.set(profile);
userProfileStorage.get(); // Should return profile
```

### 2. Job Parser
```typescript
import { JDParserAgent } from "@/services/agents/jd-parser-agent";

const config = {
  provider: "qwen",
  model: "qwen-plus",
  apiKey: process.env.AI_API_KEY,
};

const agent = new JDParserAgent(config);
const jobPosting = {
  id: "job_1",
  title: "Senior React Developer",
  company: "Google",
  description: "We are looking for...",
  postedAt: new Date().toISOString(),
};

const parsed = await agent.parseJobDescription(jobPosting);
console.log(parsed); // Check parsed skills, experience, etc.
```

### 3. Matcher Agent
```typescript
import { ResumeMatcherAgent } from "@/services/agents/resume-matcher-agent";

const matcher = new ResumeMatcherAgent();
const analysis = await matcher.analyzeMatch(profile, parsedJD, jobId);
console.log(analysis.overallScore); // Should be 0-100
```

### 4. Full Workflow
```typescript
import { createApplicationOrchestrator } from "@/services/agents/orchestrator";

const orchestrator = createApplicationOrchestrator({
  jdParserConfig: {
    provider: "qwen",
    model: "qwen-plus",
    apiKey: process.env.AI_API_KEY,
  },
});

const session = await orchestrator.executeApplicationWorkflow(
  userId,
  jobPosting,
  userProfile
);

console.log(session.results); // Full results
```

### 5. ORPC Endpoints
```bash
# Get user profile
curl http://localhost:3000/api/applications/profile

# Analyze job
curl -X POST http://localhost:3000/api/applications/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Senior React Developer",
    "company": "Google",
    "description": "Job description..."
  }'

# Get stats
curl http://localhost:3000/api/applications/stats
```

### 6. UI Demo Page
1. Navigate to `http://localhost:3000/dashboard/applications`
2. Fill in sample job details
3. Click "Analyze Job"
4. Check:
   - Loading state works
   - Results display correctly
   - No console errors
   - Recommendations shown

---

## 🔌 How Data Flows

```
Frontend (Demo Page)
    ↓
    [User enters job description]
    ↓
    HTTP POST /api/applications/analyze
    ↓
Backend (ORPC Procedure)
    ↓
    [applicationsProcedures.analyzeJob]
    ↓
    [ApplicationOrchestrator]
    ↓
    Step 1: JDParserAgent.parseJobDescription()
    Step 2: ResumeMatcherAgent.analyzeMatch()
    Step 3: Save to localStorage via storage layer
    ↓
    Return session with results
    ↓
    HTTP Response with JSON
    ↓
Frontend
    ↓
    [Display parsed JD, match score, recommendations]
```

---

## 🚀 Common Commands

### Run Development Server
```bash
pnpm dev
```

### Type Check
```bash
pnpm typecheck
```

### Lint Code
```bash
pnpm lint
```

### Format Code
```bash
pnpm fmt
```

---

## 📊 Key Data Structures

### UserProfile
```typescript
{
  id: string;
  headline: string;
  summary: string;
  skills: Array<{ name: string; }>;
  experience: Array<{
    title: string;
    startDate: string;
    endDate?: string;
  }>;
  education: Array<{
    degree: string;
    field: string;
  }>;
}
```

### ParsedJD
```typescript
{
  id: string;
  jobId: string;
  requirements: {
    skills: Array<{
      name: string;
      importance: "required" | "desired" | "nice_to_have";
    }>;
    experience: Array<{
      description: string;
      yearsRequired: number;
    }>;
    education: Array<{
      level: string;
      field?: string;
    }>;
  };
  seniority: "junior" | "mid" | "senior" | "lead";
  keywords: string[];
}
```

### MatchAnalysis
```typescript
{
  id: string;
  overallScore: number; // 0-100
  skillMatches: {
    matched: string[];
    missing: string[];
    strengths: string[];
  };
  recommendations: string[];
  analysisAt: string;
}
```

### ApplicationSession
```typescript
{
  id: string;
  jobId: string;
  userId: string;
  currentStep: "parse_jd" | "analyze" | "generate" | "evaluate" | "apply" | "completed";
  results: {
    parsedJD?: ParsedJD;
    matchAnalysis?: MatchAnalysis;
    optimizedResume?: OptimizedResume;
    evaluation?: EvaluationResult;
  };
  createdAt: string;
  completedAt?: string;
}
```

---

## ⚡ Performance Tips

### 1. Cache Parsed JDs
- Same job description parsed twice? Use cached result
- `parsedJDStorage.getByJobId(jobId)` before parsing

### 2. Batch Operations
- Analyzing multiple jobs? Use `agent.parseMultiple(jobs)`
- Reduces overhead

### 3. Session Reuse
- Don't create new session for same job
- Check `applicationSessionStorage.getByJobId(jobId)`

### 4. Error Recovery
- All operations wrapped in try-catch
- Check `session.errors` array for failures

---

## 🐛 Debugging

### Enable Logging
```typescript
// Add to orchestrator
console.log(`[Agent Orchestrator] Step 1: Parsing JD...`);

// Check localStorage
console.log(localStorage.getItem("job_app_application_sessions"));
```

### Check Types
```bash
pnpm typecheck
```

### View Stored Data
```javascript
// Browser console
Object.keys(localStorage)
  .filter(k => k.startsWith('job_app_'))
  .forEach(k => console.log(k, JSON.parse(localStorage[k])))
```

---

## 🎯 Next Steps

1. **LLM Integration**: Replace mock LLM with real qwen3
2. **Phase 2**: Implement Resume Generator Agent
3. **Phase 3**: Build UI workbench
4. **Phase 4**: Add cloud sync

---

## 📞 Support

**File locations**:
- `AGENT_ARCHITECTURE.md` - Architecture details
- `PHASE_1_COMPLETED.md` - This implementation
- `job-applications.ts` - Data schemas

**Questions?** Check the JSDoc comments in source files.
