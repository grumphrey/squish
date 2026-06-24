import styles from "./ShortURLResult.module.css";
import { useRef, useState } from "react";
import { type ActiveTabOption } from "../route";

import { Checkbox } from "radix-ui";
import {
  IconCopy,
  IconDownload,
  IconPaperclip,
  IconCheck,
} from "@tabler/icons-react";

type CopyButtonText = "Copy" | "Copied!"; // maybe unnecessary lol

interface ShortURLResultProps {
  shortURL: string | undefined;
  QRCode: string | undefined;
  activeTab: ActiveTabOption;
  qrCodeChecked: Checkbox.CheckedState;
}

// Shows the short url + QR code returned from backend, if available
// Allows user to copy short url to clipboard with a button.
// Allows user to download the QR code as an image.
export default function ShortURLResult({
  shortURL,
  QRCode,
  activeTab,
  qrCodeChecked,
}: ShortURLResultProps) {
  const [copyBtnText, setCopyBtnText] = useState<CopyButtonText>("Copy");
  const qrImgRef = useRef<HTMLImageElement>(null);

  const displayURL = window.location.origin + "/" + shortURL;
  // const showQRCode = (QRCode  && activeTab == "qr-code") || (activeTab == "qr-code" && ) TODO

  // Copy URL to system clipboard
  const copyLink = () => {
    navigator.clipboard.writeText(displayURL).catch(() => {});
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
      {shortURL && activeTab == "short-url" && (
        <div className={styles.shortURLResult}>
          <IconPaperclip />

          <span>{displayURL}</span>

          <button className={styles.copyBtn} onClick={copyLink}>
            {copyBtnText == "Copy" ? <IconCopy /> : <IconCheck />}
            <span>{copyBtnText}</span>
          </button>
        </div>
      )}
      {QRCode &&
        (activeTab == "qr-code" ||
          (activeTab == "short-url" && qrCodeChecked)) && (
          <div className={styles.QRCodeResult}>
            <div className={styles.shineEffect}>
              <img
                className={styles.QRCodeImage}
                alt="QR Code"
                src={QRCode}
                ref={qrImgRef}
              />
            </div>
            <button className={styles.downloadBtn} onClick={downloadQRCode}>
              <IconDownload />
              <span>Download QR Code</span>
            </button>
          </div>
        )}
    </>
  );
}
