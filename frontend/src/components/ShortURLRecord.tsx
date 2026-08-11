import { useState, type ReactNode } from "react";
import {
  IconArrowNarrowRight,
  IconCheck,
  IconCopy,
  IconQrcode,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import styles from "@/routes/_authenticated/dashboard/dashboard.module.css";

interface ShortURLRecordProps {
  short_url: string;
  long_url: string;
  is_active: boolean;
  created_at?: Date;
  is_qrcode?: boolean;
  rank?: number;
  totalVisits?: number;
  actions?: ReactNode;
}

export function ShortURLRecord({
  short_url,
  long_url,
  is_active,
  created_at,
  is_qrcode = false,
  rank,
  totalVisits,
  actions,
}: ShortURLRecordProps) {
  const displayShortURL = "/" + short_url;
  const fullURL = window.location.origin + displayShortURL;
  const displayDate = created_at ? urlDateFormatter.format(created_at) : null;

  return (
    <div className={`${styles.urlContainer} hover:bg-accent transition-all`}>
      {rank != null && <div className={styles.urlRank}>{rank}</div>}

      <div className="hidden md:flex">
        {is_active ? (
          <div className={styles.urlActive} />
        ) : (
          <div className={styles.urlInactive} />
        )}
      </div>

      <div className={styles.urlLinks}>
        <div className={styles.urlShort}>
          <div className="md:hidden">
            {is_active ? (
              <div className={styles.urlActive} />
            ) : (
              <div className={styles.urlInactive} />
            )}
          </div>
          <span className={`pl-2 ${!is_active && "text-muted-foreground"}`}>
            {displayShortURL}
          </span>
          {is_qrcode && <IconQrcode className="text-(--color-primary)" />}
          <div className="items-center hidden md:flex">
            <CopyURLButton url={fullURL} iconSize="10px" />
          </div>
        </div>

        <div className={styles.urlLong}>
          <IconArrowNarrowRight stroke={2} />

          <Tooltip>
            <TooltipContent className="max-w-sm md:max-w-xl break-all">
              {long_url}
            </TooltipContent>
            <TooltipTrigger className="hover:text-foreground transition-all whitespace-nowrap overflow-hidden text-ellipsis">
              {long_url}
            </TooltipTrigger>
          </Tooltip>
        </div>
      </div>

      {totalVisits != null ? (
        <div className={styles.urlVisits}>
          <span className={styles.urlVisitCount}>
            {totalVisits.toLocaleString()}
          </span>
          <span>{totalVisits === 1 ? "visit" : "visits"}</span>
        </div>
      ) : (
        displayDate && (
          <div className={styles.urlCreatedDate}>
            <span>{displayDate}</span>
          </div>
        )
      )}

      {actions}
    </div>
  );
}

interface CopyURLButtonProps extends ButtonProps {
  url: string;
  isDropdown?: boolean;
  iconSize?: string;
}

export function CopyURLButton({
  url,
  isDropdown = false,
  iconSize = "16px",
  ...props
}: CopyURLButtonProps) {
  const [copying, setCopying] = useState(false);

  const handleClick = () => {
    navigator.clipboard.writeText(url).catch(() => {
      toast.error("Could not copy onto clipboard.", {
        description: "Please try again later.",
        position: "top-center",
      });
    });

    toast.success("Copied onto clipboard", {
      description: <div className="text-(--color-primary)">{url}</div>,
      position: "top-center",
    });

    setCopying(true);
    setTimeout(() => {
      setCopying(false);
    }, 2000);
  };

  if (isDropdown) {
    return (
      <span className="flex gap-2 items-center" onClick={handleClick}>
        <IconCopy height="10px" />
        Copy
      </span>
    );
  }

  return (
    <Button
      variant="ghost"
      onClick={handleClick}
      className="h-5 cursor-pointer"
      {...props}
    >
      {copying ? (
        <IconCheck height={iconSize} />
      ) : (
        <IconCopy height={iconSize} />
      )}
    </Button>
  );
}

const urlDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
});
