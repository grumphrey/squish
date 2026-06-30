import styles from "../dashboard.module.css";
import {
  IconArrowNarrowRight,
  IconCheck,
  IconCopy,
  IconLink,
  IconPlus,
} from "@tabler/icons-react";
import { api } from "@/lib/api";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export default function URLsList() {
  const navigate = useNavigate();
  const { data, isPending, error } = useQuery({
    queryKey: ["urls"],
    queryFn: () =>
      api.get<ShortURLRecord[]>("/metrics/urls").then((res) => {
        return res.data.map((urlRecord) => {
          return { ...urlRecord, created_at: new Date(urlRecord.created_at) };
        });
      }),
    staleTime: 1000 * 60 * 5,
  });

  // TODO:
  // Loading skeleton
  // Error state
  if (isPending)
    return (
      <Card className="flex flex-row items-center w-full">
        <CardHeader className="gap-1.5">
          <Skeleton className="h-3 w-3 rounded-full" />
        </CardHeader>

        <CardContent className="h-5 h-5 w-full">
          <Skeleton className="w-1/3 h-2 mb-1" />
          <Skeleton className="w-1/2 h-2" />
        </CardContent>
      </Card>
    );

  if (error) return <div>Error loading URLs</div>;

  if (data.length === 0)
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
        <EmptyContent className="flex-row justify-center gap-2">
          <Button onClick={() => navigate({ to: "/" })}>
            <IconPlus /> Create Short URL
          </Button>
        </EmptyContent>
      </Empty>
    );

  return (
    <ul className={styles.urlRootContainer}>
      {data.map((record) => (
        <li className={styles.urlListItemContainer} key={record.short_url}>
          {<ShortURLRecord {...record} />}
        </li>
      ))}
    </ul>
  );
}

function CopyURLButton({ shortURL }: { shortURL: string }) {
  const [copying, setCopying] = useState(false);

  // Copy url into  clipboard and show tick icon for 2 seconds.
  const handleClick = () => {
    const url = window.location.origin + "/" + shortURL;
    navigator.clipboard.writeText(url).catch(() => {});

    setCopying(true);
    setTimeout(() => {
      setCopying(false);
    }, 2000);
  };

  return (
    <button className={styles.copyButton} type="button" onClick={handleClick}>
      {copying ? <IconCheck /> : <IconCopy />}
    </button>
  );
}

function ShortURLRecord({
  short_url,
  long_url,
  is_active,
  created_at,
}: ShortURLRecord) {
  return (
    <>
      <div className={styles.urlContainer}>
        {is_active ? (
          <div className={styles.urlActive} />
        ) : (
          <div className={styles.urlInactive} />
        )}

        <div className={styles.urlLinks}>
          <div className={styles.urlShort}>
            <IconLink />
            <span>{window.location.hostname + "/" + short_url}</span>
          </div>
          <div className={styles.urlLong}>
            <IconArrowNarrowRight stroke={2} />
            <span> {long_url}</span>
          </div>
        </div>

        <div className={styles.urlCreatedDate}>
          <span>Created </span>
          <span>{dateFormatter.format(created_at)}</span>
        </div>
      </div>

      <CopyURLButton shortURL={short_url} />
    </>
  );
}

interface ShortURLRecord {
  short_url: string;
  long_url: string;
  is_active: boolean;
  created_at: Date;
}

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
