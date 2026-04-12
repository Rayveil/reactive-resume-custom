import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import { Trans } from "@lingui/react/macro";
import { GridFourIcon, ListIcon, PencilSimpleLineIcon, ReadCvLogoIcon, UploadSimpleIcon, UserCircleIcon } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, stripSearchParams, useNavigate, useRouter } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { zodValidator } from "@tanstack/zod-adapter";
import { useMemo } from "react";
import z from "zod";

import { Combobox } from "@/components/ui/combobox";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { orpc } from "@/integrations/orpc/client";
import { cn } from "@/utils/style";

import { DashboardHeader } from "../-components/header";
import { GridView } from "./-components/grid-view";
import { ListView } from "./-components/list-view";
import { useDialogStore } from "@/dialogs/store";

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
  loader: async () => {
    const view = await getViewServerFn();
    return { view };
  },
});

function RouteComponent() {
  const router = useRouter();
  const { i18n } = useLingui();
  const { view } = Route.useLoaderData();
  const { tags, sort } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { openDialog } = useDialogStore();

  const { data: allTags } = useQuery(orpc.resume.tags.list.queryOptions());
  const { data: resumes } = useQuery(orpc.resume.list.queryOptions({ input: { tags, sort } }));

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

  const onViewChange = async (value: string) => {
    await setViewServerFn({ data: value as "grid" | "list" });
    void router.invalidate();
  };

  return (
    <div className="space-y-6">
      <DashboardHeader icon={ReadCvLogoIcon} title={t`Resumes`} />

      <section className="relative overflow-hidden rounded-3xl border bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.95),rgba(51,65,85,0.96))] p-6 text-white shadow-sm">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_40%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_32%)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.35em] text-white/60">Resume studio</p>
            <h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
              <Trans>Import a resume, type your details once, and reuse them for every new version.</Trans>
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
              <Trans>
                Start from an existing PDF, Word document, or JSON file, or enter your personal information manually
                to create a reusable resume foundation.
              </Trans>
            </p>

            <div className="flex flex-wrap gap-3">
              <Button
                className="h-11 rounded-full bg-white px-5 text-slate-950 hover:bg-white/90"
                onClick={() => openDialog("resume.import", undefined)}
              >
                <UploadSimpleIcon />
                <Trans>Import resume</Trans>
              </Button>

              <Button
                variant="outline"
                className="h-11 rounded-full border-white/20 bg-white/10 px-5 text-white hover:bg-white/20"
                onClick={() => openDialog("resume.create", undefined)}
              >
                <PencilSimpleLineIcon />
                <Trans>Enter personal details</Trans>
              </Button>

              <Button
                variant="ghost"
                className="h-11 rounded-full px-5 text-white hover:bg-white/20 hover:text-white"
                onClick={() => void navigate({ to: "/dashboard/settings/profile" })}
              >
                <UserCircleIcon />
                <Trans>Update account profile</Trans>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
            <div className="rounded-xl border border-white/15 bg-black/10 p-4">
              <p className="text-sm font-medium text-white">
                <Trans>1. Import or type your profile</Trans>
              </p>
              <p className="mt-1 text-sm text-white/70">
                <Trans>Save your name, headline, contact details, and website in the new resume.</Trans>
              </p>
            </div>

            <div className="rounded-xl border border-white/15 bg-black/10 p-4">
              <p className="text-sm font-medium text-white">
                <Trans>2. Pick a template</Trans>
              </p>
              <p className="mt-1 text-sm text-white/70">
                <Trans>Choose a layout that fits the role before you start refining sections.</Trans>
              </p>
            </div>

            <div className="rounded-xl border border-white/15 bg-black/10 p-4">
              <p className="text-sm font-medium text-white">
                <Trans>3. Reuse the result</Trans>
              </p>
              <p className="mt-1 text-sm text-white/70">
                <Trans>Duplicate, tailor, or export the resume whenever you need a new version.</Trans>
              </p>
            </div>
          </div>
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
    </div>
  );
}

const RESUMES_VIEW_COOKIE_NAME = "resumes_view";

const viewSchema = z.enum(["grid", "list"]).catch("grid");

const setViewServerFn = createServerFn({ method: "POST" })
  .inputValidator(viewSchema)
  .handler(async ({ data }) => {
    setCookie(RESUMES_VIEW_COOKIE_NAME, JSON.stringify(data));
  });

const getViewServerFn = createServerFn({ method: "GET" }).handler(async () => {
  const view = getCookie(RESUMES_VIEW_COOKIE_NAME);
  if (!view) return "grid";
  return viewSchema.parse(JSON.parse(view));
});
