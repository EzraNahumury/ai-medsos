import { redirect } from "next/navigation";
import { getAdminFromRequest } from "@/lib/auth";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await getAdminFromRequest();
  if (!admin) redirect("/login");
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header email={admin.email} />
        <main className="p-6 flex-1">{children}</main>
      </div>
    </div>
  );
}
