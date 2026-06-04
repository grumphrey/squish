function validateURL(input) {
  try {
    // Prepend https:// if no protocol is present
    const hasProtocol = /^https?:\/\//i.test(input);
    const normalised = hasProtocol ? input : `https://${input}`;

    const url = new URL(normalised);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null; // maybe not necessary check since already prepend https

    const parts = url.hostname.split(".");
    if (parts.length < 2) return null; // no tld

    const tld = parts[parts.length - 1].toLowerCase();
    if (!tlds.includes(tld)) return null; // TODO: maybe race condition if tld list not downloaded yet
    return normalised;
  } catch (error) {
    return null;
  }
}

async function shortenLink() {
  document.getElementById("shortResult").classList.remove("show");
  const input = document.getElementById("urlInput");
  const parsedInput = input.value.trim();
  const url = validateURL(parsedInput);

  if (!url) {
    document
      .querySelector(".hero-input-row")
      .classList.add("invalid", input.value !== "");
    document.querySelector(".hint").textContent =
      `We'll need a valid URL, like "super-long-link.com/shorten-it"`;
    input.focus();
    return;
  }
  document.querySelector(".hero-input-row").classList.remove("invalid");
  document.querySelector(".hint").textContent = "";

  const payload = { url };
  // TODO: loading spinner
  try {
    const response = await fetch("/shorten", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`${response.status} from server`);
    }

    const result = await response.json();
    const shortUrl = window.location.origin + "/" + result.short_url;

    // Display short url to user
    document.getElementById("shortUrl").textContent = shortUrl;
    document.getElementById("shortResult").classList.add("show");
    document.getElementById("urlInput").value = "";
  } catch (err) {
    console.error("Error sending data", err);
    // Show error to user
    document
      .querySelector(".hero-input-row")
      .classList.add("invalid", input.value !== "");
    document.querySelector(".hint").textContent = err;
    input.focus();
    return;
  }
}

function copyLink() {
  const url = document.getElementById("shortUrl").textContent;
  navigator.clipboard.writeText(url).catch(() => {});
  const btn = document.querySelector(".copy-btn");
  btn.innerHTML = '<i class="ti ti-check"></i> Copied!';
  setTimeout(() => {
    btn.innerHTML = '<i class="ti ti-copy"></i> Copy';
  }, 2000);
}

// Allow Enter key to trigger shorten
document.getElementById("urlInput").addEventListener("keydown", function (e) {
  if (e.key === "Enter") shortenLink();
});

let tlds = [];
async function fetchTLDs() {
  const url = "https://data.iana.org/TLD/tlds-alpha-by-domain.txt";
  const response = await fetch(url);
  const text = await response.text();

  tlds = text
    .split("\n")
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => line.trim().toLowerCase());
}
fetchTLDs();

const el = document.getElementById("tw");
const taglines = [
  "Sometimes less is better.",
  "Shrink it. Send it. Done.",
  "Your link, but make it cute.",
  "Life's too short for long links.",
  "We put URLs on a diet.",
  "Shrinking links, not dreams.",
];
let i = 0,
  charIdx = 0,
  deleting = false;

function tick() {
  const current = taglines[i];

  if (!deleting) {
    el.textContent = current.slice(0, ++charIdx);
    if (charIdx === current.length) {
      deleting = true;
      return setTimeout(tick, 1400);
    }
  } else {
    el.textContent = current.slice(0, --charIdx);
    if (charIdx === 0) {
      deleting = false;
      i = (i + 1) % taglines.length;
      return setTimeout(tick, 400);
    }
  }

  // To make typing effect slower than backspace
  setTimeout(tick, deleting ? 60 : 110);
}

tick();
