import { Trans } from "@lingui/react/macro";
import { SparkleIcon } from "@phosphor-icons/react";
import { Fragment, useCallback, useRef, useState } from "react";
import { match } from "ts-pattern";

import { AIChat } from "@/components/ai/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserDropdownMenu } from "@/components/user/dropdown-menu";
import { getSectionIcon, getSectionTitle, type LeftSidebarSection, leftSidebarSections } from "@/utils/resume/section";
import { getInitials } from "@/utils/string";

import { BuilderSidebarEdge } from "../../-components/edge";
import { useBuilderSidebar } from "../../-store/sidebar";
import { AwardsSectionBuilder } from "./sections/awards";
import { BasicsSectionBuilder } from "./sections/basics";
import { CertificationsSectionBuilder } from "./sections/certifications";
import { CustomSectionBuilder } from "./sections/custom";
import { EducationSectionBuilder } from "./sections/education";
import { ExperienceSectionBuilder } from "./sections/experience";
import { InterestsSectionBuilder } from "./sections/interests";
import { LanguagesSectionBuilder } from "./sections/languages";
import { PictureSectionBuilder } from "./sections/picture";
import { ProfilesSectionBuilder } from "./sections/profiles";
import { ProjectsSectionBuilder } from "./sections/projects";
import { PublicationsSectionBuilder } from "./sections/publications";
import { ReferencesSectionBuilder } from "./sections/references";
import { SkillsSectionBuilder } from "./sections/skills";
import { SummarySectionBuilder } from "./sections/summary";
import { VolunteerSectionBuilder } from "./sections/volunteer";

function getSectionComponent(type: LeftSidebarSection) {
  return match(type)
    .with("picture", () => <PictureSectionBuilder />)
    .with("basics", () => <BasicsSectionBuilder />)
    .with("summary", () => <SummarySectionBuilder />)
    .with("profiles", () => <ProfilesSectionBuilder />)
    .with("experience", () => <ExperienceSectionBuilder />)
    .with("education", () => <EducationSectionBuilder />)
    .with("projects", () => <ProjectsSectionBuilder />)
    .with("skills", () => <SkillsSectionBuilder />)
    .with("languages", () => <LanguagesSectionBuilder />)
    .with("interests", () => <InterestsSectionBuilder />)
    .with("awards", () => <AwardsSectionBuilder />)
    .with("certifications", () => <CertificationsSectionBuilder />)
    .with("publications", () => <PublicationsSectionBuilder />)
    .with("volunteer", () => <VolunteerSectionBuilder />)
    .with("references", () => <ReferencesSectionBuilder />)
    .with("custom", () => <CustomSectionBuilder />)
    .exhaustive();
}

type LeftMode = "manual" | "copilot";

const getInitialLeftMode = (): LeftMode => {
  if (typeof window === "undefined") return "manual";

  const mode = new URLSearchParams(window.location.search).get("leftMode");
  return mode === "copilot" ? "copilot" : "manual";
};

const setLeftModeInUrl = (mode: LeftMode) => {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.set("leftMode", mode);
  window.history.replaceState(window.history.state, "", url.toString());
};

export function BuilderSidebarLeft() {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const [leftMode, setLeftMode] = useState<LeftMode>(getInitialLeftMode);

  return (
    <>
      <SidebarEdge leftMode={leftMode} scrollAreaRef={scrollAreaRef} />

      <ScrollArea ref={scrollAreaRef} className="@container h-[calc(100svh-3.5rem)] bg-background sm:ms-12">
        <div className="space-y-4 p-4">
          <Tabs
            value={leftMode}
            onValueChange={(value) => {
              const nextMode = (value as LeftMode) ?? "manual";
              setLeftMode(nextMode);
              setLeftModeInUrl(nextMode);
            }}
          >
            <TabsList className="w-full">
              <TabsTrigger value="manual">
                <Trans>手动修改</Trans>
              </TabsTrigger>
              <TabsTrigger value="copilot">
                <Trans>Copilot 修改版本</Trans>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {leftMode === "manual" ? (
            leftSidebarSections.map((section) => (
              <Fragment key={section}>
                {getSectionComponent(section)}
                <Separator />
              </Fragment>
            ))
          ) : (
            <div className="rounded-md border bg-card p-4">
              <p className="mb-3 text-sm text-muted-foreground">
                <Trans>Use Copilot to rewrite, tailor and optimize resume content for this job.</Trans>
              </p>
              <AIChat />
            </div>
          )}
        </div>
      </ScrollArea>
    </>
  );
}

type SidebarEdgeProps = {
  leftMode: LeftMode;
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
};

function SidebarEdge({ leftMode, scrollAreaRef }: SidebarEdgeProps) {
  const toggleSidebar = useBuilderSidebar((state) => state.toggleSidebar);

  const scrollToSection = useCallback(
    (section: LeftSidebarSection) => {
      if (!scrollAreaRef.current) return;
      toggleSidebar("left", true);

      const sectionElement = scrollAreaRef.current.querySelector(`#sidebar-${section}`);
      sectionElement?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    },
    [toggleSidebar, scrollAreaRef],
  );

  return (
    <BuilderSidebarEdge side="left">
      <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-y-2 overflow-hidden">
        <div className="no-scrollbar min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto">
          <div className="flex min-h-full flex-col items-center justify-center gap-y-2">
            {leftMode === "manual" ? (
              leftSidebarSections.map((section) => (
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
              <Button size="icon" variant="ghost" title="Copilot">
                <SparkleIcon />
              </Button>
            )}
          </div>
        </div>

        <UserDropdownMenu>
          {({ session }) => (
            <Button size="icon" variant="ghost">
              <Avatar className="size-6">
                <AvatarImage src={session.user.image ?? undefined} />
                <AvatarFallback className="text-[0.5rem]">{getInitials(session.user.name)}</AvatarFallback>
              </Avatar>
            </Button>
          )}
        </UserDropdownMenu>
      </div>
    </BuilderSidebarEdge>
  );
}
