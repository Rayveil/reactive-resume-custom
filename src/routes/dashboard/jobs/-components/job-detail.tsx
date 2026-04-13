import { Trans } from "@lingui/react/macro";
import { GlobeIcon } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

type Job = {
  id: string;
  company: string;
  title: string;
  link: string;
  description: string;
};

type JobDetailProps = {
  job: Job;
};

export function JobDetail({ job }: JobDetailProps) {
  return (
    <section className="space-y-3 rounded-md border bg-popover p-4">
      <div>
        <p className="text-xs text-muted-foreground">
          <Trans>Company</Trans>
        </p>
        <p className="text-sm font-medium">{job.company}</p>
      </div>

      <div>
        <p className="text-xs text-muted-foreground">
          <Trans>Job Title</Trans>
        </p>
        <p className="text-sm font-medium">{job.title}</p>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          <Trans>Description</Trans>
        </p>
        <p className="text-sm whitespace-pre-wrap text-muted-foreground">{job.description}</p>
      </div>

      {job.link && (
        <Button variant="outline" onClick={() => window.open(job.link, "_blank", "noopener,noreferrer")}>
          <GlobeIcon />
          <Trans>Open Job Link</Trans>
        </Button>
      )}
    </section>
  );
}
