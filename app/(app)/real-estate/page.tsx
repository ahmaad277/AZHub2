"use client";

import * as React from "react";
import { Building, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useApp } from "@/components/providers";

export default function RealEstatePage() {
  const { t } = useApp();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("nav.realEstate")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("common.comingSoon")}
          </p>
        </div>
        <Button disabled className="gap-2">
          <Plus className="h-4 w-4" /> {t("form.add")}
        </Button>
      </div>
      
      <div className="rounded-xl border border-dashed p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
          <Building className="h-6 w-6 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">{t("nav.realEstate")}</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          سجل شامل للعقارات (تأجير، أراضي، تجاري) مع تتبع العائد الإيجاري وصيانة العقار. سيتم إضافتها في التحديثات القادمة.
        </p>
      </div>
    </div>
  );
}
