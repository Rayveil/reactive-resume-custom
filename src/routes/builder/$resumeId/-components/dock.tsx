import { t } from "@lingui/core/macro";
import {
  ArrowUUpLeftIcon,
  ArrowUUpRightIcon,
  CircleNotchIcon,
  CubeFocusIcon,
  FileDocIcon,
  FloppyDiskIcon,
  FileJsIcon,
  FilePdfIcon,
  type Icon,
  LinkSimpleIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
} from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useControls } from "react-zoom-pan-pinch";
import { toast } from "sonner";
import { useCopyToClipboard } from "usehooks-ts";

import { AIChat } from "@/components/ai/chat";
import { useResumeStore, useTemporalStore } from "@/components/resume/store/resume";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { authClient } from "@/integrations/auth/client";
import { orpc } from "@/integrations/orpc/client";
import {
  createMockProfileSource,
  mergeProfileSource,
  profileSourceStorageKey,
  type BasicInfo,
  type ProfileSkill,
  type ProfileProject,
  type WorkExperience,
} from "@/routes/dashboard/personal/-components/profile-source";
import { downloadFromUrl, downloadWithAnchor, generateFilename } from "@/utils/file";
import { buildDocx } from "@/utils/resume/docx";
import { generateId } from "@/utils/string";
import { cn } from "@/utils/style";

const normalize = (value: string) => value.trim().toLowerCase();

export function BuilderDock() {
  const { data: session } = authClient.useSession();

  const [_, copyToClipboard] = useCopyToClipboard();
  const { zoomIn, zoomOut, centerView } = useControls();

  const { mutateAsync: printResumeAsPDF, isPending: isPrinting } = useMutation(
    orpc.printer.printResumeAsPDF.mutationOptions(),
  );

  const { undo, redo, pastStates, futureStates } = useTemporalStore((state) => ({
    undo: state.undo,
    redo: state.redo,
    pastStates: state.pastStates,
    futureStates: state.futureStates,
  }));

  const updateResumeData = useResumeStore((state) => state.updateResumeData);
  const resume = useResumeStore((state) => state.resume);
  const currentResumeData = useResumeStore((state) => state.resume?.data);

  const [openImport, setOpenImport] = useState(false);
  const [openSaveDialog, setOpenSaveDialog] = useState(false);
  const [selectedBasicInfo, setSelectedBasicInfo] = useState(true);
  const [selectedSkillIds, setSelectedSkillIds] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedWorkExperienceIds, setSelectedWorkExperienceIds] = useState<string[]>([]);
  const [syncToProfile, setSyncToProfile] = useState(false);

  const [profileBasicInfo, setProfileBasicInfo] = useState<BasicInfo>(createMockProfileSource().basicInfo);
  const [profileSkills, setProfileSkills] = useState<ProfileSkill[]>([]);
  const [profileProjects, setProfileProjects] = useState<ProfileProject[]>([]);
  const [profileWorkExperiences, setProfileWorkExperiences] = useState<WorkExperience[]>([]);

  // load profile source from localStorage (mock)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(profileSourceStorageKey);
      if (!raw) {
        const mock = createMockProfileSource();
        setProfileBasicInfo(mock.basicInfo);
        setProfileSkills(mock.skills);
        setProfileProjects(mock.projects);
        setProfileWorkExperiences(mock.workExperiences);
        return;
      }
      const parsed = mergeProfileSource(JSON.parse(raw));
      setProfileBasicInfo(parsed.basicInfo);
      setProfileSkills(parsed.skills);
      setProfileProjects(parsed.projects);
      setProfileWorkExperiences(parsed.workExperiences);
    } catch {
      const mock = createMockProfileSource();
      setProfileBasicInfo(mock.basicInfo);
      setProfileSkills(mock.skills);
      setProfileProjects(mock.projects);
      setProfileWorkExperiences(mock.workExperiences);
    }
  }, []);

  // check for any "pushed" profile payload intended for this builder (profile.push.<resumeId>)
  useEffect(() => {
    try {
      if (!resume?.id || typeof window === "undefined") return;
      const key = `profile.push.${resume.id}`;
      const raw = window.localStorage.getItem(key);
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        basicInfo?: BasicInfo;
        skills?: ProfileSkill[];
        projects?: ProfileProject[];
        workExperiences?: WorkExperience[];
      };

      const incomingSkills = Array.isArray(parsed.skills) ? parsed.skills : [];
      const incomingProjects = Array.isArray(parsed.projects) ? parsed.projects : [];
      const incomingWorkExperiences = Array.isArray(parsed.workExperiences) ? parsed.workExperiences : [];

      updateResumeData((draft) => {
        if (parsed.basicInfo) {
          draft.basics.name = parsed.basicInfo.name ?? draft.basics.name;
          draft.basics.headline = parsed.basicInfo.headline ?? draft.basics.headline;
          draft.basics.email = parsed.basicInfo.email ?? draft.basics.email;
          draft.basics.phone = parsed.basicInfo.phone ?? draft.basics.phone;
          draft.basics.location = parsed.basicInfo.location ?? draft.basics.location;
          draft.basics.website.url = parsed.basicInfo.website ?? draft.basics.website.url;
          draft.basics.website.label = draft.basics.website.label || "";
        }

        const existingSkillNames = new Set(draft.sections.skills.items.map((s) => normalize(s.name)));
        const existingProjectKeys = new Set(
          draft.sections.projects.items.map((p) => `${normalize(p.name)}::${normalize(p.description)}`),
        );
        const existingExperienceKeys = new Set(
          draft.sections.experience.items.map(
            (experience) =>
              `${normalize(experience.company)}::${normalize(experience.position)}::${normalize(experience.period)}::${normalize(experience.description)}`,
          ),
        );

        const addedSkills = incomingSkills
          .filter((s) => !existingSkillNames.has(normalize(s.name)))
          .map((s) => ({
            id: generateId(),
            hidden: false,
            icon: "",
            name: s.name,
            proficiency: "",
            level: 0,
            keywords: [],
          }));

        const addedProjects = incomingProjects
          .filter((p) => {
            const key = `${normalize(p.name)}::${normalize(p.description)}`;
            return !existingProjectKeys.has(key);
          })
          .map((p) => ({
            id: generateId(),
            hidden: false,
            name: p.name,
            period: "",
            website: { url: "", label: "" },
            description: p.description,
          }));

        const addedExperience = incomingWorkExperiences
          .filter((work) => {
            const key = `${normalize(work.company)}::${normalize(work.role)}::${normalize(work.period)}::${normalize(work.description)}`;
            return !existingExperienceKeys.has(key);
          })
          .map((work) => ({
            id: generateId(),
            hidden: false,
            options: undefined,
            company: work.company,
            position: work.role,
            location: "",
            period: work.period,
            website: { url: "", label: "" },
            description: work.description,
            roles: [],
          }));

        draft.sections.skills.items = [...draft.sections.skills.items, ...addedSkills];
        draft.sections.projects.items = [...draft.sections.projects.items, ...addedProjects];
        draft.sections.experience.items = [...draft.sections.experience.items, ...addedExperience];
      });

      // remove the push key so it doesn't re-import
      window.localStorage.removeItem(key);

      const importedCount =
        (parsed.basicInfo ? 1 : 0) + incomingSkills.length + incomingProjects.length + incomingWorkExperiences.length;
      toast.success(t`Imported ${importedCount} profile items into this resume.`);
    } catch {
      // ignore errors here
    }
  }, [resume?.id, updateResumeData]);

  const canUndo = pastStates.length > 1;
  const canRedo = futureStates.length > 0;

  useHotkeys("mod+z", () => undo(), { enabled: canUndo, preventDefault: true });
  useHotkeys(["mod+y", "mod+shift+z"], () => redo(), { enabled: canRedo, preventDefault: true });

  const publicUrl = useMemo(() => {
    if (!session?.user.username || !resume?.slug) return "";
    return `${window.location.origin}/${session.user.username}/${resume.slug}`;
  }, [session?.user.username, resume?.slug]);

  const onCopyUrl = useCallback(async () => {
    await copyToClipboard(publicUrl);
    toast.success(t`A link to your resume has been copied to clipboard.`);
  }, [publicUrl, copyToClipboard]);

  const onDownloadJSON = useCallback(async () => {
    if (!resume?.data) return;
    const filename = generateFilename(resume.name, "json");
    const jsonString = JSON.stringify(resume.data, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });

    downloadWithAnchor(blob, filename);
  }, [resume?.data]);

  const onDownloadDOCX = useCallback(async () => {
    if (!resume?.data) return;
    const filename = generateFilename(resume.name, "docx");

    try {
      const blob = await buildDocx(resume.data);
      downloadWithAnchor(blob, filename);
    } catch {
      toast.error(t`There was a problem while generating the DOCX, please try again.`);
    }
  }, [resume?.data]);

  const onDownloadPDF = useCallback(async () => {
    if (!resume?.id) return;

    const filename = generateFilename(resume.name, "pdf");
    const toastId = toast.loading(t`Please wait while your PDF is being generated...`, {
      description: t`This may take a while depending on the server capacity. Please do not close the window or refresh the page.`,
    });

    try {
      const { url } = await printResumeAsPDF({ id: resume.id });
      await downloadFromUrl(url, filename);
    } catch {
      toast.error(t`There was a problem while generating the PDF, please try again in some time.`);
    } finally {
      toast.dismiss(toastId);
    }
  }, [resume?.id, resume?.name, printResumeAsPDF]);

  const importSelected = useCallback(() => {
    try {
      const toImportSkills = profileSkills.filter((s) => selectedSkillIds.includes(s.id));
      const toImportProjects = profileProjects.filter((p) => selectedProjectIds.includes(p.id));
      const toImportWorkExperiences = profileWorkExperiences.filter((work) =>
        selectedWorkExperienceIds.includes(work.id),
      );

      updateResumeData((draft) => {
        if (selectedBasicInfo) {
          draft.basics.name = profileBasicInfo.name;
          draft.basics.headline = profileBasicInfo.headline;
          draft.basics.email = profileBasicInfo.email;
          draft.basics.phone = profileBasicInfo.phone;
          draft.basics.location = profileBasicInfo.location;
          draft.basics.website.url = profileBasicInfo.website;
          draft.basics.website.label = "";
        }

        const existingSkillNames = new Set(draft.sections.skills.items.map((skill) => normalize(skill.name)));
        const existingProjectKeys = new Set(
          draft.sections.projects.items.map(
            (project) => `${normalize(project.name)}::${normalize(project.description)}`,
          ),
        );
        const existingExperienceKeys = new Set(
          draft.sections.experience.items.map(
            (experience) =>
              `${normalize(experience.company)}::${normalize(experience.position)}::${normalize(experience.period)}::${normalize(experience.description)}`,
          ),
        );

        const importedSkills = toImportSkills
          .filter((skill) => !existingSkillNames.has(normalize(skill.name)))
          .map((skill) => ({
            id: generateId(),
            hidden: false,
            icon: "",
            name: skill.name,
            proficiency: "",
            level: 0,
            keywords: [],
          }));

        const importedProjects = toImportProjects
          .filter((project) => {
            const key = `${normalize(project.name)}::${normalize(project.description)}`;
            return !existingProjectKeys.has(key);
          })
          .map((project) => ({
            id: generateId(),
            hidden: false,
            name: project.name,
            period: "",
            website: { url: "", label: "" },
            description: project.description,
          }));

        const importedExperience = toImportWorkExperiences
          .filter((work) => {
            const key = `${normalize(work.company)}::${normalize(work.role)}::${normalize(work.period)}::${normalize(work.description)}`;
            return !existingExperienceKeys.has(key);
          })
          .map((work) => ({
            id: generateId(),
            hidden: false,
            options: undefined,
            company: work.company,
            position: work.role,
            location: "",
            period: work.period,
            website: { url: "", label: "" },
            description: work.description,
            roles: [],
          }));

        draft.sections.skills.items = [...draft.sections.skills.items, ...importedSkills];
        draft.sections.projects.items = [...draft.sections.projects.items, ...importedProjects];
        draft.sections.experience.items = [...draft.sections.experience.items, ...importedExperience];
      });

      toast.success(t`Imported selected profile items into this resume.`);
      setOpenImport(false);
    } catch {
      toast.error(t`Could not import items.`);
    }
  }, [
    profileBasicInfo,
    profileProjects,
    profileSkills,
    profileWorkExperiences,
    selectedBasicInfo,
    selectedProjectIds,
    selectedSkillIds,
    selectedWorkExperienceIds,
    updateResumeData,
  ]);

  const onSaveWithSync = useCallback(() => {
    try {
      if (syncToProfile) {
        const resumeBasics = currentResumeData?.basics;
        const resumeDataSkills = currentResumeData?.sections.skills.items ?? [];
        const resumeDataProjects = currentResumeData?.sections.projects.items ?? [];
        const resumeDataWorkExperiences = currentResumeData?.sections.experience.items ?? [];

        const mappedSkills: ProfileSkill[] = resumeDataSkills.map((skill) => ({
          id: generateId(),
          name: skill.name,
        }));

        const mappedProjects: ProfileProject[] = resumeDataProjects.map((project) => ({
          id: generateId(),
          name: project.name,
          description: project.description,
        }));

        const mappedWorkExperiences: WorkExperience[] = resumeDataWorkExperiences.map((experience) => ({
          id: generateId(),
          company: experience.company,
          role: experience.position,
          period: experience.period,
          description: experience.description,
        }));

        const raw = window.localStorage.getItem(profileSourceStorageKey);
        const parsed = raw ? mergeProfileSource(JSON.parse(raw)) : createMockProfileSource();

        const existingProfileSkills: ProfileSkill[] = parsed.skills;
        const existingProfileProjects: ProfileProject[] = parsed.projects;
        const existingProfileWorkExperiences: WorkExperience[] = parsed.workExperiences;

        const existingProfileSkillNames = new Set(existingProfileSkills.map((skill) => normalize(skill.name)));
        const existingProfileProjectKeys = new Set(
          existingProfileProjects.map((project) => `${normalize(project.name)}::${normalize(project.description)}`),
        );
        const existingProfileWorkKeys = new Set(
          existingProfileWorkExperiences.map(
            (work) =>
              `${normalize(work.company)}::${normalize(work.role)}::${normalize(work.period)}::${normalize(work.description)}`,
          ),
        );

        const dedupedMappedSkills = mappedSkills.filter(
          (skill) => !existingProfileSkillNames.has(normalize(skill.name)),
        );

        const dedupedMappedProjects = mappedProjects.filter((project) => {
          const key = `${normalize(project.name)}::${normalize(project.description)}`;
          return !existingProfileProjectKeys.has(key);
        });

        const dedupedMappedWorkExperiences = mappedWorkExperiences.filter((work) => {
          const key = `${normalize(work.company)}::${normalize(work.role)}::${normalize(work.period)}::${normalize(work.description)}`;
          return !existingProfileWorkKeys.has(key);
        });

        const nextProfileBasicInfo = {
          ...parsed.basicInfo,
          name: resumeBasics?.name?.trim() ? resumeBasics.name : parsed.basicInfo.name,
          headline: resumeBasics?.headline?.trim() ? resumeBasics.headline : parsed.basicInfo.headline,
          email: resumeBasics?.email?.trim() ? resumeBasics.email : parsed.basicInfo.email,
          phone: resumeBasics?.phone?.trim() ? resumeBasics.phone : parsed.basicInfo.phone,
          location: resumeBasics?.location?.trim() ? resumeBasics.location : parsed.basicInfo.location,
          website: resumeBasics?.website?.url?.trim() ? resumeBasics.website.url : parsed.basicInfo.website,
        };

        parsed.basicInfo = nextProfileBasicInfo;
        parsed.skills = [...existingProfileSkills, ...dedupedMappedSkills];
        parsed.projects = [...existingProfileProjects, ...dedupedMappedProjects];
        parsed.workExperiences = [...existingProfileWorkExperiences, ...dedupedMappedWorkExperiences];

        window.localStorage.setItem(profileSourceStorageKey, JSON.stringify(parsed));
        toast.success(t`Resume saved and synchronized to Profile.`);
      } else {
        toast.success(t`Resume saved.`);
      }
    } catch {
      toast.error(t`There was a problem saving.`);
    } finally {
      setOpenSaveDialog(false);
    }
  }, [currentResumeData, syncToProfile]);

  return (
    <div className="fixed inset-x-0 bottom-4 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 0.6, y: 0 }}
        whileHover={{ opacity: 1, y: -2, scale: 1.01 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        style={{ willChange: "transform, opacity" }}
        className="flex items-center rounded-l-full rounded-r-full bg-popover px-2 shadow-xl"
      >
        <DockIcon
          disabled={!canUndo}
          onClick={() => undo()}
          icon={ArrowUUpLeftIcon}
          title={t({
            context: "'Ctrl' may be replaced with the locale-specific equivalent (e.g. 'Strg' for QWERTZ layouts).",
            message: "Undo (Ctrl+Z)",
          })}
        />
        <DockIcon
          disabled={!canRedo}
          onClick={() => redo()}
          icon={ArrowUUpRightIcon}
          title={t({
            context: "'Ctrl' may be replaced with the locale-specific equivalent (e.g. 'Strg' for QWERTZ layouts).",
            message: "Redo (Ctrl+Y)",
          })}
        />
        <div className="mx-1 h-8 w-px bg-border" />
        <DockIcon icon={MagnifyingGlassPlusIcon} title={t`Zoom in`} onClick={() => zoomIn(0.1)} />
        <DockIcon icon={MagnifyingGlassMinusIcon} title={t`Zoom out`} onClick={() => zoomOut(0.1)} />
        <DockIcon icon={CubeFocusIcon} title={t`Center view`} onClick={() => centerView()} />
        <div className="mx-1 h-8 w-px bg-border" />
        <AIChat />
        <DockIcon icon={LinkSimpleIcon} title={t`Copy URL`} onClick={() => onCopyUrl()} />
        <DockIcon icon={FileJsIcon} title={t`Import from Profile`} onClick={() => setOpenImport(true)} />
        <DockIcon icon={FloppyDiskIcon} title={t`Save`} onClick={() => setOpenSaveDialog(true)} />
        <DockIcon icon={FileJsIcon} title={t`Download JSON`} onClick={() => onDownloadJSON()} />
        <DockIcon icon={FileDocIcon} title={t`Download DOCX`} onClick={() => onDownloadDOCX()} />
        <DockIcon
          title={t`Download PDF`}
          disabled={isPrinting}
          onClick={() => onDownloadPDF()}
          icon={isPrinting ? CircleNotchIcon : FilePdfIcon}
          iconClassName={cn(isPrinting && "animate-spin")}
        />
      </motion.div>
      {/* Import Dialog */}
      <Dialog open={openImport} onOpenChange={setOpenImport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t`Import from Profile`}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="font-medium">{t`Skills`}</h4>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {profileSkills.length === 0 && <div className="text-muted">{t`No skills available in Profile.`}</div>}
                {profileSkills.map((s) => (
                  <label key={s.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedSkillIds.includes(s.id)}
                      onChange={(e) => {
                        setSelectedSkillIds((prev) =>
                          e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id),
                        );
                      }}
                    />
                    <span>{s.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-medium">{t`Projects`}</h4>
              <div className="mt-2 grid grid-cols-1 gap-2">
                {profileProjects.length === 0 && (
                  <div className="text-muted">{t`No projects available in Profile.`}</div>
                )}
                {profileProjects.map((p) => (
                  <label key={p.id} className="flex items-start space-x-2">
                    <input
                      type="checkbox"
                      checked={selectedProjectIds.includes(p.id)}
                      onChange={(e) => {
                        setSelectedProjectIds((prev) =>
                          e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id),
                        );
                      }}
                    />
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-sm text-muted-foreground">{p.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenImport(false)}>{t`Cancel`}</Button>
            <Button onClick={() => importSelected()}>{t`Import selected`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Dialog with Sync */}
      <Dialog open={openSaveDialog} onOpenChange={setOpenSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t`Save Resume`}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">{t`Sync to Profile`}</div>
                <div className="text-sm text-muted">{t`When enabled, skills and projects from this resume will be merged into your Profile.`}</div>
              </div>
              <Switch checked={syncToProfile} onCheckedChange={(v) => setSyncToProfile(Boolean(v))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenSaveDialog(false)}>{t`Cancel`}</Button>
            <Button onClick={() => onSaveWithSync()}>{t`Save`}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type DockIconProps = {
  title: string;
  icon: Icon;
  disabled?: boolean;
  onClick: () => void;
  iconClassName?: string;
};

function DockIcon({ icon: Icon, title, disabled, onClick, iconClassName }: DockIconProps) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <motion.div
            whileHover={disabled ? undefined : { y: -1, scale: 1.04 }}
            whileTap={disabled ? undefined : { scale: 0.97 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{ willChange: "transform" }}
          >
            <Button size="icon" variant="ghost" disabled={disabled} onClick={onClick}>
              <Icon className={cn("size-4", iconClassName)} />
            </Button>
          </motion.div>
        }
      />

      <TooltipContent side="top" align="center" className="font-medium">
        {title}
      </TooltipContent>
    </Tooltip>
  );
}
