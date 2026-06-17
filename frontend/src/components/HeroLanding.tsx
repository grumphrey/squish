import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  useMutation,
  useQuery,
  type UseMutateFunction,
} from "@tanstack/react-query";
import useTypewriter from "../hooks/useTypewriter";
import Spinner from "./Spinner";

const taglines = [
  "Sometimes less is better.",
  "Shrink it. Send it. Done.",
  "Your link, but make it cute.",
  "Life's too short for long links.",
  "We put URLs on a diet.",
  "Shrinking links, not dreams.",
];

export default function HeroLanding() {
  const { mutate, data, isPending } = useMutation<
    GetShortURLResponse,
    Error,
    string
  >({
    mutationFn: getShortURL,
  });
  const [longURL, setLongURL] = useState<string>("");

  const shortURL = data?.short_url;
  const QRCode = data?.qr_code;

  return (
    <>
      <div className="hero-badge">
        <i className="ti ti-circle-check" />
        Free to use!
      </div>

      <h1>
        URL shortener
        <br />
        <TypewriterSubtitle taglines={taglines} />
      </h1>

      <div className="hero-sub-container">
        <p className="hero-sub">Create short links for your convenience.</p>
        <p className="hero-sub">Simple, no fuss.</p>
      </div>

      <HeroInputRow
        longURL={longURL}
        setLongURL={setLongURL}
        onSubmit={mutate}
        isPending={isPending}
      />
      <ShortURLResult shortURL={shortURL} QRCode={QRCode} />
    </>
  );
}

interface HeroInputRowProps {
  longURL: string;
  setLongURL: Dispatch<SetStateAction<string>>;
  onSubmit: UseMutateFunction<GetShortURLResponse, Error, string, unknown>;
  isPending: boolean;
}

function HeroInputRow({
  longURL,
  setLongURL,
  onSubmit,
  isPending,
}: HeroInputRowProps) {
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

  const validateURL = () => {
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
    try {
      url = validateURL();
    } catch (err) {
      setError(`We'll need a valid URL, like "super-long-link.com/shorten-it"`);
      inputRef.current?.focus();
      return;
    }
    setError("");
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
      <div className={`hero-input-row ${error ? "invalid" : ""}`}>
        <input
          id="urlInput"
          type="text"
          placeholder="Squish your long URL..."
          value={longURL}
          onChange={(e) => setLongURL(e.target.value)}
          ref={inputRef}
          onKeyDown={(e) => {
            if (e.key === "Enter") createShortLink();
          }}
        />
        <button type="button" id="fetch-btn" onClick={createShortLink}>
          {isPending ? <Spinner /> : <span id="shorten-text">Shorten</span>}
        </button>
      </div>
      {error && <div className="hint">{error}</div>}
    </>
  );
}

interface ShortURLResultProps {
  shortURL: string | undefined;
  QRCode: string | undefined;
}

type CopyButtonText = "Copy" | "Copied!";

// Shows the short url + QR code returned from backend, if available
// Allows user to copy short url to clipboard with a button.
// Allows user to download the QR code as an image.
function ShortURLResult({ shortURL, QRCode }: ShortURLResultProps) {
  const [copyBtnText, setCopyBtnText] = useState<CopyButtonText>("Copy");
  const qrImgRef = useRef<HTMLImageElement>(null);

  const displayURL = window.location.origin + "/" + shortURL;

  const copyLink = (url: string) => {
    navigator.clipboard.writeText(url).catch(() => {});
    setCopyBtnText("Copied!");
    setTimeout(() => {
      setCopyBtnText("Copy");
    }, 2000);
  };
  const downloadQRCode = () => {
    const img = qrImgRef.current;
    if (!img) return;

    const link = document.createElement("a");
    link.href = img.src;
    link.download = "squish-qr-code.png";
    link.click();
  };

  return (
    <>
      {shortURL && (
        <div id="shortResult" className="short-result">
          <i className="ti ti-paperclip" />
          <span id="shortUrl">{displayURL}</span>
          <button className="copy-btn" onClick={() => copyLink(displayURL)}>
            <i
              className={`ti ${copyBtnText == "Copy" ? "ti-copy" : "ti-check"}`}
            />{" "}
            {copyBtnText}
          </button>
        </div>
      )}
      {QRCode && (
        <div className="qr-result">
          <div className="shine-image">
            <img id="qr-img" alt="QR Code" src={QRCode} ref={qrImgRef} />
          </div>
          <button className="qr-download-button" onClick={downloadQRCode}>
            <i className="ti ti-download" /> Download QR Code
          </button>
        </div>
      )}
    </>
  );
}

interface TypeWriterSubtitleProps {
  taglines: string[];
}

function TypewriterSubtitle({ taglines }: TypeWriterSubtitleProps) {
  const text = useTypewriter({ strings: taglines });

  return (
    <>
      <span id="tw" className="highlight">
        {text}
      </span>
      <span className="cursor" />
    </>
  );
}

interface GetShortURLResponse {
  qr_code: string;
  short_url: string;
}

// Takes long URL from user input and makes a request to backend server to generate the corresponding short URL.
// Throws an error if server returns non-successful status code.
async function getShortURL(longURL: string): Promise<GetShortURLResponse> {
  const payload = { url: longURL };
  const response = await fetch("/api/shorten", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error(`${response.status} from server`);

  return response.json();
}

// Returns a list of currently valid top-level domains.
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
