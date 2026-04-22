import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/language-provider";

export function LogoutButton() {
  const { logoutMutation, user } = useAuth();
  const { t } = useLanguage();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (!user) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleLogout}
      disabled={logoutMutation.isPending}
      data-testid="button-logout"
      title={t("logout")}
    >
      <LogOut className="h-5 w-5" />
    </Button>
  );
}
