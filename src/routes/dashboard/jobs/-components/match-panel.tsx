import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { Separator } from "@/components/ui/separator";

type ResumeOption = {
  id: string;
  name: string;
};

type MatchSkill = {
  name: string;
  matched: boolean;
};

type MatchResult = {
  score: number;
  skills: MatchSkill[];
};

type MatchPanelProps = {
  resumeId: string;
  resumeOptions: ResumeOption[];
  matchResult: MatchResult | null;
  isAnalyzing: boolean;
  onResumeChange: (value: string) => void;
  onAnalyze: () => void;
};

export function MatchPanel({
  resumeId,
  resumeOptions,
  matchResult,
  isAnalyzing,
  onResumeChange,
  onAnalyze,
}: MatchPanelProps) {
  return (
    <section className="space-y-3 rounded-md border bg-popover p-4">
      <h3 className="text-sm font-medium">
        <Trans>Match Panel</Trans>
      </h3>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          <Trans>Import Resume</Trans>
        </p>
        <Combobox
          value={resumeId || null}
          options={resumeOptions.map((item) => ({ value: item.id, label: item.name }))}
          placeholder={t`Select a resume`}
          onValueChange={(value) => onResumeChange(value ?? "")}
        />
      </div>

      <Button disabled={!resumeId || isAnalyzing} onClick={onAnalyze}>
        <Trans>Analyze Match</Trans>
      </Button>

      {matchResult && (
        <>
          <Separator />

          <div className="rounded-md border bg-card p-3">
            <p className="text-xs text-muted-foreground">
              <Trans>Match Score</Trans>
            </p>
            <p className="text-lg font-semibold">{matchResult.score}%</p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              <Trans>Skill Matching</Trans>
            </p>

            {matchResult.skills.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                <Trans>No skills extracted from this job description.</Trans>
              </p>
            ) : (
              <div className="space-y-1">
                {matchResult.skills.map((skill) => (
                  <p key={skill.name} className="text-sm text-muted-foreground">
                    {skill.matched ? "✔" : "❌"} {skill.name}
                  </p>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
