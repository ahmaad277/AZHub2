import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { useLanguage } from "@/lib/language-provider";
import { History, Sparkles, Zap, Bug } from "lucide-react";

interface ChangelogEntry {
  version: string;
  date: Date;
  features?: string[];
  improvements?: string[];
  bugFixes?: string[];
}

export default function Changelog() {
  const { t, language } = useLanguage();

  const changelog: ChangelogEntry[] = [
    {
      version: "1.0.1",
      date: new Date(2025, 10, 22), // November 22, 2025
      features: [
        "changelog.v101.feature1",
        "changelog.v101.feature2"
      ],
      improvements: [
        "changelog.v101.improvement1",
        "changelog.v101.improvement2"
      ],
      bugFixes: [
        "changelog.v101.bugFix1"
      ]
    },
    {
      version: "1.0.0",
      date: new Date(2025, 10, 15), // November 15, 2025
      features: [
        "changelog.v100.feature1",
        "changelog.v100.feature2",
        "changelog.v100.feature3",
        "changelog.v100.feature4",
        "changelog.v100.feature5",
        "changelog.v100.feature6",
        "changelog.v100.feature7",
        "changelog.v100.feature8",
        "changelog.v100.feature9"
      ]
    }
  ];

  // Format date using Intl.DateTimeFormat based on current language
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
      calendar: 'gregory',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  return (
    <div className="w-full space-y-4 sm:space-y-5" data-testid="page-changelog">
      <PageHeader title={t("changelog.title")} gradient />

      <div className="space-y-4 sm:space-y-5">
        {changelog.map((entry, index) => (
          <Card key={entry.version} data-testid={`changelog-entry-${entry.version}`}>
            <CardHeader className="pb-3">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <Badge variant="default" className="text-sm sm:text-base px-2.5 sm:px-3 py-1 shrink-0" data-testid={`badge-version-${entry.version}`}>
                    {t("changelog.version")} {entry.version}
                  </Badge>
                  {index === 0 && (
                    <Badge variant="secondary" className="px-2 py-0.5 shrink-0" data-testid="badge-latest">
                      {t("changelog.latest")}
                    </Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground break-words leading-snug" data-testid={`text-date-${entry.version}`}>
                  {t("changelog.releaseDate")}: {formatDate(entry.date)}
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 sm:space-y-6 pt-0">
              {entry.features && entry.features.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold">{t("changelog.features")}</h3>
                  </div>
                  <ul className="space-y-2">
                    {entry.features.map((featureKey, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm" data-testid={`feature-${entry.version}-${idx}`}>
                        <span className="text-primary mt-1 shrink-0" aria-hidden>•</span>
                        <span className="min-w-0 break-words leading-relaxed">{t(featureKey)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {entry.improvements && entry.improvements.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-4 h-4 text-blue-500" />
                    <h3 className="font-semibold">{t("changelog.improvements")}</h3>
                  </div>
                  <ul className="space-y-2">
                    {entry.improvements.map((improvementKey, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm" data-testid={`improvement-${entry.version}-${idx}`}>
                        <span className="text-blue-500 mt-1 shrink-0" aria-hidden>•</span>
                        <span className="min-w-0 break-words leading-relaxed">{t(improvementKey)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {entry.bugFixes && entry.bugFixes.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Bug className="w-4 h-4 text-green-500" />
                    <h3 className="font-semibold">{t("changelog.bugFixes")}</h3>
                  </div>
                  <ul className="space-y-2">
                    {entry.bugFixes.map((fixKey, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm" data-testid={`bugfix-${entry.version}-${idx}`}>
                        <span className="text-green-500 mt-1 shrink-0" aria-hidden>•</span>
                        <span className="min-w-0 break-words leading-relaxed">{t(fixKey)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
