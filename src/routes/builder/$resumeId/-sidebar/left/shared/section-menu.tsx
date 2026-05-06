import { t } from "@lingui/core/macro";
import { Plural, Trans } from "@lingui/react/macro";
import {
  BroomIcon,
  ColumnsIcon,
  DownloadSimpleIcon,
  EyeClosedIcon,
  EyeIcon,
  ListIcon,
  PencilSimpleLineIcon,
  PlusIcon,
  UploadSimpleIcon,
} from "@phosphor-icons/react";

import type { SectionType } from "@/schema/resume/data";

import { useResumeStore } from "@/components/resume/store/resume";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDialogStore } from "@/dialogs/store";
import { useConfirm } from "@/hooks/use-confirm";
import { usePrompt } from "@/hooks/use-prompt";
import { profileSourceStorageKey } from "@/routes/dashboard/personal/-components/profile-source";

type Props = {
  type: "summary" | SectionType;
};

export function SectionDropdownMenu({ type }: Props) {
  const prompt = usePrompt();
  const confirm = useConfirm();
  const { openDialog } = useDialogStore();

  const updateResumeData = useResumeStore((state) => state.updateResumeData);
  const section = useResumeStore((state) =>
    type === "summary" ? state.resume.data.summary : state.resume.data.sections[type],
  );

  const onAddItem = () => {
    if (type === "summary") return;
    openDialog(`resume.sections.${type}.create`, undefined);
  };

  const onToggleVisibility = () => {
    updateResumeData((draft) => {
      if (type === "summary") {
        draft.summary.hidden = !draft.summary.hidden;
      } else {
        draft.sections[type].hidden = !draft.sections[type].hidden;
      }
    });
  };

  const onRenameSection = async () => {
    const newTitle = await prompt(t`What do you want to rename this section to?`, {
      description: t`Leave empty to reset the title to the original.`,
      defaultValue: section.title,
    });

    if (newTitle === null || newTitle === section.title) return;

    updateResumeData((draft) => {
      if (type === "summary") {
        draft.summary.title = newTitle ?? "";
      } else {
        draft.sections[type].title = newTitle ?? "";
      }
    });
  };

  const onSetColumns = (value: string) => {
    updateResumeData((draft) => {
      if (type === "summary") {
        draft.summary.columns = parseInt(value, 10);
      } else {
        draft.sections[type].columns = parseInt(value, 10);
      }
    });
  };

  const onReset = async () => {
    const confirmed = await confirm("Are you sure you want to reset this section?", {
      description: "This will remove all items from this section.",
      confirmText: "Reset",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    updateResumeData((draft) => {
      if (type === "summary") {
        draft.summary.content = "";
      } else {
        draft.sections[type].items = [];
      }
    });
  };

  const onImportFromProfile = () => {
    try {
      const profileSource = localStorage.getItem(profileSourceStorageKey);
      if (!profileSource) {
        alert(t`No profile data found in personal info page.`);
        return;
      }

      const profile = JSON.parse(profileSource) as Record<string, unknown>;
      const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const toWebsite = (url?: string, label?: string) => ({ url: url ?? "", label: label ?? "" });
      let importedItems: unknown[] = [];

      if (type === "skills" && Array.isArray(profile.skills)) {
        importedItems = profile.skills.map((skill) => {
          const value = skill as { id?: string; name?: string };
          return {
            id: value.id ?? createId("skill"),
            hidden: false,
            icon: "",
            name: value.name ?? "Skill",
            proficiency: "",
            level: 0,
            keywords: [],
          };
        });
      } else if (type === "projects" && Array.isArray(profile.projects)) {
        importedItems = profile.projects.map((project) => {
          const value = project as { id?: string; name?: string; description?: string };
          return {
            id: value.id ?? createId("project"),
            hidden: false,
            name: value.name ?? "Untitled Project",
            period: "",
            website: toWebsite(),
            description: value.description ?? "",
          };
        });
      } else if (type === "experience" && Array.isArray(profile.workExperiences)) {
        importedItems = profile.workExperiences.map((work) => {
          const value = work as { id?: string; company?: string; role?: string; period?: string; description?: string };
          return {
            id: value.id ?? createId("exp"),
            hidden: false,
            company: value.company ?? "Company",
            position: value.role ?? "Position",
            location: "",
            period: value.period ?? "",
            website: toWebsite(),
            description: value.description ?? "",
            roles: [],
          };
        });
      } else if (type === "education" && Array.isArray(profile.education)) {
        importedItems = profile.education.map((education) => {
          const value = education as {
            id?: string;
            school?: string;
            degree?: string;
            area?: string;
            grade?: string;
            location?: string;
            period?: string;
            websiteUrl?: string;
            websiteLabel?: string;
            description?: string;
          };
          return {
            id: value.id ?? createId("edu"),
            hidden: false,
            school: value.school ?? "School",
            degree: value.degree ?? "",
            area: value.area ?? "",
            grade: value.grade ?? "",
            location: value.location ?? "",
            period: value.period ?? "",
            website: toWebsite(value.websiteUrl, value.websiteLabel),
            description: value.description ?? "",
          };
        });
      } else if (type === "languages" && Array.isArray(profile.languages)) {
        importedItems = profile.languages.map((language) => {
          const value = language as { id?: string; language?: string; fluency?: string; level?: number };
          return {
            id: value.id ?? createId("lang"),
            hidden: false,
            language: value.language ?? "Language",
            fluency: value.fluency ?? "",
            level: value.level ?? 0,
          };
        });
      } else if (type === "interests" && Array.isArray(profile.interests)) {
        importedItems = profile.interests.map((interest) => {
          const value = interest as { id?: string; icon?: string; name?: string; keywords?: string };
          return {
            id: value.id ?? createId("interest"),
            hidden: false,
            icon: value.icon ?? "",
            name: value.name ?? "Interest",
            keywords: value.keywords ? value.keywords.split(",").map((x) => x.trim()).filter(Boolean) : [],
          };
        });
      } else if (type === "awards" && Array.isArray(profile.awards)) {
        importedItems = profile.awards.map((award) => {
          const value = award as {
            id?: string;
            title?: string;
            awarder?: string;
            date?: string;
            websiteUrl?: string;
            websiteLabel?: string;
            description?: string;
          };
          return {
            id: value.id ?? createId("award"),
            hidden: false,
            title: value.title ?? "Award",
            awarder: value.awarder ?? "",
            date: value.date ?? "",
            website: toWebsite(value.websiteUrl, value.websiteLabel),
            description: value.description ?? "",
          };
        });
      } else if (type === "certifications" && Array.isArray(profile.certifications)) {
        importedItems = profile.certifications.map((certification) => {
          const value = certification as {
            id?: string;
            title?: string;
            issuer?: string;
            date?: string;
            websiteUrl?: string;
            websiteLabel?: string;
            description?: string;
          };
          return {
            id: value.id ?? createId("cert"),
            hidden: false,
            title: value.title ?? "Certification",
            issuer: value.issuer ?? "",
            date: value.date ?? "",
            website: toWebsite(value.websiteUrl, value.websiteLabel),
            description: value.description ?? "",
          };
        });
      } else if (type === "publications" && Array.isArray(profile.publications)) {
        importedItems = profile.publications.map((publication) => {
          const value = publication as {
            id?: string;
            title?: string;
            publisher?: string;
            date?: string;
            websiteUrl?: string;
            websiteLabel?: string;
            description?: string;
          };
          return {
            id: value.id ?? createId("pub"),
            hidden: false,
            title: value.title ?? "Publication",
            publisher: value.publisher ?? "",
            date: value.date ?? "",
            website: toWebsite(value.websiteUrl, value.websiteLabel),
            description: value.description ?? "",
          };
        });
      } else if (type === "volunteer" && Array.isArray(profile.volunteer)) {
        importedItems = profile.volunteer.map((volunteer) => {
          const value = volunteer as {
            id?: string;
            organization?: string;
            location?: string;
            period?: string;
            websiteUrl?: string;
            websiteLabel?: string;
            description?: string;
          };
          return {
            id: value.id ?? createId("volunteer"),
            hidden: false,
            organization: value.organization ?? "Organization",
            location: value.location ?? "",
            period: value.period ?? "",
            website: toWebsite(value.websiteUrl, value.websiteLabel),
            description: value.description ?? "",
          };
        });
      } else if (type === "references" && Array.isArray(profile.references)) {
        importedItems = profile.references.map((reference) => {
          const value = reference as {
            id?: string;
            name?: string;
            position?: string;
            websiteUrl?: string;
            websiteLabel?: string;
            phone?: string;
            description?: string;
          };
          return {
            id: value.id ?? createId("reference"),
            hidden: false,
            name: value.name ?? "Reference",
            position: value.position ?? "",
            website: toWebsite(value.websiteUrl, value.websiteLabel),
            phone: value.phone ?? "",
            description: value.description ?? "",
          };
        });
      }

      if (importedItems.length === 0) {
        alert(t`No matching data found in profile for this section.`);
        return;
      }

      updateResumeData((draft) => {
        if (type !== "summary" && "items" in draft.sections[type]) {
          draft.sections[type].items.push(...(importedItems as never[]));
        }
      });
    } catch (error) {
      console.error("Failed to import from profile:", error);
      alert(t`Failed to import profile data.`);
    }
  };

  const onExportToProfile = () => {
    try {
      const resumeId = window.location.pathname.split("/").find((seg) => seg.match(/^[a-f0-9-]{36}$/));
      if (!resumeId) {
        alert(t`Could not identify resume ID.`);
        return;
      }

      const exportKey = `profile.import.${resumeId}`;
      const exportData =
        type === "summary"
          ? { content: "content" in section ? section.content : "" }
          : "items" in section
            ? section.items
            : [];

      const profilePayload = {
        timestamp: Date.now(),
        section: type,
        items: exportData,
      };

      localStorage.setItem(exportKey, JSON.stringify(profilePayload));
      alert(t`Items exported to profile. Visit Personal Info page to confirm.`);
    } catch (error) {
      console.error("Failed to export to profile:", error);
      alert(t`Failed to export items.`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button size="icon" variant="ghost">
            <ListIcon />
          </Button>
        }
      />

      <DropdownMenuContent>
        {type !== "summary" && (
          <>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onAddItem}>
                <PlusIcon />
                <Trans>Add a new item</Trans>
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />
          </>
        )}

        <DropdownMenuGroup>
          <DropdownMenuItem onClick={onToggleVisibility}>
            {section.hidden ? <EyeIcon /> : <EyeClosedIcon />}
            {section.hidden ? <Trans>Show</Trans> : <Trans>Hide</Trans>}
          </DropdownMenuItem>

          <DropdownMenuItem onClick={onRenameSection}>
            <PencilSimpleLineIcon />
            <Trans>Rename</Trans>
          </DropdownMenuItem>

          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <ColumnsIcon />
              <Trans>Columns</Trans>
            </DropdownMenuSubTrigger>

            <DropdownMenuSubContent>
              <DropdownMenuRadioGroup value={section.columns.toString()} onValueChange={onSetColumns}>
                {[1, 2, 3, 4, 5, 6].map((column) => (
                  <DropdownMenuRadioItem key={column} value={column.toString()}>
                    <Plural value={column} one="# Column" other="# Columns" />
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onClick={onReset}>
            <BroomIcon />
            <Trans>Reset</Trans>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          {type !== "summary" && (
            <>
              <DropdownMenuItem onClick={onImportFromProfile}>
                <DownloadSimpleIcon />
                <Trans>Import from Profile</Trans>
              </DropdownMenuItem>

              <DropdownMenuItem onClick={onExportToProfile}>
                <UploadSimpleIcon />
                <Trans>Export to Profile</Trans>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
