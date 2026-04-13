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

      <section className="rounded-md border bg-popover p-6 shadow-sm">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)] lg:items-start">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">
              <Trans>Resumes</Trans>
            </p>
            <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              <Trans>Create a new resume</Trans>
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              <Trans>Start building your resume from scratch</Trans>
            </p>

            <div className="flex flex-wrap gap-3">
              <Button
                className="h-11 rounded-full px-5"
                onClick={() => openDialog("resume.import", undefined)}
              >
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
                onClick={() => void navigate({ to: "/dashboard/settings/profile" })}
              >
                <UserCircleIcon />
                <Trans>Profile</Trans>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 rounded-md border bg-background p-4 shadow-xs">
            <div className="rounded-md border bg-background p-4">
              <p className="text-sm font-medium text-foreground">
                <Trans>Import an existing resume</Trans>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                <Trans>Continue where you left off</Trans>
              </p>
            </div>

            <div className="rounded-md border bg-background p-4">
              <p className="text-sm font-medium text-foreground">
                <Trans>Create a new resume</Trans>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                <Trans>Start building your resume from scratch</Trans>
              </p>
            </div>

            <div className="rounded-md border bg-background p-4">
              <p className="text-sm font-medium text-foreground">
                <Trans>Sort by</Trans>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                <Trans>Last Updated</Trans>
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
