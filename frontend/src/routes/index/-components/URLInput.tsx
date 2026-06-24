import styles from "./URLInput.module.css";
import {
  useState,
  useRef,
  useEffect,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useQuery, type UseMutateFunction } from "@tanstack/react-query";
import { type GetShortURLResponse, type ActiveTabOption } from "../route";

import Spinner from "@/components/Spinner";

interface URLInputProps {
  longURL: string;
  setLongURL: Dispatch<SetStateAction<string>>;
  tab: ActiveTabOption;
  onSubmit: UseMutateFunction<GetShortURLResponse, Error, string, unknown>;
  isPending: boolean;
}

export default function URLInput({
  longURL,
  setLongURL,
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

  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null); // for setting focus on input

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
    onSubmit(url, {
      onSuccess: () => {
        setLongURL("");
      },
      onError: (err: any) => {
        setError(err.message);
      },
    });
  };

  return (
    <>
      <div className={`${styles.inputRow} ${error ? "invalid" : ""}`}>
        <input
          id="urlInput"
          type="text"
          placeholder="Squish your long URL..."
          value={longURL}
          ref={inputRef}
          onChange={(e) => setLongURL(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") createShortLink();
          }}
        />

        <button id="fetch-btn" type="button" onClick={createShortLink}>
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
