import styles from "./index.module.css";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import useTypewriter from "@/hooks/useTypewriter";

import { IconCircleCheck } from "@tabler/icons-react";
import { Checkbox } from "radix-ui";

import URLTabs, { TabContent } from "./-components/URLTabs";
import ShortURLResult from "./-components/ShortURLResult";
import { api } from "@/lib/api";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

export type ActiveTabOption = "short-url" | "qr-code";

function RouteComponent() {
  const { mutate, data, isPending, reset } = useMutation({
    mutationFn: getShortURL,
  });
  // TODO: move state to hooks or structure components better - too messy now
  const [longURL, setLongURL] = useState<string>("");
  const [slug, setSlug] = useState("");
  const [activeTab, setActiveTab] = useState<ActiveTabOption>("short-url");
  const [qrCodeChecked, setQrCodeChecked] =
    useState<Checkbox.CheckedState>(false);

  const shortURL = data?.short_url;
  const QRCode = data?.qr_code;

  return (
    <section className="hero">
      <div className={styles.heroBadge}>
        <IconCircleCheck height="16px" />
        <span>Free to use!</span>
      </div>

      <h1 className={styles.heroTitle}>
        <span>URL shortener</span>
        <br />
        <TypewriterSubtitle taglines={taglines} />
      </h1>

      <div className={styles.heroSubtitleContainer}>
        <p className={styles.heroSubtitle}>
          Create short links for your convenience.
        </p>
        <p className={styles.heroSubtitle}>Simple, no fuss.</p>
      </div>

      <URLTabs
        tab={activeTab}
        setTab={setActiveTab}
        reset={reset}
        URLTabContent={
          <TabContent
            mutate={mutate}
            isPending={isPending}
            longURL={longURL}
            setLongURL={setLongURL}
            slug={slug}
            setSlug={setSlug}
            qrCodeChecked={qrCodeChecked}
            setQrCodeChecked={setQrCodeChecked}
            tab={activeTab}
          />
        }
        QRCodeTabContent={
          <TabContent
            mutate={mutate}
            isPending={isPending}
            longURL={longURL}
            setLongURL={setLongURL}
            slug={slug}
            setSlug={setSlug}
            qrCodeChecked={qrCodeChecked}
            setQrCodeChecked={setQrCodeChecked}
            tab={activeTab}
          />
        }
      />

      <ShortURLResult
        activeTab={activeTab}
        shortURL={shortURL}
        QRCode={QRCode}
        qrCodeChecked={qrCodeChecked}
      />
    </section>
  );
}

const taglines = [
  "Sometimes less is better.",
  "Shrink it. Send it. Done.",
  "Your link, but make it cute.",
  "Life's too short for long links.",
  "We put URLs on a diet.",
  "Shrinking links, not dreams.",
];

// Display a typewriter effect (type to end of string, then backspace to empty) for a given list of strings
function TypewriterSubtitle({ taglines }: { taglines: string[] }) {
  const text = useTypewriter({ strings: taglines });

  return (
    <>
      <span className={styles.heroTitleHighlight}>{text}</span>
      <span className={styles.typewriterCursor} />
    </>
  );
}

export interface GetShortURLResponse {
  qr_code: string;
  short_url: string;
}

export interface GetShortURLRequest {
  url: string;
  slug?: string;
}

// Takes long URL and optional slug from user input and makes a request to backend server to generate the corresponding short URL.
// Throws an error if server returns non-successful status code.
async function getShortURL(
  payload: GetShortURLRequest,
): Promise<GetShortURLResponse> {
  const response = await api.post<GetShortURLResponse>("/shorten", payload);

  return response.data;
}
