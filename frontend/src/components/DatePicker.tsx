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
              // dot styles to mark dates with a created short link
              links: `relative after:absolute after:bottom-1 after:left-1/2 
              after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full 
              after:bg-(--color-primary) after:z-10`,
              // need higher z-index to stack ::after on top of highlighted date range styles
            }}
          />
        </PopoverContent>
      </Popover>
    </Field>
  );
}
