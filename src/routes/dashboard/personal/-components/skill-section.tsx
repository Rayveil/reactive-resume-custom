import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import type { ProfileSkill } from "./profile-source";

type Props = {
  skills: ProfileSkill[];
  onAdd: (name: string) => void;
  onUpdate: (id: string, name: string) => void;
  onDelete: (id: string) => void;
};

export function SkillSection({ skills, onAdd, onUpdate, onDelete }: Props) {
  const [draftSkill, setDraftSkill] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const handleAdd = () => {
    const value = draftSkill.trim();
    if (!value) return;
    onAdd(value);
    setDraftSkill("");
  };

  const startEdit = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const saveEdit = () => {
    if (!editingId) return;
    const value = editingName.trim();
    if (!value) return;
    onUpdate(editingId, value);
    setEditingId(null);
    setEditingName("");
  };

  return (
    <section className="space-y-4 rounded-xl border bg-background p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          <Trans>Skill List</Trans>
        </h2>

        <div className="flex items-center gap-2">
          <Input
            value={draftSkill}
            onChange={(event) => setDraftSkill(event.target.value)}
            placeholder={t`Add skill`}
            className="h-9 w-44"
          />

          <Button type="button" size="sm" onClick={handleAdd}>
            <PlusIcon />
            <Trans>Add</Trans>
          </Button>
        </div>
      </div>

      {skills.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          <Trans>No skills yet.</Trans>
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <div key={skill.id} className="flex items-center gap-2 rounded-full border bg-muted px-3 py-1.5">
              {editingId === skill.id ? (
                <>
                  <Input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    className="h-7 w-32"
                  />
                  <Button type="button" size="sm" variant="secondary" className="h-7" onClick={saveEdit}>
                    <Trans>Save</Trans>
                  </Button>
                </>
              ) : (
                <>
                  <span className="text-sm">{skill.name}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-6"
                    onClick={() => startEdit(skill.id, skill.name)}
                  >
                    <PencilSimpleIcon />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="size-6 text-destructive"
                    onClick={() => onDelete(skill.id)}
                  >
                    <TrashIcon />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
