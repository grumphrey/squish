import styles from "./URLInput.module.css";
import {
  useState,
  useRef,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import { type UseMutateFunction } from "@tanstack/react-query";
import { type ActiveTabOption } from "../route";

import Spinner from "@/components/Spinner";
import { IconCheck, IconSettings } from "@tabler/icons-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Toggle } from "@/components/ui/toggle";
import axios from "axios";
import { Checkbox } from "radix-ui";
import { useValidTLDs, validateURL } from "@/hooks/useValidTLDs";
import type {
  GetShortURLResponse,
  GetShortURLRequest,
} from "@/hooks/useCreateShortURL";
import { DEFAULT_ERR } from "@/constants";
import { toast } from "sonner";
import { Kbd } from "@/components/ui/kbd";

interface URLInputProps {
  longURL: string;
  setLongURL: Dispatch<SetStateAction<string>>;
  slug: string;
  setSlug: Dispatch<SetStateAction<string>>;
  tab: ActiveTabOption;
  onSubmit: UseMutateFunction<
    GetShortURLResponse,
    Error,
    GetShortURLRequest,
    unknown
  >;
  isPending: boolean;
  qrCodeChecked: boolean;
  setQrCodeChecked: Dispatch<SetStateAction<boolean>>;
}

export default function URLInput({
  longURL,
  setLongURL,
  slug,
  setSlug,
  tab,
  onSubmit,
  isPending,
  qrCodeChecked,
  setQrCodeChecked,
}: URLInputProps) {
  const { data: tlds } = useValidTLDs();
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null); // for setting focus on input

  const handleShowOptions = () => {
    setOptionsVisible(!optionsVisible);
    setSlug("");
  };

  // use "cmd/ctrl + k" key to focus on input
  useEffect(() => {
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    });
  }, []);

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      inputRef.current?.blur();
    } else if (e.key === "Enter") createShortLink();
  };

  const createShortLink = () => {
    let url;
    // Validate input URL
    try {
      url = validateURL(tlds || [], longURL);
    } catch (err) {
      setError(`We'll need a valid URL, like "super-long-link.com/shorten-it"`);
      inputRef.current?.focus();
      return;
    }
    setError("");

    // Send long URL to server to create short URL
    const payload = { url, slug, qr_code: qrCodeChecked || tab === "qr-code" };
    onSubmit(payload, {
      onSuccess: (data) => {
        setLongURL("");
        setSlug("");
        setOptionsVisible(false);

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
    <>
      <div
        className={`${styles.inputContainer} font-sans gap-2 ${error ? "invalid" : ""}`}
      >
        <input
          id="urlInput"
          className={styles.formInput}
          type="text"
          placeholder="Squish your long URL..."
          value={longURL}
          ref={inputRef}
          onChange={(e) => setLongURL(e.target.value)}
          onKeyDown={handleInputKeyDown}
        />
        <div className="hidden md:block">
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </div>

        {tab == "short-url" && (
          <Tooltip>
            <TooltipContent className="max-w-sm font-sans">
              Toggle options
            </TooltipContent>
            <TooltipTrigger className="hover:text-foreground transition-all">
              <Toggle
                variant="outline"
                aria-label="Toggle options"
                className="data-[state=on]:bg-(--color-border) data-[state=on]:text-(--color-text)"
                onClick={handleShowOptions}
              >
                <IconSettings />
              </Toggle>
            </TooltipTrigger>
          </Tooltip>
        )}

        <button
          className={styles.inputBtn}
          type="button"
          onClick={createShortLink}
        >
          {isPending ? (
            <Spinner />
          ) : tab === "short-url" ? (
            <span>
              Shorten
              <Kbd className="hidden md:inline-flex translate-x-2 bg-(--color-primary-light) dark:bg-(--color-primary-dark) text-(--color-text)">
                ⏎
              </Kbd>
            </span>
          ) : (
            <span>
              Generate QR
              <Kbd className="hidden md:inline-flex translate-x-2 bg-(--color-primary-light) dark:bg-(--color-primary-dark) text-(--color-text)">
                ⏎
              </Kbd>
            </span>
          )}
        </button>
      </div>

      <div className={`${styles.inputError} ${error ? "" : "vis-hidden"}`}>
        {error}
      </div>

      {optionsVisible && tab == "short-url" && (
        <div className="bg-(--color-bg) p-4 m-auto max-w-[580px] mt-5 rounded-lg border-2 border-(--color-border)">
          <div className="flex flex-col justify-start items-start mt-2 gap-0">
            <label
              className="font-sans text-(--color-text) text-sm font-semibold pl-2 pb-2"
              htmlFor="slugInput"
            >
              Path (optional)
            </label>
            <div
              className={`${styles.inputContainer} mt-5 ${error ? "invalid" : ""}`}
            >
              <span className="">/</span>
              <input
                id="slugInput"
                className={`${styles.formInput} ${styles.slugInput}`}
                type="text"
                placeholder="my-link"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
          </div>

          {tab == "short-url" && (
            <div className={styles.checkboxContainer}>
              <Checkbox.Root
                id="qrcode"
                className={styles.checkboxRoot}
                checked={qrCodeChecked}
                onCheckedChange={(checked) => {
                  if (checked !== "indeterminate") {
                    setQrCodeChecked(checked);
                  }
                }}
              >
                <Checkbox.Indicator className={styles.checkboxIndicator}>
                  <IconCheck />
                </Checkbox.Indicator>
              </Checkbox.Root>

              <label className={styles.checkboxLabel} htmlFor="qrcode">
                Also create a QR Code for this link
              </label>
            </div>
          )}
        </div>
      )}
    </>
  );
}
