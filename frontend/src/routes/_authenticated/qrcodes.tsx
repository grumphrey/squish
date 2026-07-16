import { IconQrcode } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { URLSearchInput } from "./links";
import URLsList from "@/components/URLsList";
import { useGetURLs } from "@/hooks/useGetURLs";
import { DatePickerWithRange } from "@/components/DatePicker";
import type { DateRange } from "react-day-picker";
import { addDays } from "date-fns";

export const Route = createFileRoute("/_authenticated/qrcodes")({
  component: RouteComponent,
});

function RouteComponent() {
  const [searchTerm, setSearchTerm] = useState("");
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -28), // about a month ago
    to: new Date(), // today
  });
  const { data, isPending, error } = useGetURLs();
  // TODO: duplicated in /links page. maybe refactor
  // Get dates for calendar styles
  const urlDates = data?.map((u) => u.created_at);

  return (
    <>
      <title>squi.sh — QR Codes</title>
      <section className="max-w-5xl w-full my-0 mx-auto px-5 py-10 flex flex-col gap-5 sm:px-20">
        <div>
          <div className="flex justify-between items-center font-sans">
            <h1 className="flex items-center gap-3 text-3xl font-sans font-bold tracking-tighter mb-5 md:text-4xl mr-10">
              QR Codes <IconQrcode size="40px" />
            </h1>
            <URLSearchInput query={searchTerm} setQuery={setSearchTerm} />
          </div>
          <DatePickerWithRange
            date={date}
            setDate={setDate}
            linkDates={urlDates}
          />
        </div>

        {/* TODO: move props out of urlslist into parent */}
        <URLsList
          data={data}
          error={error}
          isPending={isPending}
          query={searchTerm}
          isQROnly
        />
      </section>
    </>
  );
}
