import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/lib/language-provider";

export function LanguageToggle() {
  const { language, setLanguage, t } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          data-testid="button-language-toggle"
          className="hover-elevate active-elevate-2"
        >
          <Globe className="h-5 w-5" />
          <span className="sr-only">{t("common.toggleLanguageAria")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={() => setLanguage("en")}
          className={language === "en" ? "bg-accent" : ""}
          data-testid="menu-item-english"
        >
          EN
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => setLanguage("ar")}
          className={language === "ar" ? "bg-accent" : ""}
          data-testid="menu-item-arabic"
        >
          العربية
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
