import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { BriefcaseIcon, GlobeIcon, PencilSimpleLineIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useEffect, useMemo, useState } from "react";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { client, orpc, type RouterOutput } from "@/integrations/orpc/client";

import { DashboardHeader } from "../-components/header";

type Resume = RouterOutput["resume"]["list"][number];
type WorkStatus = "draft" | "saved" | "applied" | "interview" | "offer" | "rejected";
type WorkStatusFilter = WorkStatus | "all";

const searchSchema = z.object({
  status: z.enum(["all", "draft", "saved", "applied", "interview", "offer", "rejected"]).default("all"),
});

export const Route = createFileRoute("/dashboard/work/")({
  component: RouteComponent,
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [stripSearchParams({ status: "all" })],
  },
});

type WorkEntry = {
  id: string;
  company: string;
  position: string;
  applyUrl: string;
  responsibilities: string;
  resumeId: string;
  status: WorkStatus;
  matchScore: number | null;
  matchReason: string;
  createdAt: string;
  updatedAt: string;
};

type WorkFormState = {
  company: string;
  position: string;
  applyUrl: string;
  responsibilities: string;
  resumeId: string;
  status: WorkStatus;
};

const STORAGE_KEY = "work-tracker.entries";

const defaultFormState: WorkFormState = {
  company: "",
  position: "",
  applyUrl: "",
  responsibilities: "",
  resumeId: "",
  status: "draft",
};

const statusOptions = [
  { value: "draft", label: t`Draft` },
  { value: "saved", label: t`Saved` },
  { value: "applied", label: t`Applied` },
  { value: "interview", label: t`Interview` },
  { value: "offer", label: t`Offer` },
  { value: "rejected", label: t`Rejected` },
] as const;

const statusFilterOptions = [{ value: "all", label: t`All statuses` }, ...statusOptions] as const;

function RouteComponent() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { status: statusFilter } = Route.useSearch();
  const { data: resumes } = useQuery(orpc.resume.list.queryOptions());

  const [entries, setEntries] = useState<WorkEntry[]>(() => {
    if (typeof window === "undefined") return [];

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    try {
      return JSON.parse(raw) as WorkEntry[];
    } catch {
      return [];
    }
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEvaluatingId, setIsEvaluatingId] = useState<string | null>(null);
  const [form, setForm] = useState<WorkFormState>(defaultFormState);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const resumeOptions = useMemo(() => {
    if (!resumes) return [];
    return resumes.map((resume) => ({ value: resume.id, label: resume.name }));
  }, [resumes]);

  const resumeMap = useMemo(() => {
    const map = new Map<string, Resume>();
    for (const resume of resumes ?? []) map.set(resume.id, resume);
    return map;
  }, [resumes]);

  const filteredEntries = useMemo(() => {
    if (statusFilter === "all") return entries;
    return entries.filter((entry) => entry.status === statusFilter);
  }, [entries, statusFilter]);

  const statusLabelMap = useMemo(() => {
    return Object.fromEntries(statusOptions.map((option) => [option.value, option.label])) as Record<WorkStatus, string>;
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm(defaultFormState);
  };

  const onSave = () => {
    if (!form.company.trim() || !form.position.trim()) return;

    const now = new Date().toISOString();

    if (editingId) {
      setEntries(
        entries.map((entry) =>
          entry.id === editingId
            ? {
                ...entry,
                company: form.company.trim(),
                position: form.position.trim(),
                applyUrl: form.applyUrl.trim(),
                responsibilities: form.responsibilities.trim(),
                resumeId: form.resumeId,
                status: form.status,
                updatedAt: now,
              }
            : entry,
        ),
      );
      resetForm();
      return;
    }

    const next: WorkEntry = {
      id: crypto.randomUUID(),
      company: form.company.trim(),
      position: form.position.trim(),
      applyUrl: form.applyUrl.trim(),
      responsibilities: form.responsibilities.trim(),
      resumeId: form.resumeId,
      status: form.status,
      matchScore: null,
      matchReason: "",
      createdAt: now,
      updatedAt: now,
    };

    setEntries([next, ...entries]);
    resetForm();
  };

  const onEdit = (entry: WorkEntry) => {
    setEditingId(entry.id);
    setForm({
      company: entry.company,
      position: entry.position,
      applyUrl: entry.applyUrl,
      responsibilities: entry.responsibilities,
      resumeId: entry.resumeId,
      status: entry.status,
    });
  };

  const onDelete = (id: string) => {
    setEntries(entries.filter((entry) => entry.id !== id));
    if (editingId === id) resetForm();
  };

  const onEvaluate = async (entry: WorkEntry) => {
    if (!entry.resumeId) return;
    setIsEvaluatingId(entry.id);

    try {
      const resume = await client.resume.getById({ id: entry.resumeId });

      const jobText = `${entry.company} ${entry.position} ${entry.responsibilities}`;
      const resumeText = [
        resume.data.basics.name,
        resume.data.basics.headline,
        resume.data.summary.content,
        ...resume.data.sections.skills.items.flatMap((skill) => [skill.name, ...skill.keywords]),
        ...resume.data.sections.experience.items.flatMap((item) => [item.company, item.position, item.description]),
      ].join(" ");

      const { score, reason } = estimateMatch(jobText, resumeText);

      setEntries(
        entries.map((item) =>
          item.id === entry.id
            ? {
                ...item,
                matchScore: score,
                matchReason: reason,
                updatedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
    } finally {
      setIsEvaluatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <DashboardHeader icon={BriefcaseIcon} title={t`Work`} />

      <Separator />

      <div className="grid gap-4 rounded-md border bg-popover p-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="company">
            <Trans>Company</Trans>
          </Label>
          <Input
            id="company"
            value={form.company}
            placeholder={t`e.g. Acme Corp`}
            onChange={(e) => setForm((prev) => ({ ...prev, company: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="position">
            <Trans>Position</Trans>
          </Label>
          <Input
            id="position"
            value={form.position}
            placeholder={t`e.g. Frontend Engineer`}
            onChange={(e) => setForm((prev) => ({ ...prev, position: e.target.value }))}
          />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="apply-url">
            <Trans>Application Link</Trans>
          </Label>
          <Input
            id="apply-url"
            type="url"
            value={form.applyUrl}
            placeholder={t`https://...`}
            onChange={(e) => setForm((prev) => ({ ...prev, applyUrl: e.target.value }))}
          />
        </div>

        <div className="space-y-2 lg:col-span-2">
          <Label htmlFor="responsibilities">
            <Trans>Responsibilities</Trans>
          </Label>
          <Textarea
            id="responsibilities"
            rows={6}
            value={form.responsibilities}
            placeholder={t`Paste key requirements and responsibilities from the job post...`}
            onChange={(e) => setForm((prev) => ({ ...prev, responsibilities: e.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label>
            <Trans>Linked Resume</Trans>
          </Label>
          <Combobox
            value={form.resumeId || null}
            options={resumeOptions}
            placeholder={t`Select a resume`}
            showClear
            onValueChange={(value) => setForm((prev) => ({ ...prev, resumeId: value ?? "" }))}
          />
        </div>

        <div className="space-y-2">
          <Label>
            <Trans>Status</Trans>
          </Label>
          <Combobox
            value={form.status}
            options={statusOptions}
            onValueChange={(value) => {
              if (!value) return;
              setForm((prev) => ({ ...prev, status: value as WorkStatus }));
            }}
          />
        </div>

        <div className="flex gap-2 lg:col-span-2">
          <Button onClick={onSave}>{editingId ? <Trans>Save Changes</Trans> : <Trans>Add Work Item</Trans>}</Button>
          {editingId && (
            <Button variant="outline" onClick={resetForm}>
              <Trans>Cancel</Trans>
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="w-full max-w-xs space-y-2">
          <Label>
            <Trans>Filter by status</Trans>
          </Label>
          <Combobox
            value={statusFilter}
            options={statusFilterOptions}
            onValueChange={(value) => {
              void navigate({
                search: {
                  status: (value as WorkStatusFilter | null) ?? "all",
                },
              });
            }}
          />
        </div>

        {filteredEntries.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            {entries.length === 0 ? (
              <Trans>No work items yet. Add your first company and position above.</Trans>
            ) : (
              <Trans>No work items in this status.</Trans>
            )}
          </div>
        ) : (
          filteredEntries.map((entry) => {
            const linkedResume = entry.resumeId ? resumeMap.get(entry.resumeId)?.name : null;

            return (
              <div key={entry.id} className="space-y-3 rounded-md border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-medium">{entry.position}</h3>
                    <p className="text-sm text-muted-foreground">{entry.company}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => onEdit(entry)}>
                      <PencilSimpleLineIcon />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => onDelete(entry.id)}>
                      <TrashSimpleIcon />
                    </Button>
                  </div>
                </div>

                {entry.responsibilities && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{entry.responsibilities}</p>}

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span>
                    <Trans>Status</Trans>: {statusLabelMap[entry.status]}
                  </span>
                  {linkedResume && (
                    <span>
                      <Trans>Resume</Trans>: {linkedResume}
                    </span>
                  )}
                  {entry.matchScore !== null && (
                    <span>
                      <Trans>Match</Trans>: {entry.matchScore}%
                    </span>
                  )}
                </div>

                {entry.matchReason && <p className="text-xs text-muted-foreground">{entry.matchReason}</p>}

                <div className="flex flex-wrap gap-2">
                  {entry.applyUrl && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        window.open(entry.applyUrl, "_blank", "noopener,noreferrer");
                      }}
                    >
                      <GlobeIcon />
                      <Trans>Open Apply Link</Trans>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    disabled={!entry.resumeId || isEvaluatingId === entry.id}
                    onClick={() => onEvaluate(entry)}
                  >
                    {isEvaluatingId === entry.id ? <Trans>Evaluating...</Trans> : <Trans>Evaluate Resume Match</Trans>}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function estimateMatch(jobTextRaw: string, resumeTextRaw: string): { score: number; reason: string } {
  const jobWords = new Set(tokenize(jobTextRaw));
  const resumeWords = new Set(tokenize(resumeTextRaw));

  if (jobWords.size === 0 || resumeWords.size === 0) {
    return { score: 0, reason: t`Not enough text to compute a match score.` };
  }

  let overlap = 0;
  for (const word of jobWords) {
    if (resumeWords.has(word)) overlap++;
  }

  const score = Math.max(0, Math.min(100, Math.round((overlap / jobWords.size) * 100)));
  return {
    score,
    reason: t`${overlap} matching keywords out of ${jobWords.size} extracted from the job record.`,
  };
}

function tokenize(text: string): string[] {
  const normalized = text
    .replace(/<[^>]*>/g, " ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ");

  return normalized
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3);
}