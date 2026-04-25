/**
 * Flat dictionary keyed by a dotted path. Keep entries in both languages
 * synchronized. `t(key)` falls back to the key itself if missing.
 */

export type Locale = "en" | "ar";

export const dictionary: Record<string, { en: string; ar: string }> = {
  // App-wide
  "app.name": { en: "A.Z Finance Hub", ar: "مركز A.Z المالي" },
  "app.tagline": {
    en: "Sukuk & fixed-income command center",
    ar: "مركز قيادة الصكوك والدخل الثابت",
  },

  // Nav
  "nav.dashboard": { en: "Dashboard", ar: "لوحة القيادة" },
  "nav.investments": { en: "Investments", ar: "الاستثمارات" },
  "nav.cashflows": { en: "Cashflows", ar: "التدفقات" },
  "nav.wallet": { en: "Wallet", ar: "المحفظة النقدية" },
  "nav.platforms": { en: "Platforms", ar: "المنصات" },
  "nav.vision": { en: "Vision 2040", ar: "رؤية 2040" },
  "nav.reports": { en: "Reports", ar: "التقارير" },
  "nav.alerts": { en: "Alerts", ar: "التنبيهات" },
  "nav.dataQuality": { en: "Data Quality", ar: "جودة البيانات" },
  "nav.snapshots": { en: "Snapshots", ar: "النسخ الاحتياطية" },
  "nav.import": { en: "Import", ar: "الاستيراد" },
  "nav.settings": { en: "Settings", ar: "الإعدادات" },

  // Metrics
  "metric.totalCashBalance": { en: "Cash Balance", ar: "الرصيد النقدي" },
  "metric.activePrincipal": { en: "Active Principal", ar: "رأس المال النشط" },
  "metric.nav": { en: "NAV", ar: "صافي قيمة الأصول" },
  "metric.cashDrag": { en: "Cash Drag", ar: "نسبة الكاش المعطل" },
  "metric.realizedGains": { en: "Realized Gains", ar: "الأرباح المحققة" },
  "metric.expectedInflow30": { en: "Inflow (30d)", ar: "الداخل خلال 30 يوم" },
  "metric.wam": { en: "WAM", ar: "متوسط الاستحقاق المرجح" },
  "metric.defaultRate": { en: "Default Rate", ar: "معدل التعثر" },
  "metric.activeAnnualYield": { en: "Annual Yield", ar: "العائد السنوي النشط" },
  "metric.nextPayment": { en: "Next Payment", ar: "الدفعة القادمة" },
  "metric.totalExpectedProfit": { en: "Expected Profit", ar: "الربح المتوقع" },
  "metric.overdueBalance": { en: "Overdue", ar: "متأخرات" },

  // Status
  "status.active": { en: "Active", ar: "نشط" },
  "status.late": { en: "Late", ar: "متأخر" },
  "status.defaulted": { en: "Defaulted", ar: "متعثر" },
  "status.completed": { en: "Completed", ar: "مكتمل" },
  "status.pending": { en: "Pending", ar: "قيد الانتظار" },
  "status.received": { en: "Received", ar: "مستلم" },

  // Forms
  "form.name": { en: "Name", ar: "الاسم" },
  "form.platform": { en: "Platform", ar: "المنصة" },
  "form.principalAmount": { en: "Principal Amount", ar: "رأس المال" },
  "form.expectedProfit": { en: "Expected Profit", ar: "الربح المتوقع" },
  "form.expectedIrr": { en: "Expected IRR (%)", ar: "معدل العائد المتوقع (%)" },
  "form.startDate": { en: "Start Date", ar: "تاريخ البدء" },
  "form.endDate": { en: "End Date", ar: "تاريخ الانتهاء" },
  "form.durationMonths": { en: "Duration (months)", ar: "المدة (شهر)" },
  "form.distributionFrequency": { en: "Distribution", ar: "تكرار التوزيع" },
  "form.notes": { en: "Notes", ar: "ملاحظات" },
  "form.amount": { en: "Amount", ar: "المبلغ" },
  "form.date": { en: "Date", ar: "التاريخ" },
  "form.type": { en: "Type", ar: "النوع" },
  "form.save": { en: "Save", ar: "حفظ" },
  "form.cancel": { en: "Cancel", ar: "إلغاء" },
  "form.delete": { en: "Delete", ar: "حذف" },
  "form.edit": { en: "Edit", ar: "تعديل" },
  "form.preview": { en: "Preview", ar: "معاينة" },
  "form.add": { en: "Add", ar: "إضافة" },

  // Frequency
  "frequency.monthly": { en: "Monthly", ar: "شهري" },
  "frequency.quarterly": { en: "Quarterly", ar: "ربع سنوي" },
  "frequency.semi_annually": { en: "Semi-annually", ar: "نصف سنوي" },
  "frequency.annually": { en: "Annually", ar: "سنوي" },
  "frequency.at_maturity": { en: "At maturity", ar: "عند الاستحقاق" },
  "frequency.custom": { en: "Custom", ar: "مخصص" },

  // Cash
  "cash.deposit": { en: "Deposit", ar: "إيداع" },
  "cash.withdrawal": { en: "Withdrawal", ar: "سحب" },
  "cash.currentBalance": { en: "Current Balance", ar: "الرصيد الحالي" },

  // Dashboard sections
  "dash.platformOverview": { en: "Platform Overview", ar: "نظرة على المنصات" },
  "dash.recentInvestments": { en: "Recent Investments", ar: "أحدث الاستثمارات" },
  "dash.upcomingCashflows": { en: "Upcoming Cashflows", ar: "التدفقات القادمة" },
  "dash.vision2040": { en: "Vision 2040 Progress", ar: "تقدم رؤية 2040" },
  "dash.forecast": { en: "Cashflow Forecast", ar: "توقعات التدفق" },
  "dash.allPlatforms": { en: "All Platforms", ar: "كل المنصات" },

  // Common
  "common.proMode": { en: "Pro Mode", ar: "الوضع الاحترافي" },
  "common.liteMode": { en: "Lite Mode", ar: "الوضع المبسط" },
  "common.needsReview": { en: "Needs Review", ar: "يحتاج مراجعة" },
  "common.loading": { en: "Loading…", ar: "جارٍ التحميل…" },
  "common.empty": { en: "Nothing to show yet.", ar: "لا يوجد شيء لعرضه." },
  "common.yes": { en: "Yes", ar: "نعم" },
  "common.no": { en: "No", ar: "لا" },
  "common.total": { en: "Total", ar: "المجموع" },
  "common.markReceived": { en: "Mark Received", ar: "تعليم كمستلم" },
  "common.generate": { en: "Generate", ar: "توليد" },
  "common.scan": { en: "Scan", ar: "فحص" },
  "common.copy": { en: "Copy", ar: "نسخ" },
  "common.copied": { en: "Copied!", ar: "تم النسخ!" },
  "common.viewAll": { en: "View all", ar: "عرض الكل" },
  "common.status": { en: "Status", ar: "الحالة" },
  "common.undo": { en: "Undo", ar: "تراجع" },
  "common.fundingSource": { en: "Funding Source", ar: "مصدر التمويل" },
  "common.external": { en: "External Bank", ar: "بنك خارجي" },
  "common.internal": { en: "Internal Wallet", ar: "المحفظة الداخلية" },

  // Auth
  "auth.signOut": { en: "Sign out", ar: "تسجيل الخروج" },

  // Settings
  "settings.theme": { en: "Theme", ar: "الثيم" },
  "settings.language": { en: "Language", ar: "اللغة" },
  "settings.viewMode": { en: "View Mode", ar: "وضع العرض" },
  "settings.fontSize": { en: "Font Size", ar: "حجم الخط" },
  "settings.target2040": { en: "Vision 2040 Target", ar: "هدف رؤية 2040" },
  "settings.currency": { en: "Currency", ar: "العملة" },
  "settings.alerts": { en: "Alerts", ar: "التنبيهات" },
  "settings.shareLinks": { en: "Data Entry Share Links", ar: "روابط مشاركة الإدخال" },
  "settings.generateShareLink": {
    en: "Generate new share link",
    ar: "إنشاء رابط مشاركة جديد",
  },
  "settings.shareLinkDescription": {
    en: "A public link that lets someone else add investments to your portfolio — they cannot see any of your data. Each entry is flagged for your review.",
    ar: "رابط عام يسمح لشخص آخر بإضافة استثمارات إلى محفظتك — لا يستطيع رؤية أي من بياناتك. كل إدخال يُعلّم للمراجعة.",
  },

  // Vision
  "vision.invalidInputs": { en: "Invalid inputs", ar: "المدخلات غير صالحة" },
  "vision.monthlyPlanGenerator": { en: "Monthly Plan Generator", ar: "مولد الخطة الشهرية" },
  "vision.startingAmount": { en: "Starting Amount", ar: "مبلغ البداية" },
  "vision.months": { en: "Months", ar: "الأشهر" },
  "vision.month": { en: "Month", ar: "الشهر" },
  "vision.target": { en: "Target", ar: "الهدف" },

  // Investments
  "investments.deleteConfirm": {
    en: "Delete this investment? This will also remove related cashflows and alerts.",
    ar: "حذف هذا الاستثمار؟ سيتم أيضًا حذف التدفقات النقدية والتنبيهات المرتبطة به.",
  },

  // Snapshots
  "snapshots.createBackup": { en: "Create backup", ar: "إنشاء نسخة احتياطية" },
  "snapshots.namePlaceholder": { en: "My snapshot", ar: "اسم النسخة" },
  "snapshots.defaultName": { en: "Snapshot", ar: "لقطة" },
  "snapshots.created": { en: "Snapshot created", ar: "تم إنشاء النسخة الاحتياطية" },
  "snapshots.restoreConfirm": {
    en: "This will replace ALL current data with the snapshot. Continue?",
    ar: "سيتم استبدال جميع البيانات الحالية بهذه النسخة. هل تريد المتابعة؟",
  },
  "snapshots.resetConfirm": {
    en: "Reset portfolio to a clean empty state? This will delete ALL current data.",
    ar: "إعادة تعيين المحفظة إلى حالة فارغة؟ سيؤدي ذلك إلى حذف جميع البيانات الحالية.",
  },
  "snapshots.resetPrompt": {
    en: "Type RESET to confirm permanent portfolio reset.",
    ar: "اكتب RESET لتأكيد إعادة التعيين الدائمة للمحفظة.",
  },
  "snapshots.restored": { en: "Restored", ar: "تمت الاستعادة" },
  "snapshots.resetSuccess": { en: "Portfolio reset", ar: "تمت إعادة تعيين المحفظة" },
  "snapshots.cleanPortfolio": { en: "Clean Portfolio", ar: "محفظة جديدة" },
  "snapshots.resetDescription": {
    en: "Restore to an empty portfolio state.",
    ar: "استعادة إلى حالة محفظة فارغة.",
  },
  "snapshots.resetAction": { en: "Reset", ar: "إعادة تعيين" },
  "snapshots.restoreAction": { en: "Restore", ar: "استعادة" },

  // Share page
  "share.title": { en: "Add Investment", ar: "إضافة استثمار" },
  "share.subtitle": {
    en: "This is a limited, shared entry form. Your submission will be reviewed by the portfolio owner.",
    ar: "هذا نموذج إدخال محدود ومشترك. سيُراجع ما تدخله صاحب المحفظة.",
  },
  "share.submitted": { en: "Submitted — thank you!", ar: "تم الإرسال — شكراً لك!" },
  "share.expired": { en: "This link is no longer valid.", ar: "هذا الرابط لم يعد صالحاً." },
};

export function createTranslator(locale: Locale) {
  return (key: string, fallback?: string) => {
    const entry = dictionary[key];
    if (!entry) return fallback ?? key;
    return entry[locale] ?? entry.en ?? key;
  };
}
