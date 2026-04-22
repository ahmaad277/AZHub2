import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/language-provider";
import { authenticateWithBiometric, checkBiometricSupport } from "@/lib/biometric-auth";
import { Fingerprint, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface LockScreenProps {
  biometricEnabled: boolean;
  biometricCredentialId?: string | null;
  onUnlock: () => void;
}

export function LockScreen({
  biometricEnabled,
  biometricCredentialId,
  onUnlock,
}: LockScreenProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [pin, setPin] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    async function checkBiometric() {
      const support = await checkBiometricSupport();
      setBiometricAvailable(support.platformAuthenticator);
      
      if (biometricEnabled && biometricCredentialId && support.platformAuthenticator) {
        tryBiometric();
      }
    }
    checkBiometric();
  }, [biometricEnabled, biometricCredentialId]);

  const tryBiometric = async () => {
    if (!biometricCredentialId) return;
    
    setIsVerifying(true);
    try {
      const success = await authenticateWithBiometric(biometricCredentialId);
      if (success) {
        onUnlock();
      } else {
        toast({
          variant: "destructive",
          title: t("lock.biometricFailed"),
          description: t("lock.tryAgain"),
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t("lock.biometricFailed"),
        description: t("lock.tryAgain"),
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const convertArabicToEnglishNumerals = (str: string) => {
    const arabicNumerals = "٠١٢٣٤٥٦٧٨٩";
    const englishNumerals = "0123456789";
    return str.replace(/[٠-٩]/g, (c) => englishNumerals[arabicNumerals.indexOf(c)]);
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length < 4) return;

    setIsVerifying(true);
    try {
      const response = await apiRequest("POST", "/api/auth/login", { pin });
      const data = await response.json();
      if (data.success) {
        onUnlock();
      } else {
        toast({
          variant: "destructive",
          title: t("lock.incorrectPIN"),
        });
        setPin("");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: error.message || t("lock.incorrectPIN"),
      });
      setPin("");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-accent/5 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">{t("lock.title")}</CardTitle>
          <CardDescription>{t("lock.subtitle")}</CardDescription>
          <p className="text-lg font-medium pt-2">{t("lock.welcome")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handlePinSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="pin" className="text-sm text-muted-foreground">
                {t("lock.enterPIN")}
              </label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  const converted = convertArabicToEnglishNumerals(e.target.value);
                  setPin(converted.replace(/\D/g, ''));
                }}
                placeholder="••••••"
                className="text-center text-2xl tracking-widest"
                disabled={isVerifying}
                autoFocus
                data-testid="input-pin"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={pin.length < 4 || isVerifying}
              data-testid="button-unlock"
            >
              {isVerifying ? "..." : t("lock.unlock")}
            </Button>
          </form>

          {biometricEnabled && biometricCredentialId && biometricAvailable && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    or
                  </span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={tryBiometric}
                disabled={isVerifying}
                data-testid="button-biometric"
              >
                <Fingerprint className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t("lock.useBiometric")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
