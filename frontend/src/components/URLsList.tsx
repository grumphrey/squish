import styles from "@/routes/_authenticated/dashboard/dashboard.module.css";
import {
  ChevronsDownIcon,
  ChevronsUpIcon,
  SearchXIcon,
  TrashIcon,
} from "lucide-react";
import {
  IconChartBar,
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";

import { useState, type MouseEvent } from "react";
import type { ShortURLRecord as ShortURLRecordModel } from "@/models/models";
import ErrorAlert from "@/components/ErrorAlert";
import QRCodeDialog from "@/components/QRCodeDialog";
import AnalyticsDialog from "@/components/AnalyticsDialog";
import { DeleteLinkDialog } from "@/components/DeleteLinkDialog";
import {
  CopyURLButton,
  ShortURLRecord,
} from "@/components/ShortURLRecord";
import type { DateRange } from "react-day-picker";

interface URLsListProps {
  data: ShortURLRecordModel[] | undefined;
  error: Error | null;
  isPending: boolean;

  query?: string;
  date?: DateRange | undefined;
  isQROnly?: boolean;
}

export default function URLsList({
  data,
  error,
  isPending,
  query,
  date,
  isQROnly,
}: URLsListProps) {
  const [inactiveOpen, setInactiveOpen] = useState(true);

  if (error) return <ErrorAlert />;

  if (isPending)
    return (
      <>
        <URLSkeleton />
        <URLSkeleton />
        <URLSkeleton />
      </>
    );

  if (!data || data?.length === 0) return <URLListEmpty />;

  // Filter links
  // TODO: refactor + need to memoize?
  let links = data;
  links = isQROnly ? links.filter((l) => l.is_qrcode) : links;
  links = filterByQuery(links, query);
  links = filterByDateRange(links, date);
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
            {<ManagedShortURLRecord {...record} />}
          </li>
        ))}
        {activeLinks.length == 0 && inactiveLinks.length == 0 && (
          <URLListEmptyResult />
        )}
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
                {<ManagedShortURLRecord {...record} />}
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}

function URLListEmptyResult() {
  return (
    <Empty className="font-sans">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <SearchXIcon />
        </EmptyMedia>
        <EmptyTitle>No links found.</EmptyTitle>
        <EmptyDescription>Try adjusting your search.</EmptyDescription>
      </EmptyHeader>
    </Empty>
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

function ManagedShortURLRecord({
  short_url,
  long_url,
  is_active,
  created_at,
  is_qrcode,
}: ShortURLRecordModel) {
  return (
    <ShortURLRecord
      short_url={short_url}
      long_url={long_url}
      is_active={is_active}
      created_at={created_at}
      is_qrcode={is_qrcode}
      actions={
        <URLRecordMenu
          isQRCode={is_qrcode}
          isActive={is_active}
          shortCode={short_url}
        />
      }
    />
  );
}

interface URLRecordMenuProps {
  isQRCode: boolean;
  isActive: boolean;
  shortCode: string;
}
function URLRecordMenu({ isQRCode, isActive, shortCode }: URLRecordMenuProps) {
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [QROpen, setQROpen] = useState(false);
  const url = window.location.origin + "/" + shortCode;

  const handleSelectAnalytics = (e: MouseEvent) => {
    e.preventDefault();
    setAnalyticsOpen(true);
  };

  const handleSelectDelete = (e: MouseEvent) => {
    e.preventDefault();
    setDeleteOpen(true);
  };

  const handleSelectQRCode = (e: MouseEvent) => {
    e.preventDefault();
    setQROpen(true);
  };

  return (
    <div className="flex gap-2">
      {/* Desktop menu */}
      <div className="items-center gap-2 flex flex-row">
        {/* TODO */}
        {isActive && (
          <Button variant="outline" className="hidden" disabled>
            <IconPencil />
          </Button>
        )}

        <div>
          <AnalyticsDialog
            shortCode={shortCode}
            open={analyticsOpen}
            setOpen={setAnalyticsOpen}
          />
        </div>

        {isActive && (
          <div className="hidden sm:block">
            <QRCodeDialog
              isQRCode={isQRCode}
              shortCode={shortCode}
              open={QROpen}
              setOpen={setQROpen}
            />
          </div>
        )}

        {isActive && (
          <div className="hidden sm:block">
            <DeleteLinkDialog
              shortCode={shortCode}
              open={deleteOpen}
              setOpen={setDeleteOpen}
            />
          </div>
        )}
      </div>

      {/* Mobile menu */}
      <div className="flex items-center gap-2 md:hidden">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="md:hidden">
              <IconDots />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="font-sans">
            <DropdownMenuGroup>
              <DropdownMenuLabel>URL</DropdownMenuLabel>
              <DropdownMenuItem>
                <CopyURLButton url={url} isDropdown />
              </DropdownMenuItem>

              {isActive && (
                <DropdownMenuItem onClick={handleSelectQRCode}>
                  <IconQrcode />
                  QR Code
                </DropdownMenuItem>
              )}

              <DropdownMenuItem onClick={handleSelectAnalytics}>
                <IconChartBar />
                Analytics
              </DropdownMenuItem>

              {/* TODO: implement edit url */}
              {isActive && (
                <DropdownMenuItem className="hidden" disabled>
                  <IconPencil />
                  Edit
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>

            {isActive && <DropdownMenuSeparator />}

            <DropdownMenuGroup>
              {isActive && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={handleSelectDelete}
                >
                  <TrashIcon />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function filterByQuery(
  links: ShortURLRecordModel[],
  query: string | undefined,
) {
  if (!query) return links; // if nothing to filter by, return full list of links

  return links.filter((link) => {
    const q = query.toLowerCase();
    const l = link.short_url.toLowerCase();

    return l.includes(q);
  });
}

function filterByDateRange(
  links: ShortURLRecordModel[],
  range: DateRange | undefined,
) {
  if (!range?.from) return links; // if no date or no from, return all links
  const from = range.from;
  const to = range.to ?? range.from; // if only "from" is picked, treat as single day range

  // normalize to start/end of day to avoid time-of-day issues
  const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const end = new Date(
    to.getFullYear(),
    to.getMonth(),
    to.getDate(),
    23,
    59,
    59,
    999,
  );

  return links.filter((l) => l.created_at >= start && l.created_at <= end);
}
