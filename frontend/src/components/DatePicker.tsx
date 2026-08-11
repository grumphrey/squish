import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Field } from "@/components/ui/field";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format } from "date-fns";
import type { Dispatch, SetStateAction } from "react";
import type { DateRange } from "react-day-picker";

interface DatePickerWithRangeProps {
  date: DateRange | undefined;
  setDate: Dispatch<SetStateAction<DateRange | undefined>>;
  linkDates: Date[] | undefined;
}

export function DatePickerWithRange({
  date,
  setDate,
  linkDates,
}: DatePickerWithRangeProps) {
  return (
    <Field className="ml-auto w-60 font-sans">
      {/* <FieldLabel htmlFor="date-picker-range">Link Created</FieldLabel> */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            id="date-picker-range"
            className="justify-start px-2.5 font-normal"
          >
            <CalendarIcon data-icon="inline-start" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 font-sans" align="start">
          <Calendar
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
            // captionLayout="dropdown"
            modifiers={{ links: linkDates }}
            modifiersClassNames={{
              // "Dot" to mark dates in which there was a short link created
              // Render the marker on the button so it stays above its selected
              // background and does not conflict with the cell's range ::after
              links: `[&>button]:after:pointer-events-none [&>button]:after:absolute
              [&>button]:after:bottom-1 [&>button]:after:left-1/2
              [&>button]:after:z-20 [&>button]:after:h-1 [&>button]:after:w-1
              [&>button]:after:-translate-x-1/2 [&>button]:after:rounded-full
              [&>button]:after:bg-(--color-primary) [&>button]:after:content-['']`,
            }}
          />
        </PopoverContent>
      </Popover>
    </Field>
  );
}
