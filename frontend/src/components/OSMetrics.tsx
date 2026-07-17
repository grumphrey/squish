import { LabelList, Pie, PieChart } from "recharts";
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
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "./ui/skeleton";
import ErrorAlert from "./ErrorAlert";
import { IconChartPie4 } from "@tabler/icons-react";
import type { ChartData } from "recharts/types/state/chartDataSlice";

const KNOWN_OS = ["windows", "macos", "linux", "android", "ios"];

const chartConfig = {
  visitors: {
    label: "Visitors",
  },
  macos: {
    label: "macOS",
    // color: "var(--chart-1)",
    color: "#FF605C",
  },
  ios: {
    label: "iOS",
    // color: "var(--chart-2)",
    color: "#FF9500",
  },
  windows: {
    label: "Windows",
    // color: "var(--chart-3)",
    color: "#00A4EF",
  },
  android: {
    label: "Android",
    // color: "var(--chart-4)",
    color: "#3DDC84",
  },
  linux: {
    label: "Linux",
    // color: "var(--chart-5)",
    color: "#FCC624",
  },
  other: {
    label: "Other",
    // color: "var(--chart-2)", // TODO: choose a darker colour to represent others
    color: "#CCCCCC",
  },
} satisfies ChartConfig;

interface OSMetricsChartDataItem {
  os: string;
  visitors: number;
  fill: string;
}

interface OSMetricsProps {
  data: Record<string, number>[] | null | undefined;
  isPending: boolean;
  error: Error | null;
}

// Similar to BrowserMetrics component (also a pie chart)
export default function OSMetrics({ data, isPending, error }: OSMetricsProps) {
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
          <Skeleton className="w-1/2 h-4" />
          <Skeleton className="w-1/4 h-4" />
        </CardHeader>

        <CardContent>
          <Skeleton className="w-full h-30" />
        </CardContent>
      </Card>
    );

  if (error) return <ErrorAlert />;

  return (
    <Card className="flex flex-col font-sans">
      <CardHeader className="items-center pb-0">
        <CardTitle>Operating System</CardTitle>
        <CardDescription>All-Time</CardDescription>
      </CardHeader>

      <CardContent className="flex-1 pb-0 h-full">
        <OSMetricsPieChart data={chartData} />
      </CardContent>
    </Card>
  );
}

function OSMetricsPieChart({ data }: { data: ChartData }) {
  if (data.length === 0)
    return (
      <Empty className="font-sans">
        <EmptyHeader>
          <EmptyMedia>
            <IconChartPie4 stroke={2} />
          </EmptyMedia>
          <EmptyTitle>No data to display.</EmptyTitle>
          <EmptyDescription>
            No operating system metrics have been recorded yet.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  return (
    <ChartContainer
      config={chartConfig}
      className="mx-auto aspect-square max-h-[200px] [&_.recharts-text]:fill-background"
    >
      <PieChart>
        <ChartTooltip
          content={<ChartTooltipContent nameKey="visitors" hideLabel />}
        />
        <Pie data={data} dataKey="visitors">
          <LabelList
            dataKey="os"
            className="fill-background"
            stroke="none"
            fontSize={12}
            formatter={(value) =>
              chartConfig[value as keyof typeof chartConfig]?.label
            }
          />
        </Pie>
      </PieChart>
    </ChartContainer>
  );
}

const processChartData = (
  data: Record<string, number>[],
): OSMetricsChartDataItem[] => {
  // Converts backend response shape for metrics data to a suitable shape to be passed into Rechart library.
  const metricsData = data.map((obj) => {
    const key = Object.keys(obj)[0];
    return {
      os: key.toLowerCase(),
      visitors: obj[key],
      fill: `var(--color-${key.toLowerCase()})`,
    };
  });

  // Label non-known OSes as "other"
  const known = metricsData.filter((d) => KNOWN_OS.includes(d.os));
  const others = metricsData.filter((d) => !KNOWN_OS.includes(d.os));

  const othersTotal = others.reduce((sum, d) => sum + d.visitors, 0);

  return [
    ...known,
    ...(othersTotal > 0
      ? [
          {
            os: "other",
            visitors: othersTotal,
            fill: `var(--color-chart-other)`,
          },
        ]
      : []),
  ];
};
