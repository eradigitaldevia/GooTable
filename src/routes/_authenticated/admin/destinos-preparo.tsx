import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/destinos-preparo")({
  beforeLoad: () => {
    throw redirect({
      to: "/admin/cardapio",
      search: { tab: "destinos" },
      replace: true,
    });
  },
  component: () => null,
});
