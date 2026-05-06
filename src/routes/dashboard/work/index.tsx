import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/dashboard/work/")({
  beforeLoad: () => {
    throw redirect({ to: "/dashboard/jobs", search: { status: "all" }, replace: true });
  },
});
