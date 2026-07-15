import { IconChartBar } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  useURLDeviceMetrics,
  useURLPastWeekMetrics,
  useURLSourceMetrics,
  useURLTotalVisitMetrics,
} from "@/hooks";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import VisitTimelineMetrics from "@/routes/_authenticated/dashboard/-components/VisitTimelineMetrics";
import SourceMetrics from "@/routes/_authenticated/dashboard/-components/SourceMetrics";
import BrowserMetrics from "@/routes/_authenticated/dashboard/-components/BrowserMetrics";
import DeviceTypeMetrics from "@/routes/_authenticated/dashboard/-components/DeviceTypeMetrics";
import CountryMetrics from "@/routes/_authenticated/dashboard/-components/CountryMetrics";
import { MetricCard } from "@/routes/_authenticated/dashboard/route";
import RefreshButton from "@/components/RefreshButton";

interface AnalyticsDialogProps {
  shortCode: string;
}

// NOTE: dialog remains mounted on the page even when closed. use dialogcontent if need to unmount (e.g. for react query refetchOnMount).
export default function AnalyticsDialog({ shortCode }: AnalyticsDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <IconChartBar />
        </Button>
      </DialogTrigger>

      <DialogContent className="font-sans sm:max-w-5xl! m-auto">
        <URLAnalytics shortCode={shortCode} open={open} />
      </DialogContent>
    </Dialog>
  );
}

interface URLAnalyticsProps {
  open: boolean;
  shortCode: string;
}

function URLAnalytics({ open, shortCode }: URLAnalyticsProps) {
  const queryClient = useQueryClient();
  const {
    data: metricsData,
    isPending: isMetricsLoading,
    isFetching: isFetchingMetrics,
    error: metricsError,
  } = useURLDeviceMetrics(open, shortCode);

  const {
    data: visitsData,
    isPending: isVisitsLoading,
    isFetching: isFetchingVisits,
    error: visitsError,
  } = useURLPastWeekMetrics(open, shortCode);

  const {
    data: totalData,
    isPending: isTotalLoading,
    isFetching: isFetchingTotal,
    error: totalError,
  } = useURLTotalVisitMetrics(open, shortCode);

  const {
    data: sourceData,
    isPending: isSourceLoading,
    isFetching: isFetchingSource,
    error: sourceError,
  } = useURLSourceMetrics(open, shortCode);

  const isRefreshing =
    isFetchingMetrics ||
    isFetchingVisits ||
    isFetchingTotal ||
    isFetchingSource;

  // Refresh metrics data from backend
  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["metrics", shortCode] });
  };
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-1 *:h-4">
          <IconChartBar /> Metrics
        </DialogTitle>
        <DialogDescription>
          /<span className="text-(--color-primary)">{shortCode}</span>
        </DialogDescription>
      </DialogHeader>

      <div className="p-4 max-h-[50vh] overflow-y-auto px-4 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-9 m-auto max-w-80 sm:max-w-none md:max-w-none">
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

      <DialogFooter>
        <RefreshButton
          handleRefresh={handleRefreshAll}
          isRefreshing={isRefreshing}
        />
      </DialogFooter>
    </>
  );
}
