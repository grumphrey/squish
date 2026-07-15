import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import type { ChartData } from "recharts/types/state/chartDataSlice";
import { Pie, PieChart } from "recharts";
import { IconChartPie } from "@tabler/icons-react";
import ErrorAlert from "@/components/ErrorAlert";

interface BrowserPieChartDataItem {
  browser: string;
  visitors: number;
  fill: string;
}

interface BrowserMetricsProps {
  data: Record<string, number>[] | null | undefined;
  isPending: boolean;
  error: Error | null;
}
export default function BrowserMetrics({
  data,
  isPending,
  error,
}: BrowserMetricsProps) {
  let chartData: ChartData;
  if (data) {
    // Transform data from backend for display
    chartData = processChartData(data);
  } else {
    chartData = [];
  }

  if (isPending)
    return (
      <Card className="max-w-[660px]">
        <CardHeader className="gap-2.5">
          <Skeleton className="w-1/2 h-6" />
          <Skeleton className="w-1/4 h-5" />
        </CardHeader>

        <CardContent>
          <Skeleton className="w-full h-70" />
        </CardContent>
      </Card>
    );

  if (error) return <ErrorAlert />;

  return (
    <Card className="flex flex-col font-sans">
      <CardHeader className="items-center pb-0">
        <CardTitle>Browsers</CardTitle>
        <CardDescription>All-Time</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-0 h-full @sm:pb-6">
        <BrowserMetricsPieChart data={chartData} />
      </CardContent>
    </Card>
  );
}

function BrowserMetricsPieChart({ data }: { data: ChartData }) {
  if (data.length === 0)
    return (
      <Empty className="font-sans">
        <EmptyHeader>
          <EmptyMedia>
            <IconChartPie stroke={2} />
          </EmptyMedia>
          <EmptyTitle>No data to display.</EmptyTitle>
          <EmptyDescription>
            No browser metrics have been recorded yet.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  return (
    <ChartContainer
      config={browserChartConfig}
      className="mx-auto aspect-square h-full [&_.recharts-pie-label-text]:fill-foreground"
    >
      <PieChart accessibilityLayer>
        <ChartTooltip
          content={
            <ChartTooltipContent nameKey="browser" labelKey="visitors" />
          }
        />
        <Pie data={data} dataKey="visitors" label nameKey="browser" />
        <ChartLegend
          content={<ChartLegendContent nameKey="browser" />}
          className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
        />
      </PieChart>
    </ChartContainer>
  );
}

const browserChartConfig = {
  visitors: {
    label: "Total Visitors",
  },
  chrome: {
    label: "Chrome",
    color: "var(--color-chart-chrome)",
  },
  safari: {
    label: "Safari",
    color: "var(--color-chart-safari)",
  },
  firefox: {
    label: "Firefox",
    color: "var(--color-chart-firefox)",
  },
  opera: {
    label: "Opera",
    color: "var(--color-chart-opera)",
  },
  brave: {
    label: "Brave",
    color: "var(--color-chart-brave)",
  },
  edge: {
    label: "Edge",
    color: "var(--color-chart-edge)",
  },
  other: {
    label: "Other",
    color: "var(--color-chart-other)",
  },
} satisfies ChartConfig;

const KNOWN_BROWSERS = [
  "chrome",
  "safari",
  "firefox",
  "opera",
  "brave",
  "edge",
];

const processChartData = (
  data: Record<string, number>[],
): BrowserPieChartDataItem[] => {
  // Converts backend response shape for metrics data to a suitable shape to be passed into Rechart library.
  const metricsData = data.map((obj) => {
    const key = Object.keys(obj)[0];
    return {
      browser: key.toLowerCase(),
      visitors: obj[key],
      fill: `var(--color-${key.toLowerCase()})`,
    };
  });

  // Label non-known browsers as "other"
  const known = metricsData.filter((d) => KNOWN_BROWSERS.includes(d.browser));
  const others = metricsData.filter((d) => !KNOWN_BROWSERS.includes(d.browser));

  const othersTotal = others.reduce((sum, d) => sum + d.visitors, 0);

  return [
    ...known,
    ...(othersTotal > 0
      ? [
          {
            browser: "other",
            visitors: othersTotal,
            fill: `var(--color-chart-other)`,
          },
        ]
      : []),
  ];
};
