import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import {
  CheckCircleIcon,
  ChevronDownIcon,
  ClockIcon,
  PlusIcon,
  TrashIcon,
  XCircleIcon,
  DownloadIcon,
} from "@phosphor-icons/react";
import { useState } from "react";

import type { Application } from "@/schema/application";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ApplicationExport, LocalApplicationStorage } from "@/services/application-storage";

type Props = {
  applications: Application[];
  onRefresh: () => void;
  userId: string;
};

export function ApplicationsList({ applications, onRefresh, userId }: Props) {
  const [filter, setFilter] = useState<Application["status"] | "all">("all");
  const [sortBy, setSortBy] = useState<"date" | "score">("date");
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);

  const filteredApplications = filter === "all" ? applications : applications.filter((app) => app.status === filter);

  const sortedApplications = [...filteredApplications].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    const scoreA = a.resumeMatchAssessment?.overallScore ?? 0;
    const scoreB = b.resumeMatchAssessment?.overallScore ?? 0;
    return scoreB - scoreA;
  });

  const handleDelete = (id: string) => {
    if (confirm(t`Are you sure you want to delete this application?`)) {
      LocalApplicationStorage.delete(id);
      onRefresh();
    }
  };

  const handleStatusChange = (id: string, status: Application["status"]) => {
    LocalApplicationStorage.update(id, { status });
    onRefresh();
  };

  const handleExportJSON = () => {
    ApplicationExport.downloadJSON(filteredApplications, "applications.json");
  };

  const handleExportCSV = () => {
    ApplicationExport.downloadCSV(filteredApplications, "applications.csv");
  };

  const getStatusColor = (status: Application["status"]) => {
    switch (status) {
      case "draft":
        return "bg-gray-100 text-gray-800";
      case "submitted":
        return "bg-blue-100 text-blue-800";
      case "reviewing":
        return "bg-yellow-100 text-yellow-800";
      case "interviewing":
        return "bg-purple-100 text-purple-800";
      case "offer":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const stats = {
    total: applications.length,
    draft: applications.filter((a) => a.status === "draft").length,
    submitted: applications.filter((a) => a.status === "submitted").length,
    interviewing: applications.filter((a) => a.status === "interviewing").length,
    offer: applications.filter((a) => a.status === "offer").length,
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="p-4">
          <p className="text-sm text-gray-600">
            <Trans>Total</Trans>
          </p>
          <p className="mt-1 text-3xl font-bold">{stats.total}</p>
        </Card>
        <Card className="border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-700">
            <Trans>Submitted</Trans>
          </p>
          <p className="mt-1 text-3xl font-bold text-blue-900">{stats.submitted}</p>
        </Card>
        <Card className="border-purple-200 bg-purple-50 p-4">
          <p className="text-sm text-purple-700">
            <Trans>Interviewing</Trans>
          </p>
          <p className="mt-1 text-3xl font-bold text-purple-900">{stats.interviewing}</p>
        </Card>
        <Card className="border-green-200 bg-green-50 p-4">
          <p className="text-sm text-green-700">
            <Trans>Offers</Trans>
          </p>
          <p className="mt-1 text-3xl font-bold text-green-900">{stats.offer}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-gray-600">
            <Trans>Success Rate</Trans>
          </p>
          <p className="mt-1 text-3xl font-bold">
            {stats.total > 0 ? Math.round(((stats.offer + stats.interviewing) / stats.total) * 100) : 0}%
          </p>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Select value={filter} onValueChange={(value: any) => setFilter(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <Trans>All Statuses</Trans>
                </SelectItem>
                <SelectItem value="draft">
                  <Trans>Draft</Trans>
                </SelectItem>
                <SelectItem value="submitted">
                  <Trans>Submitted</Trans>
                </SelectItem>
                <SelectItem value="interviewing">
                  <Trans>Interviewing</Trans>
                </SelectItem>
                <SelectItem value="offer">
                  <Trans>Offer</Trans>
                </SelectItem>
                <SelectItem value="rejected">
                  <Trans>Rejected</Trans>
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">
                  <Trans>Newest</Trans>
                </SelectItem>
                <SelectItem value="score">
                  <Trans>Best Match</Trans>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleExportJSON}>
              <DownloadIcon className="size-4" />
              <Trans>JSON</Trans>
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              <DownloadIcon className="size-4" />
              <Trans>CSV</Trans>
            </Button>
          </div>
        </div>
      </Card>

      {/* Applications List */}
      <div className="space-y-3">
        {sortedApplications.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-600">
              <Trans>No applications found</Trans>
            </p>
          </Card>
        ) : (
          sortedApplications.map((app) => (
            <Card key={app.id} className="p-4 transition-all hover:border-blue-300 hover:shadow-md">
              <div className="grid gap-4 sm:grid-cols-3">
                {/* Job Info */}
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold">{app.jobTitle}</h3>
                  <p className="text-sm text-gray-600">{app.company}</p>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="secondary" className="text-xs">
                      {new Date(app.createdAt).toLocaleDateString()}
                    </Badge>
                    {app.appliedWithCustomResume && (
                      <Badge className="bg-green-100 text-xs text-green-800">
                        <Trans>Tailored Resume</Trans>
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Match Score */}
                <div className="flex flex-col items-center justify-center">
                  {app.resumeMatchAssessment ? (
                    <div className="text-center">
                      <div className="text-4xl font-bold text-blue-600">{app.resumeMatchAssessment.overallScore}%</div>
                      <p className="text-sm text-gray-600">
                        <Trans>Match Score</Trans>
                      </p>
                      <div className="mt-2 flex justify-center gap-1 text-xs">
                        <span>Skills: {app.resumeMatchAssessment.skillsMatch}%</span>
                        <span>•</span>
                        <span>Exp: {app.resumeMatchAssessment.experienceMatch}%</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <ClockIcon className="mx-auto mb-2 size-8 text-gray-400" />
                      <p className="text-sm text-gray-600">
                        <Trans>Not analyzed</Trans>
                      </p>
                    </div>
                  )}
                </div>

                {/* Status and Actions */}
                <div className="space-y-3">
                  <Select value={app.status} onValueChange={(status: any) => handleStatusChange(app.id, status)}>
                    <SelectTrigger className={`w-full ${getStatusColor(app.status)}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">
                        <Trans>Draft</Trans>
                      </SelectItem>
                      <SelectItem value="submitted">
                        <Trans>Submitted</Trans>
                      </SelectItem>
                      <SelectItem value="interviewing">
                        <Trans>Interviewing</Trans>
                      </SelectItem>
                      <SelectItem value="offer">
                        <Trans>Offer</Trans>
                      </SelectItem>
                      <SelectItem value="rejected">
                        <Trans>Rejected</Trans>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedApplication(app);
                        setOpenDialog(true);
                      }}
                      className="flex-1"
                    >
                      <Trans>Details</Trans>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(app.id)}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <TrashIcon className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-h-screen max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedApplication?.jobTitle} @ {selectedApplication?.company}
            </DialogTitle>
          </DialogHeader>

          {selectedApplication && (
            <div className="space-y-4">
              {/* Match Assessment */}
              {selectedApplication.resumeMatchAssessment && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h3 className="mb-3 font-semibold">
                    <Trans>Match Assessment</Trans>
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <p className="text-sm text-blue-600">
                        <Trans>Overall Score</Trans>
                      </p>
                      <p className="text-2xl font-bold text-blue-900">
                        {selectedApplication.resumeMatchAssessment.overallScore}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-600">
                        <Trans>Skills Match</Trans>
                      </p>
                      <p className="text-2xl font-bold text-blue-900">
                        {selectedApplication.resumeMatchAssessment.skillsMatch}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-blue-600">
                        <Trans>Experience Match</Trans>
                      </p>
                      <p className="text-2xl font-bold text-blue-900">
                        {selectedApplication.resumeMatchAssessment.experienceMatch}%
                      </p>
                    </div>
                  </div>

                  {/* Matched Skills */}
                  {selectedApplication.resumeMatchAssessment.matchedSkills.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-medium text-green-700">
                        <CheckCircleIcon className="mr-1 inline" />
                        <Trans>Matched Skills</Trans>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedApplication.resumeMatchAssessment.matchedSkills.map((skill) => (
                          <Badge key={skill} className="bg-green-100 text-green-800">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Missing Skills */}
                  {selectedApplication.resumeMatchAssessment.missingSkills.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-medium text-red-700">
                        <XCircleIcon className="mr-1 inline" />
                        <Trans>Missing Skills</Trans>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedApplication.resumeMatchAssessment.missingSkills.map((skill) => (
                          <Badge key={skill} className="bg-red-100 text-red-800">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {selectedApplication.resumeMatchAssessment.recommendations.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-medium text-slate-700">
                        <Trans>Recommendations</Trans>
                      </p>
                      <ul className="list-inside list-disc space-y-1">
                        {selectedApplication.resumeMatchAssessment.recommendations.map((rec, idx) => (
                          <li key={idx} className="text-sm text-slate-700">
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <p className="mb-2 text-sm font-medium">
                  <Trans>Notes</Trans>
                </p>
                <p className="text-sm text-gray-700">{selectedApplication.notes || <Trans>No notes</Trans>}</p>
              </div>

              {/* Job Description */}
              <div>
                <p className="mb-2 text-sm font-medium">
                  <Trans>Job Description</Trans>
                </p>
                <div className="max-h-48 overflow-y-auto rounded-lg border bg-gray-50 p-3 text-xs whitespace-pre-wrap text-gray-700">
                  {selectedApplication.jobDescription}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
