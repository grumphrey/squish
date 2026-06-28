import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ChartData } from "recharts/types/state/chartDataSlice";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

export interface DailyTotalVisits {
  date: string;
  mobile: number;
  desktop: number;
  other: number;
  total: number;
}

interface VisitTimelineMetricsProps {
  data: DailyTotalVisits[] | undefined;
  isPending: boolean;
  error: Error | null;
}

export default function VisitTimelineMetrics({
  data,
  isPending,
  error,
}: VisitTimelineMetricsProps) {
  let chartData: ChartData;
  if (data) {
    // Transform data from backend for display
    chartData = processChartData(data);
  } else {
    chartData = [];
  }

  // TODO: proper loading state/skeleton
  // Empty state?
  if (isPending) return <div>Loading...</div>;
  if (error || !chartData) return null;

  return (
    <Card className="max-w-[660px] font-sans">
      <CardHeader>
        <CardTitle>Total Visits</CardTitle>
        <CardDescription>In the past 7 days</CardDescription>
      </CardHeader>

      <CardContent>
        <VisitsAreaChart data={chartData} />
      </CardContent>
    </Card>
  );
}

function VisitsAreaChart({ data }: { data: ChartData }) {
  return (
    <ChartContainer config={chartConfig}>
      <AreaChart
        accessibilityLayer
        data={data}
        margin={{
          left: 25,
          right: 25,
          top: 12,
        }}
      >
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={32}
          tickFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            });
          }}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              className="w-37.5"
              nameKey="visits"
              labelFormatter={(value) => {
                return new Date(value).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });
              }}
            />
          }
        />
        <Area
          dataKey="desktop"
          type="monotone"
          fill="var(--color-desktop)"
          fillOpacity={0.4}
          stroke="var(--color-desktop)"
          stackId="a"
        />
        <Area
          dataKey="mobile"
          type="monotone"
          fill="var(--color-mobile)"
          fillOpacity={0.4}
          stroke="var(--color-mobile)"
          stackId="a"
        />
        <Area
          dataKey="other"
          type="monotone"
          fill="var(--color-other)"
          fillOpacity={0.1}
          stroke="var(--color-other)"
          stackId="a"
        />
      </AreaChart>
    </ChartContainer>
  );
}

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "var(--chart-1)",
  },
  mobile: {
    label: "Mobile",
    color: "var(--chart-2)",
  },
  other: {
    label: "Other",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const processChartData = (data: DailyTotalVisits[]) => {
  return data.toSorted((a, b) => a.date.localeCompare(b.date));
};
