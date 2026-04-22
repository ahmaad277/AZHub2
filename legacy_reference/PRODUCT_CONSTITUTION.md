# A.Z Finance Hub Product Constitution

Last updated: 2026-04-18
Owner: Product Owner (Ahmed)
Status: Source of Truth for product intent and evolution

---

## 1) هوية المنتج | Product Identity

**AR:**  
A.Z Finance Hub هو مركز قيادة موحد لإدارة المحفظة الاستثمارية، يجمع الاستثمارات والتدفقات النقدية والتحليلات في واجهة واحدة واضحة، مع أولوية قصوى لدقة الأرقام المالية وسهولة القرار.

**EN:**  
A.Z Finance Hub is a unified investment command center that consolidates investments, cashflows, and analytics into one clear interface, prioritizing financial accuracy and decision clarity.

---

## 2) المشكلة والسياق | Problem and Context

**AR:**  
المشكلة الأساسية هي تشتت بيانات الاستثمارات بين منصات متعددة وصعوبة تكوين صورة مالية واحدة متماسكة. هذا المنتج يعالج ذلك عبر توحيد البيانات، متابعة الحالة الزمنية للاستثمارات، وإبراز التدفقات القادمة والمتأخرة بوضوح.

**EN:**  
The core problem is fragmented investment data across platforms and the absence of a single coherent financial view. The product solves this through unified data, lifecycle-aware investment tracking, and clear upcoming/late cashflow visibility.

Reference:
- `instructions.md`
- `replit.md`
- `client/src/pages/dashboard.tsx`
- `client/src/pages/investments.tsx`

---

## 3) المستخدمون والأهداف | Users and Core Goals

### 3.1 المستخدم الأساسي | Primary User
- **AR:** مستثمر فردي يدير محفظته الشخصية (مع سياق استثمارات متوافقة مع الشريعة).
- **EN:** Individual investor managing a personal portfolio (with Sharia-compliant investment context).

### 3.2 الأهداف غير القابلة للتنازل | Non-Negotiable Goals
- **AR:** دقة مالية، وضوح بصري، سرعة إدخال، وتجربة Mobile-first.
- **EN:** Financial precision, visual clarity, fast entry workflows, and mobile-first usability.

---

## 4) نطاق المنتج | Product Scope

### 4.1 داخل النطاق | In Scope
- إدارة المنصات والاستثمارات والتدفقات النقدية.
- إدارة رصيد النقد وحركة النقد.
- متابعة الحالة التشغيلية للاستثمار (`active`, `late`, `defaulted`, `completed`).
- تقارير وتحليلات ورؤية تقدم الأهداف.

### 4.2 خارج النطاق الافتراضي | Default Out of Scope
- أي تغيير يكسر تعريفات المقاييس المالية دون حوكمة.
- أي ميزة تتطلب تعريض أسرار المستخدم أو كلمات مرور خارج سياسة الأمن.

Reference:
- `shared/schema.ts`
- `server/routes.ts`
- `server/storage.ts`

---

## 5) ثوابت مالية (Financial Invariants)

أي تعديل يخالف ما يلي يُعتبر كسرًا للدستور ويستلزم قرارًا صريحًا وتحديثًا موثقًا:

1. **دقة النقود: منزلتان عشريتان**
   - Source: `shared/money.ts`
   - Functions: `roundToMoney()`, `splitMoneyEvenly()`

2. **معادلة الربح المتوقع**
   - `faceValue * (irrPercent / 100) * (durationMonths / 12)`
   - Source: `shared/profit-calculator.ts`

3. **منطق مدة الاستثمار**
   - الحد الأدنى 1 شهر عند وجود مدة موجبة بالأيام.
   - Source: `shared/profit-calculator.ts`

4. **توليد التدفقات وتوزيع الربح**
   - توزيع الربح على الدفعات بدون فقد هللات.
   - في `periodic`: إدراج تدفق رأس المال في اليوم التالي لآخر دفعة ربح.
   - Source: `shared/cashflow-generator.ts`

5. **منطق حالات الاستثمار**
   - الاكتمال عند استلام كل التدفقات.
   - التحول للتعثر بعد فترة سماح 30 يومًا.
   - Source: `shared/status-manager.ts`

---

## 6) حدود البيانات والأمن | Data and Security Boundaries

**AR:**  
التحقق من المدخلات يتم عبر Zod/Drizzle schemas، والوصول للعمليات يتم عبر مسارات خادمية واضحة وسياسات صلاحيات/توكنات إدخال بيانات. لا يتم إدخال أسرار أو كلمات مرور خارجية كنص صريح في المستودع أو قاعدة البيانات.

**EN:**  
Input contracts are enforced through Zod/Drizzle schemas, while operations are mediated through explicit server routes and permission/data-entry token controls. Secrets and third-party passwords must never be stored in plaintext.

Reference:
- `shared/schema.ts`
- `server/routes.ts`
- `server/storage.ts`
- `instructions.md`

---

## 7) مبادئ تجربة المستخدم | UX Principles

1. **Mobile-first with professional density**
2. **Bilingual product copy (Arabic + English terminology stability)**
3. **Consistent financial formatting in UI**
4. **Theme coherence (dark/light) with readable contrast**

Reference:
- `client/src/index.css`
- `client/src/lib/language-provider.tsx`
- `client/src/lib/theme-provider.tsx`
- `design_guidelines.md`

---

## 8) قابلية التطوير دون كسر الهوية | Evolution Without Identity Drift

أي تغيير مستقبلي يجب أن:
- يحافظ على ثوابت الحسابات أو يعلن تغييرها رسميًا قبل الدمج.
- يوضح الأثر على UX والمقاييس.
- يضيف/يحدث الاختبارات المناسبة.
- يلتزم بوثيقة `docs/CHANGE_GUARDRAILS.md`.

---

## 9) مصادر الحقيقة المرجعية | Source-of-Truth Files

- `instructions.md`
- `replit.md`
- `shared/money.ts`
- `shared/profit-calculator.ts`
- `shared/cashflow-generator.ts`
- `shared/status-manager.ts`
- `shared/schema.ts`
- `server/routes.ts`
- `server/storage.ts`
- `client/src/lib/language-provider.tsx`
- `client/src/lib/theme-provider.tsx`
- `client/src/index.css`
- `tests/math-audit.test.ts`
- `tests/status-manager.test.ts`

---

## 10) سياسة تعديل الدستور | Constitution Change Policy

**AR:**  
لا يتم تعديل هذا الدستور إلا عبر تغيير صريح ومبرر، مع تحديث ملف قواعد التعديل وذكر سبب التعديل وتأثيره على الاختبارات والمستخدم.

**EN:**  
This constitution can only be changed through explicit, justified updates that also adjust change guardrails and document user/test impact.
