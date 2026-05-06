import { Trans } from "@lingui/react/macro";

import type { WebpageTemplate } from "../-types/webpage";

interface TemplateOption {
  id: WebpageTemplate;
  icon: string;
}

const templates: TemplateOption[] = [
  {
    id: "modern",
    icon: "✨",
  },
  {
    id: "professional",
    icon: "💼",
  },
  {
    id: "creative",
    icon: "🎨",
  },
];

interface TemplateSelectorProps {
  selected: WebpageTemplate;
  onChange: (template: WebpageTemplate) => void;
}

export function TemplateSelector(props: TemplateSelectorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        <Trans>Choose a Template</Trans>
      </h3>
      <div className="grid gap-4 md:grid-cols-3">
        <button
          onClick={() => props.onChange("modern")}
          className={`rounded-lg border-2 p-4 text-left transition-all ${
            props.selected === "modern"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div className="mb-2 flex items-start gap-3">
            <span className="text-2xl">✨</span>
            <div>
              <h4 className="font-semibold text-gray-900">
                <Trans>Modern</Trans>
              </h4>
              <p className="text-sm text-gray-600">
                <Trans>Clean and contemporary design with gradient accents</Trans>
              </p>
            </div>
          </div>
          <p className="ml-9 text-xs text-gray-500">
            <Trans>Blue gradient header, modern typography, card-based layout</Trans>
          </p>
        </button>

        <button
          onClick={() => props.onChange("professional")}
          className={`rounded-lg border-2 p-4 text-left transition-all ${
            props.selected === "professional"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div className="mb-2 flex items-start gap-3">
            <span className="text-2xl">💼</span>
            <div>
              <h4 className="font-semibold text-gray-900">
                <Trans>Professional</Trans>
              </h4>
              <p className="text-sm text-gray-600">
                <Trans>Classic two-column layout perfect for corporate roles</Trans>
              </p>
            </div>
          </div>
          <p className="ml-9 text-xs text-gray-500">
            <Trans>Dark sidebar, organized sections, minimalist aesthetic</Trans>
          </p>
        </button>

        <button
          onClick={() => props.onChange("creative")}
          className={`rounded-lg border-2 p-4 text-left transition-all ${
            props.selected === "creative"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 bg-white hover:border-gray-300"
          }`}
        >
          <div className="mb-2 flex items-start gap-3">
            <span className="text-2xl">🎨</span>
            <div>
              <h4 className="font-semibold text-gray-900">
                <Trans>Creative</Trans>
              </h4>
              <p className="text-sm text-gray-600">
                <Trans>Bold and vibrant design for creative professionals</Trans>
              </p>
            </div>
          </div>
          <p className="ml-9 text-xs text-gray-500">
            <Trans>Purple-pink gradient, timeline design, modern accents</Trans>
          </p>
        </button>
      </div>
    </div>
  );
}
