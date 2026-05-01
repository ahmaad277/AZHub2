import { redirect } from "next/navigation";
import { getOwnerSessionState } from "@/lib/auth";
import { createPageTiming } from "@/lib/page-timing";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pageTiming = createPageTiming();
  pageTiming?.log("layout_start");
  pageTiming?.log("before getOwnerSessionState");
  const session = await getOwnerSessionState(pageTiming);
  pageTiming?.log("after getOwnerSessionState");
  if (session.status === "owner_mismatch") {
    redirect("/login?error=auth_unauthorized_email");
  }
  if (session.status !== "authenticated") {
    redirect("/login");
  }
  pageTiming?.log("before render children");
  pageTiming?.log("layout_total");
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar />
        <main className="container flex-1 py-6">{children}</main>
      </div>
    </div>
  );
}
