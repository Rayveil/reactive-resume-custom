import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { ArrowCounterClockwiseIcon, CheckCircleIcon, SparkleIcon, XCircleIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useIsClient } from "usehooks-ts";

import type { JobMatchOutput } from "@/schema/job-match";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAIStore } from "@/integrations/ai/store";
import { orpc } from "@/integrations/orpc/client";
import { cn } from "@/utils/style";

const demoJobDescription = `We are looking for a Frontend Engineer with strong experience in React, TypeScript, and API integration.

Requirements:
- 3+ years building production web applications
- Strong React and TypeScript skills
- Experience with REST APIs and design systems
- Nice to have: accessibility, testing, and GraphQL`;

const demoResumeText = `Frontend Engineer
Acme Studio
- Built reusable React components in TypeScript for a design system used across multiple products.
- Integrated REST APIs and improved page load performance by 35%.
- Added unit tests and accessibility improvements.

Skills: React, TypeScript, Next.js, REST APIs, Testing, Accessibility`;

function MatchScoreBadge({ score }: { score: number }) {
  const variant =
    score >= 75
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
      : score >= 50
        ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
        : "border-red-500/30 bg-red-500/10 text-red-700";

  return (
    <div className={cn("flex min-h-28 items-center justify-center rounded-2xl border p-6 text-center", variant)}>
      <div>
        <div className="text-4xl leading-none font-semibold">{score}%</div>
        <div className="mt-2 text-sm font-medium tracking-[0.2em] uppercase opacity-80">
          <Trans>Match Score</Trans>
        </div>
      </div>
    </div>
  );
}

function JobMatchPanelClient() {
  const ai = useAIStore();
  const [jobDescription, setJobDescription] = useState(demoJobDescription);
  const [resumeText, setResumeText] = useState(demoResumeText);
  const [analysis, setAnalysis] = useState<JobMatchOutput | null>(null);

  const matchJobCvMutation = useMutation(orpc.ai.matchJobCv.mutationOptions());
  const isConfigured = Boolean(ai.provider && ai.model && ai.apiKey);

  const handleDemoLoad = () => {
    setJobDescription(demoJobDescription);
    setResumeText(demoResumeText);
  };

  const handleAnalyze = async () => {
    if (!isConfigured) {
      toast.error(t`Configure your AI provider, model, and API key first.`);
      return;
    }

    try {
      const result = await matchJobCvMutation.mutateAsync({
        provider: ai.provider,
        model: ai.model,
        apiKey: ai.apiKey,
        baseURL: ai.baseURL,
        jobDescription,
        resumeText,
      });
      setAnalysis(result);
      toast.success(t`Job match analysis complete.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t`Could not analyze job match.`);
    }
  };

  const missingRequired = analysis?.gaps.required ?? [];
  const missingDesired = analysis?.gaps.desired ?? [];
  const requiredMatches = analysis?.matches.filter((match) => match.matched && match.score >= 0.72).slice(0, 6) ?? [];
  const weakMatches = analysis?.matches.filter((match) => !match.matched).slice(0, 6) ?? [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 rounded-2xl border bg-card p-5 shadow-sm"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <SparkleIcon className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">
              <Trans>Job-CV Match Analyzer</Trans>
            </h2>
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            <Trans>
              Paste a job description and resume text. The system will extract structured items, score skill and
              experience alignment, and explain exactly why the match is high or low.
            </Trans>
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handleDemoLoad}>
            <ArrowCounterClockwiseIcon />
            <Trans>Load demo</Trans>
          </Button>
          <Button size="sm" onClick={handleAnalyze} disabled={matchJobCvMutation.isPending}>
            {matchJobCvMutation.isPending ? <Spinner /> : <SparkleIcon />}
            <Trans>Analyze match</Trans>
          </Button>
        </div>
      </div>

      {!isConfigured && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-800">
          <Trans>
            Configure your AI provider settings first. This analyzer uses the same provider/model/API key as the rest of
            the AI features.
          </Trans>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="job-match-jd">
            <Trans>Job Description</Trans>
          </Label>
          <Textarea
            id="job-match-jd"
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            placeholder={t`Paste the job description here`}
            className="min-h-72"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="job-match-resume">
            <Trans>Resume Text</Trans>
          </Label>
          <Textarea
            id="job-match-resume"
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value)}
            placeholder={t`Paste the resume text here`}
            className="min-h-72"
          />
        </div>
      </div>

      {analysis && (
        <>
          <Separator />

          <div className="grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)]">
            <MatchScoreBadge score={analysis.matchScore} />

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { label: t`Skill Match`, value: analysis.subScores.skills },
                { label: t`Experience Match`, value: analysis.subScores.experience },
                { label: t`Semantic Similarity`, value: analysis.subScores.semantic },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border bg-background p-4">
                  <div className="text-xs tracking-[0.16em] text-muted-foreground uppercase">{item.label}</div>
                  <div className="mt-2 text-3xl font-semibold">{item.value}%</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-background p-4">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="size-4 text-emerald-600" />
                <h3 className="font-medium">
                  <Trans>Why this score?</Trans>
                </h3>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{analysis.explanation}</p>
              {analysis.weaknesses.length > 0 && (
                <div className="mt-4 space-y-2 text-sm">
                  <div className="font-medium text-foreground">
                    <Trans>Key gaps</Trans>
                  </div>
                  <ul className="space-y-1 text-muted-foreground">
                    {analysis.weaknesses.slice(0, 3).map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <XCircleIcon className="mt-0.5 size-4 text-red-500" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="rounded-xl border bg-background p-4">
              <h3 className="font-medium">
                <Trans>Missing skills</Trans>
              </h3>
              <div className="mt-3 space-y-4 text-sm">
                <div>
                  <div className="mb-2 text-xs tracking-[0.16em] text-muted-foreground uppercase">
                    <Trans>Required</Trans>
                  </div>
                  {missingRequired.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {missingRequired.map((item) => (
                        <Badge key={item} variant="destructive" className="gap-1">
                          <XCircleIcon className="size-3" />
                          {item}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      <Trans>No required gaps detected.</Trans>
                    </p>
                  )}
                </div>

                <div>
                  <div className="mb-2 text-xs tracking-[0.16em] text-muted-foreground uppercase">
                    <Trans>Nice to have</Trans>
                  </div>
                  {missingDesired.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {missingDesired.map((item) => (
                        <Badge key={item} variant="outline" className="gap-1">
                          <XCircleIcon className="size-3 text-amber-600" />
                          {item}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      <Trans>No optional gaps detected.</Trans>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-xl border bg-background p-4">
              <h3 className="font-medium">
                <Trans>Matched evidence</Trans>
              </h3>
              <div className="mt-3 space-y-2 text-sm">
                {requiredMatches.length > 0 ? (
                  requiredMatches.map((match) => (
                    <div key={match.jdId} className="rounded-lg border bg-muted/30 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{match.jdText}</div>
                        <Badge variant="secondary">{Math.round(match.score * 100)}%</Badge>
                      </div>
                      <div className="mt-2 text-muted-foreground">{match.resumeText ?? <Trans>No evidence</Trans>}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground">
                    <Trans>No strong matches yet.</Trans>
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border bg-background p-4">
              <h3 className="font-medium">
                <Trans>Suggestions</Trans>
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {analysis.suggestions.length > 0 ? (
                  analysis.suggestions.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <CheckCircleIcon className="mt-0.5 size-4 text-emerald-600" />
                      <span>{item}</span>
                    </li>
                  ))
                ) : (
                  <li>
                    <Trans>No suggestions generated.</Trans>
                  </li>
                )}
              </ul>
            </div>
          </div>

          <div className="rounded-xl border bg-background p-4">
            <h3 className="font-medium">
              <Trans>Weak matches</Trans>
            </h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {weakMatches.length > 0 ? (
                weakMatches.map((match) => (
                  <div key={match.jdId} className="rounded-lg border p-3 text-sm">
                    <div className="font-medium">{match.jdText}</div>
                    <div className="mt-1 text-muted-foreground">
                      <Trans>Best score:</Trans> {Math.round(match.score * 100)}%
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  <Trans>No weak matches detected.</Trans>
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </motion.section>
  );
}

export function JobMatchPanel() {
  const isClient = useIsClient();

  if (!isClient) return null;

  return <JobMatchPanelClient />;
}
