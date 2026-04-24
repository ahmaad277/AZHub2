"use client";

import { Suspense } from "react";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { KeyRound, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getLoginErrorMessage, sanitizeNextPath } from "@/lib/auth/login-flow-shared";
import packageJson from "@/package.json";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pin, setPin] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [recoverySending, setRecoverySending] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const hasShownErrorRef = React.useRef(false);
  const nextPath = React.useMemo(
    () => sanitizeNextPath(searchParams.get("next")),
    [searchParams],
  );

  const playSuccessTone = React.useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }).webkitAudioContext;
      if (!AudioCtx) return;
      const audioContext = new AudioCtx();
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.value = 0.0001;
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start();
      gain.gain.exponentialRampToValueAtTime(0.03, audioContext.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.18);
      oscillator.stop(audioContext.currentTime + 0.2);
      window.setTimeout(() => {
        void audioContext.close().catch(() => undefined);
      }, 240);
    } catch {
      // Browsers may block sound until a user interaction is allowed.
    }
  }, []);

  React.useEffect(() => {
    const currentError = searchParams.get("error");
    const message = getLoginErrorMessage(currentError);
    if (message && !hasShownErrorRef.current) {
      hasShownErrorRef.current = true;
      toast.error(message);
    }
  }, [searchParams]);

  React.useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const data = (await response.json().catch(() => ({ status: "no_session" }))) as {
        status: "authenticated" | "no_session" | "owner_mismatch";
        error?: string;
      };

      if (cancelled) return;
      if (data.status === "authenticated") {
        router.replace(nextPath);
        router.refresh();
        return;
      }
      if (data.status === "owner_mismatch") {
        const supabase = createSupabaseBrowserClient();
        await supabase.auth.signOut();
        toast.error(
          getLoginErrorMessage(data.error) ??
            "This browser had a session for a different email and it was signed out.",
        );
      }
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [nextPath, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending) return;
    if (!/^\d{6}$/.test(pin)) {
      toast.error("The PIN must be exactly 6 digits.");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Login failed");
      }
      setSuccess(true);
      playSuccessTone();
      toast.success("PIN accepted. Opening your dashboard...");
      window.setTimeout(() => {
        router.replace(nextPath);
        router.refresh();
      }, 280);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  };

  const onRequestRecovery = async () => {
    if (recoverySending) return;
    setRecoverySending(true);
    try {
      const response = await fetch("/api/auth/recovery", {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Recovery could not be started.");
      }
      toast.success("Recovery instructions were sent to the owner email inbox.");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setRecoverySending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <motion.div
        animate={success ? { scale: 1.02, opacity: 0.98 } : { scale: 1, opacity: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="w-full max-w-lg"
      >
      <Card className="w-full border-primary/15 shadow-sm">
        <CardHeader>
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
            {success ? <Sparkles className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
          </div>
          <div className="space-y-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">
              WELCOME
            </p>
            <CardTitle className="text-2xl">A.Z Finance Hub</CardTitle>
            <CardDescription>
              v{packageJson.version} · Enter the owner PIN to open the dashboard.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="current-password"
                placeholder="000000"
                required
                className="h-16 text-center text-3xl tracking-[0.45em]"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </div>
            <Button type="submit" className="w-full" disabled={sending || success}>
              {sending ? "Checking..." : success ? "Success" : "Unlock"}
            </Button>
            <div className="space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                Use a 6-digit owner PIN. Recovery still works through the owner email only.
              </p>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={onRequestRecovery}
                disabled={recoverySending}
              >
                {recoverySending ? "Sending recovery..." : "Forgot PIN?"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </motion.div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-lg border-primary/15 shadow-sm">
        <CardHeader>
          <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
            <KeyRound className="h-6 w-6" />
          </div>
          <div className="space-y-2 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">
              WELCOME
            </p>
            <CardTitle className="text-2xl">A.Z Finance Hub</CardTitle>
            <CardDescription>
              v{packageJson.version} · Enter the owner PIN to open the dashboard.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
