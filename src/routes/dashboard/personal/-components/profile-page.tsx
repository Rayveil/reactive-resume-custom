import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { BriefcaseIcon, FloppyDiskIcon, GlobeIcon, PlusIcon, TrashIcon, UserCircleIcon } from "@phosphor-icons/react";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getSectionIcon, getSectionTitle, leftSidebarSections, type LeftSidebarSection } from "@/utils/resume/section";

import { DashboardHeader } from "../../-components/header";
import { EditableListSection } from "./editable-list-section";
import {
  createMockProfileSource,
  mergeProfileSource,
  profileSourceStorageKey,
  type BasicInfo,
  type ProfileAward,
  type ProfileCertification,
  type ProfileEducation,
  type ProfileInterest,
  type ProfileLanguage,
  type ProfileLink,
  type ProfilePicture,
  type ProfilePublication,
  type ProfileReference,
  type ProfileProject,
  type ProfileSummary,
  type ProfileSkill,
  type ProfileVolunteer,
  type WorkExperience,
} from "./profile-source";
import { ProjectSection } from "./project-section";
import { SkillSection } from "./skill-section";

const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

function withStableId<T extends Record<string, unknown>>(draft: T, prefix: string): T & { id: string } {
  const record = draft as T & { id?: string };
  const { id: currentId, ...rest } = record;
  return { id: currentId || createId(prefix), ...rest } as T & { id: string };
}

export function ProfilePage() {
  const navigate = useNavigate();

  const initialData = useMemo(() => {
    if (typeof window === "undefined") return createMockProfileSource();

    const raw = window.localStorage.getItem(profileSourceStorageKey);
    if (!raw) return createMockProfileSource();

    try {
      return mergeProfileSource(JSON.parse(raw));
    } catch {
      return createMockProfileSource();
    }
  }, []);

  const [picture, setPicture] = useState<ProfilePicture>(initialData.picture);
  const [basicInfo, setBasicInfo] = useState<BasicInfo>(initialData.basicInfo);
  const [summary, setSummary] = useState<ProfileSummary>(initialData.summary);
  const [profiles, setProfiles] = useState<ProfileLink[]>(initialData.profiles);
  const [education, setEducation] = useState<ProfileEducation[]>(initialData.education);
  const [languages, setLanguages] = useState<ProfileLanguage[]>(initialData.languages);
  const [interests, setInterests] = useState<ProfileInterest[]>(initialData.interests);
  const [awards, setAwards] = useState<ProfileAward[]>(initialData.awards);
  const [certifications, setCertifications] = useState<ProfileCertification[]>(initialData.certifications);
  const [publications, setPublications] = useState<ProfilePublication[]>(initialData.publications);
  const [volunteer, setVolunteer] = useState<ProfileVolunteer[]>(initialData.volunteer);
  const [references, setReferences] = useState<ProfileReference[]>(initialData.references);
  const [skills, setSkills] = useState<ProfileSkill[]>(initialData.skills);
  const [projects, setProjects] = useState<ProfileProject[]>(initialData.projects);
  const [workExperiences, setWorkExperiences] = useState<WorkExperience[]>(initialData.workExperiences);
  const [draftWork, setDraftWork] = useState<Omit<WorkExperience, "id">>({
    company: "",
    role: "",
    period: "",
    description: "",
  });
  const [openPushDialog, setOpenPushDialog] = useState(false);
  const [selectedPushSkillIds, setSelectedPushSkillIds] = useState<string[]>([]);
  const [selectedPushProjectIds, setSelectedPushProjectIds] = useState<string[]>([]);
  const [selectedPushWorkIds, setSelectedPushWorkIds] = useState<string[]>([]);
  const [targetResumeId, setTargetResumeId] = useState("");

  useEffect(() => {
    // Check for imported data from builder exports
    const checkForImports = () => {
      const keys = Object.keys(localStorage).filter((key) => key.startsWith("profile.import."));

      keys.forEach((key) => {
        try {
          const importedData = JSON.parse(localStorage.getItem(key) || "{}");
          const { section, items } = importedData;

          if (!section || !items) return;

          if (section === "skills" && Array.isArray(items)) {
            const newSkills = items.map((item: { name?: string; label?: string; id?: string }) => ({
              id: item.id || createId("skill"),
              name: item.name || item.label || "Skill",
            }));
            setSkills((prev) => {
              const ids = new Set(prev.map((s) => s.name));
              return [...prev, ...newSkills.filter((s) => !ids.has(s.name))];
            });
            toast.success(t`${newSkills.length} skills imported from builder.`);
          } else if (section === "projects" && Array.isArray(items)) {
            const newProjects = items.map(
              (item: { name?: string; title?: string; description?: string; url?: string; id?: string }) => ({
                id: item.id || createId("project"),
                title: item.name || item.title || "Project",
                description: item.description || "",
                url: item.url || "",
              }),
            );
            setProjects((prev) => {
              const ids = new Set(prev.map((p) => p.title));
              return [...prev, ...newProjects.filter((p) => !ids.has(p.title))];
            });
            toast.success(t`${newProjects.length} projects imported from builder.`);
          } else if (section === "experience" && Array.isArray(items)) {
            const newExperiences = items.map(
              (item: {
                position?: string;
                name?: string;
                company?: string;
                startDate?: string;
                endDate?: string;
                summary?: string;
                id?: string;
              }) => ({
                id: item.id || createId("work"),
                company: item.company || item.name || "Company",
                role: item.position || "Position",
                period: `${item.startDate || ""} - ${item.endDate || ""}`,
                description: item.summary || "",
              }),
            );
            setWorkExperiences((prev) => [...prev, ...newExperiences]);
            toast.success(t`${newExperiences.length} work experiences imported from builder.`);
          }

          localStorage.removeItem(key);
        } catch (error) {
          console.error("Failed to import data from builder:", error);
        }
      });
    };

    checkForImports();
  }, []);

  const getSectionSubtitle = (section: LeftSidebarSection) => {
    switch (section) {
      case "picture":
        return picture.url ? t`Picture configured` : t`No picture yet`;
      case "basics":
        return basicInfo.name || basicInfo.headline ? t`Name and contact details` : t`Basic information is empty`;
      case "summary":
        return summary.content ? t`Summary content ready` : t`No summary text yet`;
      case "profiles":
        return profiles.length > 0 ? t`${profiles.length} profile links` : t`No profile links yet`;
      case "experience":
        return workExperiences.length > 0 ? t`${workExperiences.length} work entries` : t`No work experience yet`;
      case "education":
        return education.length > 0 ? t`${education.length} education items` : t`No education yet`;
      case "projects":
        return projects.length > 0 ? t`${projects.length} projects` : t`No projects yet`;
      case "skills":
        return skills.length > 0 ? t`${skills.length} skills` : t`No skills yet`;
      case "languages":
        return languages.length > 0 ? t`${languages.length} languages` : t`No languages yet`;
      case "interests":
        return interests.length > 0 ? t`${interests.length} interests` : t`No interests yet`;
      case "awards":
        return awards.length > 0 ? t`${awards.length} awards` : t`No awards yet`;
      case "certifications":
        return certifications.length > 0 ? t`${certifications.length} certifications` : t`No certifications yet`;
      case "publications":
        return publications.length > 0 ? t`${publications.length} publications` : t`No publications yet`;
      case "volunteer":
        return volunteer.length > 0 ? t`${volunteer.length} volunteer entries` : t`No volunteer history yet`;
      case "references":
        return references.length > 0 ? t`${references.length} references` : t`No references yet`;
      case "custom":
        return basicInfo.customFields.length > 0
          ? t`${basicInfo.customFields.length} custom fields`
          : t`No custom fields yet`;
    }
  };

  const addSkill = (name: string) => {
    setSkills((prev) => [...prev, { id: createId("skill"), name }]);
  };

  const updateSkill = (id: string, name: string) => {
    setSkills((prev) => prev.map((skill) => (skill.id === id ? { ...skill, name } : skill)));
  };

  const deleteSkill = (id: string) => {
    setSkills((prev) => prev.filter((skill) => skill.id !== id));
  };

  const addProject = (project: Omit<ProfileProject, "id">) => {
    setProjects((prev) => [...prev, { id: createId("project"), ...project }]);
  };

  const updateProject = (id: string, project: Omit<ProfileProject, "id">) => {
    setProjects((prev) => prev.map((item) => (item.id === id ? { ...item, ...project } : item)));
  };

  const deleteProject = (id: string) => {
    setProjects((prev) => prev.filter((project) => project.id !== id));
  };

  const addWorkExperience = () => {
    const company = draftWork.company.trim();
    const role = draftWork.role.trim();
    const period = draftWork.period.trim();
    const description = draftWork.description.trim();

    if (!company || !role || !period || !description) return;

    setWorkExperiences((prev) => [...prev, { id: createId("work"), company, role, period, description }]);
    setDraftWork({ company: "", role: "", period: "", description: "" });
  };

  const updateWorkExperience = (id: string, key: keyof Omit<WorkExperience, "id">, value: string) => {
    setWorkExperiences((prev) => prev.map((item) => (item.id === id ? { ...item, [key]: value } : item)));
  };

  const deleteWorkExperience = (id: string) => {
    setWorkExperiences((prev) => prev.filter((work) => work.id !== id));
  };

  const handleSave = () => {
    const payload = {
      picture,
      basicInfo,
      summary,
      profiles,
      education,
      languages,
      interests,
      awards,
      certifications,
      publications,
      volunteer,
      references,
      skills,
      projects,
      workExperiences,
    };
    window.localStorage.setItem(profileSourceStorageKey, JSON.stringify(payload));
    toast.success(t`Profile source saved. Resume can now selectively import from it.`);
  };

  const handleSendToBuilder = () => {
    if (!targetResumeId.trim()) {
      toast.error(t`Please provide a target resume id.`);
      return;
    }

    const toSendSkills = skills.filter((s) => selectedPushSkillIds.includes(s.id));
    const toSendProjects = projects.filter((p) => selectedPushProjectIds.includes(p.id));
    const toSendWorkExperiences = workExperiences.filter((work) => selectedPushWorkIds.includes(work.id));

    const payload = {
      basicInfo,
      skills: toSendSkills,
      projects: toSendProjects,
      workExperiences: toSendWorkExperiences,
    };

    try {
      window.localStorage.setItem(`profile.push.${targetResumeId}`, JSON.stringify(payload));
      toast.success(t`Profile items queued for builder. Opening builder...`);
      // open target builder in a new tab so user can review/import immediately
      try {
        window.open(`/builder/${targetResumeId}`, "_blank");
      } catch {}
      setOpenPushDialog(false);
    } catch {
      toast.error(t`Could not queue items for builder.`);
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHeader icon={UserCircleIcon} title={t`Profile Info`} />

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-linear-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-lg shadow-slate-950/10">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.6fr)] lg:items-center">
          <div className="space-y-3">
            <p className="text-xs tracking-[0.35em] text-white/60 uppercase">
              <Trans>Personal Website</Trans>
            </p>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              <Trans>Generate a polished personal website from your profile data</Trans>
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
              <Trans>
                Use your current profile as the source of truth, then generate a clean, academic-style website with a
                bilingual prompt workflow.
              </Trans>
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                className="h-11 rounded-full bg-white px-5 text-slate-900 hover:bg-white/90"
                onClick={() => void navigate({ to: "/dashboard/webpage" })}
              >
                <GlobeIcon />
                <Trans>Open Webpage Generator</Trans>
              </Button>

              <Button
                variant="outline"
                className="h-11 rounded-full border-white/20 bg-white/5 px-5 text-white hover:bg-white/10 hover:text-white"
                onClick={() => void navigate({ to: "/dashboard/webpage" })}
              >
                <Trans>View Prompt</Trans>
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="space-y-3 text-sm text-white/80">
              <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
                <span className="font-medium text-white">
                  <Trans>Source</Trans>
                </span>
                <span className="text-white/60">
                  <Trans>Profile Info</Trans>
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
                <span className="font-medium text-white">
                  <Trans>Output</Trans>
                </span>
                <span className="text-white/60">
                  <Trans>Website + Prompt</Trans>
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2">
                <span className="font-medium text-white">
                  <Trans>Workflow</Trans>
                </span>
                <span className="text-white/60">
                  <Trans>Generate, edit, publish</Trans>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
      <Separator />

      <section className="space-y-4 rounded-xl border bg-background p-5 shadow-sm">
        <div className="space-y-2">
          <p className="text-xs tracking-[0.3em] text-muted-foreground uppercase">
            <Trans>Manual Mode Mirror</Trans>
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">
            <Trans>Section order from the builder</Trans>
          </h2>
          <p className="text-sm text-muted-foreground">
            <Trans>
              The profile page now follows the same section order as the builder manual editor, while the editable cards
              below keep add and modify actions.
            </Trans>
          </p>
        </div>

        <Accordion multiple className="gap-3">
          {leftSidebarSections.map((section) => (
            <AccordionItem
              key={section}
              value={section}
              className="rounded-xl border bg-card px-4 shadow-sm data-[state=open]:border-primary/30"
            >
              <AccordionTrigger className="py-4 no-underline hover:no-underline">
                <div className="flex min-w-0 flex-1 items-center gap-3 pr-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground">
                    {getSectionIcon(section, { className: "size-4" })}
                  </span>

                  <div className="min-w-0 text-left">
                    <h3 className="truncate font-medium">{getSectionTitle(section)}</h3>
                    <p className="truncate text-xs text-muted-foreground">{getSectionSubtitle(section)}</p>
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="pb-4">
                <p className="text-sm text-muted-foreground">
                  <Trans>Use the editable cards below to add or modify the content for this section.</Trans>
                </p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <section className="space-y-4 rounded-xl border bg-background p-5 shadow-sm" id="profile-picture">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            <Trans>Picture</Trans>
          </h2>
          <UserCircleIcon className="size-5 text-muted-foreground" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            value={picture.url}
            onChange={(event) => setPicture((prev) => ({ ...prev, url: event.target.value }))}
            placeholder={t`Image URL`}
          />
          <Input
            type="number"
            value={picture.size}
            onChange={(event) => setPicture((prev) => ({ ...prev, size: Number(event.target.value || 0) }))}
            placeholder={t`Size`}
          />
          <Input
            type="number"
            value={picture.rotation}
            onChange={(event) => setPicture((prev) => ({ ...prev, rotation: Number(event.target.value || 0) }))}
            placeholder={t`Rotation`}
          />
          <Input
            type="number"
            value={picture.aspectRatio}
            onChange={(event) => setPicture((prev) => ({ ...prev, aspectRatio: Number(event.target.value || 0) }))}
            placeholder={t`Aspect Ratio`}
          />
          <Input
            type="number"
            value={picture.borderRadius}
            onChange={(event) => setPicture((prev) => ({ ...prev, borderRadius: Number(event.target.value || 0) }))}
            placeholder={t`Border Radius`}
          />
          <Input
            value={picture.borderColor}
            onChange={(event) => setPicture((prev) => ({ ...prev, borderColor: event.target.value }))}
            placeholder={t`Border Color`}
          />
          <Input
            type="number"
            value={picture.borderWidth}
            onChange={(event) => setPicture((prev) => ({ ...prev, borderWidth: Number(event.target.value || 0) }))}
            placeholder={t`Border Width`}
          />
          <Input
            value={picture.shadowColor}
            onChange={(event) => setPicture((prev) => ({ ...prev, shadowColor: event.target.value }))}
            placeholder={t`Shadow Color`}
          />
          <Input
            type="number"
            value={picture.shadowWidth}
            onChange={(event) => setPicture((prev) => ({ ...prev, shadowWidth: Number(event.target.value || 0) }))}
            placeholder={t`Shadow Width`}
          />
          <label className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 lg:col-span-3">
            <Switch
              checked={!picture.hidden}
              onCheckedChange={(checked) => setPicture((prev) => ({ ...prev, hidden: !checked }))}
            />
            <span className="text-sm text-muted-foreground">
              <Trans>Show picture in profile source</Trans>
            </span>
          </label>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-background p-5 shadow-sm" id="profile-summary">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">
            <Trans>Summary</Trans>
          </h2>
          <UserCircleIcon className="size-5 text-muted-foreground" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            value={summary.title}
            onChange={(event) => setSummary((prev) => ({ ...prev, title: event.target.value }))}
            placeholder={t`Title`}
          />
          <Input
            type="number"
            value={summary.columns}
            onChange={(event) => setSummary((prev) => ({ ...prev, columns: Number(event.target.value || 0) }))}
            placeholder={t`Columns`}
          />
          <label className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2 sm:col-span-2">
            <Switch
              checked={!summary.hidden}
              onCheckedChange={(checked) => setSummary((prev) => ({ ...prev, hidden: !checked }))}
            />
            <span className="text-sm text-muted-foreground">
              <Trans>Show summary in profile source</Trans>
            </span>
          </label>
          <Textarea
            value={summary.content}
            onChange={(event) => setSummary((prev) => ({ ...prev, content: event.target.value }))}
            placeholder={t`Summary content`}
            className="sm:col-span-2"
          />
        </div>
      </section>

      <EditableListSection
        title={t`Profile Links`}
        emptyText={t`No profile links yet.`}
        items={profiles}
        createDraft={() => ({ icon: "", network: "", username: "", websiteUrl: "", websiteLabel: "" })}
        createItem={(draft) => withStableId(draft, "profile")}
        onAdd={(item) => setProfiles((prev) => [...prev, item])}
        onUpdate={(id, item) => setProfiles((prev) => prev.map((entry) => (entry.id === id ? item : entry)))}
        onDelete={(id) => setProfiles((prev) => prev.filter((entry) => entry.id !== id))}
        fields={[
          { path: "icon", label: t`Icon` },
          { path: "network", label: t`Network` },
          { path: "username", label: t`Username` },
          { path: "websiteUrl", label: t`Website URL`, type: "url" },
          { path: "websiteLabel", label: t`Website Label` },
        ]}
        getTitle={(item) => item.network || t`Profile link`}
        getSubtitle={(item) => item.username || item.websiteLabel || item.websiteUrl || undefined}
      />

      <EditableListSection
        title={t`Education`}
        emptyText={t`No education yet.`}
        items={education}
        createDraft={() => ({
          school: "",
          degree: "",
          area: "",
          grade: "",
          location: "",
          period: "",
          websiteUrl: "",
          websiteLabel: "",
          description: "",
        })}
        createItem={(draft) => withStableId(draft, "education")}
        onAdd={(item) => setEducation((prev) => [...prev, item])}
        onUpdate={(id, item) => setEducation((prev) => prev.map((entry) => (entry.id === id ? item : entry)))}
        onDelete={(id) => setEducation((prev) => prev.filter((entry) => entry.id !== id))}
        fields={[
          { path: "school", label: t`School` },
          { path: "degree", label: t`Degree` },
          { path: "area", label: t`Area` },
          { path: "grade", label: t`Grade` },
          { path: "location", label: t`Location` },
          { path: "period", label: t`Period` },
          { path: "websiteUrl", label: t`Website URL`, type: "url" },
          { path: "websiteLabel", label: t`Website Label` },
          { path: "description", label: t`Description`, type: "textarea" },
        ]}
        getTitle={(item) => item.school || t`Education`}
        getSubtitle={(item) => item.degree || item.period || undefined}
      />

      <EditableListSection
        title={t`Languages`}
        emptyText={t`No languages yet.`}
        items={languages}
        createDraft={() => ({ language: "", fluency: "", level: 0 })}
        createItem={(draft) => withStableId(draft, "language")}
        onAdd={(item) => setLanguages((prev) => [...prev, item])}
        onUpdate={(id, item) => setLanguages((prev) => prev.map((entry) => (entry.id === id ? item : entry)))}
        onDelete={(id) => setLanguages((prev) => prev.filter((entry) => entry.id !== id))}
        fields={[
          { path: "language", label: t`Language` },
          { path: "fluency", label: t`Fluency` },
          { path: "level", label: t`Level`, type: "number", min: 0, max: 5 },
        ]}
        getTitle={(item) => item.language || t`Language`}
        getSubtitle={(item) => item.fluency || undefined}
      />

      <EditableListSection
        title={t`Interests`}
        emptyText={t`No interests yet.`}
        items={interests}
        createDraft={() => ({ icon: "", name: "", keywords: "" })}
        createItem={(draft) => withStableId(draft, "interest")}
        onAdd={(item) => setInterests((prev) => [...prev, item])}
        onUpdate={(id, item) => setInterests((prev) => prev.map((entry) => (entry.id === id ? item : entry)))}
        onDelete={(id) => setInterests((prev) => prev.filter((entry) => entry.id !== id))}
        fields={[
          { path: "icon", label: t`Icon` },
          { path: "name", label: t`Name` },
          { path: "keywords", label: t`Keywords` },
        ]}
        getTitle={(item) => item.name || t`Interest`}
        getSubtitle={(item) => item.keywords || undefined}
      />

      <EditableListSection
        title={t`Awards`}
        emptyText={t`No awards yet.`}
        items={awards}
        createDraft={() => ({ title: "", awarder: "", date: "", websiteUrl: "", websiteLabel: "", description: "" })}
        createItem={(draft) => withStableId(draft, "award")}
        onAdd={(item) => setAwards((prev) => [...prev, item])}
        onUpdate={(id, item) => setAwards((prev) => prev.map((entry) => (entry.id === id ? item : entry)))}
        onDelete={(id) => setAwards((prev) => prev.filter((entry) => entry.id !== id))}
        fields={[
          { path: "title", label: t`Title` },
          { path: "awarder", label: t`Awarder` },
          { path: "date", label: t`Date` },
          { path: "websiteUrl", label: t`Website URL`, type: "url" },
          { path: "websiteLabel", label: t`Website Label` },
          { path: "description", label: t`Description`, type: "textarea" },
        ]}
        getTitle={(item) => item.title || t`Award`}
        getSubtitle={(item) => item.awarder || item.date || undefined}
      />

      <EditableListSection
        title={t`Certifications`}
        emptyText={t`No certifications yet.`}
        items={certifications}
        createDraft={() => ({ title: "", issuer: "", date: "", websiteUrl: "", websiteLabel: "", description: "" })}
        createItem={(draft) => withStableId(draft, "certification")}
        onAdd={(item) => setCertifications((prev) => [...prev, item])}
        onUpdate={(id, item) => setCertifications((prev) => prev.map((entry) => (entry.id === id ? item : entry)))}
        onDelete={(id) => setCertifications((prev) => prev.filter((entry) => entry.id !== id))}
        fields={[
          { path: "title", label: t`Title` },
          { path: "issuer", label: t`Issuer` },
          { path: "date", label: t`Date` },
          { path: "websiteUrl", label: t`Website URL`, type: "url" },
          { path: "websiteLabel", label: t`Website Label` },
          { path: "description", label: t`Description`, type: "textarea" },
        ]}
        getTitle={(item) => item.title || t`Certification`}
        getSubtitle={(item) => item.issuer || item.date || undefined}
      />

      <EditableListSection
        title={t`Publications`}
        emptyText={t`No publications yet.`}
        items={publications}
        createDraft={() => ({ title: "", publisher: "", date: "", websiteUrl: "", websiteLabel: "", description: "" })}
        createItem={(draft) => withStableId(draft, "publication")}
        onAdd={(item) => setPublications((prev) => [...prev, item])}
        onUpdate={(id, item) => setPublications((prev) => prev.map((entry) => (entry.id === id ? item : entry)))}
        onDelete={(id) => setPublications((prev) => prev.filter((entry) => entry.id !== id))}
        fields={[
          { path: "title", label: t`Title` },
          { path: "publisher", label: t`Publisher` },
          { path: "date", label: t`Date` },
          { path: "websiteUrl", label: t`Website URL`, type: "url" },
          { path: "websiteLabel", label: t`Website Label` },
          { path: "description", label: t`Description`, type: "textarea" },
        ]}
        getTitle={(item) => item.title || t`Publication`}
        getSubtitle={(item) => item.publisher || item.date || undefined}
      />

      <EditableListSection
        title={t`Volunteer`}
        emptyText={t`No volunteer history yet.`}
        items={volunteer}
        createDraft={() => ({
          organization: "",
          location: "",
          period: "",
          websiteUrl: "",
          websiteLabel: "",
          description: "",
        })}
        createItem={(draft) => withStableId(draft, "volunteer")}
        onAdd={(item) => setVolunteer((prev) => [...prev, item])}
        onUpdate={(id, item) => setVolunteer((prev) => prev.map((entry) => (entry.id === id ? item : entry)))}
        onDelete={(id) => setVolunteer((prev) => prev.filter((entry) => entry.id !== id))}
        fields={[
          { path: "organization", label: t`Organization` },
          { path: "location", label: t`Location` },
          { path: "period", label: t`Period` },
          { path: "websiteUrl", label: t`Website URL`, type: "url" },
          { path: "websiteLabel", label: t`Website Label` },
          { path: "description", label: t`Description`, type: "textarea" },
        ]}
        getTitle={(item) => item.organization || t`Volunteer`}
        getSubtitle={(item) => item.period || item.location || undefined}
      />

      <EditableListSection
        title={t`References`}
        emptyText={t`No references yet.`}
        items={references}
        createDraft={() => ({ name: "", position: "", websiteUrl: "", websiteLabel: "", phone: "", description: "" })}
        createItem={(draft) => withStableId(draft, "reference")}
        onAdd={(item) => setReferences((prev) => [...prev, item])}
        onUpdate={(id, item) => setReferences((prev) => prev.map((entry) => (entry.id === id ? item : entry)))}
        onDelete={(id) => setReferences((prev) => prev.filter((entry) => entry.id !== id))}
        fields={[
          { path: "name", label: t`Name` },
          { path: "position", label: t`Position` },
          { path: "websiteUrl", label: t`Website URL`, type: "url" },
          { path: "websiteLabel", label: t`Website Label` },
          { path: "phone", label: t`Phone` },
          { path: "description", label: t`Description`, type: "textarea" },
        ]}
        getTitle={(item) => item.name || t`Reference`}
        getSubtitle={(item) => item.position || item.phone || undefined}
      />

      <EditableListSection
        title={t`Custom Fields`}
        emptyText={t`No custom fields yet.`}
        items={basicInfo.customFields}
        createDraft={() => ({ icon: "", text: "", link: "" })}
        createItem={(draft) => withStableId(draft, "custom-field")}
        onAdd={(item) => setBasicInfo((prev) => ({ ...prev, customFields: [...prev.customFields, item] }))}
        onUpdate={(id, item) =>
          setBasicInfo((prev) => ({
            ...prev,
            customFields: prev.customFields.map((entry) => (entry.id === id ? item : entry)),
          }))
        }
        onDelete={(id) =>
          setBasicInfo((prev) => ({
            ...prev,
            customFields: prev.customFields.filter((entry) => entry.id !== id),
          }))
        }
        fields={[
          { path: "icon", label: t`Icon` },
          { path: "text", label: t`Text` },
          { path: "link", label: t`Link`, type: "url" },
        ]}
        getTitle={(item) => item.text || t`Custom field`}
        getSubtitle={(item) => item.link || undefined}
      />

      <section className="space-y-4 rounded-xl border bg-background p-5 shadow-sm">
        <h2 className="text-lg font-semibold">
          <Trans>Basic Information</Trans>
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            value={basicInfo.name}
            onChange={(event) => setBasicInfo((prev) => ({ ...prev, name: event.target.value }))}
            placeholder={t`Name`}
          />
          <Input
            value={basicInfo.headline}
            onChange={(event) => setBasicInfo((prev) => ({ ...prev, headline: event.target.value }))}
            placeholder={t`Headline`}
          />
          <Input
            type="email"
            value={basicInfo.email}
            onChange={(event) => setBasicInfo((prev) => ({ ...prev, email: event.target.value }))}
            placeholder={t`Email`}
          />
          <Input
            value={basicInfo.phone}
            onChange={(event) => setBasicInfo((prev) => ({ ...prev, phone: event.target.value }))}
            placeholder={t`Phone`}
          />
          <Input
            value={basicInfo.location}
            onChange={(event) => setBasicInfo((prev) => ({ ...prev, location: event.target.value }))}
            placeholder={t`Location`}
          />
          <Input
            value={basicInfo.website}
            onChange={(event) => setBasicInfo((prev) => ({ ...prev, website: event.target.value }))}
            placeholder={t`Website`}
          />
        </div>
      </section>

      <SkillSection skills={skills} onAdd={addSkill} onUpdate={updateSkill} onDelete={deleteSkill} />

      <ProjectSection projects={projects} onAdd={addProject} onUpdate={updateProject} onDelete={deleteProject} />

      <section className="space-y-4 rounded-xl border bg-background p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            <Trans>Work Experience</Trans>
          </h2>
          <BriefcaseIcon className="size-5 text-muted-foreground" />
        </div>

        <div className="grid gap-3 rounded-xl border border-dashed p-4 sm:grid-cols-2">
          <Input
            value={draftWork.company}
            onChange={(event) => setDraftWork((prev) => ({ ...prev, company: event.target.value }))}
            placeholder={t`Company`}
          />
          <Input
            value={draftWork.role}
            onChange={(event) => setDraftWork((prev) => ({ ...prev, role: event.target.value }))}
            placeholder={t`Role`}
          />
          <Input
            value={draftWork.period}
            onChange={(event) => setDraftWork((prev) => ({ ...prev, period: event.target.value }))}
            placeholder={t`Period (e.g. 2021-2024)`}
          />
          <Button type="button" onClick={addWorkExperience} className="sm:justify-self-end">
            <PlusIcon />
            <Trans>Add Experience</Trans>
          </Button>
          <Textarea
            value={draftWork.description}
            onChange={(event) => setDraftWork((prev) => ({ ...prev, description: event.target.value }))}
            placeholder={t`Key achievements and responsibilities`}
            className="sm:col-span-2"
          />
        </div>

        <div className="grid gap-3">
          {workExperiences.map((work) => (
            <article key={work.id} className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm">
              <div className="grid gap-3 sm:grid-cols-3">
                <Input
                  value={work.company}
                  onChange={(event) => updateWorkExperience(work.id, "company", event.target.value)}
                />
                <Input
                  value={work.role}
                  onChange={(event) => updateWorkExperience(work.id, "role", event.target.value)}
                />
                <Input
                  value={work.period}
                  onChange={(event) => updateWorkExperience(work.id, "period", event.target.value)}
                />
              </div>
              <Textarea
                value={work.description}
                onChange={(event) => updateWorkExperience(work.id, "description", event.target.value)}
              />
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => deleteWorkExperience(work.id)}
                >
                  <TrashIcon />
                  <Trans>Delete</Trans>
                </Button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="button" className="rounded-full px-5" onClick={handleSave}>
          <FloppyDiskIcon />
          <Trans>Save Profile Source</Trans>
        </Button>
        <Button type="button" className="ml-3 rounded-full px-5" onClick={() => setOpenPushDialog(true)}>
          <Trans>Send to Builder</Trans>
        </Button>
      </div>

      <Dialog open={openPushDialog} onOpenChange={setOpenPushDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t`Send Selected Profile Items to Builder`}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-xl border bg-muted/40 p-3 text-sm text-muted-foreground">
              {t`Basic information will be included automatically. Select any skills, projects, or work experience you want to push to Builder.`}
            </div>

            <div>
              <h4 className="font-medium">{t`Target Resume ID`}</h4>
              <div className="mt-2">
                <Input
                  value={targetResumeId}
                  onChange={(e) => setTargetResumeId(e.target.value)}
                  placeholder={t`Paste target resume id (e.g. 019d9c43-c344-746a-91ad-77492f66a8b8)`}
                />
              </div>
            </div>

            <div>
              <h4 className="font-medium">{t`Skills`}</h4>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {skills.length === 0 && <div className="text-muted">{t`No skills available in Profile.`}</div>}
                {skills.map((s) => (
                  <label key={s.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedPushSkillIds.includes(s.id)}
                      onChange={(e) =>
                        setSelectedPushSkillIds((prev) =>
                          e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id),
                        )
                      }
                    />
                    <span>{s.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium">{t`Projects`}</h4>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {projects.length === 0 && <div className="text-muted">{t`No projects available in Profile.`}</div>}
                {projects.map((p) => (
                  <label key={p.id} className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedPushProjectIds.includes(p.id)}
                      onChange={(e) =>
                        setSelectedPushProjectIds((prev) =>
                          e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id),
                        )
                      }
                    />
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-sm text-muted-foreground">{p.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium">{t`Work Experience`}</h4>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {workExperiences.length === 0 && (
                  <div className="text-muted">{t`No work experience available in Profile.`}</div>
                )}
                {workExperiences.map((work) => (
                  <label key={work.id} className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedPushWorkIds.includes(work.id)}
                      onChange={(e) =>
                        setSelectedPushWorkIds((prev) =>
                          e.target.checked ? [...prev, work.id] : prev.filter((id) => id !== work.id),
                        )
                      }
                    />
                    <div>
                      <div className="font-medium">{work.company}</div>
                      <div className="text-sm text-muted-foreground">
                        {work.role} · {work.period}
                      </div>
                      <div className="text-sm text-muted-foreground">{work.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenPushDialog(false)}>{t`Cancel`}</Button>
            <Button onClick={() => handleSendToBuilder()}>{t`Send to Builder`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
