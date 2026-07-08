import { createFileRoute } from "@tanstack/react-router";
import { IconLink } from "@tabler/icons-react";
import URLsList from "./dashboard/-components/URLsList";
import { Search } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/links")({
  component: RouteComponent,
});

function RouteComponent() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <section className="max-w-5xl w-full my-0 mx-auto px-5 py-10 flex flex-col gap-5 sm:px-20">
      <div className="flex justify-between font-sans">
        <h1 className="flex items-center gap-3 text-3xl font-sans font-bold tracking-tighter mb-5 md:text-4xl">
          Links <IconLink size="40px" />
        </h1>

        <InputGroup className="max-w-xs">
          <InputGroupInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
      </div>

      <URLsList query={searchTerm} />
    </section>
  );
}
