import { redirect } from "next/navigation";
import { getOwnerSession } from "@/lib/auth";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getOwnerSession();
  if (!user && process.env.NODE_ENV === "production") {
    redirect("/login");
  }
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
