import axios from "axios";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useValidTLDs, validateURL } from "@/hooks/useValidTLDs";
import { useCreateShortURL } from "@/hooks/useCreateShortURL";
import { generateAlphanumeric } from "@/lib/utils";
import { DEFAULT_ERR, INVALID_URL_ERR } from "@/constants";
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
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";
import ErrorAlert from "@/components/ErrorAlert";
import { Checkbox } from "@/components/ui/checkbox";

export default function CreateURLDialog() {
  const { mutate, isPending } = useCreateShortURL();
  const { data: tlds } = useValidTLDs();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [longURL, setLongURL] = useState("");
  const [slug, setSlug] = useState("");
  const [qrChecked, setQrChecked] = useState(false);
  const [error, setError] = useState("");

  const randomSlug = useMemo(() => generateAlphanumeric(), []);

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Replace any character that is NOT a-z, A-Z, 0-9, or - with nothing
    const sanitizedValue = inputValue.replace(/[^a-zA-Z0-9-]+/g, "");
    setSlug(sanitizedValue);
  };

  // Submit create URL form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createShortLink(longURL);
  };

  // Reset state when dialog toggled
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
      setError(INVALID_URL_ERR);
      return;
    }
    setError("");

    const payload = {
      url,
      slug,
      qr_code: qrChecked,
    };
    mutate(payload, {
      onSuccess: (data) => {
        setLongURL("");
        setSlug("");
        queryClient.invalidateQueries({ queryKey: ["dashboard", "urls"] });

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
      },
      onError: (err) => {
        if (axios.isAxiosError(err)) {
          setError(err.response?.data.message ?? DEFAULT_ERR);
        } else {
          setError(err.message ?? DEFAULT_ERR);
        }
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <form id="create-short-url" onSubmit={handleSubmit}>
        <DialogTrigger asChild>
          <Button className="flex justify-between gap-1">
            <IconPlus />
            <span className="hidden sm:inline">Create Link</span>
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
              <InputGroup>
                <InputGroupInput
                  id="slug"
                  value={slug}
                  onChange={handleSlugChange}
                  maxLength={30}
                  placeholder="my-link"
                />
                <InputGroupAddon>
                  <span>/</span>
                </InputGroupAddon>
              </InputGroup>
              <FieldDescription>
                Only alphanumeric characters and hyphens allowed.
                <br />
                Case-sensitive.
              </FieldDescription>
            </Field>

            <Field orientation="horizontal">
              <Checkbox
                id="checkbox-qr"
                name="checkbox-qr"
                checked={qrChecked}
                onCheckedChange={(checked) => {
                  if (checked !== "indeterminate") {
                    setQrChecked(checked);
                  }
                }}
              />
              <FieldContent>
                <FieldLabel htmlFor="checkbox-qr">
                  Generate a QR Code for this link
                </FieldLabel>
                <FieldDescription>Downloadable as an image.</FieldDescription>
              </FieldContent>
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
