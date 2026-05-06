import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { Fragment, useCallback, useMemo, useRef, useState } from "react";
import { match } from "ts-pattern";

import { Button } from "@/components/ui/button";
import { Copyright } from "@/components/ui/copyright";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getSectionIcon,
  getSectionTitle,
  type RightSidebarSection,
  rightSidebarSections,
} from "@/utils/resume/section";

import { BuilderSidebarEdge } from "../../-components/edge";
import { useBuilderSidebar } from "../../-store/sidebar";
import { CSSSectionBuilder } from "./sections/css";
import { DesignSectionBuilder } from "./sections/design";
import { ExportSectionBuilder } from "./sections/export";
import { InformationSectionBuilder } from "./sections/information";
import { LayoutSectionBuilder } from "./sections/layout";
import { NotesSectionBuilder } from "./sections/notes";
import { PageSectionBuilder } from "./sections/page";
import { SharingSectionBuilder } from "./sections/sharing";
import { StatisticsSectionBuilder } from "./sections/statistics";
import { TemplateSectionBuilder } from "./sections/template";
import { TypographySectionBuilder } from "./sections/typography";
import { SectionBase } from "./shared/section-base";

function getSectionComponent(type: RightSidebarSection) {
  return match(type)
    .with("template", () => <TemplateSectionBuilder />)
    .with("layout", () => <LayoutSectionBuilder />)
    .with("typography", () => <TypographySectionBuilder />)
    .with("design", () => <DesignSectionBuilder />)
    .with("job-analysis", () => <JobAnalysisSectionBuilder />)
    .with("page", () => <PageSectionBuilder />)
    .with("css", () => <CSSSectionBuilder />)
    .with("notes", () => <NotesSectionBuilder />)
    .with("sharing", () => <SharingSectionBuilder />)
    .with("statistics", () => <StatisticsSectionBuilder />)
    .with("export", () => <ExportSectionBuilder />)
    .with("information", () => <InformationSectionBuilder />)
    .exhaustive();
}

type RightMode = "style" | "job-analysis";

const getInitialRightMode = (): RightMode => {
  if (typeof window === "undefined") return "style";

  const mode = new URLSearchParams(window.location.search).get("rightMode");
  return mode === "job-analysis" ? "job-analysis" : "style";
};

const setRightModeInUrl = (mode: RightMode) => {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.set("rightMode", mode);
  window.history.replaceState(window.history.state, "", url.toString());
};

export function BuilderSidebarRight() {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const [rightMode, setRightMode] = useState<RightMode>(getInitialRightMode);

  return (
    <>
      <SidebarEdge rightMode={rightMode} scrollAreaRef={scrollAreaRef} />

      <ScrollArea
        ref={scrollAreaRef}
        className="@container h-[calc(100svh-3.5rem)] overflow-hidden bg-background sm:me-12"
      >
        <div className="space-y-4 p-4">
          <Tabs
            value={rightMode}
            onValueChange={(value) => {
              const nextMode = (value as RightMode) ?? "style";
              setRightMode(nextMode);
              setRightModeInUrl(nextMode);
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="style">
                <Trans>样式设计</Trans>
              </TabsTrigger>
              <TabsTrigger value="job-analysis">
                <Trans>岗位具体分析</Trans>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {rightMode === "style" ? (
            rightSidebarSections.map((section) => (
              <Fragment key={section}>
                {getSectionComponent(section)}
                <Separator />
              </Fragment>
            ))
          ) : (
            <JobAnalysisSectionBuilder />
          )}

          <Copyright className="mx-auto py-2 text-center" />
        </div>
      </ScrollArea>
    </>
  );
}

type SidebarEdgeProps = {
  rightMode: RightMode;
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
};

function SidebarEdge({ rightMode, scrollAreaRef }: SidebarEdgeProps) {
  const toggleSidebar = useBuilderSidebar((state) => state.toggleSidebar);

  const scrollToSection = useCallback(
    (section: RightSidebarSection) => {
      if (!scrollAreaRef.current) return;
      toggleSidebar("right", true);

      const sectionElement = scrollAreaRef.current.querySelector(`#sidebar-${section}`);
      sectionElement?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    },
    [toggleSidebar, scrollAreaRef],
  );

  return (
    <BuilderSidebarEdge side="right">
      <div className="no-scrollbar min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto">
        <div className="flex min-h-full flex-col items-center justify-center gap-y-2">
          {rightMode === "style" ? (
            rightSidebarSections.map((section) => (
              <Button
                key={section}
                size="icon"
                variant="ghost"
                title={getSectionTitle(section)}
                onClick={() => scrollToSection(section)}
              >
                {getSectionIcon(section)}
              </Button>
            ))
          ) : (
            <Button size="icon" variant="ghost" title={getSectionTitle("job-analysis")}>
              {getSectionIcon("job-analysis")}
            </Button>
          )}
        </div>
      </div>
    </BuilderSidebarEdge>
  );
}

function JobAnalysisSectionBuilder() {
  const values = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        company: "",
        position: "",
        url: "",
        responsibilities: "",
        status: "",
        matchScore: "",
        matchReason: "",
      };
    }

    const search = new URLSearchParams(window.location.search);

    return {
      company: search.get("jobCompany") ?? "",
      position: search.get("jobPosition") ?? "",
      url: search.get("jobUrl") ?? "",
      responsibilities: search.get("jobResponsibilities") ?? "",
      status: search.get("jobStatus") ?? "",
      matchScore: search.get("jobMatchScore") ?? "",
      matchReason: search.get("jobMatchReason") ?? "",
    };
  }, []);

  const scoreLabel = values.matchScore ? `${values.matchScore}%` : t`Not evaluated yet`;

  return (
    <SectionBase type="job-analysis">
      <div className="space-y-3 px-1 pb-1">
        <InfoRow label={t`Company`} value={values.company || t`Not provided`} />
        <InfoRow label={t`Position`} value={values.position || t`Not provided`} />
        <InfoRow label={t`Status`} value={values.status || t`Not provided`} />
        <InfoRow label={t`Match Score`} value={scoreLabel} />
        <InfoRow label={t`Match Reason`} value={values.matchReason || t`No match analysis yet.`} multiline />
        <InfoRow
          label={t`Responsibilities`}
          value={values.responsibilities || t`No responsibilities provided.`}
          multiline
        />

        {values.url && (
          <a
            href={values.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            <Trans>Open Job Link</Trans>
          </a>
        )}
      </div>
    </SectionBase>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
  multiline?: boolean;
};

function InfoRow({ label, value, multiline = false }: InfoRowProps) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase">{label}</p>
      <p className={multiline ? "text-sm leading-relaxed whitespace-pre-wrap" : "text-sm"}>{value}</p>
    </div>
  );
}
