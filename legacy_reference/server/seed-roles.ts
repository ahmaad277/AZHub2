import { db } from "./db";
import { roles, permissions, rolePermissions, users } from "@shared/schema";
import { eq } from "drizzle-orm";

// 11 فئات صلاحيات - 29 صلاحية
const PERMISSION_DEFINITIONS = [
  // 1. System
  { key: "MANAGE_SYSTEM", category: "system", displayName: "Manage System", displayNameAr: "إدارة النظام", description: "Full system configuration", descriptionAr: "الإعدادات الكاملة" },
  { key: "MANAGE_PLATFORMS", category: "system", displayName: "Manage Platforms", displayNameAr: "إدارة المنصات", description: "Add/edit/remove platforms", descriptionAr: "إضافة/تعديل/حذف المنصات" },
  
  // 2. Data Access
  { key: "VIEW_ALL_NUMBERS", category: "data_access", displayName: "View All Numbers", displayNameAr: "عرض جميع الأرقام", description: "View absolute amounts", descriptionAr: "عرض المبالغ المطلقة" },
  { key: "VIEW_PERCENTAGES", category: "data_access", displayName: "View Percentages", displayNameAr: "عرض النسب", description: "View ROI percentages", descriptionAr: "عرض نسب العوائد" },
  { key: "VIEW_SENSITIVE", category: "data_access", displayName: "View Sensitive Data", displayNameAr: "عرض البيانات الحساسة", description: "View sensitive info", descriptionAr: "عرض المعلومات الحساسة" },
  
  // 3. Investments
  { key: "CREATE_INVESTMENT", category: "investments", displayName: "Create Investment", displayNameAr: "إنشاء استثمار", description: "Add investments", descriptionAr: "إضافة استثمارات" },
  { key: "EDIT_INVESTMENT", category: "investments", displayName: "Edit Investment", displayNameAr: "تعديل استثمار", description: "Modify investments", descriptionAr: "تعديل استثمارات" },
  { key: "DELETE_INVESTMENT", category: "investments", displayName: "Delete Investment", displayNameAr: "حذف استثمار", description: "Remove investments", descriptionAr: "حذف استثمارات" },
  
  // 4. Cashflows
  { key: "CREATE_CASHFLOW", category: "cashflows", displayName: "Create Cashflow", displayNameAr: "إنشاء تدفق نقدي", description: "Add cashflows", descriptionAr: "إضافة تدفقات" },
  { key: "EDIT_CASHFLOW", category: "cashflows", displayName: "Edit Cashflow", displayNameAr: "تعديل تدفق نقدي", description: "Modify cashflows", descriptionAr: "تعديل تدفقات" },
  { key: "DELETE_CASHFLOW", category: "cashflows", displayName: "Delete Cashflow", displayNameAr: "حذف تدفق نقدي", description: "Remove cashflows", descriptionAr: "حذف تدفقات" },
  
  // 5. Cash
  { key: "VIEW_CASH", category: "cash", displayName: "View Cash", displayNameAr: "عرض النقد", description: "View cash balance", descriptionAr: "عرض الرصيد النقدي" },
  { key: "MANAGE_CASH", category: "cash", displayName: "Manage Cash", displayNameAr: "إدارة النقد", description: "Manage cash transactions", descriptionAr: "إدارة المعاملات النقدية" },
  
  // 6. Analytics
  { key: "VIEW_ANALYTICS", category: "analytics", displayName: "View Analytics", displayNameAr: "عرض التحليلات", description: "Access analytics", descriptionAr: "الوصول للتحليلات" },
  { key: "EXPORT_DATA", category: "analytics", displayName: "Export Data", displayNameAr: "تصدير البيانات", description: "Export to files", descriptionAr: "تصدير للملفات" },
  
  // 7. Users
  { key: "VIEW_USERS", category: "users", displayName: "View Users", displayNameAr: "عرض المستخدمين", description: "View user list", descriptionAr: "عرض قائمة المستخدمين" },
  { key: "CREATE_USERS", category: "users", displayName: "Create Users", displayNameAr: "إنشاء مستخدمين", description: "Add users", descriptionAr: "إضافة مستخدمين" },
  { key: "EDIT_USERS", category: "users", displayName: "Edit Users", displayNameAr: "تعديل مستخدمين", description: "Modify users", descriptionAr: "تعديل مستخدمين" },
  { key: "DELETE_USERS", category: "users", displayName: "Delete Users", displayNameAr: "حذف مستخدمين", description: "Remove users", descriptionAr: "حذف مستخدمين" },
  
  // 8. Export/View Requests
  { key: "REQUEST_EXPORT", category: "export_requests", displayName: "Request Export", displayNameAr: "طلب تصدير", description: "Request export approval", descriptionAr: "طلب الموافقة على التصدير" },
  { key: "REQUEST_VIEW", category: "view_requests", displayName: "Request View", displayNameAr: "طلب عرض", description: "Request view access", descriptionAr: "طلب الوصول للعرض" },
  { key: "APPROVE_EXPORT", category: "export_requests", displayName: "Approve Export", displayNameAr: "الموافقة على التصدير", description: "Approve exports", descriptionAr: "الموافقة على التصدير" },
  { key: "APPROVE_VIEW", category: "view_requests", displayName: "Approve View", displayNameAr: "الموافقة على العرض", description: "Approve view requests", descriptionAr: "الموافقة على طلبات العرض" },
  
  // 9. Roles
  { key: "VIEW_ROLES", category: "roles", displayName: "View Roles", displayNameAr: "عرض الأدوار", description: "View roles", descriptionAr: "عرض الأدوار" },
  { key: "CREATE_ROLES", category: "roles", displayName: "Create Roles", displayNameAr: "إنشاء أدوار", description: "Create roles", descriptionAr: "إنشاء أدوار" },
  { key: "EDIT_ROLES", category: "roles", displayName: "Edit Roles", displayNameAr: "تعديل أدوار", description: "Modify roles", descriptionAr: "تعديل أدوار" },
  { key: "DELETE_ROLES", category: "roles", displayName: "Delete Roles", displayNameAr: "حذف أدوار", description: "Remove roles", descriptionAr: "حذف أدوار" },
  
  // 10. Alerts
  { key: "VIEW_ALERTS", category: "alerts", displayName: "View Alerts", displayNameAr: "عرض التنبيهات", description: "View alerts", descriptionAr: "عرض التنبيهات" },
  { key: "MANAGE_ALERTS", category: "alerts", displayName: "Manage Alerts", displayNameAr: "إدارة التنبيهات", description: "Configure alerts", descriptionAr: "ضبط التنبيهات" },
  
  // 11. Advanced
  { key: "IMPERSONATE", category: "advanced", displayName: "Impersonate", displayNameAr: "انتحال المستخدمين", description: "View as another user", descriptionAr: "العرض كمستخدم آخر" },
];

const ROLE_DEFINITIONS = [
  { name: "owner", displayName: "Owner", displayNameAr: "المالك", description: "Full system control", descriptionAr: "التحكم الكامل", isSystem: 1 },
  { name: "admin", displayName: "Manager", displayNameAr: "المدير", description: "Manage and approve", descriptionAr: "الإدارة والموافقة", isSystem: 1 },
  { name: "advanced_analyst", displayName: "Advanced Analyst", displayNameAr: "محلل متقدم", description: "Advanced analytics", descriptionAr: "تحليلات متقدمة", isSystem: 1 },
  { name: "basic_analyst", displayName: "Basic Analyst", displayNameAr: "محلل بسيط", description: "Basic viewing", descriptionAr: "عرض أساسي", isSystem: 1 },
  { name: "data_entry", displayName: "Data Entry", displayNameAr: "مدخل بيانات", description: "Data entry with approval", descriptionAr: "إدخال بيانات مع موافقة", isSystem: 1 },
  { name: "viewer", displayName: "Viewer", displayNameAr: "زائر", description: "Read-only access", descriptionAr: "وصول للقراءة فقط", isSystem: 1 },
];

const ROLE_PERMISSION_MAPPING: Record<string, string[]> = {
  owner: ["MANAGE_SYSTEM", "MANAGE_PLATFORMS", "VIEW_ALL_NUMBERS", "VIEW_PERCENTAGES", "VIEW_SENSITIVE", "CREATE_INVESTMENT", "EDIT_INVESTMENT", "DELETE_INVESTMENT", "CREATE_CASHFLOW", "EDIT_CASHFLOW", "DELETE_CASHFLOW", "VIEW_CASH", "MANAGE_CASH", "VIEW_ANALYTICS", "EXPORT_DATA", "VIEW_USERS", "CREATE_USERS", "EDIT_USERS", "DELETE_USERS", "REQUEST_EXPORT", "REQUEST_VIEW", "APPROVE_EXPORT", "APPROVE_VIEW", "VIEW_ROLES", "CREATE_ROLES", "EDIT_ROLES", "DELETE_ROLES", "VIEW_ALERTS", "MANAGE_ALERTS", "IMPERSONATE"],
  admin: ["MANAGE_PLATFORMS", "VIEW_ALL_NUMBERS", "VIEW_PERCENTAGES", "VIEW_SENSITIVE", "CREATE_INVESTMENT", "EDIT_INVESTMENT", "DELETE_INVESTMENT", "CREATE_CASHFLOW", "EDIT_CASHFLOW", "DELETE_CASHFLOW", "VIEW_CASH", "MANAGE_CASH", "VIEW_ANALYTICS", "EXPORT_DATA", "VIEW_USERS", "EDIT_USERS", "APPROVE_EXPORT", "APPROVE_VIEW", "VIEW_ROLES", "VIEW_ALERTS", "MANAGE_ALERTS"],
  advanced_analyst: ["VIEW_ALL_NUMBERS", "VIEW_PERCENTAGES", "VIEW_ANALYTICS", "EXPORT_DATA", "REQUEST_EXPORT", "REQUEST_VIEW", "VIEW_CASH", "CREATE_INVESTMENT", "CREATE_CASHFLOW", "VIEW_ALERTS", "VIEW_USERS", "VIEW_ROLES"],
  basic_analyst: ["VIEW_PERCENTAGES", "VIEW_ANALYTICS", "VIEW_CASH", "REQUEST_VIEW", "VIEW_ALERTS", "VIEW_USERS", "VIEW_ROLES"],
  data_entry: ["CREATE_INVESTMENT", "CREATE_CASHFLOW", "VIEW_PERCENTAGES", "VIEW_ALERTS", "VIEW_USERS", "REQUEST_VIEW"],
  viewer: ["VIEW_PERCENTAGES", "VIEW_ANALYTICS", "VIEW_ALERTS", "VIEW_USERS"],
};

export async function seedRolesAndPermissions() {
  console.log("🌱 Seeding roles and permissions...");

  const createdPermissions: Record<string, string> = {};
  
  for (const perm of PERMISSION_DEFINITIONS) {
    const existing = await db.query.permissions.findFirst({ where: eq(permissions.key, perm.key) });
    if (!existing) {
      const [created] = await db.insert(permissions).values(perm).returning();
      createdPermissions[perm.key] = created.id;
    } else {
      createdPermissions[perm.key] = existing.id;
    }
  }

  const createdRoles: Record<string, string> = {};
  for (const role of ROLE_DEFINITIONS) {
    const existing = await db.query.roles.findFirst({ where: eq(roles.name, role.name) });
    if (!existing) {
      const [created] = await db.insert(roles).values(role).returning();
      createdRoles[role.name] = created.id;
    } else {
      createdRoles[role.name] = existing.id;
    }
  }

  for (const [roleName, permissionKeys] of Object.entries(ROLE_PERMISSION_MAPPING)) {
    const roleId = createdRoles[roleName];
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    for (const permKey of permissionKeys) {
      const permId = createdPermissions[permKey];
      if (permId) {
        await db.insert(rolePermissions).values({ roleId, permissionId: permId });
      }
    }
  }

  const azUser = await db.query.users.findFirst({ where: eq(users.email, "az@azfinance.sa") });
  if (azUser) {
    await db.update(users).set({ roleId: createdRoles["owner"] }).where(eq(users.id, azUser.id));
  }

  console.log("✨ Seeding completed!");
}

seedRolesAndPermissions().then(() => {
  console.log("✅ Seed process finished!");
  process.exit(0);
}).catch((error) => {
  console.error("❌ Seed failed:", error);
  process.exit(1);
});
