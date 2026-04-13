import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { BriefcaseIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { orpc } from "@/integrations/orpc/client";

import { DashboardHeader } from "../-components/header";
import { JobDetail } from "./-components/job-detail";
import { JobList } from "./-components/job-list";
import { MatchPanel } from "./-components/match-panel";

export const Route = createFileRoute("/dashboard/jobs/")({
  component: RouteComponent,
});

type Job = {
  id: string;
  company: string;
  title: string;
  link: string;
  description: string;
};

type ResumeOption = {
  id: string;
  name: string;
  skills: string[];
};

type MatchResult = {
  score: number;
  skills: Array<{ name: string; matched: boolean }>;
};

const initialJobs: Job[] = [
  {
    id: crypto.randomUUID(),
    company: "Acme Tech",
    title: "Frontend Engineer",
    link: "https://example.com/jobs/frontend-engineer",
    description:
      "Build React interfaces, optimize performance, collaborate with designers, write reusable components, and maintain accessibility best practices.",
  },
  {
    id: crypto.randomUUID(),
    company: "Northwind Data",
    title: "Full Stack Developer",
    link: "https://example.com/jobs/fullstack",
    description:
      "Develop TypeScript APIs and web apps, own database modeling, improve CI pipelines, and deliver features with strong product thinking.",
  },
];

function RouteComponent() {
  const { data: resumeList } = useQuery(orpc.resume.list.queryOptions());

  const [jobs, setJobs] = useState<Job[]>(initialJobs);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isJobDetailOpen, setIsJobDetailOpen] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const [form, setForm] = useState<Omit<Job, "id">>({
    company: "",
    title: "",
    link: "",
    description: "",
  });

  const resumeOptions = useMemo<ResumeOption[]>(() => {
    if (!resumeList || resumeList.length === 0) {
      return [
        { id: "mock-fe", name: "Frontend Resume", skills: ["react", "typescript", "accessibility", "performance"] },
        { id: "mock-fs", name: "Full Stack Resume", skills: ["node", "typescript", "postgres", "api", "ci"] },
      ];
    }

    return resumeList.map((resume) => ({
      id: resume.id,
      name: resume.name,
      skills: resume.name.toLowerCase().split(/\s+/).filter((word) => word.length > 2),
    }));
  }, [resumeList]);

  const selectedJob = useMemo(() => jobs.find((job) => job.id === selectedJobId) ?? null, [jobs, selectedJobId]);

  const onOpenJob = (job: Job) => {
    setSelectedJobId(job.id);
    setSelectedResumeId("");
    setMatchResult(null);
    setIsJobDetailOpen(true);
  };

  const onDeleteJob = (id: string) => {
    setJobs((prev) => prev.filter((job) => job.id !== id));

    if (selectedJobId === id) {
      setSelectedJobId(null);
      setIsJobDetailOpen(false);
      setMatchResult(null);
      setSelectedResumeId("");
    }
  };

  const onCreateJob = () => {
    if (!form.company.trim() || !form.title.trim() || !form.description.trim()) return;

    const nextJob: Job = {
      id: crypto.randomUUID(),
      company: form.company.trim(),
      title: form.title.trim(),
      link: form.link.trim(),
      description: form.description.trim(),
    };

    setJobs((prev) => [nextJob, ...prev]);
    setForm({ company: "", title: "", link: "", description: "" });
    setIsAddDialogOpen(false);
  };

  const onAnalyze = () => {
    if (!selectedJob || !selectedResumeId) return;

    setIsAnalyzing(true);

    const jobKeywords = extractKeywords(selectedJob.description);
    const selectedResume = resumeOptions.find((resume) => resume.id === selectedResumeId);
    const resumeSkills = selectedResume?.skills ?? [];

    const skills = jobKeywords.slice(0, 8).map((keyword) => ({
      name: keyword,
      matched: resumeSkills.includes(keyword),
    }));

    const matchedCount = skills.filter((item) => item.matched).length;
    const score = skills.length === 0 ? 0 : Math.round((matchedCount / skills.length) * 100);

    setMatchResult({ score, skills });
    setIsAnalyzing(false);
  };

  return (
    <div className="space-y-4">
      <DashboardHeader icon={BriefcaseIcon} title={t`Jobs`} />

      <Separator />

      <JobList
        jobs={jobs}
        selectedJobId={selectedJobId}
        onOpenAddDialog={() => setIsAddDialogOpen(true)}
        onDeleteJob={onDeleteJob}
        onSelectJob={onOpenJob}
      />

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans>Add Job</Trans>
            </DialogTitle>
            <DialogDescription>
              <Trans>Create a new job entry for tracking and match analysis.</Trans>
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="job-company">
                <Trans>Company</Trans>
              </Label>
              <Input
                id="job-company"
                value={form.company}
                onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
                placeholder={t`e.g. Acme Tech`}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job-title">
                <Trans>Title</Trans>
              </Label>
              <Input
                id="job-title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder={t`e.g. Frontend Engineer`}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job-link">
                <Trans>Link</Trans>
              </Label>
              <Input
                id="job-link"
                value={form.link}
                onChange={(e) => setForm((prev) => ({ ...prev, link: e.target.value }))}
                placeholder={t`https://...`}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="job-description">
                <Trans>Description</Trans>
              </Label>
              <Textarea
                id="job-description"
                rows={6}
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder={t`Paste role responsibilities and requirements...`}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button onClick={onCreateJob}>
              <Trans>Add Job</Trans>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={isJobDetailOpen} onOpenChange={setIsJobDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>
              <Trans>Job Detail</Trans>
            </SheetTitle>
            <SheetDescription>
              <Trans>Review role details and analyze the selected resume match.</Trans>
            </SheetDescription>
          </SheetHeader>

          {selectedJob ? (
            <div className="space-y-4 p-4 pt-0">
              <JobDetail job={selectedJob} />

              <MatchPanel
                resumeId={selectedResumeId}
                resumeOptions={resumeOptions}
                matchResult={matchResult}
                isAnalyzing={isAnalyzing}
                onResumeChange={setSelectedResumeId}
                onAnalyze={onAnalyze}
              />
            </div>
          ) : (
            <div className="p-4 text-sm text-muted-foreground">
              <Trans>Select a job from the list to view details.</Trans>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function extractKeywords(input: string): string[] {
  const stopWords = new Set([
    "with",
    "from",
    "that",
    "this",
    "have",
    "will",
    "your",
    "and",
    "the",
    "for",
    "you",
    "are",
    "our",
    "job",
    "role",
  ]);

  return input
    .toLowerCase()
    .replace(/<[^>]+>/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3 && !stopWords.has(word))
    .filter((word, index, list) => list.indexOf(word) === index);
}
