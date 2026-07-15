import styles from "./dashboard.module.css";
import {
  IconArrowNarrowLeft,
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
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

import { useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import ErrorAlert from "@/components/ErrorAlert";
import BrowserMetrics from "./-components/BrowserMetrics";
import CountryMetrics from "./-components/CountryMetrics";
import DeviceTypeMetrics from "./-components/DeviceTypeMetrics";
import VisitTimelineMetrics from "./-components/VisitTimelineMetrics";
import SourceMetrics from "./-components/SourceMetrics";
import {
  useSourceMetrics,
  useTotalVisitMetrics,
  usePastWeekMetrics,
  useDeviceMetrics,
} from "@/hooks";
import RefreshButton from "@/components/RefreshButton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <>
      <title>squi.sh — Analytics</title>
      <MetricsDashboard />
    </>
  );
}

function MetricsDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: metricsData,
    isPending: isMetricsLoading,
    isFetching: isFetchingMetrics,
    error: metricsError,
  } = useDeviceMetrics();

  const {
    data: visitsData,
    isPending: isVisitsLoading,
    isFetching: isFetchingVisits,
    error: visitsError,
  } = usePastWeekMetrics();

  const {
    data: totalData,
    isPending: isTotalLoading,
    isFetching: isFetchingTotal,
    error: totalError,
  } = useTotalVisitMetrics();

  const {
    data: sourceData,
    isPending: isSourceLoading,
    isFetching: isFetchingSource,
    error: sourceError,
  } = useSourceMetrics();

  const isRefreshing =
    isFetchingMetrics ||
    isFetchingVisits ||
    isFetchingTotal ||
    isFetchingSource;

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
        <RefreshButton
          handleRefresh={handleRefreshAll}
          isRefreshing={isRefreshing}
        />
      </div>
      <div className={styles.dashboardHeader}>
        <h3 className={styles.dashboardSubtitle}>Summary</h3>
        <Separator />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-9 m-auto max-w-80 sm:max-w-none md:max-w-none">
        <div className="col-span-1 md:col-span-3">
          <MetricCard
            data={visitsData?.total_past_week}
            compareData={visitsData?.total_week_before}
            isCompare
            isPending={isTotalLoading}
            error={totalError}
            title="Total Visitors"
            description="Past 7 days"
          />
        </div>

        <div className="col-span-1 md:col-span-3">
          <MetricCard
            data={totalData?.unique_visitors}
            isPending={isTotalLoading}
            error={totalError}
            title="Unique Visitors"
            description="All-Time"
          />
        </div>

        {/* TODO: <OSMetrics/> */}

        <div className="col-span-1 sm:col-span-1 md:col-span-6">
          <VisitTimelineMetrics
            data={visitsData?.daily_past_week}
            isPending={isVisitsLoading}
            error={visitsError}
          />
        </div>

        <div className="col-span-1 sm:col-span-1 md:col-span-3">
          <SourceMetrics
            data={sourceData}
            isPending={isSourceLoading}
            error={sourceError}
          />
        </div>

        <div className="gap-5 grid grid-cols-subgrid sm:col-span-2 md:col-span-9 md:*:col-span-3">
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

export function MetricCard({
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
    <Card className="font-sans h-full bg-linear-to-t from-primary/5">
      <CardHeader>
        <CardTitle className="flex justify-between">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>

      <CardContent className="font-mono flex text-6xl items-center justify-center h-full">
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
