import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/cardapio-preview")({
  beforeLoad: () => {
    throw redirect({
      to: "/admin/cardapio",
      search: { tab: "previa" },
      replace: true,
    });
  },
  component: () => null,
});
