/**
 * Job-Match 辅助函数
 * 用于文本分析和相似度计算
 */

/**
 * 基于空格和标点符号的分词
 */
export function tokenizeJobMatchText(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s\-_,.:;!?"'()\[\]{}]+/)
    .filter((token) => token.length > 0);
}

/**
 * 计算余弦相似度
 */
export function cosineSimilarity(leftTokens: string[], rightTokens: string[]): number {
  if (leftTokens.length === 0 || rightTokens.length === 0) return 0;

  const left = new Map<string, number>();
  const right = new Map<string, number>();

  for (const token of leftTokens) {
    left.set(token, (left.get(token) ?? 0) + 1);
  }
  for (const token of rightTokens) {
    right.set(token, (right.get(token) ?? 0) + 1);
  }

  const allTokens = new Set([...left.keys(), ...right.keys()]);
  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (const token of allTokens) {
    const lv = left.get(token) ?? 0;
    const rv = right.get(token) ?? 0;
    dotProduct += lv * rv;
    leftMagnitude += lv * lv;
    rightMagnitude += rv * rv;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;
  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

/**
 * Jaccard 相似度
 */
export function jaccardSimilarity(leftTokens: string[], rightTokens: string[]): number {
  const leftSet = new Set(leftTokens);
  const rightSet = new Set(rightTokens);

  let intersection = 0;
  for (const token of leftSet) {
    if (rightSet.has(token)) intersection++;
  }

  const union = leftSet.size + rightSet.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * 检查是否包含所有必需关键词
 */
export function hasRequiredKeywords(text: string, keywords: string[]): boolean {
  const tokens = tokenizeJobMatchText(text);
  const tokenSet = new Set(tokens);

  return keywords.every((keyword) => {
    const keywordTokens = tokenizeJobMatchText(keyword);
    return keywordTokens.some((kt) => tokenSet.has(kt));
  });
}

/**
 * 计算技能匹配分数
 */
export function calculateSkillMatch(
  profileSkills: string[],
  requiredSkills: string[],
  desiredSkills: string[],
): number {
  const profileSkillsLower = profileSkills.map((s) => s.toLowerCase());
  const requiredSkillsLower = requiredSkills.map((s) => s.toLowerCase());
  const desiredSkillsLower = desiredSkills.map((s) => s.toLowerCase());

  let matchedRequired = 0;
  let matchedDesired = 0;

  for (const required of requiredSkillsLower) {
    if (profileSkillsLower.some((ps) => ps === required || ps.includes(required) || required.includes(ps))) {
      matchedRequired++;
    }
  }

  for (const desired of desiredSkillsLower) {
    if (profileSkillsLower.some((ps) => ps === desired || ps.includes(desired) || desired.includes(ps))) {
      matchedDesired++;
    }
  }

  const requiredScore = requiredSkillsLower.length > 0 ? matchedRequired / requiredSkillsLower.length : 0;
  const desiredScore = desiredSkillsLower.length > 0 ? matchedDesired / desiredSkillsLower.length : 0;

  // 权重：70% 必需技能，30% 期望技能
  return requiredScore * 0.7 + desiredScore * 0.3;
}

/**
 * 提取关键词
 */
export function extractKeywords(text: string, minLength: number = 3): string[] {
  const tokens = tokenizeJobMatchText(text);

  // 过滤短词和常见词汇
  const commonWords = new Set([
    "the",
    "and",
    "or",
    "a",
    "an",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "is",
    "are",
    "be",
    "been",
    "being",
  ]);

  return tokens.filter((token) => token.length >= minLength && !commonWords.has(token));
}

/**
 * 计算文本相似度（综合评分）
 */
export function calculateTextSimilarity(text1: string, text2: string): number {
  const tokens1 = tokenizeJobMatchText(text1);
  const tokens2 = tokenizeJobMatchText(text2);

  const cosine = cosineSimilarity(tokens1, tokens2);
  const jaccard = jaccardSimilarity(tokens1, tokens2);

  // 合并两个分数
  return cosine * 0.6 + jaccard * 0.4;
}

/**
 * 获取缺失的关键词
 */
export function getMissingKeywords(text: string, requiredKeywords: string[]): string[] {
  const tokens = new Set(tokenizeJobMatchText(text));
  const missing: string[] = [];

  for (const keyword of requiredKeywords) {
    const keywordTokens = tokenizeJobMatchText(keyword);
    const hasKeyword = keywordTokens.some((kt) => tokens.has(kt));
    if (!hasKeyword) {
      missing.push(keyword);
    }
  }

  return missing;
}
