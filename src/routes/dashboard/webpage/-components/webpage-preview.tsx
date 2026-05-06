import { Trans } from "@lingui/react/macro";
import { useEffect, useRef, useState } from "react";

import type { WebpageTemplate } from "../-types/webpage";

import { WebpageGenerator } from "../-services/webpage-generator";

interface WebpagePreviewProps {
  template: WebpageTemplate;
  autoRefresh?: boolean;
}

export function WebpagePreview(props: WebpagePreviewProps) {
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const generatePreview = async () => {
    setLoading(true);
    try {
      const generator = new WebpageGenerator({ template: props.template });
      const html = generator.getPreviewHTML();
      setPreviewHtml(html);
    } catch (error) {
      console.error("Failed to generate preview:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generatePreview();
  }, [props.template, props.autoRefresh]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          <Trans>Preview</Trans>
        </h3>
        <button
          onClick={generatePreview}
          disabled={loading}
          className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? <Trans>Generating...</Trans> : <Trans>Refresh</Trans>}
        </button>
      </div>

      {previewHtml ? (
        <iframe
          ref={iframeRef}
          srcDoc={previewHtml}
          className="w-full rounded-lg border border-gray-300 shadow-sm"
          style={{ height: "600px" }}
          title="Webpage Preview"
          sandbox="allow-same-origin"
        />
      ) : (
        <div
          className="flex items-center justify-center rounded-lg border border-gray-300 bg-gray-50"
          style={{ height: "600px" }}
        >
          <div className="text-center">
            <div className="mb-2 text-4xl text-gray-400">⏳</div>
            <p className="text-gray-600">
              <Trans>Loading preview...</Trans>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
