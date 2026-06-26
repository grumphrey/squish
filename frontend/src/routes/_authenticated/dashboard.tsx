import styles from "./dashboard.module.css";
import { api } from "@/lib/api";
import { IconArrowNarrowRight, IconLink } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <span>Hello "/_authenticated/dashboard"!</span>
      <br />
      <URLsList />
    </>
  );
}

function URLsList() {
  const { data, isPending, error } = useQuery({
    queryKey: ["urls"],
    queryFn: () =>
      api.get<ShortURLRecord[]>("/metrics/urls").then((res) => {
        return res.data.map((urlRecord) => {
          return { ...urlRecord, created_at: new Date(urlRecord.created_at) };
        });
      }),
  });

  if (isPending) return <div>Loading...</div>;
  if (error) return <div>Error loading URLs</div>;

  return (
    <ul className={styles.urlRootContainer}>
      {data.map((record) => (
        <li className={styles.urlContainer} key={record.short_url}>
          {<ShortURLRecord {...record} />}
        </li>
      ))}
    </ul>
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
