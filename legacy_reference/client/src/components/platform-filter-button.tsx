import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Filter } from "lucide-react";
import { useLanguage } from "@/lib/language-provider";
import { usePlatformFilter } from "@/lib/platform-filter-context";
import { useQuery } from "@tanstack/react-query";
import type { Platform } from "@shared/schema";

export function PlatformFilterButton() {
  const { t } = useLanguage();
  const { selectedPlatform, setSelectedPlatform } = usePlatformFilter();
  
  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ["/api/platforms"],
  });

  const platformList = platforms || [];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          data-testid="button-platform-filter" 
          className="h-8 w-8 p-0"
          aria-label={t("dashboard.filterByPlatform")}
          title={t("dashboard.filterByPlatform")}
        >
          <Filter className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => setSelectedPlatform("all")}
          data-testid="menu-filter-all"
          className={selectedPlatform === "all" ? "bg-accent" : ""}
        >
          {t("dashboard.allPlatforms")}
        </DropdownMenuItem>
        {platformList.map((platform) => (
          <DropdownMenuItem 
            key={platform.id} 
            onClick={() => setSelectedPlatform(platform.id)}
            data-testid={`menu-filter-${platform.id}`}
            className={selectedPlatform === platform.id ? "bg-accent" : ""}
          >
            {platform.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
