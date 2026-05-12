"use client";

import React, { useEffect } from "react";

import type { ResumeData } from "@/schema/resume/data";
import type { ImprovementRecommendation } from "@/services/agents/ml-modules/improvement-generator";

import { ResumeModificationPreview } from "@/components/resume-modification-preview";
import { useResumeModification } from "@/services/agents/use-resume-modification";

const SAMPLE_RESUME: ResumeData = {
  picture: {
    hidden: false,
    url: "",
    size: 80,
    rotation: 0,
    aspectRatio: 1,
    borderRadius: 0,
    borderColor: "rgba(0,0,0,0.5)",
    borderWidth: 0,
    shadowColor: "rgba(0,0,0,0.5)",
    shadowWidth: 0,
  },
  basics: {
    name: "Jane Doe",
    headline: "Backend Engineer",
    email: "jane@example.com",
    phone: "+1000000000",
    location: "Remote",
    website: { url: "", label: "" },
    customFields: [],
  },
  summary: { title: "", columns: 1, hidden: false, content: "Experienced backend engineer." },
  sections: {
    profiles: { title: "Profiles", columns: 1, hidden: false, items: [] },
    experience: {
      title: "Experience",
      columns: 1,
      hidden: false,
      items: [
        {
          id: "exp-1",
          hidden: false,
          company: "ACME",
          position: "Backend Engineer",
          location: "Remote",
          period: "2021 - Present",
          website: { url: "", label: "" },
          description: "Built REST APIs and maintained services.",
          roles: [],
        },
      ],
    },
    education: { title: "Education", columns: 1, hidden: false, items: [] },
    projects: { title: "Projects", columns: 1, hidden: false, items: [] },
    skills: {
      title: "Skills",
      columns: 1,
      hidden: false,
      items: [{ id: "s-1", hidden: false, icon: "", name: "Python", proficiency: "Advanced", level: 4, keywords: [] }],
    },
    languages: { title: "Languages", columns: 1, hidden: false, items: [] },
    interests: { title: "Interests", columns: 1, hidden: false, items: [] },
    awards: { title: "Awards", columns: 1, hidden: false, items: [] },
    certifications: { title: "Certifications", columns: 1, hidden: false, items: [] },
    publications: { title: "Publications", columns: 1, hidden: false, items: [] },
    volunteer: { title: "Volunteer", columns: 1, hidden: false, items: [] },
    references: { title: "References", columns: 1, hidden: false, items: [] },
  },
  customSections: [],
  metadata: {
    template: "onyx",
    layout: {
      sidebarWidth: 35,
      pages: [
        { gapX: 14, gapY: 14, marginX: 14, marginY: 14, fullWidth: false, main: ["experience"], sidebar: ["skills"] },
      ],
    },
    css: { enabled: false, value: "" },
    page: { gapX: 14, gapY: 14, marginX: 14, marginY: 14, format: "a4", locale: "en-US", hideIcons: false },
    design: {
      level: { icon: "", type: "circle" },
      colors: { primary: "rgba(66,100,205,1)", text: "rgba(0,0,0,1)", background: "rgba(255,255,255,1)" },
    },
    typography: {
      body: { fontFamily: "Inter", fontWeights: ["400"], fontSize: 11, lineHeight: 1.5 },
      heading: { fontFamily: "Inter", fontWeights: ["700"], fontSize: 14, lineHeight: 1.5 },
    },
    notes: "",
    extractedBy: "demo",
    extractedAt: new Date().toISOString(),
    source: "json",
    memoryId: "demo-resume-1",
  },
};

const SAMPLE_IMPROVEMENTS: ImprovementRecommendation[] = [
  {
    category: "skill_gap",
    priority: "high",
    suggestion: "Add Kubernetes to your skills",
    reasoning: "Job requires Kubernetes",
    implementation: "Add 'Kubernetes' to the skills section with 'Intermediate' proficiency",
    impact: "+8% match score",
    examples: ["Kubernetes orchestration"],
  },
  {
    category: "semantic_alignment",
    priority: "high",
    suggestion: "Emphasize system design capabilities",
    reasoning: "Position values system design",
    implementation: "Update experience description to: 'Architected scalable microservices architecture'",
    impact: "+10% match score",
  },
];

export default function DemoResumeModificationPage() {
  const { previewSet, generatePreviews, applyChanges, currentResume } = useResumeModification({
    resume: SAMPLE_RESUME,
    jobId: "job-demo",
  });

  useEffect(() => {
    // Try fetching real ML improvements from server; fallback to SAMPLE_IMPROVEMENTS
    let mounted = true;

    async function fetchAndGenerate() {
      try {
        const resp = await fetch("/api/modification-previews", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resume: SAMPLE_RESUME, jobInput: { title: "Demo Job" }, useLLM: false }),
        });
        const data = await resp.json();
        if (mounted && data && data.ok && data.analysis && data.analysis.improvements) {
          const recs = data.analysis.improvements.recommendations || [];
          generatePreviews(recs, { title: "Demo Job" });
          return;
        }
      } catch (e) {
        // ignore and fallback
      }

      if (mounted) generatePreviews(SAMPLE_IMPROVEMENTS, { title: "Demo Job" });
    }

    fetchAndGenerate();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Resume Modification Preview — Demo</h1>
      {previewSet ? (
        <ResumeModificationPreview previewSet={previewSet} onUpdate={() => {}} onApply={applyChanges} />
      ) : (
        <div>Loading previews…</div>
      )}

      {currentResume && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold">Modified Resume (preview)</h2>
          <pre className="mt-2 max-h-64 overflow-auto rounded bg-gray-100 p-3">
            {JSON.stringify(currentResume, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
