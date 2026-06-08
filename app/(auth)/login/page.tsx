"use client";

import { Suspense } from "react";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { KeyRound, ScanFace, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getLoginErrorMessage, sanitizeNextPath } from "@/lib/auth/login-flow-shared";
import {
  checkFaceIdSupport,
  enrollFaceId,
  isBiometricLoginPreferred,
  isFaceIdEnrolled,
  setBiometricLoginPreferred,
  unlockPinWithFaceId,
} from "@/lib/auth/face-id";
import packageJson from "@/package.json";

function LoginBackdrop() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/12 blur-3xl" />
      <div className="absolute -bottom-20 end-0 h-72 w-72 rounded-full bg-primary/6 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,hsl(var(--background))_72%)]" />
    </div>
  );
}

function LoginFooter() {
  return (
    <footer className="pointer-events-none select-none space-y-0.5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-6 text-center text-xs leading-tight text-muted-foreground/60 sm:text-sm">
      <p className="tracking-tight [word-spacing:-0.15em]">أحمد غرم الله أحمد الزهراني</p>
      <p dir="ltr">0534897272</p>
      <p dir="ltr">Ahmaaad277@gmail.com</p>
      <p dir="ltr" className="pt-1.5 text-[10px] text-muted-foreground/45 sm:text-[11px]">
        v{packageJson.version}
      </p>
    </footer>
  );
}

function LoginPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col px-4">
      <LoginBackdrop />
      <div className="flex flex-1 items-center justify-center py-8">{children}</div>
      <LoginFooter />
    </div>
  );
}

function LoginBrandHeader({
  success,
  biometricMode,
}: {
  success?: boolean;
  biometricMode?: boolean;
}) {
  return (
    <CardHeader className="items-center space-y-3 pb-4 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/15 text-primary shadow-sm ring-1 ring-primary/10">
        {success ? (
          <Sparkles className="h-7 w-7" />
        ) : biometricMode ? (
          <ScanFace className="h-7 w-7" />
        ) : (
          <KeyRound className="h-7 w-7" />
        )}
      </div>
      <div className="space-y-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-primary/70">
          Welcome
        </p>
        <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">
          A.Z Finance Hub
        </CardTitle>
        <CardDescription className="text-balance" dir="ltr">
          {biometricMode
            ? "Use your fingerprint or Face ID to open the dashboard."
            : "Enter the owner PIN to open the dashboard."}
        </CardDescription>
      </div>
    </CardHeader>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pin, setPin] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [recoverySending, setRecoverySending] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [faceIdSupported, setFaceIdSupported] = React.useState(false);
  const [faceIdEnrolled, setFaceIdEnrolled] = React.useState(false);
  const [faceIdBusy, setFaceIdBusy] = React.useState(false);
  const [enrollBusy, setEnrollBusy] = React.useState(false);
  const [sessionReady, setSessionReady] = React.useState(false);
  const [loginMode, setLoginMode] = React.useState<"pin" | "biometric">("pin");
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

    void checkFaceIdSupport().then((support) => {
      if (cancelled) return;
      const enrolled = isFaceIdEnrolled();
      setFaceIdSupported(support.platformAuthenticator);
      setFaceIdEnrolled(enrolled);
      if (enrolled && isBiometricLoginPreferred()) {
        setLoginMode("biometric");
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const completeLogin = React.useCallback(
    (message = "PIN accepted. Opening your dashboard...") => {
      setSuccess(true);
      playSuccessTone();
      toast.success(message);
      window.setTimeout(() => {
        router.replace(nextPath);
        router.refresh();
      }, 280);
    },
    [nextPath, playSuccessTone, router],
  );

  const submitPin = React.useCallback(
    async (value: string, successMessage?: string) => {
      if (sending) return false;
      if (!/^\d{6}$/.test(value)) {
        toast.error("The PIN must be exactly 6 digits.");
        return false;
      }

      setSending(true);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: value }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Login failed");
        }
        completeLogin(successMessage);
        return true;
      } catch (e) {
        toast.error((e as Error).message);
        return false;
      } finally {
        setSending(false);
      }
    },
    [completeLogin, sending],
  );

  const onFaceIdLogin = React.useCallback(async () => {
    if (faceIdBusy || sending || success) return;
    setFaceIdBusy(true);
    try {
      const unlockedPin = await unlockPinWithFaceId();
      if (!unlockedPin) {
        toast.error("Biometric sign-in failed. Try again or use your PIN.");
        return;
      }
      await submitPin(
        unlockedPin,
        "Signed in with biometrics. Opening your dashboard...",
      );
    } finally {
      setFaceIdBusy(false);
    }
  }, [faceIdBusy, sending, submitPin, success]);

  const onEnableFaceId = React.useCallback(async () => {
    if (enrollBusy || !/^\d{6}$/.test(pin)) return;
    setEnrollBusy(true);
    try {
      const enrolled = await enrollFaceId(pin);
      if (!enrolled) {
        toast.error("Biometric sign-in could not be enabled on this device.");
        return;
      }
      setFaceIdEnrolled(true);
      setLoginMode("biometric");
      toast.success("Biometric sign-in enabled. Use your fingerprint or Face ID next time.");
    } finally {
      setEnrollBusy(false);
    }
  }, [enrollBusy, pin]);

  const onUsePinInstead = React.useCallback(() => {
    setBiometricLoginPreferred(false);
    setLoginMode("pin");
  }, []);

  const onUseBiometricInstead = React.useCallback(() => {
    setBiometricLoginPreferred(true);
    setLoginMode("biometric");
  }, []);

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

    void hydrate().finally(() => {
      if (!cancelled) setSessionReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [nextPath, router]);

  const biometricMode =
    loginMode === "biometric" && faceIdSupported && faceIdEnrolled;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (biometricMode) {
      await onFaceIdLogin();
      return;
    }
    await submitPin(pin);
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
    <LoginPageShell>
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={success ? { scale: 1.02, opacity: 0.98, y: 0 } : { scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="w-full border-border/50 bg-card/90 shadow-lg backdrop-blur-sm">
          <LoginBrandHeader success={success} biometricMode={biometricMode} />
          <CardContent className="px-6 pb-6">
            <form onSubmit={onSubmit} className="space-y-5">
              {biometricMode ? (
                <>
                  <Button
                    type="button"
                    className="h-14 w-full gap-2 rounded-xl text-base font-semibold shadow-sm"
                    onClick={onFaceIdLogin}
                    disabled={faceIdBusy || sending || success || !sessionReady}
                  >
                    <ScanFace className="h-5 w-5" />
                    <span dir="ltr">
                      {!sessionReady
                        ? "Loading..."
                        : faceIdBusy
                          ? "Verifying biometrics..."
                          : "Sign in with fingerprint / Face ID"}
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-full text-muted-foreground hover:text-foreground"
                    onClick={onUsePinInstead}
                    disabled={faceIdBusy || sending || success}
                  >
                    <span dir="ltr">Use PIN instead</span>
                  </Button>
                </>
              ) : (
                <>
                  <Input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    autoComplete="current-password"
                    placeholder="000000"
                    aria-label="Owner PIN"
                    required
                    className="h-[4.5rem] rounded-2xl border-border/60 bg-secondary/25 text-center text-3xl tracking-[0.5em] shadow-inner transition-shadow focus-visible:ring-2 focus-visible:ring-primary/35"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />

                  <Button
                    type="submit"
                    className="h-12 w-full gap-2 rounded-xl text-base font-semibold shadow-sm"
                    disabled={sending || success}
                  >
                    {!sending && !success ? <KeyRound className="h-4 w-4" /> : null}
                    {sending ? "Checking..." : success ? "Success" : "Unlock"}
                  </Button>

                  {faceIdSupported && !faceIdEnrolled && pin.length === 6 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-full gap-2 text-muted-foreground hover:text-foreground"
                      onClick={onEnableFaceId}
                      disabled={enrollBusy || sending || success}
                    >
                      <ScanFace className="h-4 w-4" />
                      <span dir="ltr">
                        {enrollBusy
                          ? "Setting up biometrics..."
                          : "Enable fingerprint / Face ID on this device"}
                      </span>
                    </Button>
                  ) : null}

                  {faceIdSupported && faceIdEnrolled ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-full gap-2 text-muted-foreground hover:text-foreground"
                      onClick={onUseBiometricInstead}
                      disabled={sending || success}
                    >
                      <ScanFace className="h-4 w-4" />
                      <span dir="ltr">Sign in with fingerprint / Face ID</span>
                    </Button>
                  ) : null}
                </>
              )}

              <div className="space-y-2 border-t border-border/40 pt-4">
                <p
                  className="text-center text-xs text-muted-foreground sm:text-sm"
                  dir="ltr"
                >
                  <span className="whitespace-nowrap">
                    6-digit owner PIN — recovery via owner email only.
                  </span>
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 w-full text-muted-foreground hover:text-foreground"
                  onClick={onRequestRecovery}
                  disabled={recoverySending}
                >
                  <span dir="ltr">{recoverySending ? "Sending recovery..." : "Forgot PIN?"}</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </LoginPageShell>
  );
}

function LoginFallback() {
  return (
    <LoginPageShell>
      <Card className="w-full max-w-md border-border/50 bg-card/90 shadow-lg backdrop-blur-sm">
        <LoginBrandHeader />
      </Card>
    </LoginPageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
