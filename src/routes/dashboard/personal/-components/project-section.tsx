import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import type { ProfileProject } from "./profile-source";

type Props = {
  projects: ProfileProject[];
  onAdd: (project: Omit<ProfileProject, "id">) => void;
  onUpdate: (id: string, project: Omit<ProfileProject, "id">) => void;
  onDelete: (id: string) => void;
};

export function ProjectSection({ projects, onAdd, onUpdate, onDelete }: Props) {
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

  const handleAdd = () => {
    const name = draftName.trim();
    const description = draftDescription.trim();
    if (!name || !description) return;

    onAdd({ name, description });
    setDraftName("");
    setDraftDescription("");
  };

  const startEdit = (project: ProfileProject) => {
    setEditingId(project.id);
    setEditingName(project.name);
    setEditingDescription(project.description);
  };

  const saveEdit = () => {
    if (!editingId) return;

    const name = editingName.trim();
    const description = editingDescription.trim();
    if (!name || !description) return;

    onUpdate(editingId, { name, description });
    setEditingId(null);
    setEditingName("");
    setEditingDescription("");
  };

  return (
    <section className="space-y-4 rounded-xl border bg-background p-5 shadow-sm">
      <h2 className="text-lg font-semibold">
        <Trans>Project Experience</Trans>
      </h2>

      <div className="grid gap-3 rounded-xl border border-dashed p-4 sm:grid-cols-2">
        <Input
          value={draftName}
          onChange={(event) => setDraftName(event.target.value)}
          placeholder={t`Project name`}
          className="sm:col-span-1"
        />

        <Button type="button" className="sm:col-span-1 sm:justify-self-end" onClick={handleAdd}>
          <PlusIcon />
          <Trans>Add Project</Trans>
        </Button>

        <Textarea
          value={draftDescription}
          onChange={(event) => setDraftDescription(event.target.value)}
          placeholder={t`Describe the project outcome and your contribution`}
          className="sm:col-span-2"
        />
      </div>

      <div className="grid gap-3">
        {projects.map((project) => (
          <article key={project.id} className="rounded-xl border bg-card p-4 shadow-sm">
            {editingId === project.id ? (
              <div className="grid gap-3">
                <Input value={editingName} onChange={(event) => setEditingName(event.target.value)} />
                <Textarea value={editingDescription} onChange={(event) => setEditingDescription(event.target.value)} />
                <div className="flex justify-end">
                  <Button type="button" size="sm" onClick={saveEdit}>
                    <Trans>Save</Trans>
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-medium">{project.name}</h3>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => startEdit(project)}
                    >
                      <PencilSimpleIcon />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive"
                      onClick={() => onDelete(project.id)}
                    >
                      <TrashIcon />
                    </Button>
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{project.description}</p>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
