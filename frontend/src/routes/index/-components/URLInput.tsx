import styles from "./URLInput.module.css";
import {
  useState,
  useRef,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useQuery, type UseMutateFunction } from "@tanstack/react-query";
import {
  type GetShortURLResponse,
  type ActiveTabOption,
  type GetShortURLRequest,
} from "../route";

import Spinner from "@/components/Spinner";
import { IconSettings } from "@tabler/icons-react";
import { Toggle } from "@/components/ui/toggle";
import axios from "axios";

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
}

export default function URLInput({
  longURL,
  setLongURL,
  slug,
  setSlug,
  tab,
  onSubmit,
  isPending,
}: URLInputProps) {
  // need to handle error when cannot fetch tlds. fallback values?
  const { data: tlds } = useQuery({
    queryKey: ["tld"],
    queryFn: getTLDs,
    staleTime: Infinity, // never trigger automatic background refetches in app lifetime
  });

  const [optionsVisible, setOptionsVisible] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null); // for setting focus on input

  const handleShowOptions = () => {
    setOptionsVisible(!optionsVisible);
    setSlug("");
  };

  // use "/" key to focus on input
  useEffect(() => {
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    });
  }, []);

  // Check that it is a valid URL (valid protocol + TLD)
  // Return URL with https prepended if there was no protocol.
  const validateURL = (): string => {
    const input = longURL.trim();
    const hasProtocol = /^https?:\/\//i.test(input);
    const normalised = hasProtocol ? input : `https://${input}`;

    const url = new URL(normalised);
    if (url.protocol !== "http:" && url.protocol !== "https:")
      throw new Error("no protocol"); // maybe not necessary check since already prepend https

    const parts = url.hostname.split(".");
    if (parts.length < 2) throw new Error("no top-level domain"); // no tld

    const tld = parts[parts.length - 1].toLowerCase();
    if (tlds && !tlds.includes(tld)) throw new Error("invalid tld");
    return normalised;
  };

  const createShortLink = () => {
    let url;
    // Validate input URL
    try {
      url = validateURL();
    } catch (err) {
      setError(`We'll need a valid URL, like "super-long-link.com/shorten-it"`);
      inputRef.current?.focus();
      return;
    }
    setError("");

    // Send long URL to server to create short URL
    onSubmit(
      { url, slug },
      {
        onSuccess: () => {
          setLongURL("");
          setSlug("");
          setOptionsVisible(false);
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
          onKeyDown={(e) => {
            if (e.key === "Enter") createShortLink();
          }}
        />

        <Toggle
          variant="outline"
          aria-label="Toggle options"
          className="data-[state=on]:bg-(--color-border) data-[state=on]:text-(--color-text)"
          onClick={handleShowOptions}
        >
          <IconSettings />
        </Toggle>

        <button
          className={styles.inputBtn}
          type="button"
          onClick={createShortLink}
        >
          {isPending ? (
            <Spinner />
          ) : (
            <span>{tab == "short-url" ? "Shorten" : "Generate QR"}</span>
          )}
        </button>
      </div>

      <div className={`${styles.inputError} ${error ? "" : "vis-hidden"}`}>
        {error}
      </div>

      {optionsVisible && (
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
        </div>
      )}
    </>
  );
}

// Queries the official TLD authority and returns a list of currently valid top-level domains.
async function getTLDs(): Promise<string[]> {
  const url = "https://data.iana.org/TLD/tlds-alpha-by-domain.txt";
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error("failed to fetch TLDs");
  }

  const text = await response.text();
  return text
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.trim().toLowerCase());
}
