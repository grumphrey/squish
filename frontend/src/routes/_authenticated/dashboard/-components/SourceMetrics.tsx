import { IconChartBar } from "@tabler/icons-react";
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
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import ErrorAlert from "@/components/ErrorAlert";
import type { VisitsBySource } from "@/models/models";
import type { ChartData } from "recharts/types/state/chartDataSlice";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

const chartConfig = {
  total_visits: {
    label: "Visitors",
  },
  direct_link: {
    label: "Direct Link",
    color: "#2563eb",
  },
  qr_code: {
    label: "QR Code",
    color: "#60a5fa",
  },
} satisfies ChartConfig;

interface SourceMetricsProps {
  data: VisitsBySource[] | undefined;
  isPending: boolean;
  error: Error | null;
}

export default function SourceMetrics({
  data,
  isPending,
  error,
}: SourceMetricsProps) {
  let chartData: ChartData;
  if (data) {
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
    <Card className="font-sans h-full justify-between">
      <CardHeader>
        <CardTitle>Source</CardTitle>
        <CardDescription>All-Time</CardDescription>
      </CardHeader>
      <CardContent>
        <SourceMetricsBarChart data={chartData} />
      </CardContent>
    </Card>
  );
}

function SourceMetricsBarChart({ data }: { data: ChartData }) {
  if (data.length === 0)
    return (
      <Empty className="font-sans">
        <EmptyHeader>
          <EmptyMedia>
            <IconChartBar stroke={2} />
          </EmptyMedia>
          <EmptyTitle>No data to display.</EmptyTitle>
          <EmptyDescription>
            No source metrics have been recorded yet.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  return (
    <ChartContainer config={chartConfig} className="aspect-5/6">
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="source"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) =>
            chartConfig[value as keyof typeof chartConfig]?.label
          }
        />
        <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
        <Bar dataKey="total_visits" strokeWidth={2} radius={6} barSize={40} />
      </BarChart>
    </ChartContainer>
  );
}

function processChartData(data: VisitsBySource[]) {
  return data.map((d) => {
    return { ...d, fill: `var(--color-${d.source})` };
  });
}
