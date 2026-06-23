// layout route wrapping all auth-required pages
// https://tanstack.com/router/latest/docs/guide/authenticated-routes

import { redirect, createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context }) => {
    if (context.auth.isLoading) return;
    if (!context.auth.user) {
      throw redirect({ to: "/", search: { redirect: location.href } }); // TODO: change to redirect to /login path
    }
  },
  component: () => <Outlet />, // TODO: change to modal instead of redirecting. check tanstack docs.
});
