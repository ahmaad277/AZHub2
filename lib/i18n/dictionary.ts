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
  "nav.stocks": { en: "Stocks", ar: "الأسهم" },
  "nav.gold": { en: "Gold", ar: "الذهب" },
  "nav.realEstate": { en: "Real Estate", ar: "العقارات" },
  "nav.liabilities": { en: "Liabilities", ar: "الالتزامات" },

  // Metrics
  "metric.totalCashBalance": { en: "Cash Balance", ar: "الرصيد النقدي" },
  "metric.activePrincipal": { en: "Active Principal", ar: "رأس المال النشط" },
  "metric.nav": { en: "NAV", ar: "صافي قيمة الأصول" },
  "metric.cashDrag": { en: "Cash Drag", ar: "نسبة الكاش المعطل" },
  "metric.realizedGains": { en: "Realized Gains", ar: "الأرباح المحققة" },
  "metric.expectedInflow30": { en: "Inflow (30d)", ar: "الداخل خلال 30 يوم" },
  "metric.wam": { en: "WAM (Months)", ar: "متوسط الاستحقاق المرجح بالاشهر" },
  "metric.wamRemaining": { en: "Remaining weighted", ar: "المتوسط المتبقي" },
  "metric.wamOriginal": { en: "Original weighted", ar: "المتوسط التاريخي" },
  "metric.defaultRate": { en: "Default Rate", ar: "معدل التعثر" },
  "metric.annualYield": { en: "Annual Yield", ar: "العائد السنوي" },
  "metric.activeAnnualYield": { en: "Active Annual Yield", ar: "السنوي النشط" },
  "metric.historicalAnnualYield": { en: "Historical Annual Yield", ar: "السنوي التاريخي" },
  "metric.nextPayment": { en: "Next Payment", ar: "الدفعة القادمة" },
  "metric.totalExpectedProfit": { en: "Expected Profit", ar: "الربح المتوقع" },
  "metric.overdueBalance": { en: "Overdue", ar: "المتأخرات" },

  // Explanations
  "explain.totalCashBalance": { en: "The total amount of uninvested liquid cash currently available in your wallet.", ar: "إجمالي النقد السائل غير المستثمر والمتاح حالياً في محفظتك." },
  "explain.activePrincipal": { en: "The total original capital currently deployed in active, late, or defaulted investments, excluding completed ones.", ar: "إجمالي رأس المال الأساسي المستثمر حالياً في الفرص النشطة، المتأخرة، أو المتعثرة، باستثناء الفرص المكتملة." },
  "explain.nav": { en: "Net Asset Value: The total value of your portfolio, combining uninvested cash and the principal of all active, late, and defaulted investments.", ar: "صافي قيمة الأصول: القيمة الإجمالية لمحفظتك، وتجمع بين النقد غير المستثمر ورأس مال جميع الاستثمارات النشطة، المتأخرة، والمتعثرة." },
  "explain.cashDrag": { en: "The percentage of your total portfolio (NAV) that is held in cash. High cash drag lowers your overall portfolio yield.", ar: "النسبة المئوية من إجمالي محفظتك (صافي قيمة الأصول) المحتفظ بها كنقد. ارتفاع هذه النسبة يقلل من العائد الإجمالي للمحفظة." },
  "explain.realizedGains": { en: "The total actual profit received to date from all investments, excluding returned principal.", ar: "إجمالي الأرباح الفعلية المستلمة حتى الآن من جميع الاستثمارات، باستثناء رأس المال المسترد." },
  "explain.expectedInflow30": { en: "The total projected cash inflows (both principal and profit) expected to be received within the next 30 days.", ar: "إجمالي التدفقات النقدية المتوقعة (رأس المال والأرباح) والمقرر استلامها خلال الـ 30 يوماً القادمة." },
  "explain.wam": { en: "Weighted Average Maturity: The average time remaining (or historical duration) for your investments, weighted by the principal amount of each investment.", ar: "متوسط الاستحقاق المرجح: متوسط الوقت المتبقي (أو المدة التاريخية) لاستثماراتك، مرجحاً بحجم رأس المال لكل استثمار." },
  "explain.defaultRate": { en: "The percentage of your active principal that is currently classified as defaulted.", ar: "النسبة المئوية من رأس مالك النشط المصنفة حالياً كاستثمارات متعثرة." },
  "explain.annualYield": { en: "The principal-weighted average of the expected annual returns (IRR) across your active or historical investments.", ar: "المتوسط المرجح برأس المال للعوائد السنوية المتوقعة عبر استثماراتك النشطة أو التاريخية." },
  "explain.nextPayment": { en: "The amount and date of the very next scheduled cashflow (profit or principal) across all active investments.", ar: "مبلغ وتاريخ الدفعة النقدية المجدولة القادمة (ربح أو رأس مال) عبر جميع الاستثمارات النشطة." },
  "explain.totalExpectedProfit": { en: "The total projected profit from all investments over their entire lifespans, assuming all payments are received as scheduled.", ar: "إجمالي الأرباح المتوقعة من جميع الاستثمارات طوال فترة حياتها، بافتراض استلام جميع الدفعات في موعدها." },
  "explain.overdueBalance": { en: "The total amount of scheduled payments (principal and profit) that have passed their due date and remain unpaid.", ar: "إجمالي مبالغ الدفعات المجدولة (رأس المال والأرباح) التي تجاوزت تاريخ استحقاقها ولم يتم سدادها بعد." },
  "explain.platformDistribution": { en: "A breakdown of your portfolio allocation across different investment platforms, helping you assess concentration risk.", ar: "توزيع محفظتك الاستثمارية عبر منصات الاستثمار المختلفة، مما يساعدك على تقييم مخاطر التركز." },
  "explain.platformStatus": { en: "The current health of your investments, categorizing your principal into active, late, defaulted, or completed statuses.", ar: "الحالة الصحية الحالية لاستثماراتك، حيث تصنف رأس مالك إلى حالات: نشط، متأخر، متعثر، أو مكتمل." },
  "explain.monthlyCashflows": { en: "A forward-looking projection of expected cash inflows month by month, useful for liquidity planning.", ar: "توقع مستقبلي للتدفقات النقدية الداخلة شهراً بشهر، وهو مفيد لتخطيط السيولة." },

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
  "form.expectedIrr": { en: "Expected Annual Yield (%)", ar: "العائد السنوي المتوقع %" },
  "form.startDate": { en: "Start Date", ar: "تاريخ البدء" },
  "form.endDate": { en: "End Date", ar: "تاريخ الانتهاء" },
  "form.durationMonths": { en: "Duration (months)", ar: "المدة (شهر)" },
  "form.distributionFrequency": { en: "Distribution", ar: "تكرار التوزيع" },
  "form.notes": { en: "Notes", ar: "ملاحظات" },
  "form.amount": { en: "Amount", ar: "المبلغ" },
  "form.date": { en: "Date", ar: "التاريخ" },
  "form.type": { en: "Type", ar: "النوع" },
  "cashflowType.profit": { en: "Return", ar: "العائد" },
  "cashflowType.principal": { en: "Principal", ar: "رأس المال" },
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
  "dash.forecast": { en: "Cashflow Forecast", ar: "التدفقات القادمة" },
  "dash.allPlatforms": { en: "All Platforms", ar: "كل المنصات" },
  "dash.platformDistribution": { en: "Platform Distribution", ar: "المنصات" },
  "dash.platformStatus": { en: "Opportunities Status", ar: "حالة الفرص" },
  "dash.monthlyCashflows": { en: "Monthly Cashflows", ar: "التدفقات الشهرية" },
  "dash.monthlyCashflowsHint": {
    en: "Pending cashflows from the current month onward, stacked by platform.",
    ar: "التدفقات القادمة من الشهر الحالي وما بعده، مقسمة حسب المنصة.",
  },

  // Data Quality
  "dataQuality.openIssues": { en: "open issues", ar: "مشاكل مفتوحة" },
  "dataQuality.suggestedFix": { en: "Suggested Fix", ar: "الحل المقترح" },
  "dataQuality.applyFix": { en: "Apply Fix", ar: "تطبيق الإصلاح" },
  "dataQuality.fixSuccess": { en: "Issue resolved successfully", ar: "تم حل المشكلة بنجاح" },
  "dataQuality.fixError": { en: "Failed to apply fix", ar: "فشل تطبيق الإصلاح" },
  "dataQuality.redirecting": { en: "Redirecting...", ar: "جاري التوجيه..." },

  "dq.no_cashflows": { en: 'Investment "{name}" has no cashflow schedule', ar: 'الاستثمار "{name}" ليس له جدول تدفقات نقدية' },
  "dq.profit_mismatch": { en: "Expected profit ({expected}) ≠ sum of profit cashflows ({actual})", ar: "الربح المتوقع ({expected}) ≠ مجموع تدفقات الأرباح ({actual})" },
  "dq.principal_mismatch": { en: "Principal amount ({expected}) ≠ sum of principal cashflows ({actual})", ar: "رأس المال ({expected}) ≠ مجموع تدفقات رأس المال ({actual})" },
  "dq.missing_ledger_entry": { en: "Cashflow marked as received but no ledger entry found", ar: "تم تعليم التدفق كمستلم ولكن لم يتم العثور على قيد في السجل" },
  
  "dq.fix_regenerate_schedule": { en: "Regenerate schedule or adjust expected profit", ar: "أعد توليد الجدول أو قم بتعديل الربح المتوقع" },
  "dq.fix_open_regenerate": { en: "Open the investment and regenerate the schedule", ar: "افتح الاستثمار وأعد توليد الجدول" },
  "dq.fix_undo_receipt": { en: "Undo the receipt and re-apply it", ar: "تراجع عن الاستلام وقم بتطبيقه مرة أخرى" },
  
  "dq.entity.investment": { en: "investment", ar: "استثمار" },
  "dq.entity.cashflow": { en: "cashflow", ar: "تدفق نقدي" },

  "dq.type.no_cashflows": { en: "no_cashflows", ar: "لا_يوجد_تدفقات" },
  "dq.type.profit_mismatch": { en: "profit_mismatch", ar: "عدم_تطابق_الأرباح" },
  "dq.type.principal_mismatch": { en: "principal_mismatch", ar: "عدم_تطابق_رأس_المال" },
  "dq.type.missing_ledger_entry": { en: "missing_ledger_entry", ar: "قيد_سجل_مفقود" },

  "severity.info": { en: "info", ar: "معلومة" },
  "severity.warning": { en: "warning", ar: "تحذير" },
  "severity.error": { en: "error", ar: "خطأ" },

  // Common
  "common.hideValues": { en: "Hide values", ar: "إخفاء الأرقام" },
  "common.showValues": { en: "Show values", ar: "إظهار الأرقام" },
  "common.proMode": { en: "Pro Mode", ar: "الوضع الاحترافي" },
  "common.liteMode": { en: "Lite Mode", ar: "الوضع المبسط" },
  "common.needsReview": { en: "Needs Review", ar: "يحتاج مراجعة" },
  "common.loading": { en: "Loading…", ar: "جارٍ التحميل…" },
  "common.empty": { en: "Nothing to show yet.", ar: "لا يوجد شيء لعرضه." },
  "common.comingSoon": { en: "Coming soon", ar: "قريباً" },
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
  "common.rows": { en: "rows", ar: "صفوف" },
  "common.fundingSource": { en: "Funding Source", ar: "مصدر التمويل" },
  "common.external": { en: "External Bank", ar: "بنك خارجي" },
  "common.internal": { en: "Internal Wallet", ar: "المحفظة الداخلية" },

  // Charts
  "chart.percent": { en: "Percent", ar: "النسبة" },
  "chart.current": { en: "Current", ar: "الحالي" },
  "chart.historical": { en: "Historical", ar: "التاريخي" },
  "chart.count": { en: "Count", ar: "عدد" },
  "chart.bar": { en: "Bars", ar: "أعمدة" },
  "chart.line": { en: "Line", ar: "خطي" },

  // Platforms
  "platform.fee": { en: "Fee", ar: "الرسوم" },
  "platform.feePercent": { en: "Fee %", ar: "نسبة الرسوم" },
  "platform.deductFees": { en: "Deduct fees", ar: "خصم الرسوم" },
  "platform.deductFeesFromProfit": {
    en: "Deduct fees from profit",
    ar: "خصم الرسوم من الربح",
  },
  "platform.color": { en: "Color", ar: "اللون" },
  "platform.color.white": { en: "White", ar: "أبيض" },
  "platform.color.black": { en: "Black", ar: "أسود" },
  "platform.color.cyan": { en: "Cyan", ar: "سماوي" },
  "platform.color.yellow": { en: "Yellow", ar: "أصفر" },
  "platform.color.green": { en: "Green", ar: "أخضر" },
  "platform.color.blue": { en: "Blue", ar: "أزرق" },

  // Auth
  "auth.signOut": { en: "Sign out", ar: "تسجيل الخروج" },

  // Reports
  "reports.jsonExport": { en: "JSON Export", ar: "تصدير JSON" },
  "reports.excelExport": { en: "Excel Export", ar: "تصدير Excel" },
  "reports.pdfReport": { en: "PDF Report", ar: "تقرير PDF" },

  // Settings
  "settings.appearance": { en: "Appearance", ar: "المظهر" },
  "settings.goalsAndCurrency": { en: "Goals & Currency", ar: "الأهداف والعملة" },
  "settings.daysBefore": { en: "Days before", ar: "أيام قبل" },
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
  "vision.chart.title": { en: "Path to Vision 2040", ar: "الطريق إلى رؤية 2040" },
  "vision.chart.required": { en: "Required Path (CAGR)", ar: "الطريق المطلوب (CAGR)" },
  "vision.chart.current": { en: "Current Path (Historical)", ar: "الطريق الحالي (التاريخي)" },
  "vision.chart.whatIf": { en: "What-If Scenario", ar: "سيناريو ماذا لو" },
  "vision.chart.plan": { en: "Saved Plan", ar: "الخطة المحفوظة" },
  "vision.chart.empty": {
    en: "Set a target and ensure NAV > 0 to see the chart",
    ar: "حدد هدف 2040 وتأكد أن صافي الأصول أكبر من صفر لعرض الرسم",
  },
  "vision.annualRate": { en: "Annual Yield (What-If) %", ar: "العائد السنوي (ماذا لو) %" },
  "vision.annualRate.placeholder": {
    en: "e.g. 18 — leave empty to hide",
    ar: "مثال 18 — اتركه فارغاً للإخفاء",
  },
  "vision.requiredCagr": { en: "Required CAGR", ar: "العائد المركّب المطلوب" },
  "vision.gap": { en: "Performance Gap", ar: "فجوة الأداء" },
  "vision.scenarioTitle": { en: "Scenario Inputs", ar: "مدخلات السيناريو" },

  // Investments
  "investment.isReinvestment": { en: "Is reinvestment", ar: "إعادة استثمار" },
  "investment.customSchedule": { en: "Custom schedule", ar: "جدول مخصص" },
  "investment.schedulePreview": { en: "Schedule preview", ar: "معاينة الجدول" },
  "investment.resolvedIssue.late": {
    en: "Was late, then resolved after",
    ar: "كانت متأخرة ثم انحلت بعد",
  },
  "investment.resolvedIssue.defaulted": {
    en: "Was defaulted, then resolved after",
    ar: "كانت متعثرة ثم انحلت بعد",
  },
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

  // Share Links
  "shareLinks.linkCreated": { en: "Link created", ar: "تم إنشاء الرابط" },
  "shareLinks.label": { en: "Label", ar: "التسمية" },
  "shareLinks.days": { en: "Days", ar: "الأيام" },

  // Pagination
  "pagination.previousPage": { en: "Previous page", ar: "الصفحة السابقة" },
  "pagination.nextPage": { en: "Next page", ar: "الصفحة التالية" },

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
