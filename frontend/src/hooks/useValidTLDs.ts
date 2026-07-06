import { useQuery } from "@tanstack/react-query";

export const useValidTLDs = () => {
  return useQuery({
    queryKey: ["tld"],
    queryFn: getTLDs,
    staleTime: Infinity, // never trigger automatic background refetches in app lifetime
  });
};

// TODO: need to handle error when cannot fetch tlds. fallback values?
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

export const validateURL = (tlds: string[], inputUrl: string): string => {
  const input = inputUrl.trim();
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
