import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { CaretDownIcon, MagicWandIcon, PencilSimpleLineIcon, PlusIcon, TestTubeIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useForm, useFormContext, useWatch } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

import { ChipInput } from "@/components/input/chip-input";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { useFormBlocker } from "@/hooks/use-form-blocker";
import { authClient } from "@/integrations/auth/client";
import { orpc, type RouterInput } from "@/integrations/orpc/client";
import { defaultResumeData, type ResumeData } from "@/schema/resume/data";
import { generateRandomName, slugify } from "@/utils/string";

import { type DialogProps, useDialogStore } from "../store";

const formSchema = z.object({
  name: z.string().min(1).max(64),
  slug: z.string().min(1).max(64).transform(slugify),
  tags: z.array(z.string()),
  personalName: z.string().max(64).default(""),
  headline: z.string().max(96).default(""),
  email: z.string().max(128).default(""),
  phone: z.string().max(64).default(""),
  location: z.string().max(128).default(""),
  website: z.string().max(256).default(""),
});

type FormValues = z.infer<typeof formSchema>;

function normalizeWebsiteUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function buildStarterResumeData(values: FormValues): ResumeData | undefined {
  const personalFields = [values.personalName, values.headline, values.email, values.phone, values.location, values.website];
  if (!personalFields.some((field) => field.trim().length > 0)) return undefined;

  const data = structuredClone(defaultResumeData);
  const website = normalizeWebsiteUrl(values.website);

  data.basics = {
    ...data.basics,
    name: values.personalName.trim(),
    headline: values.headline.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    location: values.location.trim(),
    website: website
      ? {
          url: website,
          label: website.replace(/^https?:\/\//i, ""),
        }
      : { url: "", label: "" },
  };

  return data;
}

export function CreateResumeDialog(_: DialogProps<"resume.create">) {
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const { data: session } = authClient.useSession();

  const { mutate: createResume, isPending } = useMutation(orpc.resume.create.mutationOptions());

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      tags: [],
      personalName: session?.user.name ?? "",
      headline: "",
      email: session?.user.email ?? "",
      phone: "",
      location: "",
      website: "",
    },
  });

  const name = useWatch({ control: form.control, name: "name" });

  useEffect(() => {
    form.setValue("slug", slugify(name), { shouldDirty: true });
  }, [form, name]);

  useEffect(() => {
    if (!session) return;

    if (!form.getValues("personalName")) {
      form.setValue("personalName", session.user.name ?? "", { shouldDirty: false });
    }

    if (!form.getValues("email")) {
      form.setValue("email", session.user.email ?? "", { shouldDirty: false });
    }
  }, [form, session]);

  const { blockEvents } = useFormBlocker(form);

  const onSubmit = (data: FormValues) => {
    const toastId = toast.loading(t`Creating your resume...`);
    const starterData = buildStarterResumeData(data);
    const payload: RouterInput["resume"]["create"] = {
      name: data.name,
      slug: data.slug,
      tags: data.tags,
      data: starterData,
    };

    createResume(payload, {
      onSuccess: () => {
        toast.success(t`Your resume has been created successfully.`, { id: toastId });
        closeDialog();
      },
      onError: (error) => {
        if (error.message === "RESUME_SLUG_ALREADY_EXISTS") {
          toast.error(t`A resume with this slug already exists.`, { id: toastId });
          return;
        }

        toast.error(error.message, { id: toastId });
      },
    });
  };

  const onCreateSampleResume = () => {
    const values = form.getValues();
    const randomName = generateRandomName();

    const data = {
      name: values.name || randomName,
      slug: values.slug || slugify(randomName),
      tags: values.tags,
      withSampleData: true,
    } satisfies RouterInput["resume"]["create"];

    const toastId = toast.loading(t`Creating your resume...`);

    createResume(data, {
      onSuccess: () => {
        toast.success(t`Your resume has been created successfully.`, { id: toastId });
        closeDialog();
      },
      onError: (error) => {
        toast.error(error.message, { id: toastId });
      },
    });
  };

  return (
    <DialogContent {...blockEvents}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-x-2">
          <PlusIcon />
          <Trans>Create a new resume</Trans>
        </DialogTitle>
        <DialogDescription>
          <Trans>Start with a title, then save the personal details you want to reuse later.</Trans>
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <ResumeForm />

          <div className="space-y-4 rounded-xl border bg-muted/20 p-4">
            <div className="space-y-1">
              <h3 className="text-sm font-medium">
                <Trans>Personal information</Trans>
              </h3>
              <FormDescription>
                <Trans>This information will be saved in the new resume and can be reused later.</Trans>
              </FormDescription>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="personalName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Full Name</Trans>
                    </FormLabel>
                    <FormControl render={<Input autoComplete="name" placeholder="John Doe" {...field} />} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="headline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Headline</Trans>
                    </FormLabel>
                    <FormControl render={<Input placeholder="Product Designer" {...field} />} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Email</Trans>
                    </FormLabel>
                    <FormControl render={<Input type="email" autoComplete="email" placeholder="john@example.com" {...field} />} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Phone</Trans>
                    </FormLabel>
                    <FormControl render={<Input autoComplete="tel" placeholder="+1 555 123 4567" {...field} />} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Location</Trans>
                    </FormLabel>
                    <FormControl render={<Input autoComplete="address-level2" placeholder="San Francisco, CA" {...field} />} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      <Trans>Website</Trans>
                    </FormLabel>
                    <FormControl render={<Input type="url" autoComplete="url" placeholder="https://your-site.com" {...field} />} />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <DialogFooter>
            <ButtonGroup aria-label="Create Resume with Options" className="gap-x-px rtl:flex-row-reverse">
              <Button type="submit" disabled={isPending}>
                <Trans>Create</Trans>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button size="icon" disabled={isPending}>
                      <CaretDownIcon />
                    </Button>
                  }
                />

                <DropdownMenuContent align="end" className="w-fit">
                  <DropdownMenuItem onClick={onCreateSampleResume}>
                    <TestTubeIcon />
                    <Trans>Create a Sample Resume</Trans>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </ButtonGroup>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

export function UpdateResumeDialog({ data }: DialogProps<"resume.update">) {
  const closeDialog = useDialogStore((state) => state.closeDialog);

  const { mutate: updateResume, isPending } = useMutation(orpc.resume.update.mutationOptions());

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: data.id,
      name: data.name,
      slug: data.slug,
      tags: data.tags,
    },
  });

  const name = useWatch({ control: form.control, name: "name" });

  useEffect(() => {
    if (!name) return;
    form.setValue("slug", slugify(name), { shouldDirty: true });
  }, [form, name]);

  const { blockEvents } = useFormBlocker(form);

  const onSubmit = (data: FormValues) => {
    const toastId = toast.loading(t`Updating your resume...`);

    updateResume(data, {
      onSuccess: () => {
        toast.success(t`Your resume has been updated successfully.`, { id: toastId });
        closeDialog();
      },
      onError: (error) => {
        if (error.message === "RESUME_SLUG_ALREADY_EXISTS") {
          toast.error(t`A resume with this slug already exists.`, { id: toastId });
          return;
        }

        toast.error(error.message, { id: toastId });
      },
    });
  };

  return (
    <DialogContent {...blockEvents}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-x-2">
          <PencilSimpleLineIcon />
          <Trans>Update Resume</Trans>
        </DialogTitle>
        <DialogDescription>
          <Trans>Changed your mind? Rename your resume to something more descriptive.</Trans>
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <ResumeForm />

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Trans>Save Changes</Trans>
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

export function DuplicateResumeDialog({ data }: DialogProps<"resume.duplicate">) {
  const navigate = useNavigate();
  const closeDialog = useDialogStore((state) => state.closeDialog);

  const { mutate: duplicateResume, isPending } = useMutation(orpc.resume.duplicate.mutationOptions());

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      id: data.id,
      name: `${data.name} (Copy)`,
      slug: `${data.slug}-copy`,
      tags: data.tags,
    },
  });

  const name = useWatch({ control: form.control, name: "name" });

  useEffect(() => {
    if (!name) return;
    form.setValue("slug", slugify(name), { shouldDirty: true });
  }, [form, name]);

  const { blockEvents } = useFormBlocker(form);

  const onSubmit = (values: FormValues) => {
    const toastId = toast.loading(t`Duplicating your resume...`);

    duplicateResume(values, {
      onSuccess: async (id) => {
        toast.success(t`Your resume has been duplicated successfully.`, { id: toastId });
        closeDialog();

        if (!data.shouldRedirect) return;
        void navigate({ to: `/builder/$resumeId`, params: { resumeId: id } });
      },
      onError: (error) => {
        toast.error(error.message, { id: toastId });
      },
    });
  };

  return (
    <DialogContent {...blockEvents}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-x-2">
          <PencilSimpleLineIcon />
          <Trans>Duplicate Resume</Trans>
        </DialogTitle>
        <DialogDescription>
          <Trans>Duplicate your resume to create a new one, just like the original.</Trans>
        </DialogDescription>
      </DialogHeader>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <ResumeForm />

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              <Trans>Duplicate</Trans>
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

function ResumeForm() {
  const form = useFormContext<FormValues>();
  const { data: session } = authClient.useSession();

  const slugPrefix = useMemo(() => {
    return `${window.location.origin}/${session?.user.username ?? ""}/`;
  }, [session]);

  const onGenerateName = () => {
    form.setValue("name", generateRandomName(), { shouldDirty: true });
  };

  return (
    <>
      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              <Trans>Name</Trans>
            </FormLabel>
            <div className="flex items-center gap-x-2">
              <FormControl render={<Input min={1} max={64} {...field} />} />

              <Button size="icon" variant="outline" title={t`Generate a random name`} onClick={onGenerateName}>
                <MagicWandIcon />
              </Button>
            </div>
            <FormMessage />
            <FormDescription>
              <Trans>Tip: You can name the resume referring to the position you are applying for.</Trans>
            </FormDescription>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="slug"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              <Trans>Slug</Trans>
            </FormLabel>
            <FormControl
              render={
                <InputGroup>
                  <InputGroupAddon align="inline-start" className="hidden sm:flex">
                    <InputGroupText>{slugPrefix}</InputGroupText>
                  </InputGroupAddon>
                  <InputGroupInput min={1} max={64} className="ps-0!" {...field} />
                </InputGroup>
              }
            />
            <FormMessage />
            <FormDescription>
              <Trans>This is a URL-friendly name for your resume.</Trans>
            </FormDescription>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="tags"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              <Trans>Tags</Trans>
            </FormLabel>
            <FormControl render={<ChipInput {...field} />} />
            <FormMessage />
            <FormDescription>
              <Trans>Tags can be used to categorize your resume by keywords.</Trans>
            </FormDescription>
          </FormItem>
        )}
      />
    </>
  );
}
