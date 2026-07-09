import styles from "./dashboard.module.css";
import {
  IconArrowNarrowLeft,
  IconRefresh,
  IconTrendingDown,
  IconTrendingUp,
} from "@tabler/icons-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { api } from "@/lib/api";

import BrowserMetrics from "./-components/BrowserMetrics";
import CountryMetrics from "./-components/CountryMetrics";
import DeviceTypeMetrics from "./-components/DeviceTypeMetrics";
import VisitTimelineMetrics from "./-components/VisitTimelineMetrics";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import ErrorAlert from "@/components/ErrorAlert";
import type {
  DeviceMetrics,
  TotalVisitMetrics,
  VisitsPastWeek,
} from "@/models/models";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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
      api.get<VisitsPastWeek>("/metrics/visits/daily").then((res) => res.data),
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

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3">
        <div className="col-span-1 sm:col-span-2">
          <VisitTimelineMetrics
            data={visitsData?.daily_past_week}
            isPending={isVisitsLoading}
            error={visitsError}
          />
        </div>

        <div className="gap-5 grid grid-cols-subgrid col-span-1 sm:col-span-2 md:col-span-1">
          <MetricCard
            data={visitsData?.total_past_week}
            compareData={visitsData?.total_week_before}
            isCompare
            isPending={isTotalLoading}
            error={totalError}
            title="Total Visitors"
            description="Past 7 days"
          />
          <MetricCard
            data={totalData?.unique_visitors}
            isPending={isTotalLoading}
            error={totalError}
            title="Unique Visitors"
            description="All-Time"
          />
        </div>

        <div className="gap-5 grid grid-cols-subgrid sm:col-span-2 md:col-span-3">
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
      </div>

      {/* <URLsList /> */}
    </section>
  );
}

interface MetricCardProps {
  data: number | undefined;
  compareData?: number;
  isCompare?: boolean;
  isPending: boolean;
  error: Error | null;
  title: string;
  description: string;
}

function MetricCard({
  data,
  compareData,
  isCompare,
  isPending,
  error,
  title,
  description,
}: MetricCardProps) {
  if (isPending) {
    return (
      <Card>
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

  // TODO: honestly feels messy. should refactor
  let changeNum;
  if (isCompare && data && compareData != null) {
    changeNum = data - compareData;
  }

  return (
    <Card className="bg-linear-to-t from-primary/5">
      <CardHeader>
        <CardTitle className="flex justify-between">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="flex text-6xl items-center justify-center h-full">
        <div>{data}</div>
      </CardContent>

      <CardFooter className="flex-col items-start gap-1.5 font-sans text-sm">
        <div className="line-clamp-1 flex gap-2 font-medium">
          {changeNum != null && changeNum < 0 && (
            <Badge className="bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300">
              Down by {changeNum} from previous week
              <IconTrendingDown className="size-4" />
            </Badge>
          )}
          {changeNum != null &&
            changeNum == 0 &&
            "No change from the past week"}
          {changeNum != null && changeNum > 0 && (
            <Badge className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
              Up by {changeNum} from previous week
              <IconTrendingUp className="size-4" />
            </Badge>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
