import { describe, expect, it } from "vitest";

import { scoreJobMatch, tokenizeJobMatchText } from "./job-match";

describe("tokenizeJobMatchText", () => {
  it("normalizes punctuation and removes stop words", () => {
    expect(tokenizeJobMatchText("Senior Frontend Engineer for React & TypeScript")).toEqual([
      "senior",
      "frontend",
      "engineer",
      "react",
      "typescript",
    ]);
  });
});

describe("scoreJobMatch", () => {
  it("scores a strong skill overlap higher than a weak one", () => {
    const result = scoreJobMatch(
      {
        title: "Frontend Engineer",
        summary: null,
        items: [
          {
            id: "skill-react",
            category: "skill",
            text: "React and TypeScript",
            importance: 3,
            keywords: ["React", "TypeScript"],
            evidence: [],
          },
          {
            id: "exp-api",
            category: "experience",
            text: "Build and maintain user-facing APIs",
            importance: 2,
            keywords: ["API", "maintenance"],
            evidence: [],
          },
        ],
      },
      {
        title: "Resume",
        summary: null,
        items: [
          {
            id: "resume-react",
            category: "skill",
            text: "React, TypeScript, and Next.js",
            importance: 3,
            keywords: ["React", "TypeScript", "Next.js"],
            evidence: ["Built React apps with TypeScript"],
          },
          {
            id: "resume-node",
            category: "experience",
            text: "Implemented Node.js services and REST APIs",
            importance: 2,
            keywords: ["Node.js", "REST", "API"],
            evidence: ["Implemented REST APIs"],
          },
        ],
      },
    );

    expect(result.matchScore).toBeGreaterThan(55);
    expect(result.subScores.skills).toBeGreaterThan(70);
    expect(result.gaps.required).toEqual(["Build and maintain user-facing APIs (experience)"]);
    expect(result.matches[0]?.matched).toBe(true);
  });

  it("reports missing required requirements", () => {
    const result = scoreJobMatch(
      {
        title: "Backend Engineer",
        summary: null,
        items: [
          {
            id: "skill-go",
            category: "skill",
            text: "Go",
            importance: 3,
            keywords: ["Go"],
            evidence: [],
          },
        ],
      },
      {
        title: "Resume",
        summary: null,
        items: [
          {
            id: "resume-react",
            category: "skill",
            text: "React",
            importance: 3,
            keywords: ["React"],
            evidence: [],
          },
        ],
      },
    );

    expect(result.matchScore).toBeLessThan(50);
    expect(result.gaps.required).toEqual(["Go (skill)"]);
  });
});
