import { t } from "@lingui/core/macro";
import { PlusIcon } from "@phosphor-icons/react";

import { useDialogStore } from "@/dialogs/store";

import { BaseCard } from "./base-card";

export function CreateResumeCard() {
  const { openDialog } = useDialogStore();

  return (
    <BaseCard
      title={t`Create resume with details`}
      description={t`Save your personal information and start editing`}
      onClick={() => openDialog("resume.create", undefined)}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <PlusIcon weight="thin" className="size-12" />
      </div>
    </BaseCard>
  );
}
