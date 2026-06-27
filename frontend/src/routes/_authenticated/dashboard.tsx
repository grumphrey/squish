import styles from "./dashboard.module.css";
import { api } from "@/lib/api";
import {
  IconArrowNarrowLeft,
  IconArrowNarrowRight,
  IconCheck,
  IconCopy,
  IconLink,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  return (
    <section className={styles.dashboard}>
      <div className={styles.breadcrumbs} onClick={() => navigate({ to: "/" })}>
        <IconArrowNarrowLeft />
        <a>Home</a>
      </div>

      <h1 className={styles.dashboardTitle}>Analytics</h1>

      <h3 className={styles.dashboardSubtitle}>Summary</h3>
      <DeviceMetricsList />

      <h3 className={styles.dashboardSubtitle}>My links</h3>
      <URLsList />
    </section>
  );
}

interface DeviceMetrics {
  browser: Record<string, number>[] | null;
  os: Record<string, number>[] | null;
  country_code: Record<string, number>[] | null;
}

function DeviceMetricsList() {
  const { data, isPending, error } = useQuery({
    queryKey: ["deviceMetrics"],
    queryFn: () =>
      api.get<DeviceMetrics>("/metrics/device").then((res) => res.data),
  });

  // TODO: proper loading state/skeleton
  if (isPending) return <div>Loading...</div>;
  if (error) return <div>Error loading URLs</div>;
  return (
    <>
      <div className={styles.metricsContainer}>
        <MetricsBox />
        <div>
          Browsers:{" "}
          {data.browser?.map((b) =>
            Object.entries(b).map(([key, value]) => {
              console.log(key, value);
              return (
                <div>
                  {key} : {value}
                </div>
              );
            }),
          )}
        </div>
      </div>
    </>
  );
}

function MetricsBox() {
  const todonumber = 500;

  return (
    <div className={styles.metricsBox}>
      <h5 className={styles.metricsLabel}>Total clicks</h5>
      <div className={styles.metricsValue}>{todonumber}</div>
    </div>
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

  // TODO: proper loading state/skeleton
  if (isPending) return <div>Loading...</div>;
  if (error) return <div>Error loading URLs</div>;

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
