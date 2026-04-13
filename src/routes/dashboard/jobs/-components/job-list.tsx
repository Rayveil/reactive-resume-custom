import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { BriefcaseIcon, PlusIcon, TrashSimpleIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

type Job = {
  id: string;
  company: string;
  title: string;
  link: string;
  description: string;
};

type JobListProps = {
  jobs: Job[];
  selectedJobId: string | null;
  onSelectJob: (job: Job) => void;
  onDeleteJob: (id: string) => void;
  onOpenAddDialog: () => void;
};

export function JobList({ jobs, selectedJobId, onSelectJob, onDeleteJob, onOpenAddDialog }: JobListProps) {
  return (
    <section className="space-y-3 rounded-md border bg-popover p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">
          <Trans>Job List</Trans>
        </h2>

        <Button size="sm" onClick={onOpenAddDialog}>
          <PlusIcon />
          <Trans>Add Job</Trans>
        </Button>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          <Trans>No jobs yet. Add your first job record.</Trans>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <div
              key={job.id}
              className={[
                "rounded-md border bg-card p-3 transition-colors",
                selectedJobId === job.id ? "border-primary/40 bg-accent/30" : "hover:bg-accent/30",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <button type="button" className="flex min-w-0 flex-1 items-start gap-2 text-left" onClick={() => onSelectJob(job)}>
                  <BriefcaseIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{job.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{job.company}</p>
                  </div>
                </button>

                <Button
                  size="icon"
                  variant="ghost"
                  title={t`Delete`}
                  onClick={() => onDeleteJob(job.id)}
                  aria-label={t`Delete`}
                >
                  <TrashSimpleIcon />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
