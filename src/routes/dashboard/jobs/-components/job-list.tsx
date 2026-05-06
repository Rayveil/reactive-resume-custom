import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { BriefcaseIcon, TrashSimpleIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";

type WorkStatus = "draft" | "saved" | "applied" | "interview" | "offer" | "rejected";
type WorkStatusFilter = WorkStatus | "all";

type WorkEntry = {
  id: string;
  company: string;
  position: string;
  status: WorkStatus;
};

type JobListProps = {
  entries: WorkEntry[];
  hasAnyEntries: boolean;
  selectedEntryId: string | null;
  statusFilter: WorkStatusFilter;
  statusFilterOptions: Array<{ value: string; label: string }>;
  statusLabelMap: Record<WorkStatus, string>;
  onStatusChange: (value: string | null) => void;
  onSelectJob: (entry: WorkEntry) => void;
  onDeleteJob: (id: string) => void;
};

export function JobList({
  entries,
  hasAnyEntries,
  selectedEntryId,
  statusFilter,
  statusFilterOptions,
  statusLabelMap,
  onStatusChange,
  onSelectJob,
  onDeleteJob,
}: JobListProps) {
  return (
    <section className="space-y-3 rounded-md border bg-popover p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium">
          <Trans>Job List</Trans>
        </h2>

        <div className="w-full max-w-xs">
          <Combobox value={statusFilter} options={statusFilterOptions} onValueChange={onStatusChange} />
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {hasAnyEntries ? <Trans>No work items in this status.</Trans> : <Trans>No work items yet. Add your first company and position above.</Trans>}
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className={[
                "rounded-md border bg-card p-3 transition-colors",
                selectedEntryId === entry.id ? "border-primary/40 bg-accent/30" : "hover:bg-accent/30",
              ].join(" ")}
            >
              <div className="flex items-start justify-between gap-3">
                <button type="button" className="flex min-w-0 flex-1 items-start gap-2 text-left" onClick={() => onSelectJob(entry)}>
                  <BriefcaseIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{entry.position}</p>
                    <p className="truncate text-xs text-muted-foreground">{entry.company}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      <Trans>Status</Trans>: {statusLabelMap[entry.status]}
                    </p>
                  </div>
                </button>

                <Button
                  size="icon"
                  variant="ghost"
                  title={t`Delete`}
                  onClick={() => onDeleteJob(entry.id)}
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
