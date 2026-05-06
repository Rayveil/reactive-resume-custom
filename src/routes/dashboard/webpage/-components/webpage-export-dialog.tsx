import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";

import type { WebpageTemplate } from "../-types/webpage";

import { WebpageGenerator } from "../-services/webpage-generator";

interface WebpageExportDialogProps {
  template: WebpageTemplate;
  open: boolean;
  onClose: () => void;
}

export function WebpageExportDialog(props: WebpageExportDialogProps) {
  const [fileName, setFileName] = useState("my-resume");
  const [exporting, setExporting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleExport = async () => {
    if (!fileName) {
      alert(t`Please enter a filename`);
      return;
    }

    setExporting(true);
    try {
      const generator = new WebpageGenerator({ template: props.template });
      generator.download(`${fileName}.html`);

      setSuccessMessage(`✅ ${t`Webpage exported successfully!`}`);
      setTimeout(() => {
        setSuccessMessage("");
        props.onClose();
      }, 2000);
    } catch (error) {
      console.error("Export failed:", error);
      alert(t`Failed to export webpage. Please try again.`);
    } finally {
      setExporting(false);
    }
  };

  if (!props.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="mb-4 text-xl font-bold text-gray-900">
          <Trans>Export Webpage</Trans>
        </h2>

        {successMessage && <div className="mb-4 rounded-lg bg-green-50 p-3 text-green-700">{successMessage}</div>}

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              <Trans>Filename</Trans>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="my-resume"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <span className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-600">.html</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              <Trans>A standalone HTML file that can be opened in any browser</Trans>
            </p>
          </div>

          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-sm text-blue-900">
              💡{" "}
              <span className="font-medium">
                <Trans>Tip:</Trans>
              </span>{" "}
              <Trans>Share the HTML file directly or upload it to any web hosting service.</Trans>
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={props.onClose}
              disabled={exporting}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <Trans>Cancel</Trans>
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
            >
              {exporting ? <Trans>Exporting...</Trans> : <Trans>Download</Trans>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
