import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/applications/")({
  component: ApplicationsPage,
});

import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAIStore } from "@/integrations/ai/store";
import { orpc } from "@/integrations/orpc/client";
import { applicationRecordStorage } from "@/services/application-storage";
import { cn } from "@/utils/cn";

import { ApplicationsList } from "./applications-list";

function ApplicationsPage() {
  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const analyzeMutation = useMutation(orpc.applications.analyzeJob.mutationOptions());
  const ai = useAIStore();

  const refreshApplications = () => {
    // TODO: replace 'local' with real user id from session when available
    const apps = applicationRecordStorage.getByUserId("local") ?? [];
    setApplications(apps);
  };

  useEffect(() => {
    refreshApplications();
  }, []);

  const handleAnalyze = async () => {
    if (!jobTitle || !company || !jobDescription) {
      setError("Please fill in job title, company, and description");
      return;
    }

    // Check if AI is configured
    if (!ai.provider || !ai.model || !ai.apiKey) {
      setError("Please configure your AI provider, model, and API key in settings first");
      toast.error("AI provider not configured");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        title: jobTitle,
        company,
        description: jobDescription,
        url: url || undefined,
        aiCredentials: {
          provider: ai.provider,
          model: ai.model,
          apiKey: ai.apiKey,
          baseURL: ai.baseURL,
        },
      };

      const data = await analyzeMutation.mutateAsync(payload as any);
      setResult(data);
      toast.success("Job analysis complete!");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to analyze job";
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-4xl font-bold text-slate-900">Job Application Workflow</h1>
        <p className="mb-8 text-lg text-slate-600">Analyze job postings and generate optimized resumes</p>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Input Panel */}
          <Card className="sticky top-8 h-fit p-6">
            <h2 className="mb-6 text-2xl font-semibold text-slate-900">Job Description</h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Job Title</label>
                <Input
                  placeholder="e.g., Senior Frontend Engineer"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Company</label>
                <Input
                  placeholder="e.g., Google"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">URL (Optional)</label>
                <Input
                  placeholder="e.g., https://example.com/jobs/123"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={loading}
                  type="url"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Job Description</label>
                <Textarea
                  placeholder="Paste the full job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  disabled={loading}
                  rows={12}
                  className="min-h-80"
                />
              </div>

              <Button onClick={handleAnalyze} disabled={loading} size="lg" className="w-full">
                {loading ? "Analyzing..." : "Analyze Job"}
              </Button>

              {error && (
                <div className="rounded-md border border-red-200 bg-red-50 p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
            </div>
          </Card>

          {/* Results Panel */}
          <div className="space-y-4">
            {result && (
              <>
                {/* Session Info */}
                <Card className="border-blue-200 bg-blue-50 p-4">
                  <h3 className="mb-2 font-semibold text-blue-900">Session Created</h3>
                  <p className="text-sm text-blue-700">Session ID: {result.sessionId}</p>
                  <p className="text-sm text-blue-700">Current Step: {result.currentStep}</p>
                </Card>

                {/* Parsed JD Results */}
                {result.parsedJD && (
                  <Card className="p-6">
                    <h3 className="mb-4 text-xl font-semibold text-slate-900">Parsed Job Description</h3>
                    <div className="space-y-4">
                      {/* Skills */}
                      {result.parsedJD.requirements?.skills && (
                        <div>
                          <h4 className="mb-2 font-medium text-slate-700">Required Skills</h4>
                          <div className="flex flex-wrap gap-2">
                            {result.parsedJD.requirements.skills.map((skill: any, idx: number) => (
                              <span
                                key={idx}
                                className={cn(
                                  "inline-block rounded-full px-3 py-1 text-sm font-medium",
                                  skill.importance === "required"
                                    ? "bg-red-100 text-red-700"
                                    : skill.importance === "desired"
                                      ? "bg-yellow-100 text-yellow-700"
                                      : "bg-green-100 text-green-700",
                                )}
                              >
                                {skill.name}
                                {skill.importance !== "required" && (
                                  <span className="ml-1 text-xs">({skill.importance})</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Experience */}
                      {result.parsedJD.requirements?.experience &&
                        result.parsedJD.requirements.experience.length > 0 && (
                          <div>
                            <h4 className="mb-2 font-medium text-slate-700">Experience</h4>
                            <ul className="space-y-1">
                              {result.parsedJD.requirements.experience.map((exp: any, idx: number) => (
                                <li key={idx} className="text-sm text-slate-600">
                                  • {exp.description} ({exp.yearsRequired} years)
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                      {/* Keywords */}
                      {result.parsedJD.keywords && result.parsedJD.keywords.length > 0 && (
                        <div>
                          <h4 className="mb-2 font-medium text-slate-700">Keywords</h4>
                          <p className="text-sm text-slate-600">{result.parsedJD.keywords.join(", ")}</p>
                        </div>
                      )}

                      {/* Seniority */}
                      {result.parsedJD.seniority && (
                        <div>
                          <h4 className="mb-2 font-medium text-slate-700">Seniority Level</h4>
                          <p className="text-sm text-slate-600 capitalize">{result.parsedJD.seniority}</p>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Match Analysis */}
                {result.matchAnalysis && (
                  <Card className="p-6">
                    <h3 className="mb-4 text-xl font-semibold text-slate-900">Match Analysis</h3>
                    <div className="space-y-4">
                      {/* Overall Score */}
                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <h4 className="font-medium text-slate-700">Overall Match Score</h4>
                          <span className="text-2xl font-bold text-slate-900">
                            {result.matchAnalysis.overallScore}%
                          </span>
                        </div>
                        <div className="h-3 w-full rounded-full bg-slate-200">
                          <div
                            className={cn(
                              "h-3 rounded-full transition-all",
                              result.matchAnalysis.overallScore >= 80
                                ? "bg-green-500"
                                : result.matchAnalysis.overallScore >= 60
                                  ? "bg-yellow-500"
                                  : "bg-red-500",
                            )}
                            style={{ width: `${result.matchAnalysis.overallScore}%` }}
                          />
                        </div>
                      </div>

                      {/* Strengths */}
                      {result.matchAnalysis.strengths && result.matchAnalysis.strengths.length > 0 && (
                        <div>
                          <h4 className="mb-2 font-medium text-green-700">Strengths</h4>
                          <ul className="space-y-1">
                            {result.matchAnalysis.strengths.slice(0, 3).map((strength: string, idx: number) => (
                              <li key={idx} className="text-sm text-slate-600">
                                ✓ {strength}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Recommendations */}
                      {result.matchAnalysis.recommendations && result.matchAnalysis.recommendations.length > 0 && (
                        <div>
                          <h4 className="mb-2 font-medium text-slate-700">Recommendations</h4>
                          <ul className="space-y-1">
                            {result.matchAnalysis.recommendations.slice(0, 3).map((rec: string, idx: number) => (
                              <li key={idx} className="text-sm text-slate-600">
                                → {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Next Steps */}
                <Card className="border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-600">
                    <strong>Next steps:</strong> Review the analysis above. You can now generate an optimized resume or
                    proceed with the application.
                  </p>
                </Card>
              </>
            )}

            {/* Applications list (stored records) */}
            <ApplicationsList applications={applications} onRefresh={refreshApplications} userId={"local"} />

            {!result && !loading && (
              <Card className="flex h-96 items-center justify-center p-6">
                <div className="text-center">
                  <p className="mb-2 text-lg text-slate-500">No analysis yet</p>
                  <p className="text-sm text-slate-400">
                    Enter a job description and click "Analyze Job" to get started
                  </p>
                </div>
              </Card>
            )}

            {loading && (
              <Card className="flex h-96 items-center justify-center p-6">
                <div className="text-center">
                  <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-blue-500" />
                  <p className="text-lg text-slate-600">Analyzing job posting...</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Parsing requirements, matching skills, and generating recommendations
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
