import type {
  JobMatchItemCategory,
  JobMatchScoreBreakdown,
  JobMatchSource,
  JobMatchSourceItem,
  JobMatchWeights,
} from "@/schema/job-match";

const DEFAULT_WEIGHTS: JobMatchWeights = {
  skills: 0.45,
  experience: 0.35,
  semantic: 0.2,
};

const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "with",
  "we",
  "you",
  "your",
  "our",
  "will",
  "can",
]);

type MatchResult = {
  jdId: string;
  resumeId: string | null;
  category: JobMatchItemCategory;
  jdText: string;
  resumeText: string | null;
  score: number;
  matched: boolean;
  evidence: string[];
};

export type JobMatchScoringResult = {
  weights: JobMatchWeights;
  subScores: JobMatchScoreBreakdown;
  matchScore: number;
  matches: MatchResult[];
  gaps: {
    required: string[];
    desired: string[];
  };
  strengths: string[];
  weaknesses: string[];
};

export function normalizeJobMatchText(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\u0000/g, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function tokenizeJobMatchText(text: string): string[] {
  return normalizeJobMatchText(text)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

function buildFrequencyMap(tokens: string[]): Map<string, number> {
  const frequencies = new Map<string, number>();

  for (const token of tokens) {
    frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
  }

  return frequencies;
}

function cosineSimilarity(leftTokens: string[], rightTokens: string[]): number {
  if (leftTokens.length === 0 || rightTokens.length === 0) return 0;

  const left = buildFrequencyMap(leftTokens);
  const right = buildFrequencyMap(rightTokens);
  const sharedTokens = new Set([...left.keys(), ...right.keys()]);

  let dotProduct = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (const token of sharedTokens) {
    const leftValue = left.get(token) ?? 0;
    const rightValue = right.get(token) ?? 0;
    dotProduct += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (leftMagnitude === 0 || rightMagnitude === 0) return 0;

  return dotProduct / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

function jaccardSimilarity(leftValues: string[], rightValues: string[]): number {
  const left = new Set(leftValues.map((value) => normalizeJobMatchText(value)).filter(Boolean));
  const right = new Set(rightValues.map((value) => normalizeJobMatchText(value)).filter(Boolean));

  if (left.size === 0 || right.size === 0) return 0;

  let intersection = 0;

  for (const value of left) {
    if (right.has(value)) intersection += 1;
  }

  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

function isSkillLike(category: JobMatchItemCategory): boolean {
  return category === "skill" || category === "project" || category === "other";
}

function isExperienceLike(category: JobMatchItemCategory): boolean {
  return category === "experience" || category === "responsibility" || category === "education";
}

function itemToSearchText(item: JobMatchSourceItem): string {
  return [item.text, ...item.keywords, ...item.evidence].join(" ");
}

function scoreItemPair(jdItem: JobMatchSourceItem, resumeItem: JobMatchSourceItem): number {
  const jdTokens = tokenizeJobMatchText(itemToSearchText(jdItem));
  const resumeTokens = tokenizeJobMatchText(itemToSearchText(resumeItem));
  const vectorScore = cosineSimilarity(jdTokens, resumeTokens);
  const keywordScore = jaccardSimilarity(jdItem.keywords, resumeItem.keywords);
  const categoryBonus =
    jdItem.category === resumeItem.category
      ? 0.08
      : isSkillLike(jdItem.category) && isSkillLike(resumeItem.category)
        ? 0.05
        : isExperienceLike(jdItem.category) && isExperienceLike(resumeItem.category)
          ? 0.05
          : 0;

  return Math.max(0, Math.min(1, vectorScore * 0.78 + keywordScore * 0.14 + categoryBonus));
}

function averageWeightedScore(items: Array<{ score: number; weight: number }>): number {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight === 0) return 0;

  const weightedScore = items.reduce((sum, item) => sum + item.score * item.weight, 0);
  return weightedScore / totalWeight;
}

function ratioToPercent(value: number): number {
  return Math.round(value * 1000) / 10;
}

function roundScorePercent(value: number): number {
  return Math.round(value * 10) / 10;
}

export function scoreJobMatch(
  parsedJob: JobMatchSource,
  parsedResume: JobMatchSource,
  weights = DEFAULT_WEIGHTS,
): JobMatchScoringResult {
  const matches: MatchResult[] = [];
  const skillScores: Array<{ score: number; weight: number }> = [];
  const experienceScores: Array<{ score: number; weight: number }> = [];
  const semanticScores: Array<{ score: number; weight: number }> = [];
  const requiredGaps: string[] = [];
  const desiredGaps: string[] = [];

  for (const jdItem of parsedJob.items) {
    let bestMatch: JobMatchSourceItem | null = null;
    let bestScore = 0;

    for (const resumeItem of parsedResume.items) {
      const score = scoreItemPair(jdItem, resumeItem);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = resumeItem;
      }
    }

    const matched = bestScore >= 0.72;
    const evidence = bestMatch ? bestMatch.evidence.slice(0, 2) : [];

    matches.push({
      jdId: jdItem.id,
      resumeId: bestMatch?.id ?? null,
      category: jdItem.category,
      jdText: jdItem.text,
      resumeText: bestMatch?.text ?? null,
      score: bestScore,
      matched,
      evidence: evidence.length > 0 ? evidence : bestMatch ? [bestMatch.text] : [],
    });

    const groupWeight = Math.max(1, jdItem.importance);
    semanticScores.push({ score: bestScore, weight: groupWeight });

    if (isSkillLike(jdItem.category)) {
      skillScores.push({ score: bestScore, weight: groupWeight });
    }

    if (isExperienceLike(jdItem.category)) {
      experienceScores.push({ score: bestScore, weight: groupWeight });
    }

    if (!matched) {
      const formatted = `${jdItem.text} (${jdItem.category})`;
      if (jdItem.importance >= 2) requiredGaps.push(formatted);
      else desiredGaps.push(formatted);
    }
  }

  const subScores = {
    skills: ratioToPercent(averageWeightedScore(skillScores)),
    experience: ratioToPercent(averageWeightedScore(experienceScores)),
    semantic: ratioToPercent(averageWeightedScore(semanticScores)),
  };

  const matchScore = roundScorePercent(
    (weights.skills * subScores.skills +
      weights.experience * subScores.experience +
      weights.semantic * subScores.semantic) /
      Math.max(weights.skills + weights.experience + weights.semantic, 0.0001),
  );

  const strengths = matches
    .filter((match) => match.matched)
    .sort((left, right) => right.score - left.score)
    .slice(0, 3)
    .map((match) => `${match.jdText} (${Math.round(match.score * 100)}%)`);

  const weaknesses = matches
    .filter((match) => !match.matched)
    .sort((left, right) => left.score - right.score)
    .slice(0, 3)
    .map((match) => `${match.jdText} (${Math.round(match.score * 100)}%)`);

  return {
    weights,
    subScores,
    matchScore,
    matches,
    gaps: {
      required: requiredGaps,
      desired: desiredGaps,
    },
    strengths,
    weaknesses,
  };
}
