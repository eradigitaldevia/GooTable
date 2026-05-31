import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/caixa")({
  beforeLoad: () => {
    throw redirect({ to: "/caixa", replace: true });
  },
});