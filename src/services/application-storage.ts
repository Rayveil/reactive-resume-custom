import type {
  ApplicationRecord,
  ApplicationSession,
  ApplicationStats,
  EvaluationResult,
  JobPosting,
  MatchAnalysis,
  OptimizedResume,
  ParsedJD,
  UserProfile,
} from "@/schema/job-applications";

// Storage keys
const STORAGE_PREFIX = "job_app_";

const KEYS = {
  USER_PROFILE: `${STORAGE_PREFIX}user_profile`,
  JOB_POSTINGS: `${STORAGE_PREFIX}job_postings`,
  PARSED_JDS: `${STORAGE_PREFIX}parsed_jds`,
  MATCH_ANALYSES: `${STORAGE_PREFIX}match_analyses`,
  OPTIMIZED_RESUMES: `${STORAGE_PREFIX}optimized_resumes`,
  EVALUATIONS: `${STORAGE_PREFIX}evaluations`,
  APPLICATION_RECORDS: `${STORAGE_PREFIX}application_records`,
  APPLICATION_SESSIONS: `${STORAGE_PREFIX}application_sessions`,
  APPLICATION_STATS: `${STORAGE_PREFIX}application_stats`,
};

// ===== 存储工具函数 =====

function getItem<T>(key: string, defaultValue?: T): T | null {
  try {
    if (typeof window === "undefined") return defaultValue ?? null;
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : (defaultValue ?? null);
  } catch (error) {
    console.error(`Failed to get item from localStorage: ${key}`, error);
    return defaultValue ?? null;
  }
}

function setItem<T>(key: string, value: T): boolean {
  try {
    if (typeof window === "undefined") return false;
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Failed to set item in localStorage: ${key}`, error);
    return false;
  }
}

function removeItem(key: string): boolean {
  try {
    if (typeof window === "undefined") return false;
    window.localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Failed to remove item from localStorage: ${key}`, error);
    return false;
  }
}

// ===== 用户简历存储 =====

export const userProfileStorage = {
  get: (): UserProfile | null => getItem<UserProfile>(KEYS.USER_PROFILE),
  set: (profile: UserProfile): boolean => setItem(KEYS.USER_PROFILE, profile),
  clear: (): boolean => removeItem(KEYS.USER_PROFILE),
};

// ===== 职位发布存储 =====

export const jobPostingStorage = {
  getAll: (): JobPosting[] => getItem<JobPosting[]>(KEYS.JOB_POSTINGS, []) ?? [],
  get: (id: string): JobPosting | null => {
    const postings = jobPostingStorage.getAll();
    return postings.find((p) => p.id === id) ?? null;
  },
  add: (posting: JobPosting): boolean => {
    const postings = jobPostingStorage.getAll();
    postings.push(posting);
    return setItem(KEYS.JOB_POSTINGS, postings);
  },
  update: (id: string, updates: Partial<JobPosting>): boolean => {
    const postings = jobPostingStorage.getAll();
    const index = postings.findIndex((p) => p.id === id);
    if (index === -1) return false;
    postings[index] = { ...postings[index], ...updates };
    return setItem(KEYS.JOB_POSTINGS, postings);
  },
  delete: (id: string): boolean => {
    const postings = jobPostingStorage.getAll();
    const filtered = postings.filter((p) => p.id !== id);
    if (filtered.length === postings.length) return false;
    return setItem(KEYS.JOB_POSTINGS, filtered);
  },
  clear: (): boolean => removeItem(KEYS.JOB_POSTINGS),
};

// ===== 解析 JD 存储 =====

export const parsedJDStorage = {
  getAll: (): ParsedJD[] => getItem<ParsedJD[]>(KEYS.PARSED_JDS, []) ?? [],
  get: (id: string): ParsedJD | null => {
    const items = parsedJDStorage.getAll();
    return items.find((item) => item.id === id) ?? null;
  },
  getByJobId: (jobId: string): ParsedJD | null => {
    const items = parsedJDStorage.getAll();
    return items.find((item) => item.jobId === jobId) ?? null;
  },
  add: (parsed: ParsedJD): boolean => {
    const items = parsedJDStorage.getAll();
    items.push(parsed);
    return setItem(KEYS.PARSED_JDS, items);
  },
  update: (id: string, updates: Partial<ParsedJD>): boolean => {
    const items = parsedJDStorage.getAll();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return false;
    items[index] = { ...items[index], ...updates };
    return setItem(KEYS.PARSED_JDS, items);
  },
  delete: (id: string): boolean => {
    const items = parsedJDStorage.getAll();
    const filtered = items.filter((item) => item.id !== id);
    if (filtered.length === items.length) return false;
    return setItem(KEYS.PARSED_JDS, filtered);
  },
  clear: (): boolean => removeItem(KEYS.PARSED_JDS),
};

// ===== 匹配分析存储 =====

export const matchAnalysisStorage = {
  getAll: (): MatchAnalysis[] => getItem<MatchAnalysis[]>(KEYS.MATCH_ANALYSES, []) ?? [],
  get: (id: string): MatchAnalysis | null => {
    const items = matchAnalysisStorage.getAll();
    return items.find((item) => item.id === id) ?? null;
  },
  getByJobId: (jobId: string): MatchAnalysis | null => {
    const items = matchAnalysisStorage.getAll();
    return items.find((item) => item.jobId === jobId) ?? null;
  },
  add: (analysis: MatchAnalysis): boolean => {
    const items = matchAnalysisStorage.getAll();
    items.push(analysis);
    return setItem(KEYS.MATCH_ANALYSES, items);
  },
  update: (id: string, updates: Partial<MatchAnalysis>): boolean => {
    const items = matchAnalysisStorage.getAll();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return false;
    items[index] = { ...items[index], ...updates };
    return setItem(KEYS.MATCH_ANALYSES, items);
  },
  delete: (id: string): boolean => {
    const items = matchAnalysisStorage.getAll();
    const filtered = items.filter((item) => item.id !== id);
    if (filtered.length === items.length) return false;
    return setItem(KEYS.MATCH_ANALYSES, filtered);
  },
  clear: (): boolean => removeItem(KEYS.MATCH_ANALYSES),
};

// ===== 优化简历存储 =====

export const optimizedResumeStorage = {
  getAll: (): OptimizedResume[] => getItem<OptimizedResume[]>(KEYS.OPTIMIZED_RESUMES, []) ?? [],
  get: (id: string): OptimizedResume | null => {
    const items = optimizedResumeStorage.getAll();
    return items.find((item) => item.id === id) ?? null;
  },
  getByJobId: (jobId: string): OptimizedResume[] => {
    const items = optimizedResumeStorage.getAll();
    return items.filter((item) => item.jobId === jobId);
  },
  add: (resume: OptimizedResume): boolean => {
    const items = optimizedResumeStorage.getAll();
    items.push(resume);
    return setItem(KEYS.OPTIMIZED_RESUMES, items);
  },
  update: (id: string, updates: Partial<OptimizedResume>): boolean => {
    const items = optimizedResumeStorage.getAll();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return false;
    items[index] = { ...items[index], ...updates };
    return setItem(KEYS.OPTIMIZED_RESUMES, items);
  },
  delete: (id: string): boolean => {
    const items = optimizedResumeStorage.getAll();
    const filtered = items.filter((item) => item.id !== id);
    if (filtered.length === items.length) return false;
    return setItem(KEYS.OPTIMIZED_RESUMES, filtered);
  },
  clear: (): boolean => removeItem(KEYS.OPTIMIZED_RESUMES),
};

// ===== 评分结果存储 =====

export const evaluationStorage = {
  getAll: (): EvaluationResult[] => getItem<EvaluationResult[]>(KEYS.EVALUATIONS, []) ?? [],
  get: (id: string): EvaluationResult | null => {
    const items = evaluationStorage.getAll();
    return items.find((item) => item.id === id) ?? null;
  },
  getByResumeId: (resumeId: string): EvaluationResult | null => {
    const items = evaluationStorage.getAll();
    return items.find((item) => item.resumeId === resumeId) ?? null;
  },
  add: (evaluation: EvaluationResult): boolean => {
    const items = evaluationStorage.getAll();
    items.push(evaluation);
    return setItem(KEYS.EVALUATIONS, items);
  },
  update: (id: string, updates: Partial<EvaluationResult>): boolean => {
    const items = evaluationStorage.getAll();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return false;
    items[index] = { ...items[index], ...updates };
    return setItem(KEYS.EVALUATIONS, items);
  },
  delete: (id: string): boolean => {
    const items = evaluationStorage.getAll();
    const filtered = items.filter((item) => item.id !== id);
    if (filtered.length === items.length) return false;
    return setItem(KEYS.EVALUATIONS, filtered);
  },
  clear: (): boolean => removeItem(KEYS.EVALUATIONS),
};

// ===== 投递记录存储 =====

export const applicationRecordStorage = {
  getAll: (): ApplicationRecord[] => getItem<ApplicationRecord[]>(KEYS.APPLICATION_RECORDS, []) ?? [],
  get: (id: string): ApplicationRecord | null => {
    const items = applicationRecordStorage.getAll();
    return items.find((item) => item.id === id) ?? null;
  },
  getByJobId: (jobId: string): ApplicationRecord[] => {
    const items = applicationRecordStorage.getAll();
    return items.filter((item) => item.jobId === jobId);
  },
  getByUserId: (userId: string): ApplicationRecord[] => {
    const items = applicationRecordStorage.getAll();
    return items.filter((item) => item.userId === userId);
  },
  add: (record: ApplicationRecord): boolean => {
    const items = applicationRecordStorage.getAll();
    items.push(record);
    return setItem(KEYS.APPLICATION_RECORDS, items);
  },
  update: (id: string, updates: Partial<ApplicationRecord>): boolean => {
    const items = applicationRecordStorage.getAll();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return false;
    items[index] = { ...items[index], ...updates };
    return setItem(KEYS.APPLICATION_RECORDS, items);
  },
  delete: (id: string): boolean => {
    const items = applicationRecordStorage.getAll();
    const filtered = items.filter((item) => item.id !== id);
    if (filtered.length === items.length) return false;
    return setItem(KEYS.APPLICATION_RECORDS, filtered);
  },
  clear: (): boolean => removeItem(KEYS.APPLICATION_RECORDS),
};

// ===== 应用会话存储 =====

export const applicationSessionStorage = {
  getAll: (): ApplicationSession[] => getItem<ApplicationSession[]>(KEYS.APPLICATION_SESSIONS, []) ?? [],
  get: (id: string): ApplicationSession | null => {
    const items = applicationSessionStorage.getAll();
    return items.find((item) => item.id === id) ?? null;
  },
  getByJobId: (jobId: string): ApplicationSession | null => {
    const items = applicationSessionStorage.getAll();
    return items.find((item) => item.jobId === jobId) ?? null;
  },
  add: (session: ApplicationSession): boolean => {
    const items = applicationSessionStorage.getAll();
    items.push(session);
    return setItem(KEYS.APPLICATION_SESSIONS, items);
  },
  update: (id: string, updates: Partial<ApplicationSession>): boolean => {
    const items = applicationSessionStorage.getAll();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1) return false;
    items[index] = { ...items[index], ...updates };
    return setItem(KEYS.APPLICATION_SESSIONS, items);
  },
  delete: (id: string): boolean => {
    const items = applicationSessionStorage.getAll();
    const filtered = items.filter((item) => item.id !== id);
    if (filtered.length === items.length) return false;
    return setItem(KEYS.APPLICATION_SESSIONS, filtered);
  },
  clear: (): boolean => removeItem(KEYS.APPLICATION_SESSIONS),
};

// ===== 统计数据存储 =====

export const applicationStatsStorage = {
  get: (userId: string): ApplicationStats | null => {
    const items = getItem<Record<string, ApplicationStats>>(KEYS.APPLICATION_STATS, {}) ?? {};
    return items[userId] ?? null;
  },
  set: (userId: string, stats: ApplicationStats): boolean => {
    const items = getItem<Record<string, ApplicationStats>>(KEYS.APPLICATION_STATS, {}) ?? {};
    items[userId] = stats;
    return setItem(KEYS.APPLICATION_STATS, items);
  },
  delete: (userId: string): boolean => {
    const items = getItem<Record<string, ApplicationStats>>(KEYS.APPLICATION_STATS, {}) ?? {};
    delete items[userId];
    return setItem(KEYS.APPLICATION_STATS, items);
  },
  clear: (): boolean => removeItem(KEYS.APPLICATION_STATS),
};

// ===== 批量导出/导入 =====

export interface ApplicationDataBackup {
  version: string;
  timestamp: string;
  userProfile?: UserProfile;
  jobPostings: JobPosting[];
  parsedJDs: ParsedJD[];
  matchAnalyses: MatchAnalysis[];
  optimizedResumes: OptimizedResume[];
  evaluations: EvaluationResult[];
  applicationRecords: ApplicationRecord[];
  applicationSessions: ApplicationSession[];
  stats?: Record<string, ApplicationStats>;
}

export function exportApplicationData(): ApplicationDataBackup {
  return {
    version: "1.0",
    timestamp: new Date().toISOString(),
    userProfile: userProfileStorage.get() ?? undefined,
    jobPostings: jobPostingStorage.getAll(),
    parsedJDs: parsedJDStorage.getAll(),
    matchAnalyses: matchAnalysisStorage.getAll(),
    optimizedResumes: optimizedResumeStorage.getAll(),
    evaluations: evaluationStorage.getAll(),
    applicationRecords: applicationRecordStorage.getAll(),
    applicationSessions: applicationSessionStorage.getAll(),
    stats: getItem<Record<string, any>>(KEYS.APPLICATION_STATS, {}),
  };
}

export function importApplicationData(backup: ApplicationDataBackup): boolean {
  try {
    if (backup.userProfile) userProfileStorage.set(backup.userProfile);
    setItem(KEYS.JOB_POSTINGS, backup.jobPostings);
    setItem(KEYS.PARSED_JDS, backup.parsedJDs);
    setItem(KEYS.MATCH_ANALYSES, backup.matchAnalyses);
    setItem(KEYS.OPTIMIZED_RESUMES, backup.optimizedResumes);
    setItem(KEYS.EVALUATIONS, backup.evaluations);
    setItem(KEYS.APPLICATION_RECORDS, backup.applicationRecords);
    setItem(KEYS.APPLICATION_SESSIONS, backup.applicationSessions);
    if (backup.stats) setItem(KEYS.APPLICATION_STATS, backup.stats);
    return true;
  } catch (error) {
    console.error("Failed to import application data", error);
    return false;
  }
}

export function clearAllApplicationData(): boolean {
  const keys = Object.values(KEYS);
  let allCleared = true;
  for (const key of keys) {
    if (!removeItem(key)) allCleared = false;
  }
  return allCleared;
}
