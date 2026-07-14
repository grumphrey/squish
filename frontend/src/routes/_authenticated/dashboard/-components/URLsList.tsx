import styles from "../dashboard.module.css";
import { ChevronsDownIcon, ChevronsUpIcon, TrashIcon } from "lucide-react";
import {
  IconArrowNarrowRight,
  IconCheck,
  IconCopy,
  IconDots,
  IconLink,
  IconPencil,
  IconQrcode,
} from "@tabler/icons-react";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ShortURLRecord } from "@/models/models";
import ErrorAlert from "@/components/ErrorAlert";
import { DeleteLinkButton } from "@/components/DeleteLinkButton";
import QRCodeDialog from "@/components/QRCodeDialog";
import { useGetURLs } from "@/hooks/useGetURLs";

interface URLsListProps {
  query?: string;
}

export default function URLsList({ query }: URLsListProps) {
  const [inactiveOpen, setInactiveOpen] = useState(true);
  const { data, isPending, error } = useGetURLs();

  if (error) return <ErrorAlert />;

  if (isPending)
    return (
      <>
        <URLSkeleton />
        <URLSkeleton />
        <URLSkeleton />
      </>
    );

  if (data.length === 0) return <URLListEmpty />;

  // Filter links from search bar
  const links = query
    ? data.filter((link) => {
        const q = query.toLowerCase();
        return link.short_url.toLowerCase().includes(q);
      })
    : data;
  const activeLinks = links.filter((link) => link.is_active);
  const inactiveLinks = links.filter((link) => !link.is_active);

  return (
    <>
      <div className={styles.dashboardHeader}>
        <h3 className={styles.dashboardSubtitle}>Active links</h3>
        <Separator />
      </div>

      <ul className={styles.urlRootContainer}>
        {activeLinks.map((record) => (
          <li className={styles.urlListItemContainer} key={record.short_url}>
            {<ShortURLRecord {...record} />}
          </li>
        ))}
      </ul>

      <div className={styles.dashboardHeader}>
        <h3 className={styles.dashboardSubtitle}>Deleted links</h3>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setInactiveOpen((prev) => !prev)}
        >
          {inactiveOpen ? <ChevronsUpIcon /> : <ChevronsDownIcon />}
          <span className="sr-only">Toggle deleted links</span>
        </Button>
        <Separator />
      </div>

      <Collapsible
        open={inactiveOpen}
        onOpenChange={setInactiveOpen}
        className="flex w-full flex-col gap-2"
      >
        <CollapsibleContent className="flex flex-col gap-2">
          <ul className={styles.urlRootContainer}>
            {inactiveLinks.map((record) => (
              <li
                className={styles.urlListItemContainer}
                key={record.short_url}
              >
                {<ShortURLRecord {...record} />}
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}

function URLListEmpty() {
  return (
    <Empty className="font-sans">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <IconLink />
        </EmptyMedia>
        <EmptyTitle>Start linking up.</EmptyTitle>
        <EmptyDescription>
          You haven&apos;t created any short URLs yet. Get started by creating
          your first short URL.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

function URLSkeleton() {
  return (
    <Card className="flex flex-row items-center w-full">
      <CardHeader className="gap-1.5">
        <Skeleton className="h-3 w-3 rounded-full" />
      </CardHeader>

      <CardContent className="h-5 w-full">
        <Skeleton className="w-1/3 h-2 mb-1" />
        <Skeleton className="w-1/2 h-2" />
      </CardContent>
    </Card>
  );
}

function ShortURLRecord({
  short_url,
  long_url,
  is_active,
  created_at,
  is_qrcode,
}: ShortURLRecord) {
  const queryClient = useQueryClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const displayShortURL = "/" + short_url;
  const fullURL = window.location.origin + displayShortURL;
  const displayDate = urlDateFormatter.format(created_at);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await api.post("/url/delete", { short_url });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "urls"] });

      toast.success(
        <div>
          Successfully deleted{" "}
          <span className="text-(--color-primary)">{displayShortURL}</span>
        </div>,
        {
          position: "top-center",
        },
      );
    } catch (err) {
      toast.error(
        <div>
          There was a problem trying to delete{" "}
          <span className="text-(--color-primary)">{displayShortURL}</span>.
        </div>,
        {
          description: (
            <div className="text-(--color-text)">Please try again later.</div>
          ),
          position: "top-center",
        },
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={`${styles.urlContainer} hover:bg-accent transition-all`}>
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
          <span className="pl-2">{displayShortURL}</span>
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

      <div className={styles.urlCreatedDate}>
        <span>{displayDate}</span>
      </div>

      {is_active && (
        <URLRecordMenu
          isDeleting={isDeleting}
          isQRCode={is_qrcode}
          shortCode={short_url}
          url={fullURL}
          handleEdit={() => console.log("TODO")}
          handleDelete={handleDelete}
        />
      )}
    </div>
  );
}

interface URLRecordMenuProps {
  isDeleting: boolean;
  isQRCode: boolean;
  shortCode: string;
  url: string;
  handleEdit: () => void;
  handleDelete: () => Promise<void>;
}
function URLRecordMenu({
  isDeleting,
  isQRCode,
  shortCode,
  url,
  handleEdit,
  handleDelete,
}: URLRecordMenuProps) {
  return (
    <>
      {/* Desktop menu */}
      <div className="hidden items-center gap-2 md:flex md:flex-row">
        {/* TODO */}
        <Button
          variant="outline"
          className="hidden"
          onClick={handleEdit}
          disabled
        >
          <IconPencil />
        </Button>

        <QRCodeDialog isQRCode={isQRCode} url={url} shortCode={shortCode} />
        <DeleteLinkButton isDeleting={isDeleting} onClick={handleDelete} />
      </div>

      {/* Mobile menu */}
      <div className="flex items-center gap-2 md:hidden">
        <QRCodeDialog isQRCode={isQRCode} url={url} shortCode={shortCode} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="md:hidden">
              <IconDots />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="font-sans">
            <DropdownMenuGroup>
              <DropdownMenuLabel>URL</DropdownMenuLabel>
              {/* TODO: implement edit url */}
              <DropdownMenuItem className="hidden" disabled>
                <IconPencil />
                Edit
              </DropdownMenuItem>

              <DropdownMenuItem>
                <CopyURLButton url={url} isDropdown />
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive" onClick={handleDelete}>
                <TrashIcon />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

interface CopyURLButtonProps extends ButtonProps {
  url: string;
  isDropdown?: boolean;
  iconSize?: string;
}

function CopyURLButton({
  url,
  isDropdown = false,
  iconSize = "16px",
  ...props
}: CopyURLButtonProps) {
  const [copying, setCopying] = useState(false);

  // Copy url into clipboard and show tick icon for 2 seconds.
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
