import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import type { PromptLanguage, WebpageTemplate } from "./-types/webpage";

import { TemplateSelector } from "./-components/template-selector";
import { WebpageExportDialog } from "./-components/webpage-export-dialog";
import { WebpagePreview } from "./-components/webpage-preview";
import { WebpageGenerator } from "./-services/webpage-generator";

export const Route = createFileRoute("/dashboard/webpage")({
  component: RouteComponent,
});

function RouteComponent() {
  return <WebpagePage />;
}

function WebpagePage() {
  const [selectedTemplate, setSelectedTemplate] = useState<WebpageTemplate>("modern");
  const [promptLanguage, setPromptLanguage] = useState<PromptLanguage>("zh-CN");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState("");

  const regenerateInitialPrompt = () => {
    const generator = new WebpageGenerator({ template: selectedTemplate });
    setInitialPrompt(generator.getInitialPrompt(promptLanguage));
  };

  const copyPrompt = async () => {
    if (!initialPrompt.trim()) return;

    try {
      await navigator.clipboard.writeText(initialPrompt);
      alert(t`Initial prompt copied to clipboard.`);
    } catch (error) {
      console.error("Failed to copy prompt:", error);
      alert(t`Failed to copy prompt. Please copy it manually from the text area.`);
    }
  };

  useEffect(() => {
    regenerateInitialPrompt();
  }, [selectedTemplate, promptLanguage]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            <Trans>Generate Webpage</Trans>
          </h1>
          <p className="text-gray-600">
            <Trans>Create a beautiful, shareable webpage from your resume profile</Trans>
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Settings Panel */}
          <div className="space-y-6 lg:col-span-1">
            {/* Template Selection */}
            <div className="rounded-lg bg-white p-6 shadow">
              <TemplateSelector selected={selectedTemplate} onChange={setSelectedTemplate} />
            </div>

            {/* Export Button */}
            <div className="rounded-lg bg-white p-6 shadow">
              <button
                onClick={() => setExportDialogOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-600"
              >
                <span>⬇️</span>
                <span>
                  <Trans>Download Webpage</Trans>
                </span>
              </button>
              <p className="mt-3 text-center text-xs text-gray-500">
                <Trans>Export as standalone HTML file ready to share</Trans>
              </p>
            </div>

            {/* Info Card */}
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h4 className="mb-2 font-semibold text-blue-900">
                ✨ <Trans>Features</Trans>
              </h4>
              <ul className="space-y-1 text-sm text-blue-900">
                <li>
                  ✓ <Trans>Fully responsive design</Trans>
                </li>
                <li>
                  ✓ <Trans>Print-friendly layout</Trans>
                </li>
                <li>
                  ✓ <Trans>No external dependencies</Trans>
                </li>
                <li>
                  ✓ <Trans>SEO optimized</Trans>
                </li>
                <li>
                  ✓ <Trans>Easy to share</Trans>
                </li>
              </ul>
            </div>

            {/* Tips */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
              <h4 className="mb-2 font-semibold text-amber-900">
                💡 <Trans>Pro Tips</Trans>
              </h4>
              <ul className="space-y-2 text-sm text-amber-900">
                <li>
                  1. <Trans>Make sure your profile data is complete in the Personal section</Trans>
                </li>
                <li>
                  2. <Trans>Preview looks best on desktop screens</Trans>
                </li>
                <li>
                  3. <Trans>Test in different browsers before sharing</Trans>
                </li>
              </ul>
            </div>

            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h4 className="font-semibold text-gray-900">
                  <Trans>Initial Prompt</Trans>
                </h4>
                <div className="flex gap-2">
                  <select
                    value={promptLanguage}
                    onChange={(event) => setPromptLanguage(event.target.value as PromptLanguage)}
                    className="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700"
                  >
                    <option value="zh-CN">{t`Chinese`}</option>
                    <option value="en">{t`English`}</option>
                  </select>
                  <button
                    onClick={regenerateInitialPrompt}
                    className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    <Trans>Regenerate</Trans>
                  </button>
                  <button
                    onClick={() => void copyPrompt()}
                    className="rounded bg-gray-900 px-2 py-1 text-xs text-white transition-colors hover:bg-black"
                  >
                    <Trans>Copy</Trans>
                  </button>
                </div>
              </div>

              <p className="mb-2 text-xs text-gray-500">
                <Trans>Generated from your current profile data. You can copy and edit it before sending to AI.</Trans>
              </p>

              <textarea
                value={initialPrompt}
                onChange={(event) => setInitialPrompt(event.target.value)}
                className="h-44 w-full resize-y rounded border border-gray-300 p-2 font-mono text-xs text-gray-800 focus:border-gray-400 focus:outline-none"
              />
            </div>
          </div>

          {/* Preview Panel */}
          <div className="rounded-lg bg-white p-6 shadow lg:col-span-2">
            <WebpagePreview template={selectedTemplate} autoRefresh={true} />
          </div>
        </div>
      </div>

      {/* Export Dialog */}
      <WebpageExportDialog
        template={selectedTemplate}
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
      />
    </div>
  );
}
