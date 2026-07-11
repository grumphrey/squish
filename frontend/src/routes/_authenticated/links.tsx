import { createFileRoute } from "@tanstack/react-router";
import { IconLink } from "@tabler/icons-react";
import URLsList from "./dashboard/-components/URLsList";
import { Search } from "lucide-react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type Dispatch,
  type SetStateAction,
} from "react";
import { Kbd } from "@/components/ui/kbd";

export const Route = createFileRoute("/_authenticated/links")({
  component: RouteComponent,
});

function RouteComponent() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <>
      <title>squi.sh — My Links</title>
      <section className="max-w-5xl w-full my-0 mx-auto px-5 py-10 flex flex-col gap-5 sm:px-20">
        <div className="flex justify-between font-sans">
          <h1 className="flex items-center gap-3 text-3xl font-sans font-bold tracking-tighter mb-5 md:text-4xl mr-10">
            Links <IconLink size="40px" />
          </h1>
          <URLSearchInput query={searchTerm} setQuery={setSearchTerm} />
        </div>

        <URLsList query={searchTerm} />
      </section>
    </>
  );
}

interface URLSearchInputProps extends ComponentProps<"input"> {
  query: string;
  setQuery: Dispatch<SetStateAction<string>>;
}

function URLSearchInput({ query, setQuery }: URLSearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      inputRef.current?.blur();
    }
  };

  // kbd to focus search input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    // clean up on unmount
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <InputGroup className="max-w-xs">
      <InputGroupInput
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        ref={inputRef}
        onKeyDown={handleInputKeyDown}
        className="text-sm"
      />
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupAddon className="hidden md:block" align="inline-end">
        <Kbd>⌘</Kbd>
        <Kbd>K</Kbd>
      </InputGroupAddon>
    </InputGroup>
  );
}
