import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import {
  CheckCircleIcon,
  GlobeIcon,
  GridFourIcon,
  ListIcon,
  PencilSimpleLineIcon,
  ReadCvLogoIcon,
  UploadSimpleIcon,
  UserCircleIcon,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, stripSearchParams, useNavigate } from "@tanstack/react-router";
import { zodValidator } from "@tanstack/zod-adapter";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDialogStore } from "@/dialogs/store";
import { orpc } from "@/integrations/orpc/client";
import { cn } from "@/utils/style";

import { DashboardHeader } from "../-components/header";
import {
  createMockProfileSource,
  mergeProfileSource,
  profileSourceStorageKey,
  type ProfileSourceData,
  type ProfileProject,
} from "../personal/-components/profile-source";
import { GridView } from "./-components/grid-view";
import { ListView } from "./-components/list-view";

type SortOption = "lastUpdatedAt" | "createdAt" | "name";

const searchSchema = z.object({
  tags: z.array(z.string()).default([]),
  sort: z.enum(["lastUpdatedAt", "createdAt", "name"]).default("lastUpdatedAt"),
});

export const Route = createFileRoute("/dashboard/resumes/")({
  component: RouteComponent,
  validateSearch: zodValidator(searchSchema),
  search: {
    middlewares: [stripSearchParams({ tags: [], sort: "lastUpdatedAt" })],
  },
});

function RouteComponent() {
  const { i18n } = useLingui();
  const { tags, sort } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { openDialog } = useDialogStore();
  const [view, setView] = useState<"grid" | "list">(() => getInitialResumesView());

  const { data: allTags } = useQuery(orpc.resume.tags.list.queryOptions());
  const { data: resumes } = useQuery(orpc.resume.list.queryOptions({ input: { tags, sort } }));

  const [profileSkills, setProfileSkills] = useState<Array<{ id: string; name: string }>>([]);
  const [profileProjects, setProfileProjects] = useState<ProfileProject[]>([]);
  const [resumeSkills, setResumeSkills] = useState<string[]>([]);
  const [resumeProjects, setResumeProjects] = useState<ProfileProject[]>([]);
  const [openSkillImport, setOpenSkillImport] = useState(false);
  const [openProjectImport, setOpenProjectImport] = useState(false);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [syncToProfile, setSyncToProfile] = useState(false);

  const profileSource = useMemo(() => {
    if (typeof window === "undefined") return createMockProfileSource();

    const raw = window.localStorage.getItem(profileSourceStorageKey);
    if (!raw) return createMockProfileSource();

    try {
      return mergeProfileSource(JSON.parse(raw) as Partial<ProfileSourceData>);
    } catch {
      return createMockProfileSource();
    }
  }, []);

  useEffect(() => {
    setProfileSkills(profileSource.skills);
    setProfileProjects(profileSource.projects);
  }, [profileSource]);

  const tagOptions = useMemo(() => {
    if (!allTags) return [];
    return allTags.map((tag: string) => ({ value: tag, label: tag }));
  }, [allTags]);

  const sortOptions = useMemo(() => {
    return [
      { value: "lastUpdatedAt", label: i18n.t("Last Updated") },
      { value: "createdAt", label: i18n.t("Created") },
      { value: "name", label: i18n.t("Name") },
    ];
  }, [i18n]);

  const onViewChange = (value: string) => {
    const nextView = value as "grid" | "list";
    setView(nextView);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(RESUMES_VIEW_STORAGE_KEY, nextView);
    }
  };

  const importSkillsFromProfile = () => {
    const selected = profileSkills.filter((skill) => selectedSkillIds.includes(skill.id));
    setResumeSkills((prev) => {
      const unique = new Set(prev);
      for (const skill of selected) unique.add(skill.name);
      return Array.from(unique);
    });

    setOpenSkillImport(false);
    setSelectedSkillIds([]);
    toast.success(t`Skills imported from Profile.`);
  };

  const importProjectsFromProfile = () => {
    const selected = profileProjects.filter((project) => selectedProjectIds.includes(project.id));
    setResumeProjects((prev) => {
      const exists = new Set(prev.map((project) => project.id));
      const merged = [...prev];
      for (const project of selected) {
        if (!exists.has(project.id)) merged.push(project);
      }
      return merged;
    });

    setOpenProjectImport(false);
    setSelectedProjectIds([]);
    toast.success(t`Projects imported from Profile.`);
  };

  const saveResumeDraft = () => {
    if (!syncToProfile) {
      toast.success(t`Resume draft saved (mock).`);
      return;
    }

    if (typeof window !== "undefined") {
      const raw = window.localStorage.getItem(profileSourceStorageKey);
      const profile = raw ? (JSON.parse(raw) as ReturnType<typeof createMockProfileSource>) : createMockProfileSource();

      const mergedSkills = Array.from(new Set([...profile.skills.map((skill) => skill.name), ...resumeSkills])).map(
        (name, index) => ({
          id: profile.skills[index]?.id ?? `sync-skill-${Date.now()}-${index}`,
          name,
        }),
      );

      const mergedProjects = [...profile.projects];
      const existingProjectIds = new Set(mergedProjects.map((project) => project.id));
      for (const project of resumeProjects) {
        if (!existingProjectIds.has(project.id)) {
          mergedProjects.push(project);
        }
      }

      window.localStorage.setItem(
        profileSourceStorageKey,
        JSON.stringify({
          ...profile,
          skills: mergedSkills,
          projects: mergedProjects,
        }),
      );
    }

    toast.success(t`Resume draft saved and synchronized to Profile.`);
  };

  return (
    <div className="space-y-6">
      <DashboardHeader icon={ReadCvLogoIcon} title={t`Resumes`} />

      <section className="rounded-md border bg-popover p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)] lg:items-start">
          <div className="space-y-4">
            <p className="text-xs tracking-[0.35em] text-muted-foreground uppercase">
              <Trans>Resumes</Trans>
            </p>
            <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              <Trans>Create a new resume</Trans>
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              <Trans>Start building your resume from scratch</Trans>
            </p>

            <div className="flex flex-wrap gap-3">
              <Button className="h-11 rounded-full px-5" onClick={() => openDialog("resume.import", undefined)}>
                <UploadSimpleIcon />
                <Trans>Import an existing resume</Trans>
              </Button>

              <Button
                variant="outline"
                className="h-11 rounded-full px-5"
                onClick={() => openDialog("resume.create", undefined)}
              >
                <PencilSimpleLineIcon />
                <Trans>Create a new resume</Trans>
              </Button>

              <Button
                variant="ghost"
                className="h-11 rounded-full px-5"
                onClick={() => void navigate({ to: "/dashboard/personal" })}
              >
                <UserCircleIcon />
                <Trans>Profile</Trans>
              </Button>

              <Button
                variant="outline"
                className="h-11 rounded-full px-5"
                onClick={() => void navigate({ to: "/dashboard/webpage" })}
              >
                <GlobeIcon />
                <Trans>Generate Webpage</Trans>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-background p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
              <Trans>Manual Mode Mirror</Trans>
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              <Trans>Section order from the builder</Trans>
            </h2>
            <p className="text-sm text-muted-foreground">
              <Trans>
                Render the resume in the same section order as the manual editor, with each module collapsed by default.
              </Trans>
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <p className="text-sm text-muted-foreground">
            The full editable section order now lives on Profile Info, where you can add and modify the content.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => void navigate({ to: "/dashboard/personal" })}
          >
            <UserCircleIcon />
            <Trans>Open Profile Info</Trans>
          </Button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed p-4">
          <div className="flex items-center gap-3">
            <Switch checked={syncToProfile} onCheckedChange={setSyncToProfile} />
            <p className="text-sm">
              <Trans>Sync back to Profile when saving this resume</Trans>
            </p>
          </div>

          <Button type="button" className="rounded-full px-5" onClick={saveResumeDraft}>
            <CheckCircleIcon />
            <Trans>Save Resume</Trans>
          </Button>
        </div>
      </section>

      <Separator />

      <div className="flex flex-wrap items-center gap-4">
        <Combobox
          value={sort}
          options={sortOptions}
          placeholder={t`Sort by`}
          onValueChange={(value) => {
            if (!value) return;
            void navigate({ search: { tags, sort: value as SortOption } });
          }}
        />

        <Combobox
          multiple
          value={tags}
          options={tagOptions}
          placeholder={t`Filter by`}
          className={cn({ hidden: tagOptions.length === 0 })}
          onValueChange={(value) => {
            void navigate({ search: { tags: value ?? [], sort } });
          }}
        />

        <Tabs className="ltr:ms-auto rtl:me-auto" value={view} onValueChange={onViewChange}>
          <TabsList>
            <TabsTrigger value="grid" className="rounded-r-none">
              <GridFourIcon />
              <Trans>Grid</Trans>
            </TabsTrigger>

            <TabsTrigger value="list" className="rounded-l-none">
              <ListIcon />
              <Trans>List</Trans>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {view === "list" ? <ListView resumes={resumes ?? []} /> : <GridView resumes={resumes ?? []} />}

      <Dialog open={openSkillImport} onOpenChange={setOpenSkillImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans>Import Skills from Profile</Trans>
            </DialogTitle>
            <DialogDescription>
              <Trans>Select the skills you want to reuse in this resume draft.</Trans>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {profileSkills.map((skill) => {
              const checked = selectedSkillIds.includes(skill.id);
              return (
                <label
                  key={skill.id}
                  className="flex cursor-pointer items-center justify-between rounded-lg border bg-background px-3 py-2"
                >
                  <span className="text-sm">{skill.name}</span>
                  <Switch
                    checked={checked}
                    onCheckedChange={(nextChecked) => {
                      setSelectedSkillIds((prev) => {
                        if (nextChecked) return [...prev, skill.id];
                        return prev.filter((id) => id !== skill.id);
                      });
                    }}
                  />
                </label>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenSkillImport(false)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button onClick={importSkillsFromProfile}>
              <Trans>Import</Trans>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openProjectImport} onOpenChange={setOpenProjectImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              <Trans>Import Projects from Profile</Trans>
            </DialogTitle>
            <DialogDescription>
              <Trans>Select projects to import as reusable resume cards.</Trans>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            {profileProjects.map((project) => {
              const checked = selectedProjectIds.includes(project.id);
              return (
                <label
                  key={project.id}
                  className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{project.name}</p>
                    <p className="text-xs text-muted-foreground">{project.description}</p>
                  </div>
                  <Switch
                    checked={checked}
                    onCheckedChange={(nextChecked) => {
                      setSelectedProjectIds((prev) => {
                        if (nextChecked) return [...prev, project.id];
                        return prev.filter((id) => id !== project.id);
                      });
                    }}
                  />
                </label>
              );
            })}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenProjectImport(false)}>
              <Trans>Cancel</Trans>
            </Button>
            <Button onClick={importProjectsFromProfile}>
              <Trans>Import</Trans>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const RESUMES_VIEW_STORAGE_KEY = "resumes_view";

function getInitialResumesView(): "grid" | "list" {
  if (typeof window === "undefined") return "grid";

  const view = window.localStorage.getItem(RESUMES_VIEW_STORAGE_KEY);
  return view === "list" ? "list" : "grid";
}
