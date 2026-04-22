import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/lib/language-provider";
import { Zap, Plus, BellRing, CheckCircle2, Search } from "lucide-react";

interface QuickActionsHubProps {
  onAddInvestment: () => void;
  onAddPayment: () => void;
  onGenerateAlerts: () => void;
  onCheckStatuses: () => void;
}

export function QuickActionsHub({
  onAddInvestment,
  onAddPayment,
  onGenerateAlerts,
  onCheckStatuses,
}: QuickActionsHubProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const actions = [
    {
      key: "add-investment",
      label: t("quickActions.addInvestment"),
      onSelect: onAddInvestment,
      icon: Plus,
    },
    {
      key: "add-payment",
      label: t("quickActions.addPayment"),
      onSelect: onAddPayment,
      icon: Plus,
    },
    {
      key: "generate-alerts",
      label: t("quickActions.refreshAlerts"),
      onSelect: onGenerateAlerts,
      icon: BellRing,
    },
    {
      key: "check-statuses",
      label: t("quickActions.checkStatuses"),
      onSelect: onCheckStatuses,
      icon: CheckCircle2,
    },
  ];

  return (
    <Card className="shadcn-card" data-testid="card-quick-actions-hub">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex min-w-0 flex-1 items-center gap-2 text-base leading-snug break-words">
            <Zap className="h-4 w-4 shrink-0 text-primary" />
            <span>{t("quickActions.title")}</span>
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setOpen(true)}
            data-testid="button-open-command-palette"
          >
            <Search className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
            {t("quickActions.commands")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          variant="default"
          className="h-11 w-full justify-start"
          onClick={onAddInvestment}
          data-testid="button-quick-add-investment-primary"
        >
          <Plus className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
          <span className="whitespace-normal break-words text-start leading-snug">{t("quickActions.addInvestment")}</span>
        </Button>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.key}
              variant="outline"
              className="h-10 justify-start min-w-0"
              onClick={action.onSelect}
              data-testid={`button-quick-action-${action.key}`}
            >
              <Icon className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
              <span className="whitespace-normal break-words text-start leading-snug">{action.label}</span>
            </Button>
          );
        })}
        </div>
      </CardContent>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t("quickActions.searchPlaceholder")} />
        <CommandList>
          <CommandEmpty>{t("commandPalette.empty")}</CommandEmpty>
          <CommandGroup heading={t("quickActions.groupActions")}>
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <CommandItem
                  key={action.key}
                  onSelect={() => {
                    action.onSelect();
                    setOpen(false);
                  }}
                >
                  <Icon className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
                  <span>{action.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </Card>
  );
}
