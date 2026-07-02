import { Pie, PieChart, Sector, Label } from "recharts";
import type { PieSectorShapeProps } from "recharts/types/polar/Pie";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { IconChartDonut } from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorAlert from "@/components/ErrorAlert";
import { useMemo } from "react";

const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  bot: {
    label: "Bot",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
  tablet: {
    label: "Tablet",
    color: "var(--chart-3)",
  },
  desktop: {
    label: "Desktop",
    color: "var(--chart-4)",
  },
  other: {
    label: "Other",
    color: "var(--chart-5)",
  },
} satisfies ChartConfig;

const ACTIVE_INDEX = 0;

interface DeviceTypeDonutChartDataItem {
  deviceType: string;
  visitors: number;
  fill: string;
}

interface DeviceTypeMetricsProps {
  data: Record<string, number>[] | null | undefined;
  isPending: boolean;
  error: Error | null;
}
export default function DeviceTypeMetrics({
  data,
  isPending,
  error,
}: DeviceTypeMetricsProps) {
  let chartData: DeviceTypeDonutChartDataItem[];
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
        <CardTitle>Device Type</CardTitle>
        <CardDescription>All-Time</CardDescription>
      </CardHeader>

      <CardContent className="h-full flex-1 pb-0">
        <DeviceTypeMetricsDonutChart data={chartData} />
      </CardContent>
    </Card>
  );
}

function DeviceTypeMetricsDonutChart({
  data,
}: {
  data: DeviceTypeDonutChartDataItem[];
}) {
  // TODO: maybe unnecessary to memoize
  const totalVisitors = useMemo(() => {
    return data.reduce((acc, curr) => acc + curr.visitors, 0);
  }, [data]);

  if (data.length === 0)
    return (
      <Empty className="font-sans">
        <EmptyHeader>
          <EmptyMedia>
            <IconChartDonut stroke={2} />
          </EmptyMedia>
          <EmptyTitle>No data to display.</EmptyTitle>
          <EmptyDescription>
            No device types have been recorded yet.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square h-full"
    >
      <PieChart>
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Pie
          data={data}
          dataKey="visitors"
          nameKey="deviceType"
          innerRadius={60}
          strokeWidth={5}
          shape={({ index, outerRadius = 0, ...props }: PieSectorShapeProps) =>
            index === ACTIVE_INDEX ? (
              <Sector {...props} outerRadius={outerRadius + 10} />
            ) : (
              <Sector {...props} outerRadius={outerRadius} />
            )
          }
        >
          <Label
            content={({ viewBox }) => {
              if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                return (
                  <text
                    x={viewBox.cx}
                    y={viewBox.cy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    <tspan
                      x={viewBox.cx}
                      y={(viewBox.cy || 0) - 30}
                      className="fill-foreground text-3xl font-bold"
                    >
                      {totalVisitors.toLocaleString()}
                    </tspan>
                    <tspan
                      x={viewBox.cx}
                      y={viewBox.cy}
                      className="fill-muted-foreground"
                    >
                      Visitors
                    </tspan>
                  </text>
                );
              }
            }}
          />
        </Pie>
        <ChartLegend
          content={<ChartLegendContent nameKey="deviceType" />}
          className="-translate-y-2 flex-wrap gap-2 *:basis-1/4 *:justify-center"
        />
      </PieChart>
    </ChartContainer>
  );
}

const processChartData = (
  data: Record<string, number>[],
): DeviceTypeDonutChartDataItem[] => {
  // Converts backend response shape for metrics data to a suitable shape to be passed into Rechart library.
  const metricsData = data.map((obj) => {
    const key = Object.keys(obj)[0];
    return {
      deviceType: key.toLowerCase(),
      visitors: obj[key],
      fill: `var(--color-${key.toLowerCase()})`,
    };
  });
  return metricsData;
};
