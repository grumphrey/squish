import styles from "./dashboard.module.css";
import { IconArrowNarrowLeft } from "@tabler/icons-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";

import BrowserMetrics from "./-components/BrowserMetrics";
import CountryMetrics from "./-components/CountryMetrics";
import DeviceTypeMetrics from "./-components/DeviceTypeMetrics";
import VisitTimelineMetrics, {
  type DailyTotalVisits,
} from "./-components/VisitTimelineMetrics";
import URLsList from "./-components/URLsList";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();

  // Get device metrics (browser, device type, OS, country)
  const {
    data: metricsData,
    isPending: isMetricsLoading,
    error: metricsError,
  } = useQuery({
    queryKey: ["deviceMetrics"],
    queryFn: () =>
      api.get<DeviceMetrics>("/metrics/device").then((res) => res.data),
  });
  // TODO: set stale time, disable auto refetch, enabled=false + refresh button?

  // Get daily visits metrics for the past 7 days
  const {
    data: visitsData,
    isPending: isVisitsLoading,
    error: visitsError,
  } = useQuery({
    queryKey: ["dailyTotalVisits"],
    queryFn: () =>
      api
        .get<DailyTotalVisits[]>("/metrics/visits/daily")
        .then((res) => res.data),
  });

  // Get total visits metrics all-time
  const {
    data: totalData,
    isPending: isTotalLoading,
    error: totalError,
  } = useQuery({
    queryKey: ["totalVisits"],
    queryFn: () =>
      api
        .get<TotalVisitMetrics>("/metrics/visits/total")
        .then((res) => res.data),
  });

  return (
    <section className={styles.dashboard}>
      <div className={styles.breadcrumbs} onClick={() => navigate({ to: "/" })}>
        <IconArrowNarrowLeft />
        <a>Home</a>
      </div>

      <h1 className={styles.dashboardTitle}>Analytics</h1>
      <div className={styles.dashboardHeader}>
        <h3 className={styles.dashboardSubtitle}>Summary</h3>
        <Separator />
      </div>

      <div className={styles.metricsContainer}>
        <VisitTimelineMetrics
          data={visitsData}
          isPending={isVisitsLoading}
          error={visitsError}
        />

        <div className="flex flex-col max-w-[320px] font-sans gap-5">
          <MetricCard
            data={totalData?.total_visitors}
            isPending={isTotalLoading}
            error={totalError}
            title="Total Visitors"
            description="All-Time"
          />
          <MetricCard
            data={totalData?.unique_visitors}
            isPending={isTotalLoading}
            error={totalError}
            title="Unique Visitors"
            description="All-Time"
          />
        </div>
      </div>

      <div className={styles.metricsContainer}>
        <BrowserMetrics
          data={metricsData?.browser}
          isPending={isMetricsLoading}
          error={metricsError}
        />
        <DeviceTypeMetrics
          data={metricsData?.device_type}
          isPending={isMetricsLoading}
          error={metricsError}
        />
        <CountryMetrics
          data={metricsData?.country_code}
          isPending={isMetricsLoading}
          error={metricsError}
        />
        {/* TODO: <OSMetrics/> */}
      </div>

      <div className={styles.dashboardHeader}>
        <h3 className={styles.dashboardSubtitle}>My links</h3>
        <Separator />
      </div>

      <URLsList />
    </section>
  );
}

interface DeviceMetrics {
  browser: Record<string, number>[] | null;
  os: Record<string, number>[] | null;
  country_code: Record<string, number>[] | null;
  device_type: Record<string, number>[] | null;
}

interface TotalVisitMetrics {
  total_visitors: number;
  unique_visitors: number;
}

interface MetricCardProps {
  data: number | undefined;
  isPending: boolean;
  error: Error | null;
  title: string;
  description: string;
}

function MetricCard({
  data,
  isPending,
  error,
  title,
  description,
}: MetricCardProps) {
  if (isPending) {
    return (
      <Card className="h-full">
        <CardHeader className="gap-2.5">
          <Skeleton className="w-1/2 h-4" />
          <Skeleton className="w-1/4 h-4" />
        </CardHeader>
        <CardContent className="flex text-6xl items-center justify-center h-full">
          <Skeleton className="w-full h-30" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex text-6xl items-center justify-center h-full pb-12">
        {error ? "todo-error" : data}
        {/* {TODO if 0... show empty state} */}
      </CardContent>
    </Card>
  );
}
