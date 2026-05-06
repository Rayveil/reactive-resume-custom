import type { ChangeEvent, Dispatch, SetStateAction } from "react";

import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type ValueType = string | number | boolean | null | undefined;

type PathField = {
  path: string;
  label: string;
  placeholder?: string;
  type?: "text" | "email" | "url" | "number" | "textarea";
  className?: string;
  min?: number;
  max?: number;
  step?: number;
};

type EditableListSectionProps<TItem extends { id: string }, TDraft extends Record<string, unknown>> = {
  title: string;
  emptyText: string;
  items: TItem[];
  createDraft: () => TDraft;
  createItem: (draft: TDraft) => TItem;
  onAdd: (item: TItem) => void;
  onUpdate: (id: string, item: TItem) => void;
  onDelete: (id: string) => void;
  fields: PathField[];
  getTitle: (item: TItem) => string;
  getSubtitle?: (item: TItem) => string | undefined;
  compact?: boolean;
};

export function EditableListSection<TItem extends { id: string }, TDraft extends Record<string, unknown>>({
  title,
  emptyText,
  items,
  createDraft,
  createItem,
  onAdd,
  onUpdate,
  onDelete,
  fields,
  getTitle,
  getSubtitle,
  compact = false,
}: EditableListSectionProps<TItem, TDraft>) {
  const [draft, setDraft] = useState<TDraft>(createDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState<TDraft | null>(null);

  const draftKey = useMemo(() => JSON.stringify(fields.map((field) => field.path)), [fields]);

  const updateDraftValue = (setValue: Dispatch<SetStateAction<TDraft>>, path: string, value: ValueType) => {
    setValue((prev) => setNestedValue(prev, path, value));
  };

  const handleAdd = () => {
    onAdd(createItem(draft));
    setDraft(createDraft());
  };

  const startEdit = (item: TItem) => {
    const itemDraft = createDraft();
    const nextDraft = setNestedValue(itemDraft, "id", item.id);
    const filled = Object.entries(item).reduce((acc, [key, value]) => setNestedValue(acc, key, value), nextDraft);
    setEditingId(item.id);
    setEditingDraft(filled as TDraft);
  };

  const saveEdit = () => {
    if (!editingId || !editingDraft) return;
    onUpdate(editingId, createItem(editingDraft));
    setEditingId(null);
    setEditingDraft(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingDraft(null);
  };

  return (
    <section
      className={compact ? "space-y-4" : "space-y-4 rounded-xl border bg-background p-5 shadow-sm"}
      key={draftKey}
    >
      {!compact && (
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{title}</h2>
        </div>
      )}

      <div className="grid gap-3 rounded-xl border border-dashed p-4 sm:grid-cols-2">
        {fields.map((field) => (
          <FieldInput
            key={field.path}
            field={field}
            value={getNestedValue(draft, field.path)}
            onChange={(value) => updateDraftValue(setDraft, field.path, value)}
          />
        ))}

        <Button type="button" onClick={handleAdd} className="sm:col-span-2 sm:justify-self-end">
          <PlusIcon />
          <Trans>Add</Trans>
        </Button>
      </div>

      <div className="grid gap-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          items.map((item) => {
            const isEditing = editingId === item.id && editingDraft !== null;

            return (
              <article key={item.id} className="grid gap-3 rounded-xl border bg-card p-4 shadow-sm">
                {isEditing ? (
                  <div className="grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {fields.map((field) => (
                        <FieldInput
                          key={field.path}
                          field={field}
                          value={getNestedValue(editingDraft, field.path)}
                          onChange={(value) => updateDraftValue(setEditingDraft, field.path, value)}
                        />
                      ))}
                    </div>

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="ghost" onClick={cancelEdit}>
                        <Trans>Cancel</Trans>
                      </Button>
                      <Button type="button" onClick={saveEdit}>
                        <Trans>Save</Trans>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-medium">{getTitle(item)}</h3>
                      {getSubtitle ? <p className="text-sm text-muted-foreground">{getSubtitle(item)}</p> : null}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => startEdit(item)}
                      >
                        <PencilSimpleIcon />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="size-7 text-destructive"
                        onClick={() => onDelete(item.id)}
                      >
                        <TrashIcon />
                      </Button>
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: PathField;
  value: ValueType;
  onChange: (value: ValueType) => void;
}) {
  const common = {
    value: (value ?? "") as string | number,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (field.type === "number") {
        const nextValue = event.target.value;
        onChange(nextValue === "" ? "" : Number(nextValue));
        return;
      }
      onChange(event.target.value);
    },
    placeholder: field.placeholder ?? field.label,
    className: field.className,
  };

  if (field.type === "textarea") {
    return (
      <label className="grid gap-2 sm:col-span-2">
        <span className="text-sm font-medium">{field.label}</span>
        <Textarea {...common} />
      </label>
    );
  }

  return (
    <label className="grid gap-2">
      <span className="text-sm font-medium">{field.label}</span>
      <Input
        {...common}
        type={
          field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "url" ? "url" : "text"
        }
        min={field.min}
        max={field.max}
        step={field.step}
      />
    </label>
  );
}

function getNestedValue(target: Record<string, unknown>, path: string): ValueType {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value && typeof value === "object" && key in value) return (value as Record<string, unknown>)[key];
    return undefined;
  }, target) as ValueType;
}

function setNestedValue<T extends Record<string, unknown>>(target: T, path: string, value: unknown): T {
  const keys = path.split(".");
  const clone: Record<string, unknown> = Array.isArray(target) ? [...target] : { ...target };
  let current: Record<string, unknown> = clone;

  for (let index = 0; index < keys.length - 1; index += 1) {
    const key = keys[index];
    const next = current[key];
    const nextClone = next && typeof next === "object" ? (Array.isArray(next) ? [...next] : { ...next }) : {};
    current[key] = nextClone;
    current = nextClone as Record<string, unknown>;
  }

  current[keys[keys.length - 1]] = value;
  return clone as T;
}
