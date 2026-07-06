import { createFileRoute } from "@tanstack/react-router";
import URLsList from "./dashboard/-components/URLsList";
import { IconLink, IconPlus } from "@tabler/icons-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMemo, useState } from "react";
import ErrorAlert from "@/components/ErrorAlert";
import axios from "axios";
import { useValidTLDs, validateURL } from "@/hooks/useValidTLDs";
import { useCreateShortURL } from "@/hooks/useCreateShortURL";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import { generateAlphanumeric } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/links")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <section className="max-w-5xl w-full my-0 mx-auto px-10 py-10 flex flex-col gap-5 md:px-20">
      <div className="flex justify-between font-sans">
        <h1 className="text-3xl font-sans font-bold tracking-tighter mb-5 md:text-4xl">
          Links
        </h1>

        <CreateURLDialog />
      </div>

      <URLsList />
    </section>
  );
}

function CreateURLDialog() {
  const { mutate, isPending } = useCreateShortURL();
  const { data: tlds } = useValidTLDs();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [longURL, setLongURL] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");

  const randomSlug = useMemo(() => generateAlphanumeric(), []);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Replace any character that is NOT a-z, A-Z, 0-9, or - with nothing
    const sanitizedValue = inputValue.replace(/[^a-zA-Z0-9-]+/g, "");
    setSlug(sanitizedValue);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createShortLink(longURL);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    setError("");
    setLongURL("");
    setSlug("");
  };

  // Send long URL to server to create short URL
  const createShortLink = (inputUrl: string) => {
    let url;
    // Validate input URL
    try {
      url = validateURL(tlds || [], inputUrl);
    } catch (err) {
      setError(`We'll need a valid URL, like "super-long-link.com/shorten-it"`);
      return;
    }
    setError("");

    mutate(
      { url, slug },
      {
        onSuccess: (data) => {
          setLongURL("");
          setSlug("");
          toast.success(
            <div>
              Your short link:{" "}
              <span className="text-(--color-primary)">
                {`${window.location.origin}/${data.short_url}`}
              </span>{" "}
              has been created.
            </div>,
            {
              description: (
                <div className="text-xs text-(--color-text)">{url}</div>
              ),
              position: "top-center",
            },
          );
          queryClient.invalidateQueries({ queryKey: ["dashboard", "urls"] });
        },
        onError: (err) => {
          if (axios.isAxiosError(err)) {
            setError(err.response?.data.message);
          } else {
            setError(err.message);
          }
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <form id="create-short-url" onSubmit={handleSubmit}>
        <DialogTrigger asChild>
          <Button className="flex justify-between gap-1">
            <IconPlus />
            Create Link
          </Button>
        </DialogTrigger>

        <DialogContent className="font-sans sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex gap-1 items-center">
              <IconLink height="16px" />
              Create Short URL
            </DialogTitle>
            <DialogDescription className="font-mono wrap-anywhere">
              <span>Your URL: </span>
              <span>{window.location.protocol}</span>
              <span>//</span>
              <span>{window.location.hostname}</span>
              <span>/</span>
              <span className="text-(--color-primary) inline-block">
                {slug ? slug : randomSlug}
              </span>
            </DialogDescription>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <Label htmlFor="longURL">
                Long URL<span className="text-destructive">*</span>
              </Label>
              <Input
                id="longURL"
                name="name"
                placeholder="https://example.com"
                value={longURL}
                onChange={(e) => setLongURL(e.target.value)}
                required
              />
              <FieldDescription>
                The long link to be shortened.
              </FieldDescription>
            </Field>

            <Field>
              <Label htmlFor="slug">Path</Label>
              <Input
                id="slug"
                name="Path"
                placeholder="/my-link"
                value={slug}
                onChange={handleSlugChange}
                maxLength={30}
              />
              <FieldDescription>
                Only alphanumeric characters and hyphens allowed.
              </FieldDescription>
            </Field>
          </FieldGroup>

          {error && <ErrorAlert message={error} />}

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>

            <Button type="submit" form="create-short-url" disabled={isPending}>
              {isPending ? (
                <div className="flex items-center gap-1">
                  <Spinner />
                  Loading...
                </div>
              ) : (
                "Shorten"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
