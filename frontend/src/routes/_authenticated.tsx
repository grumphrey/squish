// layout route wrapping all auth-required pages
// https://tanstack.com/router/latest/docs/guide/authenticated-routes

import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ context }) => {
    if (!context.auth.user) {
      // throw redirect({ to: "/login", search: { redirect: location.href } }); // TODO: change to redirect to /login path
    }
  },
  component: () => <Outlet />, // TODO: change to modal instead of redirecting. check tanstack docs.
});
