import styles from "./dashboard.module.css";
import { IconArrowNarrowLeft, IconRefresh } from "@tabler/icons-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";

import BrowserMetrics from "./-components/BrowserMetrics";
import CountryMetrics from "./-components/CountryMetrics";
import DeviceTypeMetrics from "./-components/DeviceTypeMetrics";
import VisitTimelineMetrics from "./-components/VisitTimelineMetrics";
import URLsList from "./-components/URLsList";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import ErrorAlert from "@/components/ErrorAlert";
import { ChevronsDown, ChevronsUp } from "lucide-react";
import { useState } from "react";
import type {
  DailyTotalVisits,
  DeviceMetrics,
  TotalVisitMetrics,
} from "@/models/models";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [urlsOpen, setUrlsOpen] = useState(true);

  // Get device metrics (browser, device type, OS, country)
  const {
    data: metricsData,
    isPending: isMetricsLoading,
    isFetching: isFetchingMetrics,
    error: metricsError,
  } = useQuery({
    queryKey: ["dashboard", "deviceMetrics"],
    queryFn: () =>
      api.get<DeviceMetrics>("/metrics/device").then((res) => res.data),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
  });

  // Get daily visits metrics for the past 7 days
  const {
    data: visitsData,
    isPending: isVisitsLoading,
    isFetching: isFetchingVisits,
    error: visitsError,
  } = useQuery({
    queryKey: ["dashboard", "dailyTotalVisits"],
    queryFn: () =>
      api
        .get<DailyTotalVisits[]>("/metrics/visits/daily")
        .then((res) => res.data),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
  });

  // Get total visits metrics all-time
  const {
    data: totalData,
    isPending: isTotalLoading,
    isFetching: isFetchingTotal,
    error: totalError,
  } = useQuery({
    queryKey: ["dashboard", "totalVisits"],
    queryFn: () =>
      api
        .get<TotalVisitMetrics>("/metrics/visits/total")
        .then((res) => res.data),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: "always",
  });

  const isRefreshing = isFetchingMetrics || isFetchingVisits || isFetchingTotal;

  // Refresh metrics data from backend
  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  return (
    <section className={styles.dashboard}>
      <div className={styles.breadcrumbs} onClick={() => navigate({ to: "/" })}>
        <IconArrowNarrowLeft />
        <a>Home</a>
      </div>

      <div className="flex justify-between">
        <h1 className={styles.dashboardTitle}>Analytics</h1>
        <Button
          className="font-sans"
          variant="outline"
          onClick={handleRefreshAll}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <>
              <Spinner data-icon="inline-start" /> Loading
            </>
          ) : (
            <>
              <IconRefresh /> Refresh
            </>
          )}
        </Button>
      </div>
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

        <div className="flex flex-col basis-xs grow-0 shrink font-sans gap-5">
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
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={() => setUrlsOpen((prev) => !prev)}
        >
          {urlsOpen ? <ChevronsUp /> : <ChevronsDown />}
          <span className="sr-only">Toggle details</span>
        </Button>
        <Separator />
      </div>

      <URLsList open={urlsOpen} setOpen={setUrlsOpen} />
    </section>
  );
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

  if (error) {
    return <ErrorAlert />;
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex text-6xl items-center justify-center h-full pb-12">
        {data}
      </CardContent>
    </Card>
  );
}
