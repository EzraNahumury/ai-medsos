import { redirect } from "next/navigation";
import { getAdminFromRequest } from "@/lib/auth";

export default async function HomePage() {
  const admin = await getAdminFromRequest();
  if (admin) redirect("/dashboard");
  redirect("/login");
}
