"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getLoginErrorMessage } from "@/lib/auth/login-flow-shared";
import { toast } from "sonner";
import packageJson from "@/package.json";

export default function ResetPinPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pin, setPin] = React.useState("");
  const [confirmPin, setConfirmPin] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [sessionReady, setSessionReady] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const message = getLoginErrorMessage(searchParams.get("error"));
      if (message) {
        toast.error(message);
      }

      const supabase = createSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (cancelled) return;
      if (!user) {
        toast.error("Open the recovery email link first, then set a new PIN.");
        router.replace("/login");
        return;
      }

      setSessionReady(true);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    if (!/^\d{6}$/.test(pin)) {
      toast.error("The new PIN must be exactly 6 digits.");
      return;
    }
    if (pin !== confirmPin) {
      toast.error("The PIN confirmation does not match.");
      return;
    }

    setSaving(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password: pin });
      if (error) throw error;
      toast.success("Your PIN has been updated successfully.");
      router.replace("/");
      router.refresh();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-primary/80">
              WELCOME
            </p>
            <CardTitle className="text-2xl">A.Z Finance Hub</CardTitle>
            <CardDescription>v{packageJson.version} · Set a new owner PIN</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">New PIN</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                placeholder="000000"
                className="h-14 text-center text-2xl tracking-[0.45em]"
                value={pin}
                onChange={(event) => setPin(event.target.value.replace(/\D/g, "").slice(0, 6))}
                disabled={!sessionReady || saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPin">Confirm PIN</Label>
              <Input
                id="confirmPin"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                placeholder="000000"
                className="h-14 text-center text-2xl tracking-[0.45em]"
                value={confirmPin}
                onChange={(event) =>
                  setConfirmPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                disabled={!sessionReady || saving}
              />
            </div>
            <Button type="submit" className="w-full" disabled={!sessionReady || saving}>
              {saving ? "Saving..." : "Save New PIN"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
