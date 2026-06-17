import { createFileRoute } from "@tanstack/react-router";
import HeroLanding from "../components/HeroLanding";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return <HeroLanding />;
}
