import { redirect } from "next/navigation";

export default function AdminAuditReportsPage() {
  redirect("/reports?category=audit");
}
