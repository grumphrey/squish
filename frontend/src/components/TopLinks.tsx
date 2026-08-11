import { useState } from "react";
import { IconExternalLink, IconLink } from "@tabler/icons-react";
import AnalyticsDialog from "@/components/AnalyticsDialog";
import ErrorAlert from "@/components/ErrorAlert";
import { ShortURLRecord } from "@/components/ShortURLRecord";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { TopLink } from "@/models/models";
import styles from "@/routes/_authenticated/dashboard/dashboard.module.css";

interface TopLinksProps {
  data: TopLink[] | undefined;
  error: Error | null;
  isPending: boolean;
}

export default function TopLinks({ data, error, isPending }: TopLinksProps) {
  if (error) return <ErrorAlert />;

  // TODO: use URLsList pending state
  if (isPending) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-5 p-5">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="flex items-center gap-4" key={index}>
              <Skeleton className="size-7 shrink-0 rounded-full" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!data?.length) {
    return (
      <Card>
        <Empty className="font-sans">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconLink />
            </EmptyMedia>
            <EmptyTitle>No links yet</EmptyTitle>
            <EmptyDescription>
              Create a short URL to start tracking its performance.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Card>
    );
  }

  return (
    <ol className={styles.urlRootContainer}>
      {data.map((link, index) => (
        <li className={styles.urlListItemContainer} key={link.short_url}>
          <ShortURLRecord
            short_url={link.short_url}
            long_url={link.long_url}
            is_active={link.is_active}
            rank={index + 1}
            totalVisits={link.total_visits}
            actions={<TopLinkActions link={link} />}
          />
        </li>
      ))}
    </ol>
  );
}

interface TopLinkActionsProps {
  link: TopLink;
}

function TopLinkActions({ link }: TopLinkActionsProps) {
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  return (
    <div className="flex shrink-0 items-center gap-2">
      <AnalyticsDialog
        shortCode={link.short_url}
        open={analyticsOpen}
        setOpen={setAnalyticsOpen}
      />

      {link.is_active ? (
        <Button asChild variant="outline" size="icon">
          <a
            href={`/${encodeURIComponent(link.short_url)}`}
            target="_blank"
            rel="noreferrer"
            aria-label={`Open /${link.short_url}`}
          >
            <IconExternalLink />
          </a>
        </Button>
      ) : (
        <Button
          variant="outline"
          size="icon"
          disabled
          aria-label={`/${link.short_url} is inactive and cannot be opened`}
          title="Inactive links cannot be opened"
        >
          <IconExternalLink />
        </Button>
      )}
    </div>
  );
}
