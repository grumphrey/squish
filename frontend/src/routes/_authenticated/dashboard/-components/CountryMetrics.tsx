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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import type { ChartData } from "recharts/types/state/chartDataSlice";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import { IconChartBar } from "@tabler/icons-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CountryMetricsProps {
  data: Record<string, number>[] | null | undefined;
  isPending: boolean;
  error: Error | null;
}

interface CountryBarChartDataItem {
  countryCode: string;
  country: string;
  visitors: number;
  // fill: string;
}

export default function CountryMetrics({
  data,
  isPending,
  error,
}: CountryMetricsProps) {
  let chartData: ChartData;
  if (data) {
    // Transform data from backend for display
    chartData = processChartData(data);
  } else {
    chartData = [];
  }

  // TODO: proper loading state/skeleton
  // Empty state?
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
  if (error) return null;
  if (!chartData) return null;

  return (
    <Card className="font-sans">
      <CardHeader>
        <CardTitle>Countries</CardTitle>
        <CardDescription>Top 5 All-Time</CardDescription>
      </CardHeader>

      <CardContent>
        <CountryMetricsBarChart data={chartData} />
      </CardContent>
    </Card>
  );
}

function CountryMetricsBarChart({ data }: { data: ChartData }) {
  if (data.length === 0)
    return (
      <Empty className="font-sans">
        <EmptyHeader>
          <EmptyMedia>
            <IconChartBar stroke={2} />
          </EmptyMedia>
          <EmptyTitle>No data to display.</EmptyTitle>
          <EmptyDescription>
            No geographical data has been recorded yet.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );

  return (
    <ChartContainer config={chartConfig} className="h-50 w-full">
      <BarChart
        accessibilityLayer
        data={data}
        layout="vertical"
        margin={{
          right: 16,
        }}
      >
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey="country"
          type="category"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value.slice(0, 3)}
          hide
        />
        <XAxis dataKey="visitors" type="number" hide />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent indicator="line" />}
        />
        <Bar dataKey="visitors" fill="var(--color-visitors)" radius={4}>
          <LabelList
            dataKey="country"
            position="insideLeft"
            offset={8}
            className="fill-foreground"
            fontSize={13}
          />
          <LabelList
            dataKey="visitors"
            position="right"
            offset={8}
            className="fill-foreground"
            fontSize={12}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

const chartConfig = {
  visitors: {
    label: "Visitors",
    color: "#2c7fff",
  },
  label: {
    color: "var(--color-text)",
  },
  0: {
    color: "#8ec6ff",
  },
  1: {
    color: "#2c7fff",
  },
  2: {
    color: "#145dfb",
  },
  3: {
    color: "#1347e6",
  },
  4: {
    color: "#173bb5",
  },
} satisfies ChartConfig;

const processChartData = (
  data: Record<string, number>[],
): CountryBarChartDataItem[] => {
  // Converts backend response shape for metrics data to a suitable shape to be passed into Rechart library.
  const metricsData = data.map((obj) => {
    const key = Object.keys(obj)[0];
    const countryCode = key.toUpperCase();
    const country = countries.find((c) => c.code == key.toUpperCase()) ?? {
      name: "Other",
      emoji: "",
    };
    return {
      countryCode,
      country: `${country?.name} ${country?.emoji}`,
      visitors: obj[key],
      // fill: `var(--color-${idx})`, // customize colour of each bar in chartConfig
    };
  });
  return metricsData;
};

// TODO: need to match country codes returned by maxmind db
// Store in countries.json file instead?
const countries = [
  { code: "AD", name: "Andorra", emoji: "🇦🇩" },
  { code: "AE", name: "United Arab Emirates", emoji: "🇦🇪" },
  { code: "AF", name: "Afghanistan", emoji: "🇦🇫" },
  { code: "AG", name: "Antigua and Barbuda", emoji: "🇦🇬" },
  { code: "AI", name: "Anguilla", emoji: "🇦🇮" },
  { code: "AL", name: "Albania", emoji: "🇦🇱" },
  { code: "AM", name: "Armenia", emoji: "🇦🇲" },
  { code: "AO", name: "Angola", emoji: "🇦🇴" },
  { code: "AQ", name: "Antarctica", emoji: "🇦🇶" },
  { code: "AR", name: "Argentina", emoji: "🇦🇷" },
  { code: "AS", name: "American Samoa", emoji: "🇦🇸" },
  { code: "AT", name: "Austria", emoji: "🇦🇹" },
  { code: "AU", name: "Australia", emoji: "🇦🇺" },
  { code: "AW", name: "Aruba", emoji: "🇦🇼" },
  { code: "AX", name: "Åland Islands", emoji: "🇦🇽" },
  { code: "AZ", name: "Azerbaijan", emoji: "🇦🇿" },
  { code: "BA", name: "Bosnia and Herzegovina", emoji: "🇧🇦" },
  { code: "BB", name: "Barbados", emoji: "🇧🇧" },
  { code: "BD", name: "Bangladesh", emoji: "🇧🇩" },
  { code: "BE", name: "Belgium", emoji: "🇧🇪" },
  { code: "BF", name: "Burkina Faso", emoji: "🇧🇫" },
  { code: "BG", name: "Bulgaria", emoji: "🇧🇬" },
  { code: "BH", name: "Bahrain", emoji: "🇧🇭" },
  { code: "BI", name: "Burundi", emoji: "🇧🇮" },
  { code: "BJ", name: "Benin", emoji: "🇧🇯" },
  { code: "BL", name: "Saint Barthélemy", emoji: "🇧🇱" },
  { code: "BM", name: "Bermuda", emoji: "🇧🇲" },
  { code: "BN", name: "Brunei Darussalam", emoji: "🇧🇳" },
  { code: "BO", name: "Bolivia", emoji: "🇧🇴" },
  { code: "BQ", name: "Bonaire, Sint Eustatius and Saba", emoji: "🇧🇶" },
  { code: "BR", name: "Brazil", emoji: "🇧🇷" },
  { code: "BS", name: "Bahamas", emoji: "🇧🇸" },
  { code: "BT", name: "Bhutan", emoji: "🇧🇹" },
  { code: "BV", name: "Bouvet Island", emoji: "🇧🇻" },
  { code: "BW", name: "Botswana", emoji: "🇧🇼" },
  { code: "BY", name: "Belarus", emoji: "🇧🇾" },
  { code: "BZ", name: "Belize", emoji: "🇧🇿" },
  { code: "CA", name: "Canada", emoji: "🇨🇦" },
  { code: "CC", name: "Cocos (Keeling) Islands", emoji: "🇨🇨" },
  { code: "CD", name: "Congo (Democratic Republic)", emoji: "🇨🇩" },
  { code: "CF", name: "Central African Republic", emoji: "🇨🇫" },
  { code: "CG", name: "Congo (Republic)", emoji: "🇨🇬" },
  { code: "CH", name: "Switzerland", emoji: "🇨🇭" },
  { code: "CI", name: "Côte d'Ivoire", emoji: "🇨🇮" },
  { code: "CK", name: "Cook Islands", emoji: "🇨🇰" },
  { code: "CL", name: "Chile", emoji: "🇨🇱" },
  { code: "CM", name: "Cameroon", emoji: "🇨🇲" },
  { code: "CN", name: "China", emoji: "🇨🇳" },
  { code: "CO", name: "Colombia", emoji: "🇨🇴" },
  { code: "CR", name: "Costa Rica", emoji: "🇨🇷" },
  { code: "CU", name: "Cuba", emoji: "🇨🇺" },
  { code: "CV", name: "Cabo Verde", emoji: "🇨🇻" },
  { code: "CW", name: "Curaçao", emoji: "🇨🇼" },
  { code: "CX", name: "Christmas Island", emoji: "🇨🇽" },
  { code: "CY", name: "Cyprus", emoji: "🇨🇾" },
  { code: "CZ", name: "Czechia", emoji: "🇨🇿" },
  { code: "DE", name: "Germany", emoji: "🇩🇪" },
  { code: "DJ", name: "Djibouti", emoji: "🇩🇯" },
  { code: "DK", name: "Denmark", emoji: "🇩🇰" },
  { code: "DM", name: "Dominica", emoji: "🇩🇲" },
  { code: "DO", name: "Dominican Republic", emoji: "🇩🇴" },
  { code: "DZ", name: "Algeria", emoji: "🇩🇿" },
  { code: "EC", name: "Ecuador", emoji: "🇪🇨" },
  { code: "EE", name: "Estonia", emoji: "🇪🇪" },
  { code: "EG", name: "Egypt", emoji: "🇪🇬" },
  { code: "EH", name: "Western Sahara", emoji: "🇪🇭" },
  { code: "ER", name: "Eritrea", emoji: "🇪🇷" },
  { code: "ES", name: "Spain", emoji: "🇪🇸" },
  { code: "ET", name: "Ethiopia", emoji: "🇪🇹" },
  { code: "FI", name: "Finland", emoji: "🇫🇮" },
  { code: "FJ", name: "Fiji", emoji: "🇫🇯" },
  { code: "FK", name: "Falkland Islands", emoji: "🇫🇰" },
  { code: "FM", name: "Micronesia", emoji: "🇫🇲" },
  { code: "FO", name: "Faroe Islands", emoji: "🇫🇴" },
  { code: "FR", name: "France", emoji: "🇫🇷" },
  { code: "GA", name: "Gabon", emoji: "🇬🇦" },
  { code: "GB", name: "United Kingdom", emoji: "🇬🇧" },
  { code: "GD", name: "Grenada", emoji: "🇬🇩" },
  { code: "GE", name: "Georgia", emoji: "🇬🇪" },
  { code: "GF", name: "French Guiana", emoji: "🇬🇫" },
  { code: "GG", name: "Guernsey", emoji: "🇬🇬" },
  { code: "GH", name: "Ghana", emoji: "🇬🇭" },
  { code: "GI", name: "Gibraltar", emoji: "🇬🇮" },
  { code: "GL", name: "Greenland", emoji: "🇬🇱" },
  { code: "GM", name: "Gambia", emoji: "🇬🇲" },
  { code: "GN", name: "Guinea", emoji: "🇬🇳" },
  { code: "GP", name: "Guadeloupe", emoji: "🇬🇵" },
  { code: "GQ", name: "Equatorial Guinea", emoji: "🇬🇶" },
  { code: "GR", name: "Greece", emoji: "🇬🇷" },
  { code: "GS", name: "South Georgia", emoji: "🇬🇸" },
  { code: "GT", name: "Guatemala", emoji: "🇬🇹" },
  { code: "GU", name: "Guam", emoji: "🇬🇺" },
  { code: "GW", name: "Guinea-Bissau", emoji: "🇬🇼" },
  { code: "GY", name: "Guyana", emoji: "🇬🇾" },
  { code: "HK", name: "Hong Kong", emoji: "🇭🇰" },
  { code: "HM", name: "Heard Island and McDonald Islands", emoji: "🇭🇲" },
  { code: "HN", name: "Honduras", emoji: "🇭🇳" },
  { code: "HR", name: "Croatia", emoji: "🇭🇷" },
  { code: "HT", name: "Haiti", emoji: "🇭🇹" },
  { code: "HU", name: "Hungary", emoji: "🇭🇺" },
  { code: "ID", name: "Indonesia", emoji: "🇮🇩" },
  { code: "IE", name: "Ireland", emoji: "🇮🇪" },
  { code: "IL", name: "Israel", emoji: "🇮🇱" },
  { code: "IM", name: "Isle of Man", emoji: "🇮🇲" },
  { code: "IN", name: "India", emoji: "🇮🇳" },
  { code: "IO", name: "British Indian Ocean Territory", emoji: "🇮🇴" },
  { code: "IQ", name: "Iraq", emoji: "🇮🇶" },
  { code: "IR", name: "Iran", emoji: "🇮🇷" },
  { code: "IS", name: "Iceland", emoji: "🇮🇸" },
  { code: "IT", name: "Italy", emoji: "🇮🇹" },
  { code: "JE", name: "Jersey", emoji: "🇯🇪" },
  { code: "JM", name: "Jamaica", emoji: "🇯🇲" },
  { code: "JO", name: "Jordan", emoji: "🇯🇴" },
  { code: "JP", name: "Japan", emoji: "🇯🇵" },
  { code: "KE", name: "Kenya", emoji: "🇰🇪" },
  { code: "KG", name: "Kyrgyzstan", emoji: "🇰🇬" },
  { code: "KH", name: "Cambodia", emoji: "🇰🇭" },
  { code: "KI", name: "Kiribati", emoji: "🇰🇮" },
  { code: "KM", name: "Comoros", emoji: "🇰🇲" },
  { code: "KN", name: "Saint Kitts and Nevis", emoji: "🇰🇳" },
  { code: "KP", name: "North Korea", emoji: "🇰🇵" },
  { code: "KR", name: "South Korea", emoji: "🇰🇷" },
  { code: "KW", name: "Kuwait", emoji: "🇰🇼" },
  { code: "KY", name: "Cayman Islands", emoji: "🇰🇾" },
  { code: "KZ", name: "Kazakhstan", emoji: "🇰🇿" },
  { code: "LA", name: "Laos", emoji: "🇱🇦" },
  { code: "LB", name: "Lebanon", emoji: "🇱🇧" },
  { code: "LC", name: "Saint Lucia", emoji: "🇱🇨" },
  { code: "LI", name: "Liechtenstein", emoji: "🇱🇮" },
  { code: "LK", name: "Sri Lanka", emoji: "🇱🇰" },
  { code: "LR", name: "Liberia", emoji: "🇱🇷" },
  { code: "LS", name: "Lesotho", emoji: "🇱🇸" },
  { code: "LT", name: "Lithuania", emoji: "🇱🇹" },
  { code: "LU", name: "Luxembourg", emoji: "🇱🇺" },
  { code: "LV", name: "Latvia", emoji: "🇱🇻" },
  { code: "LY", name: "Libya", emoji: "🇱🇾" },
  { code: "MA", name: "Morocco", emoji: "🇲🇦" },
  { code: "MC", name: "Monaco", emoji: "🇲🇨" },
  { code: "MD", name: "Moldova", emoji: "🇲🇩" },
  { code: "ME", name: "Montenegro", emoji: "🇲🇪" },
  { code: "MF", name: "Saint Martin", emoji: "🇲🇫" },
  { code: "MG", name: "Madagascar", emoji: "🇲🇬" },
  { code: "MH", name: "Marshall Islands", emoji: "🇲🇭" },
  { code: "MK", name: "North Macedonia", emoji: "🇲🇰" },
  { code: "ML", name: "Mali", emoji: "🇲🇱" },
  { code: "MM", name: "Myanmar", emoji: "🇲🇲" },
  { code: "MN", name: "Mongolia", emoji: "🇲🇳" },
  { code: "MO", name: "Macao", emoji: "🇲🇴" },
  { code: "MP", name: "Northern Mariana Islands", emoji: "🇲🇵" },
  { code: "MQ", name: "Martinique", emoji: "🇲🇶" },
  { code: "MR", name: "Mauritania", emoji: "🇲🇷" },
  { code: "MS", name: "Montserrat", emoji: "🇲🇸" },
  { code: "MT", name: "Malta", emoji: "🇲🇹" },
  { code: "MU", name: "Mauritius", emoji: "🇲🇺" },
  { code: "MV", name: "Maldives", emoji: "🇲🇻" },
  { code: "MW", name: "Malawi", emoji: "🇲🇼" },
  { code: "MX", name: "Mexico", emoji: "🇲🇽" },
  { code: "MY", name: "Malaysia", emoji: "🇲🇾" },
  { code: "MZ", name: "Mozambique", emoji: "🇲🇿" },
  { code: "NA", name: "Namibia", emoji: "🇳🇦" },
  { code: "NC", name: "New Caledonia", emoji: "🇳🇨" },
  { code: "NE", name: "Niger", emoji: "🇳🇪" },
  { code: "NF", name: "Norfolk Island", emoji: "🇳🇫" },
  { code: "NG", name: "Nigeria", emoji: "🇳🇬" },
  { code: "NI", name: "Nicaragua", emoji: "🇳🇮" },
  { code: "NL", name: "Netherlands", emoji: "🇳🇱" },
  { code: "NO", name: "Norway", emoji: "🇳🇴" },
  { code: "NP", name: "Nepal", emoji: "🇳🇵" },
  { code: "NR", name: "Nauru", emoji: "🇳🇷" },
  { code: "NU", name: "Niue", emoji: "🇳🇺" },
  { code: "NZ", name: "New Zealand", emoji: "🇳🇿" },
  { code: "OM", name: "Oman", emoji: "🇴🇲" },
  { code: "PA", name: "Panama", emoji: "🇵🇦" },
  { code: "PE", name: "Peru", emoji: "🇵🇪" },
  { code: "PF", name: "French Polynesia", emoji: "🇵🇫" },
  { code: "PG", name: "Papua New Guinea", emoji: "🇵🇬" },
  { code: "PH", name: "Philippines", emoji: "🇵🇭" },
  { code: "PK", name: "Pakistan", emoji: "🇵🇰" },
  { code: "PL", name: "Poland", emoji: "🇵🇱" },
  { code: "PM", name: "Saint Pierre and Miquelon", emoji: "🇵🇲" },
  { code: "PN", name: "Pitcairn", emoji: "🇵🇳" },
  { code: "PR", name: "Puerto Rico", emoji: "🇵🇷" },
  { code: "PS", name: "Palestine", emoji: "🇵🇸" },
  { code: "PT", name: "Portugal", emoji: "🇵🇹" },
  { code: "PW", name: "Palau", emoji: "🇵🇼" },
  { code: "PY", name: "Paraguay", emoji: "🇵🇾" },
  { code: "QA", name: "Qatar", emoji: "🇶🇦" },
  { code: "RE", name: "Réunion", emoji: "🇷🇪" },
  { code: "RO", name: "Romania", emoji: "🇷🇴" },
  { code: "RS", name: "Serbia", emoji: "🇷🇸" },
  { code: "RU", name: "Russia", emoji: "🇷🇺" },
  { code: "RW", name: "Rwanda", emoji: "🇷🇼" },
  { code: "SA", name: "Saudi Arabia", emoji: "🇸🇦" },
  { code: "SB", name: "Solomon Islands", emoji: "🇸🇧" },
  { code: "SC", name: "Seychelles", emoji: "🇸🇨" },
  { code: "SD", name: "Sudan", emoji: "🇸🇩" },
  { code: "SE", name: "Sweden", emoji: "🇸🇪" },
  { code: "SG", name: "Singapore", emoji: "🇸🇬" },
  { code: "SH", name: "Saint Helena", emoji: "🇸🇭" },
  { code: "SI", name: "Slovenia", emoji: "🇸🇮" },
  { code: "SJ", name: "Svalbard and Jan Mayen", emoji: "🇸🇯" },
  { code: "SK", name: "Slovakia", emoji: "🇸🇰" },
  { code: "SL", name: "Sierra Leone", emoji: "🇸🇱" },
  { code: "SM", name: "San Marino", emoji: "🇸🇲" },
  { code: "SN", name: "Senegal", emoji: "🇸🇳" },
  { code: "SO", name: "Somalia", emoji: "🇸🇴" },
  { code: "SR", name: "Suriname", emoji: "🇸🇷" },
  { code: "SS", name: "South Sudan", emoji: "🇸🇸" },
  { code: "ST", name: "Sao Tome and Principe", emoji: "🇸🇹" },
  { code: "SV", name: "El Salvador", emoji: "🇸🇻" },
  { code: "SX", name: "Sint Maarten", emoji: "🇸🇽" },
  { code: "SY", name: "Syria", emoji: "🇸🇾" },
  { code: "SZ", name: "Eswatini", emoji: "🇸🇿" },
  { code: "TC", name: "Turks and Caicos Islands", emoji: "🇹🇨" },
  { code: "TD", name: "Chad", emoji: "🇹🇩" },
  { code: "TF", name: "French Southern Territories", emoji: "🇹🇫" },
  { code: "TG", name: "Togo", emoji: "🇹🇬" },
  { code: "TH", name: "Thailand", emoji: "🇹🇭" },
  { code: "TJ", name: "Tajikistan", emoji: "🇹🇯" },
  { code: "TK", name: "Tokelau", emoji: "🇹🇰" },
  { code: "TL", name: "Timor-Leste", emoji: "🇹🇱" },
  { code: "TM", name: "Turkmenistan", emoji: "🇹🇲" },
  { code: "TN", name: "Tunisia", emoji: "🇹🇳" },
  { code: "TO", name: "Tonga", emoji: "🇹🇴" },
  { code: "TR", name: "Turkey", emoji: "🇹🇷" },
  { code: "TT", name: "Trinidad and Tobago", emoji: "🇹🇹" },
  { code: "TV", name: "Tuvalu", emoji: "🇹🇻" },
  { code: "TW", name: "Taiwan", emoji: "🇹🇼" },
  { code: "TZ", name: "Tanzania", emoji: "🇹🇿" },
  { code: "UA", name: "Ukraine", emoji: "🇺🇦" },
  { code: "UG", name: "Uganda", emoji: "🇺🇬" },
  { code: "UM", name: "United States Minor Outlying Islands", emoji: "🇺🇲" },
  { code: "US", name: "United States", emoji: "🇺🇸" },
  { code: "UY", name: "Uruguay", emoji: "🇺🇾" },
  { code: "UZ", name: "Uzbekistan", emoji: "🇺🇿" },
  { code: "VA", name: "Holy See", emoji: "🇻🇦" },
  { code: "VC", name: "Saint Vincent and the Grenadines", emoji: "🇻🇨" },
  { code: "VE", name: "Venezuela", emoji: "🇻🇪" },
  { code: "VG", name: "Virgin Islands (British)", emoji: "🇻🇬" },
  { code: "VI", name: "Virgin Islands (U.S.)", emoji: "🇻🇮" },
  { code: "VN", name: "Vietnam", emoji: "🇻🇳" },
  { code: "VU", name: "Vanuatu", emoji: "🇻🇺" },
  { code: "WF", name: "Wallis and Futuna", emoji: "🇼🇫" },
  { code: "WS", name: "Samoa", emoji: "🇼🇸" },
  { code: "YE", name: "Yemen", emoji: "🇾🇪" },
  { code: "YT", name: "Mayotte", emoji: "🇾🇹" },
  { code: "ZA", name: "South Africa", emoji: "🇿🇦" },
  { code: "ZM", name: "Zambia", emoji: "🇿🇲" },
  { code: "ZW", name: "Zimbabwe", emoji: "🇿🇼" },
];
