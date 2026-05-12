import { createFileRoute } from "@tanstack/react-router";

import type { ResumeData } from "@/schema/resume/data";

import { MLModulesManager } from "@/services/agents/ml-modules";

async function postHandler({ request }: { request: Request }) {
  try {
    const body = await request.json();
    const resume: ResumeData = body.resume;
    const jobInput = body.jobInput || {};
    const useLLM = Boolean(body.useLLM);

    const mgr = new MLModulesManager();
    const analysis = await mgr.analyzeMatch(resume, jobInput, useLLM);

    const payload = { ok: true, analysis };
    const headers = new Headers();
    const bodyText = JSON.stringify(payload);
    headers.set("Content-Type", "application/json; charset=UTF-8");
    headers.set("Content-Length", Buffer.byteLength(bodyText, "utf-8").toString());

    return new Response(bodyText, { headers, status: 200 });
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    const payload = { ok: false, error: err };
    return new Response(JSON.stringify(payload), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export const Route = createFileRoute("/api/modification-previews")({
  server: {
    handlers: {
      POST: postHandler,
    },
  },
});
