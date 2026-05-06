import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { BriefcaseIcon, GlobeIcon, PencilSimpleLineIcon, PlusIcon, TrashSimpleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useEffect, useMemo, useState } from "react";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { client, orpc } from "@/integrations/orpc/client";

import { DashboardHeader } from "../-components/header";

type WorkStatus = "draft" | "saved" | "applied" | "interview" | "offer" | "rejected";
type WorkStatusFilter = WorkStatus | "all";

const searchSchema = z.object({
  status: z.enum(["all", "draft", "saved", "applied", "interview", "offer", "rejected"]).default("all"),
});

export const Route = createFileRoute("/dashboard/jobs/")({
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

const statusOptions: Array<{ value: WorkStatus; label: string }> = [
  { value: "draft", label: t`Draft` },
  { value: "saved", label: t`Saved` },
  { value: "applied", label: t`Applied` },
  { value: "interview", label: t`Interview` },
  { value: "offer", label: t`Offer` },
  { value: "rejected", label: t`Rejected` },
];

const statusFilterOptions: Array<{ value: WorkStatusFilter; label: string }> = [
  { value: "all", label: t`All statuses` },
  ...statusOptions,
];

function RouteComponent() {
  const navigate = useNavigate({ from: Route.fullPath });
  const { status: statusFilter } = Route.useSearch();
  const { session } = Route.useRouteContext();
  const { data: resumeList } = useQuery({
    ...orpc.resume.list.queryOptions(),
    enabled: Boolean(session) || !import.meta.env.DEV,
  });

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

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEvaluatingId, setIsEvaluatingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<WorkFormState>(defaultFormState);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (statusFilter === "all") return entries;
    return entries.filter((entry) => entry.status === statusFilter);
  }, [entries, statusFilter]);

  const statusLabelMap = useMemo(() => {
    return Object.fromEntries(statusOptions.map((option) => [option.value, option.label])) as Record<
      WorkStatus,
      string
    >;
  }, []);

  const resumeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const resume of resumeList ?? []) {
      map.set(resume.id, resume.name);
    }
    return map;
  }, [resumeList]);

  const resumeOptions = useMemo(() => {
    return (resumeList ?? []).map((resume) => ({ value: resume.id, label: resume.name }));
  }, [resumeList]);

  const persistEntries = (nextEntries: WorkEntry[]) => {
    setEntries(nextEntries);

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEntries));
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormError(null);
    setForm(defaultFormState);
  };

  const openCreateForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEditForm = (entry: WorkEntry) => {
    setEditingId(entry.id);
    setForm({
      company: entry.company,
      position: entry.position,
      applyUrl: entry.applyUrl,
      responsibilities: entry.responsibilities,
      resumeId: entry.resumeId,
      status: entry.status,
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const onSave = () => {
    if (!form.company.trim() || !form.position.trim()) {
      setFormError(t`Company and Position are required.`);
      return;
    }

    setFormError(null);

    const now = new Date().toISOString();

    const nextEntries = editingId
      ? entries.map((entry) =>
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
        )
      : [
          {
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
          },
          ...entries,
        ];

    persistEntries(nextEntries);

    closeForm();
  };

  const onDelete = (id: string) => {
    const nextEntries = entries.filter((entry) => entry.id !== id);
    persistEntries(nextEntries);

    if (editingId === id) {
      closeForm();
    }
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

      const nextEntries = entries.map((item) =>
        item.id === entry.id
          ? {
              ...item,
              matchScore: score,
              matchReason: reason,
              updatedAt: new Date().toISOString(),
            }
          : item,
      );

      persistEntries(nextEntries);

      void navigate({
        to: "/builder/$resumeId",
        params: { resumeId: entry.resumeId },
        search: {
          leftMode: "manual",
          rightMode: "job-analysis",
          jobId: entry.id,
          jobCompany: entry.company,
          jobPosition: entry.position,
          jobUrl: entry.applyUrl,
          jobResponsibilities: entry.responsibilities,
          jobStatus: entry.status,
          jobMatchScore: score.toString(),
          jobMatchReason: reason,
        },
      });
    } finally {
      setIsEvaluatingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <DashboardHeader icon={BriefcaseIcon} title={t`Jobs`} />

      <Separator />

      <div className="flex flex-col gap-4 rounded-md border bg-popover p-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="w-full max-w-sm space-y-2">
          <Label>
            <Trans>All statuses</Trans>
          </Label>
          <Combobox
            value={statusFilter}
            options={statusFilterOptions}
            showClear={false}
            onValueChange={(value) => {
              void navigate({
                search: {
                  status: (value as WorkStatusFilter | null) ?? "all",
                },
              });
            }}
          />
        </div>

        <Button onClick={openCreateForm}>
          <PlusIcon />
          <Trans>新增工作记录</Trans>
        </Button>
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
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const linkedResume = entry.resumeId ? resumeNameMap.get(entry.resumeId) : null;

            return (
              <div key={entry.id} className="space-y-3 rounded-md border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{entry.position}</h3>
                    <p className="text-sm text-muted-foreground">{entry.company}</p>
                  </div>

                  <div className="flex gap-2">
                    <Button size="icon" variant="ghost" onClick={() => openEditForm(entry)}>
                      <PencilSimpleLineIcon />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => onDelete(entry.id)}>
                      <TrashSimpleIcon />
                    </Button>
                  </div>
                </div>

                {entry.responsibilities && (
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">{entry.responsibilities}</p>
                )}

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
          })}
        </div>
      )}

      <Dialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <form
            className="space-y-6"
            onSubmit={(event) => {
              event.preventDefault();
              onSave();
            }}
          >
            <DialogHeader>
              <DialogTitle>{editingId ? <Trans>编辑工作记录</Trans> : <Trans>新增工作记录</Trans>}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 lg:grid-cols-2">
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
            </div>

            {formError && <p className="text-sm text-destructive">{formError}</p>}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={closeForm}>
                <Trans>Cancel</Trans>
              </Button>
              <Button type="submit">
                <Trans>确认</Trans>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
