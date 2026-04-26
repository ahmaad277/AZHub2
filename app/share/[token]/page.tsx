"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import { Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { InvestmentWizard } from "@/components/investment-wizard";
import { useApp } from "@/components/providers";

interface Meta {
  valid: boolean;
  label: string;
  expiresAt: string | null;
  platforms: Array<{ id: string; name: string; type: string }>;
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const { t } = useApp();
  const [state, setState] = React.useState<"loading" | "ready" | "invalid" | "done">("loading");
  const [meta, setMeta] = React.useState<Meta | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/share/${token}`);
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(j?.error ?? "Invalid link");
          setState("invalid");
          return;
        }
        const data = (await res.json()) as Meta;
        if (!cancelled) {
          setMeta(data);
          setState("ready");
        }
      } catch (e) {
        setError((e as Error).message);
        setState("invalid");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold">{t("share.title")}</h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          {t("share.subtitle")}
        </p>
      </div>

      {state === "loading" ? (
        <div className="rounded-2xl border p-8 text-center text-sm text-muted-foreground">
          {t("common.loading")}
        </div>
      ) : null}

      {state === "invalid" ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-8 text-center">
          <AlertCircle className="mx-auto h-6 w-6 text-destructive" />
          <div className="mt-2 font-semibold">{t("share.expired")}</div>
          {error ? (
            <div className="mt-1 text-xs text-muted-foreground">{error}</div>
          ) : null}
        </div>
      ) : null}

      {state === "ready" && meta ? (
        <div className="rounded-2xl border bg-card/50 p-5">
          <div className="mb-4 text-xs text-muted-foreground">
            Link: <span className="font-semibold">{meta.label}</span>
            {meta.expiresAt
              ? ` · expires ${new Date(meta.expiresAt).toLocaleDateString()}`
              : ""}
          </div>
          <InvestmentWizard
            availablePlatforms={meta.platforms}
            publicSubmit={async (payload) => {
              const res = await fetch(`/api/share/${token}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                throw new Error(j?.error ?? "Submission failed");
              }
              setState("done");
            }}
          />
        </div>
      ) : null}

      {state === "done" ? (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/5 p-10 text-center">
          <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" />
          <div className="mt-3 text-lg font-semibold">{t("share.submitted")}</div>
        </div>
      ) : null}
    </main>
  );
}
