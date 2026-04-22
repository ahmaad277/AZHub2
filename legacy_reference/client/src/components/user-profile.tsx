import { User, Shield, ChevronDown, UserX, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/lib/language-provider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export function UserProfile() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();

  const endImpersonationMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/v2/impersonation/end", "POST");
    },
    onSuccess: () => {
      toast({
        title: t("success"),
        description: t("impersonationEnded"),
      });
      window.location.reload();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: t("error"),
        description: error.message || t("impersonationEndFailed"),
      });
    },
  });

  if (!user) return null;

  const displayName = user.user?.name || user.user?.email || "User";
  const roleName = language === "ar" 
    ? user.role?.displayNameAr || user.role?.displayName || t("common.unknown")
    : user.role?.displayName || t("common.unknown");

  const permissions = user.role?.permissions || [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="gap-2 h-auto py-2 px-3"
          data-testid="button-user-profile"
        >
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <User className="h-4 w-4" />
            </div>
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-sm font-medium leading-none">{displayName}</span>
              <span className="text-xs text-muted-foreground mt-0.5">{roleName}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-80" 
        align="end"
      >
        {user.isImpersonating && (
          <>
            <div className="px-2 py-3">
              <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {t("impersonationActive")}
                </AlertDescription>
              </Alert>
            </div>
            <DropdownMenuSeparator />
          </>
        )}
        
        <DropdownMenuLabel className="pb-3">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="font-semibold">{displayName}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground font-normal">
              <Shield className="h-3 w-3" />
              <span className="text-xs">{roleName}</span>
            </div>
            {user.user?.email && (
              <span className="text-xs text-muted-foreground font-normal">
                {user.user.email}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
            {t("permissions")} ({permissions.length})
          </DropdownMenuLabel>
          <ScrollArea className="h-[200px] px-2">
            <div className="flex flex-wrap gap-1 py-2">
              {permissions.length > 0 ? (
                permissions.map((permission: any) => (
                  <Badge
                    key={permission.id}
                    variant="secondary"
                    className="text-xs"
                  >
                    {language === "ar" 
                      ? permission.displayNameAr || permission.displayName
                      : permission.displayName}
                  </Badge>
                ))
              ) : (
                <span className="text-xs text-muted-foreground px-2">
                  {t("noPermissions")}
                </span>
              )}
            </div>
          </ScrollArea>
        </DropdownMenuGroup>

        {user.isImpersonating && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2">
              <Button
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => endImpersonationMutation.mutate()}
                disabled={endImpersonationMutation.isPending}
                data-testid="button-end-impersonation"
              >
                <UserX className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                {t("endImpersonation")}
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
