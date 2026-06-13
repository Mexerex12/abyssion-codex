import { createFileRoute, redirect } from "@tanstack/react-router";
import { StaffShell } from "@/components/staff-chrome";
import { getMyRole } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({ meta: [{ title: "Central de Operações | Abyssion SMP" }] }),
  beforeLoad: async () => {
    const role = await getMyRole();
    if (!role.isStaff) throw redirect({ to: "/dashboard" });
  },
  component: StaffShell,
});
